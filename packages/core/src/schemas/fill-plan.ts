import { z } from 'zod';

import { fieldTypeSchema, relativeBBoxSchema } from './common';

export const fillPlanEntrySchema = z
  .object({
    fieldId: z.string().min(1),
    fieldType: fieldTypeSchema,
    value: z.union([z.string(), z.boolean()]),
    confidence: z.number().min(0).max(1),
    source: z
      .object({
        pageIndex: z.number().int().min(0),
        bbox: relativeBBoxSchema.optional(),
        sourceHint: z.string().min(1),
      })
      .strict(),
    targetPdfFieldName: z.string().optional(),
    unresolvedReason: z.string().optional(),
  })
  .strict();

export const fillPlanSchema = z
  .object({
    entries: z.array(fillPlanEntrySchema),
    unresolved: z.array(
      z
        .object({
          fieldId: z.string().min(1),
          reason: z.string().min(1),
          confidence: z.number().min(0).max(1),
        })
        .strict(),
    ),
    createdAt: z.string().datetime(),
  })
  .strict();
