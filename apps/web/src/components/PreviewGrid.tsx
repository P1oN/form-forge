import type { FillPlan } from '@form-forge/core';
import { useEffect, useMemo, useState } from 'react';

interface PreviewGridProps {
  entries: FillPlan['entries'];
  pageSize?: number;
  onFocusedFieldIdChange?: (fieldId: string | undefined) => void;
}

const toDisplayLabel = (fieldId: string, targetPdfFieldName?: string): string => {
  const raw = targetPdfFieldName ?? fieldId.replace(/^f_\d+_/, '');
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const PreviewGrid = ({ entries, pageSize = 4, onFocusedFieldIdChange }: PreviewGridProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pinnedFieldId, setPinnedFieldId] = useState<string | undefined>(undefined);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | undefined>(undefined);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

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
      <div className="preview-toolbar">
        <button type="button" onClick={() => setShowDebugInfo((current) => !current)}>
          {showDebugInfo ? 'Hide debug info' : 'Show debug info'}
        </button>
      </div>
      <div className="preview-grid">
        {pageEntries.map((entry) => (
          <button
            type="button"
            className={`preview-card preview-card--button ${focusedFieldId === entry.fieldId ? 'preview-card--active' : ''}`}
            key={entry.fieldId}
            onMouseEnter={() => setHoveredFieldId(entry.fieldId)}
            onMouseLeave={() => setHoveredFieldId(undefined)}
            onClick={() => setPinnedFieldId((current) => (current === entry.fieldId ? undefined : entry.fieldId))}
            title={entry.fieldId}
          >
            <div className="field-label">{toDisplayLabel(entry.fieldId, entry.targetPdfFieldName)}</div>
            {showDebugInfo ?
              <>
                <div className="field-id-muted truncate-line">{entry.fieldId}</div>
                <div>BBox: {entry.source.bbox ? entry.source.bbox.join(', ') : 'n/a'}</div>
                <div>Source: {entry.source.sourceHint}</div>
              </> : null
            }
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
