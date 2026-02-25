import type { FillPlan, ValidationReport } from '@form-forge/core';
import { useState } from 'react';

import { downloadBlob, jsonBlob } from '../utils/file';

interface ResultsPanelProps {
  result?:
    | {
        pdfBytes: Uint8Array;
        csv: string;
        fillPlan: FillPlan;
        report: ValidationReport;
      }
    | undefined;
  title?: string | undefined;
  showContainer?: boolean | undefined;
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

export const ResultsPanel = ({ result, title = 'Results', showContainer = true }: ResultsPanelProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!result) {
    return null;
  }

  const content = (
    <>
      <h2>{title}</h2>
      <div className="actions results-actions">
        <button
          type="button"
          onClick={() =>
            downloadBlob('result_filled.pdf', new Blob([toArrayBuffer(result.pdfBytes)], { type: 'application/pdf' }))
          }
        >
          Download PDF
        </button>
        <div className="advanced-downloads">
          <button
            type="button"
            className="advanced-toggle"
            aria-expanded={showAdvanced}
            aria-label="Toggle advanced downloads"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            •••
          </button>
          {showAdvanced ? (
            <div className="advanced-downloads-menu">
              <button type="button" onClick={() => downloadBlob('result.csv', new Blob([result.csv], { type: 'text/csv' }))}>
                Download CSV
              </button>
              <button type="button" onClick={() => downloadBlob('fill_plan.json', jsonBlob(result.fillPlan))}>
                Download Fill Plan
              </button>
              <button type="button" onClick={() => downloadBlob('validation_report.json', jsonBlob(result.report))}>
                Download Validation Report
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  if (!showContainer) {
    return content;
  }

  return <section className="card">{content}</section>;
};
