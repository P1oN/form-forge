import type { FillPlan, ValidationReport } from '@form-forge/core';

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
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

export const ResultsPanel = ({ result }: ResultsPanelProps) => {
  if (!result) {
    return null;
  }

  return (
    <section className="card">
      <h2>Results</h2>
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            downloadBlob('result_filled.pdf', new Blob([toArrayBuffer(result.pdfBytes)], { type: 'application/pdf' }))
          }
        >
          Download PDF
        </button>
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
    </section>
  );
};
