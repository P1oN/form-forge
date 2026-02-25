import {
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  ParseSpeeds,
  type PDFField,
} from 'pdf-lib';

import { PdfParseError } from '../errors';
import { templateInventorySchema, templateRegionConfigSchema } from '../schemas';
import type { TemplateInventory, TemplateRegionConfig } from '../types/template';
import { nowIso } from '../utils/clock';
import { normalizePdfArrayBuffer } from '../utils/pdf-bytes';

const normalizeBBox = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number,
): [number, number, number, number] => [x / pageWidth, y / pageHeight, width / pageWidth, height / pageHeight];

const inferTypeFromName = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('date')) return 'date' as const;
  if (lower.includes('email')) return 'email' as const;
  if (lower.includes('phone') || lower.includes('tel')) return 'phone' as const;
  if (lower.includes('sign')) return 'signature' as const;
  if (lower.includes('initial')) return 'initials' as const;
  if (lower.includes('check') || lower.includes('tick')) return 'checkbox' as const;
  return 'text' as const;
};

const inferTypeFromField = (field: PDFField) => {
  if (field instanceof PDFCheckBox) {
    return 'checkbox' as const;
  }
  if (field instanceof PDFRadioGroup) {
    return 'radio' as const;
  }
  if (field instanceof PDFSignature) {
    return 'signature' as const;
  }
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    return 'text' as const;
  }
  if (field instanceof PDFTextField) {
    return inferTypeFromName(field.getName());
  }
  return inferTypeFromName(field.getName());
};

const loadTemplatePdf = async (templatePdf: ArrayBuffer): Promise<PDFDocument> => {
  const bytes = new Uint8Array(normalizePdfArrayBuffer(templatePdf));

  try {
    return await PDFDocument.load(bytes, {
      parseSpeed: ParseSpeeds.Fastest,
      updateMetadata: false,
    });
  } catch {
    return PDFDocument.load(bytes, {
      ignoreEncryption: true,
      parseSpeed: ParseSpeeds.Fastest,
      updateMetadata: false,
    });
  }
};

export const analyzeTemplate = async (
  templatePdf: ArrayBuffer,
  regionConfig?: TemplateRegionConfig,
): Promise<TemplateInventory> => {
  try {
    if (regionConfig) {
      templateRegionConfigSchema.parse(regionConfig);
    }

    const pdf = await loadTemplatePdf(templatePdf);
    const pageCount = pdf.getPageCount();
    const pages = pdf.getPages();

    let fields: PDFField[] = [];
    try {
      fields = pdf.getForm().getFields();
    } catch {
      fields = [];
    }

    if (fields.length > 0) {
      const mapped = fields.map((field, idx) => {
        const widget = field.acroField.getWidgets()[0];
        const rect = widget?.getRectangle() ?? { x: 0, y: 0, width: 0.2, height: 0.03 };
        const pageIndex = 0;
        const page = pages[pageIndex];
        const size = page?.getSize() ?? { width: 1, height: 1 };

        return {
          fieldId: `f_${idx}_${field.getName()}`,
          labelText: field.getName(),
          fieldType: inferTypeFromField(field),
          required: false,
          pageIndex,
          bbox: normalizeBBox(rect.x, rect.y, rect.width, rect.height, size.width, size.height),
          pdfFieldName: field.getName(),
        };
      });

      return templateInventorySchema.parse({
        templateType: 'acroform',
        pageCount,
        fields: mapped,
        createdAt: nowIso(),
      });
    }

    const flatFields = regionConfig?.fields ?? [];

    return templateInventorySchema.parse({
      templateType: 'flat',
      pageCount,
      fields: flatFields,
      createdAt: nowIso(),
    });
  } catch (error) {
    if (error instanceof PdfParseError) {
      throw error;
    }

    const reason = error instanceof Error ? error.message : 'Unknown parse error';
    throw new PdfParseError(`Failed to analyze template PDF. ${reason}`, error);
  }
};
