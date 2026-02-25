export type RelativeBBox = [number, number, number, number];
export type BBoxOrigin = 'top_left' | 'bottom_left';

export type FieldType =
  | 'text'
  | 'multiline'
  | 'number'
  | 'date'
  | 'email'
  | 'phone'
  | 'checkbox'
  | 'radio'
  | 'signature'
  | 'initials'
  | 'unknown';

export interface ConstraintSpec {
  maxLength?: number | undefined;
  min?: number | undefined;
  max?: number | undefined;
  pattern?: string | undefined;
  options?: string[] | undefined;
}

export interface SourceRef {
  pageIndex: number;
  bbox?: RelativeBBox | undefined;
  bboxOrigin?: BBoxOrigin | undefined;
  sourceHint: string;
}

export interface CacheAdapter<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T): Promise<void>;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown> | undefined): void;
  info(message: string, meta?: Record<string, unknown> | undefined): void;
  warn(message: string, meta?: Record<string, unknown> | undefined): void;
  error(message: string, meta?: Record<string, unknown> | undefined): void;
}
