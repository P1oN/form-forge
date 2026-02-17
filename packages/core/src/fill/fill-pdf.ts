import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';

import { FillError } from '../errors';
import { fillPlanSchema } from '../schemas';
import type { FillPlan } from '../types/fill-plan';

const drawFlatEntry = (
  page: PDFPage,
  entry: FillPlan['entries'][number],
  font: PDFFont,
): void => {
  const [x, y, w, h] = entry.source.bbox ?? [0.1, 0.1, 0.2, 0.03];
  const size = page.getSize();

  const absX = x * size.width;
  const absY = y * size.height;
  const absW = w * size.width;
  const absH = h * size.height;

  if (typeof entry.value === 'boolean') {
    if (entry.value) {
      page.drawLine({
        start: { x: absX, y: absY },
        end: { x: absX + absW, y: absY + absH },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      page.drawLine({
        start: { x: absX + absW, y: absY },
        end: { x: absX, y: absY + absH },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
    }
    return;
  }

  const fontSize = Math.max(8, Math.min(12, absH * 0.7));
  page.drawText(entry.value, {
    x: absX,
    y: absY,
    maxWidth: absW,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
};

export const fillPdf = async (templatePdf: ArrayBuffer, fillPlan: FillPlan): Promise<Uint8Array> => {
  const validated = fillPlanSchema.parse(fillPlan);

  try {
    const pdf = await PDFDocument.load(templatePdf);
    const form = pdf.getForm();
    const hasAcro = form.getFields().length > 0;

    if (hasAcro) {
      const fields = form.getFields();
      const byName = new Map(fields.map((field) => [field.getName(), field]));

      validated.entries.forEach((entry) => {
        try {
          if (!entry.targetPdfFieldName) {
            return;
          }

          const field = byName.get(entry.targetPdfFieldName);
          if (!field) {
            return;
          }

          if (typeof entry.value === 'boolean') {
            const maybeCheck = form.getCheckBox(entry.targetPdfFieldName);
            if (entry.value) {
              maybeCheck.check();
            } else {
              maybeCheck.uncheck();
            }
            return;
          }

          if (entry.fieldType === 'radio') {
            const radio = form.getRadioGroup(entry.targetPdfFieldName);
            radio.select(entry.value);
            return;
          }

          const text = form.getTextField(entry.targetPdfFieldName);
          text.setText(entry.value);
        } catch {
          return;
        }
      });
      form.updateFieldAppearances();
    } else {
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      for (const entry of validated.entries) {
        const page = pages[entry.source.pageIndex] ?? pages[0];
        if (!page) {
          continue;
        }
        drawFlatEntry(page, entry, font);
      }
    }

    return pdf.save();
  } catch (error) {
    throw new FillError('Failed to fill output PDF.', error);
  }
};
