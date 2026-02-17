import { validationReportSchema } from '../schemas';
import { isIsoDate, isPlausibleEmail, isPlausiblePhone } from './validators';
import type { FillPlan } from '../types/fill-plan';
import type { TemplateInventory } from '../types/template';
import { nowIso } from '../utils/clock';

export const validateFillPlan = (template: TemplateInventory, fillPlan: FillPlan) => {
  const issues: Array<{
    code: string;
    severity: 'error' | 'warning';
    fieldId?: string;
    message: string;
  }> = [];

  const entryMap = new Map(fillPlan.entries.map((e) => [e.fieldId, e]));

  template.fields.forEach((field) => {
    const entry = entryMap.get(field.fieldId);

    if (field.required && !entry) {
      issues.push({
        code: 'REQUIRED_MISSING',
        severity: 'error',
        fieldId: field.fieldId,
        message: 'Required field has no mapped value.',
      });
      return;
    }

    if (!entry || typeof entry.value !== 'string') {
      return;
    }

    if (field.fieldType === 'email' && !isPlausibleEmail(entry.value)) {
      issues.push({
        code: 'EMAIL_IMPLAUSIBLE',
        severity: 'warning',
        fieldId: field.fieldId,
        message: 'Email value appears invalid.',
      });
    }

    if (field.fieldType === 'phone' && !isPlausiblePhone(entry.value)) {
      issues.push({
        code: 'PHONE_IMPLAUSIBLE',
        severity: 'warning',
        fieldId: field.fieldId,
        message: 'Phone value appears invalid.',
      });
    }

    if (field.fieldType === 'date' && !isIsoDate(entry.value)) {
      issues.push({
        code: 'DATE_NOT_ISO',
        severity: 'warning',
        fieldId: field.fieldId,
        message: 'Date is not normalized to ISO-8601.',
      });
    }

    if (field.constraints?.maxLength && entry.value.length > field.constraints.maxLength) {
      issues.push({
        code: 'MAX_LENGTH_EXCEEDED',
        severity: 'warning',
        fieldId: field.fieldId,
        message: `Value exceeds maxLength ${field.constraints.maxLength}.`,
      });
    }
  });

  const lowConfidenceFields = fillPlan.entries
    .filter((entry) => entry.confidence < 0.75)
    .map((entry) => ({ fieldId: entry.fieldId, confidence: entry.confidence }));

  const unresolvedFields = fillPlan.unresolved.map((u) => u.fieldId);

  return validationReportSchema.parse({
    valid: issues.every((x) => x.severity !== 'error'),
    issues,
    lowConfidenceFields,
    unresolvedFields,
    createdAt: nowIso(),
  });
};
