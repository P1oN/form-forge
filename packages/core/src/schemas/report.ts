import { z } from 'zod';

export const validationIssueSchema = z
  .object({
    code: z.string().min(1),
    severity: z.enum(['error', 'warning']),
    fieldId: z.string().optional(),
    message: z.string().min(1),
  })
  .strict();

export const validationReportSchema = z
  .object({
    valid: z.boolean(),
    issues: z.array(validationIssueSchema),
    lowConfidenceFields: z.array(
      z
        .object({
          fieldId: z.string().min(1),
          confidence: z.number().min(0).max(1),
        })
        .strict(),
    ),
    unresolvedFields: z.array(z.string()),
    createdAt: z.string().datetime(),
  })
  .strict();
