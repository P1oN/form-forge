import type { CacheAdapter, Logger } from './common';
import type { ManualEdit } from './fill-plan';
import type { LLMProvider } from './provider';
import type { TemplateRegionConfig } from './template';

export type PipelinePhase = 'A' | 'B' | 'C' | 'D';

export interface PipelineProgressEvent {
  phase: PipelinePhase;
  percent: number;
  message: string;
  fileName?: string | undefined;
  pageIndex?: number | undefined;
}

export interface PipelineLimits {
  maxFileSizeBytes: number;
  maxPagesPerFile: number;
  maxTotalPages: number;
}

export interface PipelineConfig {
  llmMode: 'disabled' | 'auto' | 'required';
  deterministicThreshold: number;
  limits: PipelineLimits;
  logger?: Logger | undefined;
  templateCache?: CacheAdapter<unknown> | undefined;
  ocrCache?: CacheAdapter<unknown> | undefined;
}

export interface PipelineArgs {
  templatePdf: ArrayBuffer;
  clientFiles: Array<{ name: string; data: ArrayBuffer; mime: string }>;
  templateRegionConfig?: TemplateRegionConfig | undefined;
  llm?: LLMProvider | undefined;
  config?: Partial<PipelineConfig> | undefined;
  manualEdits?: ManualEdit[] | undefined;
  onProgress?: ((event: PipelineProgressEvent) => void) | undefined;
}
