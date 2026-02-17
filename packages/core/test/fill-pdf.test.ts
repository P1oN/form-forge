import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { fillPdf } from '../src/fill/fill-pdf';

const createAcroPdf = async (): Promise<ArrayBuffer> => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  const form = doc.getForm();
  const field = form.createTextField('full_name');
  field.addToPage(page, { x: 100, y: 700, width: 200, height: 20 });
  return doc.save();
};

const withLeadingBytes = (pdf: ArrayBuffer, count = 552): ArrayBuffer => {
  const src = new Uint8Array(pdf);
  const dst = new Uint8Array(count + src.byteLength);
  dst.set(src, count);
  return dst.buffer;
};

describe('fillPdf', () => {
  it('fills acroform fields', async () => {
    const pdf = await createAcroPdf();

    const filled = await fillPdf(pdf, {
      entries: [
        {
          fieldId: 'full_name',
          fieldType: 'text',
          value: 'Ada Lovelace',
          confidence: 1,
          source: { pageIndex: 0, sourceHint: 'manual' },
          targetPdfFieldName: 'full_name',
        },
      ],
      unresolved: [],
      createdAt: new Date().toISOString(),
    });

    const loaded = await PDFDocument.load(filled);
    const form = loaded.getForm();
    expect(form.getTextField('full_name').getText()).toBe('Ada Lovelace');
  });

  it('fills flat pdf by drawing text', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([500, 500]);
    const base = await doc.save();

    const filled = await fillPdf(base, {
      entries: [
        {
          fieldId: 'notes',
          fieldType: 'text',
          value: 'Hello flat mode',
          confidence: 0.8,
          source: { pageIndex: 0, sourceHint: 'manual', bbox: [0.1, 0.8, 0.4, 0.05] },
        },
      ],
      unresolved: [],
      createdAt: new Date().toISOString(),
    });

    expect(filled.byteLength).toBeGreaterThan(base.byteLength);
  });

  it('fills acroform when template buffer has bytes before PDF header', async () => {
    const pdf = withLeadingBytes(await createAcroPdf());

    const filled = await fillPdf(pdf, {
      entries: [
        {
          fieldId: 'full_name',
          fieldType: 'text',
          value: 'Grace Hopper',
          confidence: 1,
          source: { pageIndex: 0, sourceHint: 'manual' },
          targetPdfFieldName: 'full_name',
        },
      ],
      unresolved: [],
      createdAt: new Date().toISOString(),
    });

    const loaded = await PDFDocument.load(filled);
    expect(loaded.getForm().getTextField('full_name').getText()).toBe('Grace Hopper');
  });
});
