import { describe, expect, it } from 'vitest';

import { InputValidationError } from '../src/errors';
import { validateClientFiles } from '../src/extraction/input-validation';

describe('validateClientFiles', () => {
  const limits = {
    maxFileSizeBytes: 10,
    maxPagesPerFile: 10,
    maxTotalPages: 10,
  };

  it('throws on unsupported mime', () => {
    expect(() =>
      validateClientFiles([{ name: 'x.txt', data: new ArrayBuffer(1), mime: 'text/plain' }], limits),
    ).toThrow(InputValidationError);
  });

  it('throws on oversized file', () => {
    expect(() =>
      validateClientFiles(
        [{ name: 'x.pdf', data: new Uint8Array(11).buffer, mime: 'application/pdf' }],
        limits,
      ),
    ).toThrow(InputValidationError);
  });
});
