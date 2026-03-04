import type { FillPlan } from '@form-forge/core';
import { useEffect, useMemo, useState } from 'react';

import { PreviewGridCard } from './PreviewGridCard';

interface PreviewGridProps {
  entries: FillPlan['entries'];
  valueByFieldId: Record<string, string | boolean>;
  onEntryValueChange: (fieldId: string, value: string | boolean) => void;
  defaultColumns?: 1 | 2;
  defaultPageSize?: number;
  onFocusedFieldIdChange?: (fieldId: string | undefined) => void;
}

const PAGE_SIZE_OPTIONS = [4, 6, 8, 12] as const;

const toDisplayLabel = (fieldId: string, targetPdfFieldName?: string): string => {
  const raw = targetPdfFieldName ?? fieldId.replace(/^f_\d+_/, '');
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const resolveFocusedFieldId = (
  hoveredFieldId: string | undefined,
  pinnedFieldId: string | undefined,
): string | undefined => hoveredFieldId ?? pinnedFieldId;

export const clampPageIndex = (pageIndex: number, totalPages: number): number =>
  Math.min(Math.max(pageIndex, 0), Math.max(0, totalPages - 1));

export const resolvePageEntries = (
  entries: FillPlan['entries'],
  pageIndex: number,
  pageSize: number,
): FillPlan['entries'] => {
  const start = pageIndex * pageSize;
  return entries.slice(start, start + pageSize);
};

export const resolveNextPageSize = (rawValue: string, defaultPageSize: number): number => {
  const parsed = Number(rawValue);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : defaultPageSize;
};

export const PreviewGrid = ({
  entries,
  valueByFieldId,
  onEntryValueChange,
  defaultColumns = 1,
  defaultPageSize = 6,
  onFocusedFieldIdChange,
}: PreviewGridProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [columns, setColumns] = useState<1 | 2>(defaultColumns);
  const [pinnedFieldId, setPinnedFieldId] = useState<string | undefined>(undefined);
  const [hoveredFieldId, setHoveredFieldId] = useState<string | undefined>(undefined);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  useEffect(() => {
    setPageIndex((current) => clampPageIndex(current, totalPages));
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

  const focusedFieldId = resolveFocusedFieldId(hoveredFieldId, pinnedFieldId);

  useEffect(() => {
    onFocusedFieldIdChange?.(focusedFieldId);
  }, [focusedFieldId, onFocusedFieldIdChange]);

  const pageEntries = useMemo(() => {
    return resolvePageEntries(entries, pageIndex, pageSize);
  }, [entries, pageIndex, pageSize]);

  return (
    <div>
      <div className="preview-toolbar">
        <label>
          Layout
          <select value={String(columns)} onChange={(e) => setColumns(e.target.value === '2' ? 2 : 1)}>
            <option value="1">1 per line</option>
            <option value="2">2 per line</option>
          </select>
        </label>
        <label>
          Items
          <select
            value={String(pageSize)}
            onChange={(e) => {
              const nextPageSize = resolveNextPageSize(e.target.value, defaultPageSize);
              setPageSize(nextPageSize);
              setPageIndex(0);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} per line
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setShowDebugInfo((current) => !current)}>
          {showDebugInfo ? 'Hide debug info' : 'Show debug info'}
        </button>
      </div>
      <div className={`preview-grid preview-grid--cols-${columns}`}>
        {pageEntries.map((entry) => (
          <PreviewGridCard
            key={entry.fieldId}
            entry={entry}
            displayLabel={toDisplayLabel(entry.fieldId, entry.targetPdfFieldName)}
            value={valueByFieldId[entry.fieldId]}
            isActive={focusedFieldId === entry.fieldId}
            showDebugInfo={showDebugInfo}
            onValueChange={(value) => onEntryValueChange(entry.fieldId, value)}
            onHoverStart={() => setHoveredFieldId(entry.fieldId)}
            onHoverEnd={() => setHoveredFieldId(undefined)}
            onTogglePinned={() => setPinnedFieldId((current) => (current === entry.fieldId ? undefined : entry.fieldId))}
          />
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
