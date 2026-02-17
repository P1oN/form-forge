import { describe, expect, it } from 'vitest';

import { MockLLMProvider } from '../src/llm/mock-provider';
import { mapToTemplate } from '../src/mapping/map-to-template';

describe('LLM fallback', () => {
  it('uses mock llm when unresolved fields remain and mode is auto', async () => {
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
            blocks: [{ text: 'N/A', bbox: [0.1, 0.2, 0.2, 0.05], confidence: 0.8, sourceHint: 'ocr' }],
          },
        ],
        createdAt: new Date().toISOString(),
        filesProcessed: ['raw.pdf'],
      },
      threshold: 0.95,
      llmMode: 'auto',
      llm: new MockLLMProvider(),
    });

    expect(result.fillPlan.entries[0]?.value).toBe('[LLM_REVIEW_REQUIRED]');
  });
});
