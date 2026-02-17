import { InputValidationError } from '../errors';
import type { PipelineLimits } from '../types/pipeline';

const SUPPORTED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export const validateClientFiles = (
  files: Array<{ name: string; data: ArrayBuffer; mime: string }>,
  limits: PipelineLimits,
): void => {
  if (files.length === 0) {
    throw new InputValidationError('At least one client document must be provided.');
  }

  files.forEach((file) => {
    if (!SUPPORTED_MIME.has(file.mime)) {
      throw new InputValidationError(`Unsupported mime type: ${file.mime}`, { fileName: file.name });
    }
    if (file.data.byteLength > limits.maxFileSizeBytes) {
      throw new InputValidationError('File exceeds configured maxFileSizeBytes limit.', {
        fileName: file.name,
        size: file.data.byteLength,
      });
    }
  });
};
