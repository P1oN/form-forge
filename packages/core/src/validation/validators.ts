export const isPlausibleEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isPlausiblePhone = (value: string): boolean => /^\+?[0-9]{7,15}$/.test(value.replace(/\s+/g, ''));

export const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);
