import { describe, expect, it } from 'vitest';

import { buildManualEditsPayload, resolveManualInputType, resolvePreviewBBoxOrigin } from './HumanReviewPanel';

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

describe('resolveManualInputType', () => {
  it('returns checkbox when either entry or template field is checkbox', () => {
    const checkboxFromEntry = resolveManualInputType(
      'agree',
      new Map([
        [
          'agree',
          {
            fieldId: 'agree',
            fieldType: 'checkbox',
            value: false,
            confidence: 1,
            source: { pageIndex: 0, sourceHint: 'manual' },
          },
        ],
      ]),
      new Map(),
    );
    expect(checkboxFromEntry).toBe('checkbox');

    const checkboxFromTemplate = resolveManualInputType(
      'agree',
      new Map(),
      new Map([['agree', { fieldId: 'agree', fieldType: 'checkbox', pageIndex: 0, bbox: [0, 0, 1, 1] }]]),
    );
    expect(checkboxFromTemplate).toBe('checkbox');
  });

  it('returns text for non-checkbox fields', () => {
    const type = resolveManualInputType(
      'name',
      new Map([
        [
          'name',
          {
            fieldId: 'name',
            fieldType: 'text',
            value: '',
            confidence: 0.2,
            source: { pageIndex: 0, sourceHint: 'ocr' },
          },
        ],
      ]),
      new Map(),
    );
    expect(type).toBe('text');
  });
});

describe('manual edit payload shaping', () => {
  it('emits boolean payload for changed checkbox edits', () => {
    const payload = buildManualEditsPayload({
      edits: { agree: true },
      entryByFieldId: new Map([
        [
          'agree',
          {
            fieldId: 'agree',
            fieldType: 'checkbox',
            value: false,
            confidence: 1,
            source: { pageIndex: 0, sourceHint: 'manual' },
          },
        ],
      ]),
      templateFieldById: new Map(),
      presumableValueByFieldId: { agree: false },
    });
    expect(payload).toEqual([{ fieldId: 'agree', value: true }]);
  });

  it('emits string payload for non-empty text edits', () => {
    const payload = buildManualEditsPayload({
      edits: { full_name: 'Ada Lovelace' },
      entryByFieldId: new Map([
        [
          'full_name',
          {
            fieldId: 'full_name',
            fieldType: 'text',
            value: '',
            confidence: 0.4,
            source: { pageIndex: 0, sourceHint: 'ocr' },
          },
        ],
      ]),
      templateFieldById: new Map(),
      presumableValueByFieldId: { full_name: '' },
    });
    expect(payload).toEqual([{ fieldId: 'full_name', value: 'Ada Lovelace' }]);
  });

  it('emits checkbox payload even when unresolved field has no prior entry', () => {
    const payload = buildManualEditsPayload({
      edits: { agree: true },
      entryByFieldId: new Map(),
      templateFieldById: new Map([
        ['agree', { fieldId: 'agree', fieldType: 'checkbox', pageIndex: 0, bbox: [0, 0, 1, 1] }],
      ]),
      presumableValueByFieldId: {},
    });
    expect(payload).toEqual([{ fieldId: 'agree', value: true }]);
  });
});
