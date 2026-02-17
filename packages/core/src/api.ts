import { extractClientData as extractImpl } from './extraction/extract-client-data';
import { fillPdf as fillImpl } from './fill/fill-pdf';
import { mapToTemplate as mapImpl } from './mapping/map-to-template';
import { resolvePipelineConfig } from './pipeline/config';
import { runPipeline as runPipelineImpl } from './pipeline/run-pipeline';
import { analyzeTemplate as analyzeImpl } from './template/analyze-template';
import type { ExtractedBlocks } from './types/extraction';
import type { FillPlan } from './types/fill-plan';
import type { LLMProvider } from './types/provider';
import type { ValidationReport } from './types/report';
import type { TemplateInventory, TemplateRegionConfig } from './types/template';

export const analyzeTemplate = async (
  templatePdf: ArrayBuffer,
  regionConfig?: TemplateRegionConfig,
): Promise<TemplateInventory> => analyzeImpl(templatePdf, regionConfig);

export const extractClientData = async (
  files: Array<{ name: string; data: ArrayBuffer; mime: string }>,
): Promise<ExtractedBlocks> => {
  const config = resolvePipelineConfig();
  return extractImpl(files, { config });
};

export const mapToTemplate = async (args: {
  template: TemplateInventory;
  extracted: ExtractedBlocks;
  llm?: LLMProvider | undefined;
}): Promise<{ csv: string; fillPlan: FillPlan; report: ValidationReport }> => {
  const config = resolvePipelineConfig();
  return mapImpl({
    template: args.template,
    extracted: args.extracted,
    llmMode: config.llmMode,
    threshold: config.deterministicThreshold,
    ...(args.llm ? { llm: args.llm } : {}),
  });
};

export const fillPdf = async (templatePdf: ArrayBuffer, fillPlan: FillPlan): Promise<Uint8Array> =>
  fillImpl(templatePdf, fillPlan);

export const runPipeline = runPipelineImpl;
