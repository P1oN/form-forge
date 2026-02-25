import { fillPlanSchema } from '../schemas';
import { normalizeDate, normalizeEmail, normalizePhone } from './normalizers';
import { jaccard } from './similarity';
import type { ExtractedBlock, ExtractedBlocks } from '../types/extraction';
import type { FillPlan } from '../types/fill-plan';
import type { TemplateInventory } from '../types/template';
import { nowIso } from '../utils/clock';

const center = (bbox: [number, number, number, number]): [number, number] => [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];

const distanceScore = (a: [number, number, number, number], b: [number, number, number, number]): number => {
  const [ax, ay] = center(a);
  const [bx, by] = center(b);
  const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
  return Math.max(0, 1 - d);
};

const parseByType = (
  fieldType: TemplateInventory['fields'][number]['fieldType'],
  raw: string,
): { value: string | boolean; unresolvedReason?: string } => {
  switch (fieldType) {
    case 'checkbox': {
      const t = raw.trim().toLowerCase();
      return { value: ['x', 'yes', 'true', 'checked', '1'].includes(t) };
    }
    case 'date': {
      const normalized = normalizeDate(raw);
      if (normalized.value) {
        return { value: normalized.value };
      }
      return normalized.unresolved
        ? { value: raw, unresolvedReason: normalized.unresolved }
        : { value: raw };
    }
    case 'email':
      return { value: normalizeEmail(raw) };
    case 'phone':
      return { value: normalizePhone(raw) };
    case 'signature':
    case 'initials':
      return {
        value: raw,
        unresolvedReason: 'Signature and initials require human review unless printed alternative is mapped.',
      };
    default:
      return { value: raw.trim() };
  }
};

const findBestBlock = (fieldLabel: string, fieldBbox: [number, number, number, number], blocks: ExtractedBlock[]) => {
  let best: { block: ExtractedBlock; score: number } | undefined;

  blocks.forEach((block) => {
    const lexical = jaccard(fieldLabel, block.text);
    const spatial = distanceScore(fieldBbox, block.bbox);
    const score = lexical * 0.7 + spatial * 0.2 + block.confidence * 0.1;

    if (!best || score > best.score) {
      best = { block, score };
    }
  });

  return best;
};

export const deterministicMap = (
  template: TemplateInventory,
  extracted: ExtractedBlocks,
  threshold: number,
): FillPlan => {
  const entries: FillPlan['entries'] = [];
  const unresolved: FillPlan['unresolved'] = [];

  template.fields.forEach((field) => {
    const pageBlocks = extracted.pages.find((p) => p.pageIndex === field.pageIndex)?.blocks ?? [];
    const globalBlocks = extracted.pages.flatMap((p) => p.blocks);
    const blocks = pageBlocks.length > 0 ? pageBlocks : globalBlocks;

    if (blocks.length === 0) {
      unresolved.push({ fieldId: field.fieldId, reason: 'No extraction blocks available.', confidence: 0 });
      return;
    }

    const candidate = findBestBlock(field.labelText ?? field.fieldId, field.bbox, blocks);
    if (!candidate) {
      unresolved.push({ fieldId: field.fieldId, reason: 'No candidate mapping found.', confidence: 0 });
      return;
    }

    const parsed = parseByType(field.fieldType, candidate.block.text);

    entries.push({
      fieldId: field.fieldId,
      fieldType: field.fieldType,
      value: parsed.value,
      confidence: candidate.score,
      source: {
        pageIndex: field.pageIndex,
        bbox: candidate.block.bbox,
        bboxOrigin: candidate.block.bboxOrigin,
        sourceHint: candidate.block.sourceHint,
      },
      targetPdfFieldName: field.pdfFieldName,
      unresolvedReason: parsed.unresolvedReason,
    });

    if (candidate.score < threshold || parsed.unresolvedReason) {
      unresolved.push({
        fieldId: field.fieldId,
        reason: parsed.unresolvedReason ?? 'Below deterministic confidence threshold.',
        confidence: candidate.score,
      });
    }
  });

  return fillPlanSchema.parse({
    entries,
    unresolved,
    createdAt: nowIso(),
  });
};
