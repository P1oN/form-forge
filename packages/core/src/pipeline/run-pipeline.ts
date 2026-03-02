import { MemoryCacheAdapter } from '../cache/memory-cache';
import { PipelineError } from '../errors';
import { extractClientData } from '../extraction/extract-client-data';
import { applyManualEdits } from '../fill/apply-manual-edits';
import { fillPdf } from '../fill/fill-pdf';
import { mapToTemplate } from '../mapping/map-to-template';
import { resolvePipelineConfig } from '../pipeline/config';
import { analyzeTemplate } from '../template/analyze-template';
import type { FillPlan } from '../types/fill-plan';
import type { PipelineArgs } from '../types/pipeline';
import { hashBytes } from '../utils/hash';
import { normalizePdfArrayBuffer } from '../utils/pdf-bytes';

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
    config.logger?.info('Pipeline started', {
      clientFiles: args.clientFiles.length,
      llmMode: config.llmMode,
    });
    args.onProgress?.({ phase: 'A', percent: 5, message: 'Analyzing template' });
    const cloneBuffer = (buffer: ArrayBuffer): ArrayBuffer => buffer.slice(0);
    const cloneClientFiles = (
      files: Array<{ name: string; data: ArrayBuffer; mime: string }>,
    ): Array<{ name: string; data: ArrayBuffer; mime: string }> =>
      files.map((file) => ({
        ...file,
        data: cloneBuffer(file.data),
      }));

    const templatePdf = normalizePdfArrayBuffer(cloneBuffer(args.templatePdf));
    const extractionFiles = cloneClientFiles(args.clientFiles).map((file) =>
      file.mime === 'application/pdf'
        ? { ...file, data: normalizePdfArrayBuffer(file.data) }
        : file,
    );
    const llmFiles = cloneClientFiles(args.clientFiles);

    const templateHash = await hashBytes(templatePdf);
    const cachedTemplate = (await config.templateCache.get(templateHash)) as
      | Awaited<ReturnType<typeof analyzeTemplate>>
      | undefined;

    const template = cachedTemplate ?? (await analyzeTemplate(templatePdf, args.templateRegionConfig));
    config.logger?.info('Template analysis completed', {
      cached: Boolean(cachedTemplate),
      templateType: template.templateType,
      pageCount: template.pageCount,
      fields: template.fields.length,
    });

    if (!cachedTemplate) {
      await config.templateCache.set(templateHash, template);
    }

    args.onProgress?.({ phase: 'B', percent: 35, message: 'Extracting client document data' });

    const extracted = await extractClientData(extractionFiles, {
      config,
      ...(args.ocrEngine ? { ocrEngine: args.ocrEngine } : {}),
    });
    config.logger?.info('Extraction completed', {
      pages: extracted.pages.length,
      filesProcessed: extracted.filesProcessed.length,
    });

    args.onProgress?.({ phase: 'C', percent: 65, message: 'Mapping extracted data to template' });

    const mapped = await mapToTemplate({
      template,
      extracted,
      threshold: config.deterministicThreshold,
      llmMode: config.llmMode,
      logger: config.logger,
      clientFiles: llmFiles,
      ...(args.llm ? { llm: args.llm } : {}),
    });
    config.logger?.info('Mapping completed', {
      entries: mapped.fillPlan.entries.length,
      unresolved: mapped.fillPlan.unresolved.length,
    });

    const fillPlan: FillPlan = args.manualEdits?.length
      ? applyManualEdits(mapped.fillPlan, args.manualEdits, template.fields)
      : mapped.fillPlan;

    args.onProgress?.({ phase: 'D', percent: 85, message: 'Generating filled PDF' });

    const pdfBytes = await fillPdf(templatePdf, fillPlan);
    config.logger?.info('PDF fill completed', {
      outputBytes: pdfBytes.byteLength,
      entries: fillPlan.entries.length,
    });

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
    config.logger?.error('Pipeline failed', { reason });
    throw new PipelineError(`Pipeline execution failed: ${reason}`, undefined, error);
  }
};
