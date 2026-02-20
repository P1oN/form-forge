import { applyManualEdits } from '@form-forge/core';
import { useState } from 'react';

import { HumanReviewPanel } from './components/HumanReviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadPanel } from './components/UploadPanel';
import { usePipeline, type RecognitionEngine } from './state/use-pipeline';

export const App = () => {
  const [templateFile, setTemplateFile] = useState<File>();
  const [clientFiles, setClientFiles] = useState<File[]>([]);
  const [recognitionEngine, setRecognitionEngine] = useState<RecognitionEngine>('gemini');
  const { run, rerunFillOnly, state } = usePipeline();

  const runPipeline = async () => {
    if (!templateFile || clientFiles.length === 0) {
      return;
    }
    await run(templateFile, clientFiles, recognitionEngine);
  };

  return (
    <main className="app-shell">
      <h1>Form Forge: Scan-to-Fillable-PDF</h1>
      <p>
        Deterministic extraction and mapping first, optional LLM fallback when confidence is low.
      </p>

      <UploadPanel
        templateFile={templateFile}
        clientFiles={clientFiles}
        recognitionEngine={recognitionEngine}
        onTemplateSelect={setTemplateFile}
        onClientSelect={setClientFiles}
        onRecognitionEngineChange={setRecognitionEngine}
      />

      <section className="card">
        <button
          type="button"
          disabled={!templateFile || clientFiles.length === 0 || state.running}
          onClick={() => void runPipeline()}
        >
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
