import { z } from 'zod';

export const relativeBBoxSchema = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .superRefine((value, ctx) => {
    value.forEach((v, idx) => {
      if (v < 0 || v > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `bbox index ${idx} must be in range [0,1]`,
        });
      }
    });
  });

export const bboxOriginSchema = z.enum(['top_left', 'bottom_left']);

export const fieldTypeSchema = z.enum([
  'text',
  'multiline',
  'number',
  'date',
  'email',
  'phone',
  'checkbox',
  'radio',
  'signature',
  'initials',
  'unknown',
]);

export const constraintSchema = z
  .object({
    maxLength: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    options: z.array(z.string()).optional(),
  })
  .strict();
