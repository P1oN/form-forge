import { MemoryCacheAdapter } from '../cache/memory-cache';
import { PipelineError } from '../errors';
import { extractClientData } from '../extraction/extract-client-data';
import { applyManualEdits } from '../fill/apply-manual-edits';
import { fillPdf } from '../fill/fill-pdf';
import { mapToTemplate } from '../mapping/map-to-template';
import { resolvePipelineConfig } from '../pipeline/config';
import { analyzeTemplate } from '../template/analyze-template';
import type { PipelineArgs } from '../types/pipeline';
import { hashBytes } from '../utils/hash';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

export const runPipeline = async (args: PipelineArgs) => {
  const config = resolvePipelineConfig(args.config);

  if (!config.templateCache) {
    config.templateCache = new MemoryCacheAdapter();
  }
  if (!config.ocrCache) {
    config.ocrCache = new MemoryCacheAdapter();
  }

  try {
    args.onProgress?.({ phase: 'A', percent: 5, message: 'Analyzing template' });

    const templateHash = await hashBytes(args.templatePdf);
    const cachedTemplate = (await config.templateCache.get(templateHash)) as
      | Awaited<ReturnType<typeof analyzeTemplate>>
      | undefined;

    const template =
      cachedTemplate ?? (await analyzeTemplate(args.templatePdf, args.templateRegionConfig));

    if (!cachedTemplate) {
      await config.templateCache.set(templateHash, template);
    }

    args.onProgress?.({ phase: 'B', percent: 35, message: 'Extracting client document data' });

    const extracted = await extractClientData(args.clientFiles, {
      config,
    });

    args.onProgress?.({ phase: 'C', percent: 65, message: 'Mapping extracted data to template' });

    const mapped = await mapToTemplate({
      template,
      extracted,
      threshold: config.deterministicThreshold,
      llmMode: config.llmMode,
      ...(args.llm ? { llm: args.llm } : {}),
    });

    const fillPlan = args.manualEdits?.length
      ? applyManualEdits(mapped.fillPlan, args.manualEdits)
      : mapped.fillPlan;

    args.onProgress?.({ phase: 'D', percent: 85, message: 'Generating filled PDF' });

    const pdfBytes = await fillPdf(args.templatePdf, fillPlan);

    args.onProgress?.({ phase: 'D', percent: 100, message: 'Completed pipeline run' });

    return {
      pdfBytes,
      csv: mapped.csv,
      fillPlan,
      report: mapped.report,
      template,
      extracted,
    };
  } catch (error) {
    const reason = getErrorMessage(error);
    throw new PipelineError(`Pipeline execution failed: ${reason}`, undefined, error);
  }
};
