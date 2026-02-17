import { fillPlanSchema } from '../schemas';
import type { FillPlan, ManualEdit } from '../types/fill-plan';

export const applyManualEdits = (fillPlan: FillPlan, edits: ManualEdit[]): FillPlan => {
  const editMap = new Map(edits.map((edit) => [edit.fieldId, edit.value]));

  const entries = fillPlan.entries.map((entry) => {
    const override = editMap.get(entry.fieldId);
    if (override === undefined) {
      return entry;
    }

    return {
      ...entry,
      value: override,
      confidence: 1,
      unresolvedReason: undefined,
    };
  });

  const unresolved = fillPlan.unresolved.filter((item) => !editMap.has(item.fieldId));

  return fillPlanSchema.parse({
    ...fillPlan,
    entries,
    unresolved,
    createdAt: new Date().toISOString(),
  });
};
