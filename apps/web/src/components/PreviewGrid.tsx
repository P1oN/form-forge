import type { FillPlan } from '@form-forge/core';
import { useEffect, useMemo, useState } from 'react';

interface PreviewGridProps {
  entries: FillPlan['entries'];
  pageSize?: number;
  onFocusedFieldIdChange?: (fieldId: string | undefined) => void;
}

export const PreviewGrid = ({ entries, pageSize = 8, onFocusedFieldIdChange }: PreviewGridProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pinnedFieldId, setPinnedFieldId] = useState<string | undefined>(undefined);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | undefined>(undefined);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  useEffect(() => {
    setPageIndex((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    if (!pinnedFieldId) {
      return;
    }
    const exists = entries.some((entry) => entry.fieldId === pinnedFieldId);
    if (!exists) {
      setPinnedFieldId(undefined);
    }
  }, [entries, pinnedFieldId]);

  const focusedFieldId = hoveredFieldId ?? pinnedFieldId;

  useEffect(() => {
    onFocusedFieldIdChange?.(focusedFieldId);
  }, [focusedFieldId, onFocusedFieldIdChange]);

  const pageEntries = useMemo(() => {
    const start = pageIndex * pageSize;
    return entries.slice(start, start + pageSize);
  }, [entries, pageIndex, pageSize]);

  return (
    <div>
      <div className="preview-grid">
        {pageEntries.map((entry) => (
          <button
            type="button"
            className={`preview-card preview-card--button ${focusedFieldId === entry.fieldId ? 'preview-card--active' : ''}`}
            key={entry.fieldId}
            onMouseEnter={() => setHoveredFieldId(entry.fieldId)}
            onMouseLeave={() => setHoveredFieldId(undefined)}
            onClick={() => setPinnedFieldId((current) => (current === entry.fieldId ? undefined : entry.fieldId))}
          >
            <div>{entry.fieldId}</div>
            <div>BBox: {entry.source.bbox ? entry.source.bbox.join(', ') : 'n/a'}</div>
            <div>Source: {entry.source.sourceHint}</div>
            <div>Value: {String(entry.value)}</div>
          </button>
        ))}
      </div>
      {entries.length > pageSize ? (
        <div className="preview-pagination">
          <button type="button" onClick={() => setPageIndex((current) => Math.max(0, current - 1))} disabled={pageIndex === 0}>
            Previous page
          </button>
          <span>
            Page {pageIndex + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
            disabled={pageIndex >= totalPages - 1}
          >
            Next page
          </button>
        </div>
      ) : null}
    </div>
  );
};
