import { fillPlanSchema } from '../schemas';
import type { FillPlan, ManualEdit } from '../types/fill-plan';
import type { TemplateField } from '../types/template';

export const applyManualEdits = (
  fillPlan: FillPlan,
  edits: ManualEdit[],
  templateFields?: TemplateField[],
): FillPlan => {
  const editMap = new Map(edits.map((edit) => [edit.fieldId, edit.value]));
  const templateByFieldId = new Map((templateFields ?? []).map((field) => [field.fieldId, field]));
  const entryByFieldId = new Map(fillPlan.entries.map((entry) => [entry.fieldId, entry]));

  edits.forEach((edit) => {
    const existing = entryByFieldId.get(edit.fieldId);
    if (existing) {
      entryByFieldId.set(edit.fieldId, {
        ...existing,
        value: edit.value,
        confidence: 1,
        unresolvedReason: undefined,
      });
      return;
    }

    const templateField = templateByFieldId.get(edit.fieldId);
    if (!templateField) {
      return;
    }

    entryByFieldId.set(edit.fieldId, {
      fieldId: edit.fieldId,
      fieldType: templateField.fieldType,
      value: edit.value,
      confidence: 1,
      source: {
        pageIndex: templateField.pageIndex,
        bbox: templateField.bbox,
        ...(templateField.bboxOrigin ? { bboxOrigin: templateField.bboxOrigin } : {}),
        sourceHint: 'manual_review',
      },
      ...(templateField.pdfFieldName ? { targetPdfFieldName: templateField.pdfFieldName } : {}),
    });
  });

  const entries = Array.from(entryByFieldId.values());
  const unresolved = fillPlan.unresolved.filter((item) => !editMap.has(item.fieldId) || !entryByFieldId.has(item.fieldId));

  return fillPlanSchema.parse({
    ...fillPlan,
    entries,
    unresolved,
    createdAt: new Date().toISOString(),
  });
};
