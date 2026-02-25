import { describe, expect, it } from 'vitest';

import { computePreviewDrawY } from './SourcePreview';

describe('computePreviewDrawY', () => {
  it('uses top-left coordinates by default', () => {
    expect(computePreviewDrawY(0.25, 0.1, undefined)).toBeCloseTo(0.25);
    expect(computePreviewDrawY(0.25, 0.1, 'top_left')).toBeCloseTo(0.25);
  });

  it('converts bottom-left coordinates for canvas rendering', () => {
    expect(computePreviewDrawY(0.2, 0.3, 'bottom_left')).toBeCloseTo(0.5);
  });
});

