import type { Logger } from '../types/common';

const redactString = (value: string): string => {
  if (value.length <= 4) {
    return '***';
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
};

const redactMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!meta) {
    return undefined;
  }

  const copy: Record<string, unknown> = {};
  Object.entries(meta).forEach(([k, v]) => {
    if (typeof v === 'string' && /(name|email|phone|ssn|address|text|value)/i.test(k)) {
      copy[k] = redactString(v);
      return;
    }
    copy[k] = v;
  });
  return copy;
};

export const defaultLogger: Logger = {
  debug(message, meta) {
    console.debug(message, redactMeta(meta));
  },
  info(message, meta) {
    console.info(message, redactMeta(meta));
  },
  warn(message, meta) {
    console.warn(message, redactMeta(meta));
  },
  error(message, meta) {
    console.error(message, redactMeta(meta));
  },
};
