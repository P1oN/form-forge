const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeDate = (input: string): { value?: string; unresolved?: string } => {
  const trimmed = input.trim();
  if (ISO_DATE_RE.test(trimmed)) {
    return { value: trimmed };
  }

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) {
    return { unresolved: 'Date format is ambiguous or invalid.' };
  }

  const first = Number(dmy[1]);
  const second = Number(dmy[2]);
  const year = Number(dmy[3]);

  if (first > 12 && second <= 12) {
    return { value: `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}` };
  }
  if (second > 12 && first <= 12) {
    return { value: `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}` };
  }

  return { unresolved: 'Date cannot be normalized unambiguously.' };
};

export const normalizePhone = (input: string): string => input.replace(/[^\d+]/g, '');

export const normalizeEmail = (input: string): string => input.trim().toLowerCase();
