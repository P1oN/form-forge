import type { FillPlan, PipelineProgressEvent, ValidationReport } from '@form-forge/core';

export interface UploadState {
  templateFile?: File | undefined;
  clientFiles: File[];
}

export interface PipelineState {
  running: boolean;
  progress: PipelineProgressEvent[];
  error?: string | undefined;
  result?:
    | {
        pdfBytes: Uint8Array;
        csv: string;
        fillPlan: FillPlan;
        report: ValidationReport;
      }
    | undefined;
}
