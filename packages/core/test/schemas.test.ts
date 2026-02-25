import { describe, expect, it } from 'vitest';

import { extractedBlocksSchema, fillPlanSchema, templateInventorySchema } from '../src/schemas';

describe('schemas', () => {
  it('accepts valid template inventory', () => {
    const parsed = templateInventorySchema.parse({
      templateType: 'flat',
      pageCount: 1,
      fields: [
        {
          fieldId: 'first_name',
          fieldType: 'text',
          pageIndex: 0,
          bbox: [0.1, 0.1, 0.3, 0.05],
        },
      ],
      createdAt: new Date().toISOString(),
    });

    expect(parsed.fields).toHaveLength(1);
  });

  it('rejects invalid bbox', () => {
    expect(() =>
      extractedBlocksSchema.parse({
        pages: [
          {
            pageIndex: 0,
            blocks: [
              {
                text: 'x',
                bbox: [2, 0, 0, 0],
                bboxOrigin: 'top_left',
                confidence: 0.9,
                sourceHint: 'ocr',
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['a'],
      }),
    ).toThrow();
  });

  it('accepts fill plan', () => {
    const parsed = fillPlanSchema.parse({
      entries: [
        {
          fieldId: 'email',
          fieldType: 'email',
          value: 'a@b.com',
          confidence: 0.9,
          source: { pageIndex: 0, sourceHint: 'pdf_text' },
        },
      ],
      unresolved: [],
      createdAt: new Date().toISOString(),
    });
    expect(parsed.entries[0]?.fieldType).toBe('email');
  });
});
