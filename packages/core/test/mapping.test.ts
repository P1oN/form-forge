import { describe, expect, it } from 'vitest';

import { deterministicMap } from '../src/mapping/deterministic-mapper';

describe('deterministicMap', () => {
  it('maps by label similarity and normalizes email', () => {
    const result = deterministicMap(
      {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          {
            fieldId: 'email',
            labelText: 'Email Address',
            fieldType: 'email',
            pageIndex: 0,
            bbox: [0.1, 0.1, 0.3, 0.1],
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        pages: [
          {
            pageIndex: 0,
            blocks: [
              {
                text: 'EMAIL ADDRESS: USER@EXAMPLE.COM',
                bbox: [0.12, 0.11, 0.35, 0.08],
                confidence: 0.98,
                sourceHint: 'ocr',
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['f1'],
      },
      0.2,
    );

    expect(result.entries[0]?.value).toContain('user@example.com');
    expect(result.unresolved).toHaveLength(0);
  });

  it('marks ambiguous dates unresolved', () => {
    const result = deterministicMap(
      {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          {
            fieldId: 'birth_date',
            labelText: 'Birth Date',
            fieldType: 'date',
            pageIndex: 0,
            bbox: [0.1, 0.1, 0.3, 0.1],
          },
        ],
        createdAt: new Date().toISOString(),
      },
      {
        pages: [
          {
            pageIndex: 0,
            blocks: [
              {
                text: '01/02/2024',
                bbox: [0.12, 0.11, 0.35, 0.08],
                confidence: 0.9,
                sourceHint: 'ocr',
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['f1'],
      },
      0.1,
    );

    expect(result.unresolved[0]?.fieldId).toBe('birth_date');
  });
});
