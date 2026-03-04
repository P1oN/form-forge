import { describe, expect, it } from 'vitest';

import { clampPageIndex, resolveFocusedFieldId, resolveNextPageSize, resolvePageEntries } from './PreviewGrid';

describe('resolveFocusedFieldId', () => {
  it('uses hovered field over pinned field', () => {
    expect(resolveFocusedFieldId('hovered', 'pinned')).toBe('hovered');
  });

  it('falls back to pinned field when not hovering', () => {
    expect(resolveFocusedFieldId(undefined, 'pinned')).toBe('pinned');
  });
});

describe('pagination helpers', () => {
  it('clamps page index to valid bounds', () => {
    expect(clampPageIndex(-2, 4)).toBe(0);
    expect(clampPageIndex(9, 4)).toBe(3);
    expect(clampPageIndex(2, 4)).toBe(2);
  });

  it('slices entries based on page index and page size', () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      fieldId: `f${index + 1}`,
      fieldType: 'text' as const,
      value: `${index + 1}`,
      confidence: 1,
      source: { pageIndex: 0, sourceHint: 'ocr' },
    }));
    const page = resolvePageEntries(entries, 1, 4);
    expect(page.map((item) => item.fieldId)).toEqual(['f5', 'f6', 'f7', 'f8']);
  });

  it('accepts only supported page size options', () => {
    expect(resolveNextPageSize('8', 6)).toBe(8);
    expect(resolveNextPageSize('999', 6)).toBe(6);
  });
});
