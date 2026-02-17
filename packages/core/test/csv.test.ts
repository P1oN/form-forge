import { describe, expect, it } from 'vitest';

import { generateCsv } from '../src/csv/generate-csv';

describe('generateCsv', () => {
  it('produces RFC4180-compliant escaping', () => {
    const csv = generateCsv({
      entries: [
        {
          fieldId: 'name',
          fieldType: 'text',
          value: 'Doe, "John"',
          confidence: 0.94,
          source: { pageIndex: 0, sourceHint: 'ocr', bbox: [0.1, 0.1, 0.2, 0.1] },
        },
      ],
      unresolved: [],
      createdAt: new Date().toISOString(),
    });

    expect(csv).toContain('"Doe, ""John"""');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});
