import { FormForgeError } from './base-error';
import { ErrorCode } from './codes';

export class InputValidationError extends FormForgeError {
  public constructor(message: string, details?: Record<string, unknown> | undefined) {
    super(ErrorCode.INPUT_VALIDATION, message, { details });
  }
}

export class PdfParseError extends FormForgeError {
  public constructor(message: string, cause?: unknown) {
    super(ErrorCode.PDF_PARSE, message, { cause });
  }
}

export class OcrError extends FormForgeError {
  public constructor(message: string, cause?: unknown) {
    super(ErrorCode.OCR, message, { cause });
  }
}

export class MappingError extends FormForgeError {
  public constructor(message: string, cause?: unknown) {
    super(ErrorCode.MAPPING, message, { cause });
  }
}

export class FillError extends FormForgeError {
  public constructor(message: string, cause?: unknown) {
    super(ErrorCode.FILL, message, { cause });
  }
}

export class ValidationError extends FormForgeError {
  public constructor(message: string, details?: Record<string, unknown> | undefined) {
    super(ErrorCode.VALIDATION, message, { details });
  }
}

export class ConfigError extends FormForgeError {
  public constructor(message: string) {
    super(ErrorCode.CONFIG, message);
  }
}

export class PipelineError extends FormForgeError {
  public constructor(message: string, details?: Record<string, unknown> | undefined, cause?: unknown) {
    super(ErrorCode.PIPELINE, message, { details, cause });
  }
}
