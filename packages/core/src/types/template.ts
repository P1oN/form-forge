import type { BBoxOrigin, ConstraintSpec, FieldType, RelativeBBox } from './common';

export interface TemplateField {
  fieldId: string;
  labelText?: string | undefined;
  fieldType: FieldType;
  required?: boolean | undefined;
  constraints?: ConstraintSpec | undefined;
  pageIndex: number;
  bbox: RelativeBBox;
  bboxOrigin?: BBoxOrigin | undefined;
  pdfFieldName?: string | undefined;
}

export interface TemplateInventory {
  templateType: 'acroform' | 'flat';
  pageCount: number;
  fields: TemplateField[];
  createdAt: string;
}

export interface TemplateRegionConfig {
  pageCount?: number | undefined;
  fields: Array<{
    fieldId: string;
    labelText?: string | undefined;
    fieldType: FieldType;
    required?: boolean | undefined;
    constraints?: ConstraintSpec | undefined;
    pageIndex: number;
    bbox: RelativeBBox;
    bboxOrigin?: BBoxOrigin | undefined;
  }>;
}
