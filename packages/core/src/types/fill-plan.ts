import type { FieldType, SourceRef } from './common';

export interface FillPlanEntry {
  fieldId: string;
  fieldType: FieldType;
  value: string | boolean;
  confidence: number;
  source: SourceRef;
  targetPdfFieldName?: string | undefined;
  unresolvedReason?: string | undefined;
}

export interface FillPlan {
  entries: FillPlanEntry[];
  unresolved: Array<{
    fieldId: string;
    reason: string;
    confidence: number;
  }>;
  createdAt: string;
}

export interface ManualEdit {
  fieldId: string;
  value: string | boolean;
}
