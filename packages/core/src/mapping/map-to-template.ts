import { generateCsv } from '../csv/generate-csv';
import { MappingError } from '../errors';
import { fillPlanSchema } from '../schemas';
import { deterministicMap } from './deterministic-mapper';
import type { Logger } from '../types/common';
import type { ExtractedBlocks } from '../types/extraction';
import type { FillPlan } from '../types/fill-plan';
import type { LLMProvider } from '../types/provider';
import type { TemplateInventory } from '../types/template';
import { validateFillPlan } from '../validation/validate-fill-plan';


export const mapToTemplate = async (args: {
  template: TemplateInventory;
  extracted: ExtractedBlocks;
  threshold: number;
  llmMode: 'disabled' | 'auto' | 'required';
  logger?: Logger | undefined;
  clientFiles?: Array<{ name: string; data: ArrayBuffer; mime: string }> | undefined;
  llm?: LLMProvider | undefined;
}): Promise<{ csv: string; fillPlan: FillPlan; report: ReturnType<typeof validateFillPlan> }> => {
  const deterministic = deterministicMap(args.template, args.extracted, args.threshold);

  const requiresLlm = deterministic.unresolved.length > 0;

  if (args.llmMode === 'disabled' || (!requiresLlm && args.llmMode !== 'required')) {
    const csv = generateCsv(deterministic);
    return {
      csv,
      fillPlan: deterministic,
      report: validateFillPlan(args.template, deterministic),
    };
  }

  if (!args.llm) {
    if (args.llmMode === 'required') {
      throw new MappingError('LLM mode is required but no provider was configured.');
    }
    const csv = generateCsv(deterministic);
    return {
      csv,
      fillPlan: deterministic,
      report: validateFillPlan(args.template, deterministic),
    };
  }

  let llmResult: Awaited<ReturnType<LLMProvider['map']>>;
  try {
    args.logger?.info('LLM mapping started', {
      provider: args.llm.name,
      unresolvedCount: deterministic.unresolved.length,
    });
    llmResult = await args.llm.map({
      template: args.template,
      extracted: args.extracted,
      unresolvedFieldIds: deterministic.unresolved.map((u) => u.fieldId),
      clientFiles: args.clientFiles,
    });
    args.logger?.info('LLM mapping completed', {
      provider: args.llm.name,
      llmEntryCount: llmResult.fillPlan.entries.length,
      llmUnresolvedCount: llmResult.fillPlan.unresolved.length,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown LLM error';
    args.logger?.warn('LLM mapping failed; falling back to deterministic results.', {
      provider: args.llm.name,
      reason,
      llmMode: args.llmMode,
    });
    if (args.llmMode === 'required') {
      throw error;
    }
    const csv = generateCsv(deterministic);
    return {
      csv,
      fillPlan: deterministic,
      report: validateFillPlan(args.template, deterministic),
    };
  }

  const mergedEntriesByField = new Map(deterministic.entries.map((entry) => [entry.fieldId, entry]));
  llmResult.fillPlan.entries.forEach((entry) => {
    mergedEntriesByField.set(entry.fieldId, entry);
  });
  const mergedEntries = Array.from(mergedEntriesByField.values());
  const llmResolvedFieldIds = new Set(
    llmResult.fillPlan.entries
      .filter((entry) => entry.confidence >= args.threshold && !entry.unresolvedReason)
      .map((entry) => entry.fieldId),
  );
  const mergedUnresolvedByField = new Map(
    deterministic.unresolved
      .filter((entry) => !llmResolvedFieldIds.has(entry.fieldId))
      .map((entry) => [entry.fieldId, entry]),
  );
  llmResult.fillPlan.unresolved.forEach((entry) => {
    mergedUnresolvedByField.set(entry.fieldId, entry);
  });

  const merged = fillPlanSchema.parse({
    entries: mergedEntries,
    unresolved: Array.from(mergedUnresolvedByField.values()),
    createdAt: llmResult.fillPlan.createdAt,
  });

  return {
    csv: llmResult.csv || generateCsv(merged),
    fillPlan: merged,
    report: validateFillPlan(args.template, merged),
  };
};
