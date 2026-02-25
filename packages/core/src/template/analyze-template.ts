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
  type PDFPage,
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

const toRefKey = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  if (!('toString' in value)) {
    return undefined;
  }

  const toString = (value as { toString?: unknown }).toString;
  if (typeof toString !== 'function') {
    return undefined;
  }

  return toString.call(value);
};

const buildAnnotationPageIndexMap = (pages: PDFPage[]): Map<string, number> => {
  const byAnnotationRef = new Map<string, number>();

  pages.forEach((page, pageIndex) => {
    const annots = (page.node as unknown as { Annots?: () => unknown }).Annots?.();
    const asArray = (annots as { asArray?: () => unknown[] } | undefined)?.asArray;
    const refs = typeof asArray === 'function' ? asArray.call(annots) : [];

    refs.forEach((ref) => {
      const key = toRefKey(ref);
      if (key) {
        byAnnotationRef.set(key, pageIndex);
      }
    });
  });

  return byAnnotationRef;
};

const buildPageRefIndexMap = (pages: PDFPage[]): Map<string, number> => {
  const byPageRef = new Map<string, number>();
  pages.forEach((page, pageIndex) => {
    const key = toRefKey((page as unknown as { ref?: unknown }).ref);
    if (key) {
      byPageRef.set(key, pageIndex);
    }
  });
  return byPageRef;
};

const getWidgetPageIndex = (
  widget: unknown,
  byAnnotationRef: Map<string, number>,
  byPageRef: Map<string, number>,
): number => {
  const widgetPageRef = (widget as { P?: () => unknown } | undefined)?.P?.();
  const widgetPageKey = widgetPageRef ? toRefKey(widgetPageRef) : undefined;
  if (widgetPageKey) {
    return byPageRef.get(widgetPageKey) ?? 0;
  }

  const ref = (widget as { ref?: unknown } | undefined)?.ref;
  const key = ref ? toRefKey(ref) : undefined;
  if (!key) {
    return 0;
  }

  return byAnnotationRef.get(key) ?? 0;
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
    const annotationPageIndex = buildAnnotationPageIndexMap(pages);
    const pageRefIndex = buildPageRefIndexMap(pages);

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
        const pageIndex = getWidgetPageIndex(widget, annotationPageIndex, pageRefIndex);
        const page = pages[pageIndex];
        const size = page?.getSize() ?? { width: 1, height: 1 };

        return {
          fieldId: `f_${idx}_${field.getName()}`,
          labelText: field.getName(),
          fieldType: inferTypeFromField(field),
          required: false,
          pageIndex,
          bbox: normalizeBBox(rect.x, rect.y, rect.width, rect.height, size.width, size.height),
          bboxOrigin: 'bottom_left' as const,
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

    const flatFields = (regionConfig?.fields ?? []).map((field) => ({
      ...field,
      bboxOrigin: field.bboxOrigin ?? 'top_left',
    }));

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
