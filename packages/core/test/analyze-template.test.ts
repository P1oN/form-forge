import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { analyzeTemplate } from '../src/template/analyze-template';

const withLeadingBytes = (pdf: ArrayBuffer, count = 552): ArrayBuffer => {
  const src = new Uint8Array(pdf);
  const dst = new Uint8Array(count + src.byteLength);
  dst.set(src, count);
  return dst.buffer;
};

describe('analyzeTemplate', () => {
  it('parses PDF when ArrayBuffer has leading bytes before the PDF header', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([400, 400]);

    const analyzed = await analyzeTemplate(withLeadingBytes(await doc.save()));

    expect(analyzed.pageCount).toBe(1);
    expect(analyzed.templateType).toBe('flat');
  });
});
