import { describe, expect, it } from 'vitest';

import { resolvePreviewBBoxOrigin } from './HumanReviewPanel';

describe('resolvePreviewBBoxOrigin', () => {
  it('uses focused entry origin first', () => {
    const origin = resolvePreviewBBoxOrigin(
      {
        fieldId: 'f1',
        fieldType: 'text',
        value: 'x',
        confidence: 1,
        source: { pageIndex: 0, sourceHint: 'ocr', bboxOrigin: 'bottom_left' },
      },
      { fieldId: 'f1', fieldType: 'text', pageIndex: 0, bbox: [0, 0, 1, 1], bboxOrigin: 'top_left' },
      undefined,
      undefined,
    );

    expect(origin).toBe('bottom_left');
  });

  it('falls back through template and selected entries, then top_left default', () => {
    expect(
      resolvePreviewBBoxOrigin(
        undefined,
        { fieldId: 'f1', fieldType: 'text', pageIndex: 0, bbox: [0, 0, 1, 1], bboxOrigin: 'bottom_left' },
        { fieldId: 'f1', fieldType: 'text', value: 'x', confidence: 1, source: { pageIndex: 0, sourceHint: 'ocr' } },
        undefined,
      ),
    ).toBe('bottom_left');

    expect(
      resolvePreviewBBoxOrigin(
        undefined,
        undefined,
        { fieldId: 'f1', fieldType: 'text', value: 'x', confidence: 1, source: { pageIndex: 0, sourceHint: 'ocr' } },
        { fieldId: 'f1', fieldType: 'text', pageIndex: 0, bbox: [0, 0, 1, 1], bboxOrigin: 'bottom_left' },
      ),
    ).toBe('bottom_left');

    expect(resolvePreviewBBoxOrigin(undefined, undefined, undefined, undefined)).toBe('top_left');
  });
});

