import type { FillPlan } from '@form-forge/core';
import { useMemo, useState } from 'react';

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

  const unresolvedEntries = useMemo(() => unresolved, [unresolved]);

  if (!result) {
    return null;
  }

  const selectedFieldId = unresolvedEntries[0]?.fieldId;
  const selectedEntry = entries.find((entry) => entry.fieldId === selectedFieldId);

  return (
    <section className="card">
      <h2>Human Review</h2>
      {unresolvedEntries.length === 0 ? <p>No unresolved fields.</p> : null}
      {unresolvedEntries.map((item) => (
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
      <SourcePreview sourceFile={sourceFile} bbox={selectedEntry?.source.bbox} />
      <div className="preview-grid">
        {result.fillPlan.entries.slice(0, 8).map((entry) => (
          <div className="preview-card" key={entry.fieldId}>
            <div>{entry.fieldId}</div>
            <div>BBox: {entry.source.bbox ? entry.source.bbox.join(', ') : 'n/a'}</div>
            <div>Source: {entry.source.sourceHint}</div>
            <div>Value: {String(entry.value)}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
