import type { ErrorCode } from './codes';

export class FormForgeError extends Error {
  public readonly code: ErrorCode;
  public readonly details: Record<string, unknown> | undefined;

  public constructor(
    code: ErrorCode,
    message: string,
    options?: { cause?: unknown; details?: Record<string, unknown> | undefined },
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.code = code;
    this.details = options?.details;
  }
}
