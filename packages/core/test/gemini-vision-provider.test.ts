import { describe, expect, it } from 'vitest';

import { GeminiVisionProvider } from '../src/llm/gemini-vision-provider';

describe('GeminiVisionProvider', () => {
  it('maps checkbox and text answers from JSON response', async () => {
    const client = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({
            answers: [
              { fieldId: 'agree', checked: true, confidence: 0.95 },
              { fieldId: 'name', typedText: 'Ada Lovelace', confidence: 0.92 },
            ],
          }),
        }),
      },
    };
    const provider = new GeminiVisionProvider({
      apiKey: 'test-key',
      client,
    });

    const result = await provider.map({
      template: {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          { fieldId: 'agree', fieldType: 'checkbox', pageIndex: 0, bbox: [0.1, 0.1, 0.1, 0.1] },
          { fieldId: 'name', fieldType: 'text', pageIndex: 0, bbox: [0.2, 0.2, 0.3, 0.1] },
        ],
        createdAt: new Date().toISOString(),
      },
      extracted: {
        pages: [],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.png'],
      },
      unresolvedFieldIds: ['agree', 'name'],
      clientFiles: [{ name: 'raw.png', mime: 'image/png', data: new Uint8Array([1, 2, 3]).buffer }],
    });

    expect(result.fillPlan.entries.find((entry) => entry.fieldId === 'agree')?.value).toBe(true);
    expect(result.fillPlan.entries.find((entry) => entry.fieldId === 'name')?.value).toBe(
      'Ada Lovelace',
    );
    expect(result.fillPlan.entries.find((entry) => entry.fieldId === 'agree')?.source.bboxOrigin).toBe(
      'bottom_left',
    );
  });

  it('retries on HTTP 429 and succeeds on subsequent attempt', async () => {
    let callCount = 0;
    const client = {
      models: {
        generateContent: async () => {
          callCount += 1;
          if (callCount === 1) {
            const err = new Error('rate limited') as Error & { status?: number };
            err.status = 429;
            throw err;
          }
          return {
            text: JSON.stringify({
              answers: [{ fieldId: 'agree', checked: true, confidence: 0.95 }],
            }),
          };
        },
      },
    };
    const provider = new GeminiVisionProvider({
      apiKey: 'test-key',
      retryBaseMs: 1,
      client,
    });

    const result = await provider.map({
      template: {
        templateType: 'flat',
        pageCount: 1,
        fields: [{ fieldId: 'agree', fieldType: 'checkbox', pageIndex: 0, bbox: [0.1, 0.1, 0.1, 0.1] }],
        createdAt: new Date().toISOString(),
      },
      extracted: {
        pages: [],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.png'],
      },
      unresolvedFieldIds: ['agree'],
      clientFiles: [{ name: 'raw.png', mime: 'image/png', data: new Uint8Array([1, 2, 3]).buffer }],
    });

    expect(callCount).toBe(2);
    expect(result.fillPlan.entries[0]?.value).toBe(true);
  });
});
