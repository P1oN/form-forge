import { describe, expect, it } from 'vitest';

import { MappingError } from '../src/errors';
import { GeminiVisionProvider } from '../src/llm/gemini-vision-provider';
import { MockLLMProvider } from '../src/llm/mock-provider';
import { mapToTemplate } from '../src/mapping/map-to-template';
import type { LLMMappingResult, LLMProvider } from '../src/types/provider';

describe('LLM fallback', () => {
  it('uses mock llm when unresolved fields remain and mode is auto', async () => {
    const result = await mapToTemplate({
      template: {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          {
            fieldId: 'full_name',
            labelText: 'Full Name',
            fieldType: 'text',
            pageIndex: 0,
            bbox: [0.1, 0.1, 0.2, 0.05],
          },
          {
            fieldId: 'signature',
            labelText: 'Signature',
            fieldType: 'signature',
            pageIndex: 0,
            bbox: [0.1, 0.2, 0.2, 0.05],
          },
        ],
        createdAt: new Date().toISOString(),
      },
      extracted: {
        pages: [
          {
            pageIndex: 0,
            blocks: [
              {
                text: 'Ada Lovelace',
                bbox: [0.1, 0.1, 0.2, 0.05],
                bboxOrigin: 'top_left',
                confidence: 0.95,
                sourceHint: 'ocr',
              },
              {
                text: 'N/A',
                bbox: [0.1, 0.2, 0.2, 0.05],
                bboxOrigin: 'top_left',
                confidence: 0.8,
                sourceHint: 'ocr',
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.pdf'],
      },
      threshold: 0.9,
      llmMode: 'auto',
      llm: new MockLLMProvider(),
    });

    expect(result.fillPlan.entries.some((entry) => entry.fieldId === 'full_name')).toBe(true);
    expect(result.fillPlan.entries.find((entry) => entry.fieldId === 'signature')?.value).toBe(
      '[LLM_REVIEW_REQUIRED]',
    );
  });
});

class ThrowingLlm implements LLMProvider {
  public readonly name = 'throwing';

  public async map(args: {
    unresolvedFieldIds: string[];
  }): Promise<LLMMappingResult> {
    void args;
    throw new MappingError('rate limited');
  }
}

describe('LLM fallback error handling', () => {
  it('falls back to deterministic result when llm fails in auto mode', async () => {
    const result = await mapToTemplate({
      template: {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          {
            fieldId: 'signature',
            labelText: 'Signature',
            fieldType: 'signature',
            pageIndex: 0,
            bbox: [0.1, 0.2, 0.2, 0.05],
          },
        ],
        createdAt: new Date().toISOString(),
      },
      extracted: {
        pages: [
          {
            pageIndex: 0,
            blocks: [
              {
                text: 'N/A',
                bbox: [0.1, 0.2, 0.2, 0.05],
                bboxOrigin: 'top_left',
                confidence: 0.8,
                sourceHint: 'ocr',
              },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.pdf'],
      },
      threshold: 0.95,
      llmMode: 'auto',
      llm: new ThrowingLlm(),
    });

    expect(result.fillPlan.unresolved.length).toBeGreaterThan(0);
    expect(result.fillPlan.entries[0]?.value).toBe('N/A');
  });

  it('merges salvaged Gemini checkbox answers even when another answer is malformed', async () => {
    const gemini = new GeminiVisionProvider({
      apiKey: 'test-key',
      client: {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              answers: [{ fieldId: 'agree', checked: 'yes', confidence: 0.91 }, { typedText: 'missing field id' }],
            }),
          }),
        },
      },
    });

    const result = await mapToTemplate({
      template: {
        templateType: 'flat',
        pageCount: 1,
        fields: [
          {
            fieldId: 'agree',
            labelText: 'Agree',
            fieldType: 'checkbox',
            pageIndex: 0,
            bbox: [0.1, 0.1, 0.05, 0.05],
          },
          {
            fieldId: 'full_name',
            labelText: 'Full Name',
            fieldType: 'text',
            pageIndex: 0,
            bbox: [0.2, 0.2, 0.2, 0.05],
          },
        ],
        createdAt: new Date().toISOString(),
      },
      extracted: {
        pages: [],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.pdf'],
      },
      threshold: 0.8,
      llmMode: 'auto',
      llm: gemini,
      clientFiles: [{ name: 'raw.pdf', mime: 'application/pdf', data: new Uint8Array([1, 2, 3]).buffer }],
    });

    expect(result.fillPlan.entries.find((entry) => entry.fieldId === 'agree')?.value).toBe(true);
    expect(result.fillPlan.unresolved.some((item) => item.fieldId === 'full_name')).toBe(true);
  });
});
