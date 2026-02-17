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
});
