import { z } from 'zod';

import { bboxOriginSchema, constraintSchema, fieldTypeSchema, relativeBBoxSchema } from './common';

export const templateFieldSchema = z
  .object({
    fieldId: z.string().min(1),
    labelText: z.string().optional(),
    fieldType: fieldTypeSchema,
    required: z.boolean().optional(),
    constraints: constraintSchema.optional(),
    pageIndex: z.number().int().min(0),
    bbox: relativeBBoxSchema,
    bboxOrigin: bboxOriginSchema.optional(),
    pdfFieldName: z.string().optional(),
  })
  .strict();

export const templateInventorySchema = z
  .object({
    templateType: z.enum(['acroform', 'flat']),
    pageCount: z.number().int().positive(),
    fields: z.array(templateFieldSchema),
    createdAt: z.string().datetime(),
  })
  .strict();

export const templateRegionConfigSchema = z
  .object({
    pageCount: z.number().int().positive().optional(),
    fields: z.array(
      templateFieldSchema
        .omit({ pdfFieldName: true })
        .strict(),
    ),
  })
  .strict();
