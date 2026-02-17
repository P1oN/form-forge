import { generateCsv } from '../csv/generate-csv';
import { MappingError } from '../errors';
import { fillPlanSchema } from '../schemas';
import { deterministicMap } from './deterministic-mapper';
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

  const llmResult = await args.llm.map({
    template: args.template,
    extracted: args.extracted,
    unresolvedFieldIds: deterministic.unresolved.map((u) => u.fieldId),
  });

  const merged = fillPlanSchema.parse({
    ...deterministic,
    ...llmResult.fillPlan,
  });

  return {
    csv: llmResult.csv || generateCsv(merged),
    fillPlan: merged,
    report: validateFillPlan(args.template, merged),
  };
};
