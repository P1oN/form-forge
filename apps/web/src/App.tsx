import { applyManualEdits } from '@form-forge/core';
import { useState } from 'react';

import { HumanReviewPanel } from './components/HumanReviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadPanel } from './components/UploadPanel';
import { usePipeline } from './state/use-pipeline';

const FIELD_TEST_TEMPLATE = '/@fs/Users/bm/Documents/repos/form-forge/examples/empty_form.pdf';
const FIELD_TEST_RAW = '/@fs/Users/bm/Documents/repos/form-forge/examples/raw_filled.pdf';

const fetchAsFile = async (url: string, name: string, type: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${name}.`);
  }
  const blob = await response.blob();
  return new File([blob], name, { type });
};

export const App = () => {
  const [templateFile, setTemplateFile] = useState<File>();
  const [clientFiles, setClientFiles] = useState<File[]>([]);
  const { run, rerunFillOnly, state } = usePipeline();

  const runPipeline = async () => {
    if (!templateFile || clientFiles.length === 0) {
      return;
    }
    await run(templateFile, clientFiles);
  };

  return (
    <main className="app-shell">
      <h1>Form Forge: Scan-to-Fillable-PDF</h1>
      <p>Deterministic extraction and mapping first, optional LLM fallback when confidence is low.</p>

      <UploadPanel
        templateFile={templateFile}
        clientFiles={clientFiles}
        onTemplateSelect={setTemplateFile}
        onClientSelect={setClientFiles}
        onLoadFieldTest={async () => {
          const [template, raw] = await Promise.all([
            fetchAsFile(FIELD_TEST_TEMPLATE, 'empty_form.pdf', 'application/pdf'),
            fetchAsFile(FIELD_TEST_RAW, 'raw_filled.pdf', 'application/pdf'),
          ]);
          setTemplateFile(template);
          setClientFiles([raw]);
        }}
      />

      <section className="card">
        <button type="button" disabled={!templateFile || clientFiles.length === 0 || state.running} onClick={() => void runPipeline()}>
          Run Pipeline
        </button>
        {state.error ? <p className="error whitespace-pre-wrap">{state.error}</p> : null}
      </section>

      <ProgressPanel running={state.running} progress={state.progress} />
      <ResultsPanel result={state.result} />

      <HumanReviewPanel
        result={state.result ? { fillPlan: state.result.fillPlan } : undefined}
        sourceFile={clientFiles[0]}
        onApplyEdits={async (edits) => {
          if (!state.result || !templateFile) {
            return;
          }

          const updatedPlan = applyManualEdits(state.result.fillPlan, edits);
          await rerunFillOnly(templateFile, updatedPlan);
        }}
      />
    </main>
  );
};
