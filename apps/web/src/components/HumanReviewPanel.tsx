import type { FillPlan } from '@form-forge/core';
import { useEffect, useMemo, useState } from 'react';

import { PreviewGrid } from './PreviewGrid';
import { SourcePreview } from './SourcePreview';

interface HumanReviewPanelProps {
  result?:
    | {
        fillPlan: FillPlan;
      }
    | undefined;
  sourceFile?: File | undefined;
  onApplyEdits: (edits: Array<{ fieldId: string; value: string }>) => Promise<void>;
}

export const HumanReviewPanel = ({ result, sourceFile, onApplyEdits }: HumanReviewPanelProps) => {
  const unresolved = result?.fillPlan.unresolved ?? [];
  const entries = result?.fillPlan.entries ?? [];
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewFocusedFieldId, setPreviewFocusedFieldId] = useState<string | undefined>(undefined);

  const unresolvedEntries = useMemo(() => unresolved, [unresolved]);
  const presumableValueByFieldId = useMemo<Record<string, string>>(
    () =>
      entries.reduce<Record<string, string>>((accumulator, entry) => {
        accumulator[entry.fieldId] = String(entry.value);
        return accumulator;
      }, {}),
    [entries],
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
    setEdits((current) => {
      const next: Record<string, string> = {};

      unresolvedEntries.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(current, item.fieldId)) {
          next[item.fieldId] = current[item.fieldId] ?? '';
          return;
        }
        next[item.fieldId] = presumableValueByFieldId[item.fieldId] ?? '';
      });

      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);
      if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) {
        return current;
      }

      return next;
    });
  }, [unresolvedEntries, presumableValueByFieldId]);

  const activeItem = unresolvedEntries[activeIndex];
  const selectedFieldId = activeItem?.fieldId;
  const selectedEntry = entries.find((entry) => entry.fieldId === selectedFieldId);
  const previewFocusedEntry = entries.find((entry) => entry.fieldId === previewFocusedFieldId);
  const previewBbox = previewFocusedEntry?.source.bbox ?? selectedEntry?.source.bbox;
  const previewPageIndex = previewFocusedEntry?.source.pageIndex ?? selectedEntry?.source.pageIndex ?? 0;
  const previewSourceHint = previewFocusedEntry?.source.sourceHint ?? selectedEntry?.source.sourceHint;
  const previewStrokeColor = previewFocusedEntry ? '#1d4ed8' : '#c9382b';
  const itemsToRender = viewMode === 'all' ? unresolvedEntries : activeItem ? [activeItem] : [];

  const goNext = () => {
    if (unresolvedEntries.length === 0) {
      return;
    }
    setActiveIndex((current) => (current + 1) % unresolvedEntries.length);
  };

  const goPrevious = () => {
    if (unresolvedEntries.length === 0) {
      return;
    }
    setActiveIndex((current) => (current - 1 + unresolvedEntries.length) % unresolvedEntries.length);
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
          <div className="review-row" key={item.fieldId}>
            <div>
              <strong>{item.fieldId}</strong>
              <div>{item.reason}</div>
              <div>Confidence: {item.confidence.toFixed(2)}</div>
            </div>
            <div>
              <label>
                Manual value
                <input
                  type="text"
                  value={edits[item.fieldId] ?? ''}
                  onChange={(e) => setEdits((current) => ({ ...current, [item.fieldId]: e.target.value }))}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          void onApplyEdits(
            Object.entries(edits)
              .filter(([, value]) => value.trim().length > 0)
              .map(([fieldId, value]) => ({ fieldId, value })),
          )
        }
      >
        Apply Manual Edits and Refill
      </button>
      <h3>Source Snippet Preview</h3>
      <SourcePreview
        sourceFile={sourceFile}
        bbox={previewBbox}
        pageIndex={previewPageIndex}
        sourceHint={previewSourceHint}
        strokeColor={previewStrokeColor}
      />
      <PreviewGrid entries={result.fillPlan.entries} onFocusedFieldIdChange={setPreviewFocusedFieldId} />
    </section>
  );
};
