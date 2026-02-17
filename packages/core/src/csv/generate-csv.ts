import type { FillPlan } from '../types/fill-plan';

const escapeCsv = (value: string): string => {
  const mustQuote = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
};

export const generateCsv = (plan: FillPlan): string => {
  const header = 'field_id,value,confidence,source,page_index,bbox';
  const rows = plan.entries.map((entry) => {
    const bbox = entry.source.bbox ? entry.source.bbox.join('|') : '';
    const value = typeof entry.value === 'boolean' ? String(entry.value) : entry.value;
    return [
      escapeCsv(entry.fieldId),
      escapeCsv(value),
      escapeCsv(entry.confidence.toFixed(4)),
      escapeCsv(entry.source.sourceHint),
      escapeCsv(String(entry.source.pageIndex)),
      escapeCsv(bbox),
    ].join(',');
  });

  return `${header}\r\n${rows.join('\r\n')}\r\n`;
};
