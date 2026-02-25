import { z } from 'zod';

import { bboxOriginSchema, relativeBBoxSchema } from './common';

export const extractedBlockSchema = z
  .object({
    text: z.string(),
    bbox: relativeBBoxSchema,
    bboxOrigin: bboxOriginSchema,
    confidence: z.number().min(0).max(1),
    sourceHint: z.enum(['pdf_text', 'ocr', 'manual']),
  })
  .strict();

export const extractedBlocksSchema = z
  .object({
    pages: z.array(
      z
        .object({
          pageIndex: z.number().int().min(0),
          blocks: z.array(extractedBlockSchema),
        })
        .strict(),
    ),
    createdAt: z.string().datetime(),
    filesProcessed: z.array(z.string()),
  })
  .strict();
