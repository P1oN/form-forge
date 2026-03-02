import { describe, expect, it } from 'vitest';

import { applyManualEdits } from '../src/fill/apply-manual-edits';

describe('applyManualEdits', () => {
  it('updates values and clears unresolved item for edited fields', () => {
    const updated = applyManualEdits(
      {
        entries: [
          {
            fieldId: 'full_name',
            fieldType: 'text',
            value: '',
            confidence: 0.2,
            source: { pageIndex: 0, sourceHint: 'ocr' },
          },
        ],
        unresolved: [{ fieldId: 'full_name', reason: 'low confidence', confidence: 0.2 }],
        createdAt: new Date().toISOString(),
      },
      [{ fieldId: 'full_name', value: 'Ada' }],
    );

    expect(updated.entries[0]?.value).toBe('Ada');
    expect(updated.unresolved).toHaveLength(0);
  });

  it('creates new checkbox and text entries from template metadata when unresolved had no entries', () => {
    const updated = applyManualEdits(
      {
        entries: [],
        unresolved: [
          { fieldId: 'agree_terms', reason: 'No extraction blocks available.', confidence: 0 },
          { fieldId: 'full_name', reason: 'No extraction blocks available.', confidence: 0 },
        ],
        createdAt: new Date().toISOString(),
      },
      [
        { fieldId: 'agree_terms', value: true },
        { fieldId: 'full_name', value: 'Ada Lovelace' },
      ],
      [
        {
          fieldId: 'agree_terms',
          fieldType: 'checkbox',
          pageIndex: 0,
          bbox: [0.1, 0.1, 0.05, 0.05],
          bboxOrigin: 'bottom_left',
          pdfFieldName: 'agree_terms',
        },
        {
          fieldId: 'full_name',
          fieldType: 'text',
          pageIndex: 0,
          bbox: [0.2, 0.2, 0.3, 0.05],
          bboxOrigin: 'bottom_left',
          pdfFieldName: 'full_name',
        },
      ],
    );

    expect(updated.entries).toHaveLength(2);
    expect(updated.entries.find((entry) => entry.fieldId === 'agree_terms')).toMatchObject({
      fieldType: 'checkbox',
      value: true,
      targetPdfFieldName: 'agree_terms',
      source: { sourceHint: 'manual_review', pageIndex: 0 },
    });
    expect(updated.entries.find((entry) => entry.fieldId === 'full_name')).toMatchObject({
      fieldType: 'text',
      value: 'Ada Lovelace',
      targetPdfFieldName: 'full_name',
      source: { sourceHint: 'manual_review', pageIndex: 0 },
    });
    expect(updated.unresolved).toHaveLength(0);
  });

  it('keeps unresolved item when edited field is missing from template metadata', () => {
    const updated = applyManualEdits(
      {
        entries: [],
        unresolved: [{ fieldId: 'missing_field', reason: 'No extraction blocks available.', confidence: 0 }],
        createdAt: new Date().toISOString(),
      },
      [{ fieldId: 'missing_field', value: 'value' }],
      [],
    );

    expect(updated.entries).toHaveLength(0);
    expect(updated.unresolved).toHaveLength(1);
    expect(updated.unresolved[0]?.fieldId).toBe('missing_field');
  });
});
