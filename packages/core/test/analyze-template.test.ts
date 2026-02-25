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

  it('detects checkbox and radio field types from acroform field classes', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([400, 400]);
    const form = doc.getForm();

    const checkbox = form.createCheckBox('agreement_accept');
    checkbox.addToPage(page, { x: 50, y: 300, width: 18, height: 18 });

    const radio = form.createRadioGroup('contact_method');
    radio.addOptionToPage('email', page, { x: 80, y: 300, width: 18, height: 18 });

    const text = form.createTextField('date_of_birth');
    text.addToPage(page, { x: 50, y: 250, width: 120, height: 18 });

    const analyzed = await analyzeTemplate(await doc.save());

    expect(analyzed.templateType).toBe('acroform');

    const byName = new Map(analyzed.fields.map((field) => [field.pdfFieldName, field.fieldType]));
    expect(byName.get('agreement_accept')).toBe('checkbox');
    expect(byName.get('contact_method')).toBe('radio');
    expect(byName.get('date_of_birth')).toBe('date');
  });
});
