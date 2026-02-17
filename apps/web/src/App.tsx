import { applyManualEdits } from '@form-forge/core';
import { useState } from 'react';

import { HumanReviewPanel } from './components/HumanReviewPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadPanel } from './components/UploadPanel';
import { usePipeline, type RecognitionEngine } from './state/use-pipeline';

const FIELD_TEST_TEMPLATE = new URL('../../../examples/empty_form.pdf', import.meta.url).href;
const FIELD_TEST_RAW = new URL('../../../examples/raw_filled.pdf', import.meta.url).href;

const hasPdfHeader = (bytes: Uint8Array): boolean => {
  const maxProbe = Math.min(bytes.length - 4, 1024);
  for (let idx = 0; idx <= maxProbe; idx += 1) {
    if (
      bytes[idx] === 0x25 &&
      bytes[idx + 1] === 0x50 &&
      bytes[idx + 2] === 0x44 &&
      bytes[idx + 3] === 0x46 &&
      bytes[idx + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
};

const fetchAsFile = async (url: string, name: string, type: string): Promise<File> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${name}.`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (type === 'application/pdf' && !hasPdfHeader(bytes)) {
    const contentType = response.headers.get('content-type') ?? 'unknown';
    throw new Error(`Could not load ${name} as PDF. Received content-type: ${contentType}.`);
  }
  return new File([bytes], name, { type });
};

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
      <p>Deterministic extraction and mapping first, optional LLM fallback when confidence is low.</p>

      <UploadPanel
        templateFile={templateFile}
        clientFiles={clientFiles}
        recognitionEngine={recognitionEngine}
        onTemplateSelect={setTemplateFile}
        onClientSelect={setClientFiles}
        onRecognitionEngineChange={setRecognitionEngine}
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
