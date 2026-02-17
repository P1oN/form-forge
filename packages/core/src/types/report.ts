export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  fieldId?: string | undefined;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
  lowConfidenceFields: Array<{
    fieldId: string;
    confidence: number;
  }>;
  unresolvedFields: string[];
  createdAt: string;
}
