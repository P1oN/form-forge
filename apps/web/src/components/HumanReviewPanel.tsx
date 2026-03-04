import type { BBoxOrigin, FillPlan, TemplateField } from '@form-forge/core';
import { useEffect, useMemo, useState } from 'react';

import { PreviewGrid } from './PreviewGrid';
import { SourcePreview } from './SourcePreview';

interface HumanReviewPanelProps {
  result?:
    | {
        fillPlan: FillPlan;
        templateFields?: TemplateField[] | undefined;
      }
    | undefined;
  sourceFile?: File | undefined;
  onApplyEdits: (edits: Array<{ fieldId: string; value: string | boolean }>) => Promise<void>;
}

export interface FieldEditDraft {
  value: string | boolean;
  updatedAt: number;
}

export type FieldEditDraftByFieldId = Record<string, FieldEditDraft>;

export const resolveManualInputType = (
  fieldId: string,
  entryByFieldId: Map<string, FillPlan['entries'][number]>,
  templateFieldById: Map<string, TemplateField>,
): 'checkbox' | 'text' => {
  const entryType = entryByFieldId.get(fieldId)?.fieldType;
  if (entryType === 'checkbox') {
    return 'checkbox';
  }
  const templateType = templateFieldById.get(fieldId)?.fieldType;
  return templateType === 'checkbox' ? 'checkbox' : 'text';
};

export const mergeEditDraft = (
  currentDraft: FieldEditDraft | undefined,
  incomingDraft: FieldEditDraft,
): FieldEditDraft => {
  if (!currentDraft) {
    return incomingDraft;
  }
  return incomingDraft.updatedAt >= currentDraft.updatedAt ? incomingDraft : currentDraft;
};

export const buildManualEditsPayload = (args: {
  editDraftByFieldId: FieldEditDraftByFieldId;
  entryByFieldId: Map<string, FillPlan['entries'][number]>;
  templateFieldById: Map<string, TemplateField>;
  presumableValueByFieldId: Record<string, string | boolean>;
}): Array<{ fieldId: string; value: string | boolean }> => {
  return Object.entries(args.editDraftByFieldId).flatMap<{ fieldId: string; value: string | boolean }>(([
    fieldId,
    draft,
  ]) => {
    const value = draft.value;
    if (resolveManualInputType(fieldId, args.entryByFieldId, args.templateFieldById) === 'checkbox') {
      const initialValue = Boolean(args.presumableValueByFieldId[fieldId]);
      const currentValue = Boolean(value);
      return currentValue !== initialValue ? [{ fieldId, value: currentValue }] : [];
    }

    const initialValue = args.presumableValueByFieldId[fieldId];
    const initialTextValue = typeof initialValue === 'string' ? initialValue : String(initialValue ?? '');
    const textValue = typeof value === 'string' ? value : String(value ?? '');

    return textValue !== initialTextValue ? [{ fieldId, value: textValue }] : [];
  });
};

const toDisplayLabel = (fieldId: string, targetPdfFieldName?: string): string => {
  const raw = targetPdfFieldName ?? fieldId.replace(/^f_\d+_/, '');
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const resolvePreviewBBoxOrigin = (
  previewFocusedEntry: FillPlan['entries'][number] | undefined,
  previewFocusedTemplateField: TemplateField | undefined,
  selectedEntry: FillPlan['entries'][number] | undefined,
  selectedTemplateField: TemplateField | undefined,
): BBoxOrigin => {
  return (
    previewFocusedEntry?.source.bboxOrigin ??
    previewFocusedTemplateField?.bboxOrigin ??
    selectedEntry?.source.bboxOrigin ??
    selectedTemplateField?.bboxOrigin ??
    'top_left'
  );
};

export const HumanReviewPanel = ({ result, sourceFile, onApplyEdits }: HumanReviewPanelProps) => {
  const unresolved = result?.fillPlan.unresolved ?? [];
  const entries = result?.fillPlan.entries ?? [];
  const templateFields = result?.templateFields ?? [];
  const [editDraftByFieldId, setEditDraftByFieldId] = useState<FieldEditDraftByFieldId>({});
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewFocusedFieldId, setPreviewFocusedFieldId] = useState<string | undefined>(undefined);

  const unresolvedEntries = useMemo(() => unresolved, [unresolved]);
  const entryByFieldId = useMemo(
    () => new Map(entries.map((entry) => [entry.fieldId, entry])),
    [entries],
  );
  const templateFieldById = useMemo(
    () => new Map(templateFields.map((field) => [field.fieldId, field])),
    [templateFields],
  );
  const presumableValueByFieldId = useMemo<Record<string, string | boolean>>(
    () =>
      entries.reduce<Record<string, string | boolean>>((accumulator, entry) => {
        accumulator[entry.fieldId] = entry.value;
        return accumulator;
      }, {}),
    [entries],
  );
  const effectiveValueByFieldId = useMemo<Record<string, string | boolean>>(
    () =>
      entries.reduce<Record<string, string | boolean>>((accumulator, entry) => {
        accumulator[entry.fieldId] = editDraftByFieldId[entry.fieldId]?.value ?? entry.value;
        return accumulator;
      }, {}),
    [editDraftByFieldId, entries],
  );

  useEffect(() => {
    setActiveIndex((current) => {
      if (unresolvedEntries.length === 0) {
        return 0;
      }
      return Math.min(current, unresolvedEntries.length - 1);
    });
  }, [unresolvedEntries.length]);

  useEffect(() => {
    setEditDraftByFieldId((current) => {
      const next: FieldEditDraftByFieldId = {};
      const allFieldIds = new Set<string>([
        ...entries.map((entry) => entry.fieldId),
        ...unresolvedEntries.map((entry) => entry.fieldId),
      ]);

      allFieldIds.forEach((fieldId) => {
        const initialValue = presumableValueByFieldId[fieldId];
        const defaultValue =
          initialValue ??
          (resolveManualInputType(fieldId, entryByFieldId, templateFieldById) === 'checkbox' ? false : '');
        const existingDraft = current[fieldId];
        const defaultDraft: FieldEditDraft = { value: defaultValue, updatedAt: 0 };
        next[fieldId] = mergeEditDraft(existingDraft, defaultDraft);
      });

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every(
          (key) =>
            current[key]?.updatedAt === next[key]?.updatedAt &&
            current[key]?.value === next[key]?.value,
        )
      ) {
        return current;
      }

      return next;
    });
  }, [entries, entryByFieldId, presumableValueByFieldId, templateFieldById, unresolvedEntries]);

  const activeItem = unresolvedEntries[activeIndex];
  const selectedFieldId = activeItem?.fieldId;
  const selectedEntry = entries.find((entry) => entry.fieldId === selectedFieldId);
  const previewFocusedEntry = entries.find((entry) => entry.fieldId === previewFocusedFieldId);
  const selectedTemplateField = selectedFieldId ? templateFieldById.get(selectedFieldId) : undefined;
  const previewFocusedTemplateField = previewFocusedFieldId
    ? templateFieldById.get(previewFocusedFieldId)
    : undefined;
  const previewBbox =
    previewFocusedEntry?.source.bbox ??
    previewFocusedTemplateField?.bbox ??
    selectedEntry?.source.bbox ??
    selectedTemplateField?.bbox;
  const previewPageIndex =
    previewFocusedEntry?.source.pageIndex ??
    previewFocusedTemplateField?.pageIndex ??
    selectedEntry?.source.pageIndex ??
    selectedTemplateField?.pageIndex ??
    0;
  const previewBboxOrigin = resolvePreviewBBoxOrigin(
    previewFocusedEntry,
    previewFocusedTemplateField,
    selectedEntry,
    selectedTemplateField,
  );
  const previewStrokeColor = previewFocusedEntry ? '#1d4ed8' : '#c9382b';
  const itemsToRender = viewMode === 'all' ? unresolvedEntries : activeItem ? [activeItem] : [];
  const updateFieldDraftValue = (fieldId: string, value: string | boolean) => {
    const now = Date.now();
    setEditDraftByFieldId((current) => ({
      ...current,
      [fieldId]: mergeEditDraft(current[fieldId], { value, updatedAt: now }),
    }));
  };

  const goNext = () => {
    if (unresolvedEntries.length === 0) {
      return;
    }
    setPreviewFocusedFieldId(undefined);
    setActiveIndex((current) => (current + 1) % unresolvedEntries.length);
  };

  const goPrevious = () => {
    if (unresolvedEntries.length === 0) {
      return;
    }
    setPreviewFocusedFieldId(undefined);
    setActiveIndex((current) => (current - 1 + unresolvedEntries.length) % unresolvedEntries.length);
  };

  const focusUnresolvedField = (fieldId: string) => {
    setPreviewFocusedFieldId(undefined);
    const index = unresolvedEntries.findIndex((item) => item.fieldId === fieldId);
    if (index >= 0) {
      setActiveIndex(index);
    }
  };

  if (!result) {
    return null;
  }

  return (
    <section className="card">
      <h2>Human Review</h2>
      {unresolvedEntries.length === 0 ? <p>No unresolved fields.</p> : null}
      {unresolvedEntries.length > 0 ? (
        <div className="review-controls">
          <button type="button" onClick={goPrevious}>
            Previous
          </button>
          <button type="button" onClick={goNext}>
            Next
          </button>
          <button type="button" onClick={() => setViewMode((current) => (current === 'all' ? 'single' : 'all'))}>
            {viewMode === 'all' ? 'Show one' : 'Show all'}
          </button>
          {viewMode === 'single' ? (
            <span>
              {activeIndex + 1} / {unresolvedEntries.length}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={`review-list ${viewMode === 'all' ? 'review-list--scroll' : ''}`}>
        {itemsToRender.map((item) => (
          <div
            className="review-row"
            key={item.fieldId}
            onMouseEnter={() => focusUnresolvedField(item.fieldId)}
            onFocus={() => focusUnresolvedField(item.fieldId)}
          >
            <div>
              <strong className="field-label">
                {toDisplayLabel(
                  item.fieldId,
                  entryByFieldId.get(item.fieldId)?.targetPdfFieldName ?? templateFieldById.get(item.fieldId)?.labelText,
                )}
              </strong>
              <div className="field-id-muted">{item.fieldId}</div>
              <div>{item.reason}</div>
              <div>Confidence: {item.confidence.toFixed(2)}</div>
            </div>
            <div>
              <label>
                Manual value
                {resolveManualInputType(item.fieldId, entryByFieldId, templateFieldById) === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(editDraftByFieldId[item.fieldId]?.value)}
                    onChange={(e) => updateFieldDraftValue(item.fieldId, e.target.checked)}
                  />
                ) : (
                  (() => {
                    const editValue = editDraftByFieldId[item.fieldId]?.value;
                    return (
                      <input
                        type="text"
                        value={typeof editValue === 'string' ? editValue : String(editValue ?? '')}
                        onChange={(e) => updateFieldDraftValue(item.fieldId, e.target.value)}
                      />
                    );
                  })()
                )}
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          void onApplyEdits(
            buildManualEditsPayload({
              editDraftByFieldId,
              entryByFieldId,
              templateFieldById,
              presumableValueByFieldId,
            }),
          )
        }
      >
        Apply Manual Edits and Refill
      </button>
      <h3>Source Snippet Preview</h3>
      <SourcePreview
        sourceFile={sourceFile}
        bbox={previewBbox}
        bboxOrigin={previewBboxOrigin}
        pageIndex={previewPageIndex}
        strokeColor={previewStrokeColor}
      />
      <PreviewGrid
        entries={result.fillPlan.entries}
        valueByFieldId={effectiveValueByFieldId}
        onEntryValueChange={updateFieldDraftValue}
        defaultColumns={1}
        defaultPageSize={6}
        onFocusedFieldIdChange={setPreviewFocusedFieldId}
      />
    </section>
  );
};
