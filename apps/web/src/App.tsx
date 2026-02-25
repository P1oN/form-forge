import { applyManualEdits } from '@form-forge/core';
import { useEffect, useState } from 'react';

import { HumanReviewPanel } from './components/HumanReviewPanel';
import { PipelineStepper } from './components/PipelineStepper';
import { ProgressPanel } from './components/ProgressPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { UploadPanel } from './components/UploadPanel';
import { usePipeline, type RecognitionEngine } from './state/use-pipeline';

type PipelineView = 'setup' | 'progress' | 'review' | 'fin';

export const App = () => {
  const [templateFile, setTemplateFile] = useState<File>();
  const [clientFile, setClientFile] = useState<File>([]);
  const [recognitionEngine, setRecognitionEngine] = useState<RecognitionEngine>('gemini');
  const [view, setView] = useState<PipelineView>('setup');
  const [runRequested, setRunRequested] = useState(false);
  const { run, rerunFillOnly, reset, state } = usePipeline();

  const canRun = Boolean(templateFile) && Boolean(clientFile) && !state.running;
  const hasResult = Boolean(state.result);
  const hasUnresolved = (state.result?.fillPlan.unresolved.length ?? 0) > 0;
  const isRunning = state.running;

  const runPipeline = async () => {
    if (!templateFile || !clientFile || !canRun) {
      return;
    }
    setView('progress');
    setRunRequested(true);
    await run(templateFile, [clientFile], recognitionEngine);
  };

  useEffect(() => {
    if (!runRequested || isRunning) {
      return;
    }

    setRunRequested(false);
    setView(state.result ? 'review' : 'setup');
  }, [isRunning, runRequested, state.result]);

  const goToFin = () => {
    if (!isRunning && hasResult) {
      setView('fin');
    }
  };

  const goToSetup = () => {
    if (isRunning) {
      return;
    }

    reset();
    setTemplateFile(undefined);
    setClientFile(undefined);
    setRecognitionEngine('gemini');
    setRunRequested(false);
    setView('setup');
  };

  const contextLabel = recognitionEngine === 'gemini' ? 'Gemini' : 'Tesseract';

  return (
    <main className="app-shell">
      <h1>Form Forge: Scan-to-Fillable-PDF</h1>
      <p>
        Deterministic extraction and mapping first, optional LLM fallback when confidence is low.
      </p>
      <PipelineStepper current={view} />

      {view === 'setup' ? (
        <section className="view-shell">
          <UploadPanel
            templateFile={templateFile}
            clientFile={clientFile}
            recognitionEngine={recognitionEngine}
            onTemplateSelect={setTemplateFile}
            onClientSelect={setClientFile}
            onRecognitionEngineChange={setRecognitionEngine}
          />
          <section className="controls">
            <button type="button" disabled={!canRun} onClick={() => void runPipeline()}>
              Run Pipeline
            </button>
            {state.error ? <p className="error whitespace-pre-wrap">{state.error}</p> : null}
          </section>
        </section>
      ) : null}

      {view === 'progress' ? (
        <section className="view-shell">
          <section className="card">
            <h2>Run Context</h2>
            <div className="context-list">
              <div className="context-row">
                <span className="context-label">Template</span>
                <span>{templateFile?.name ?? 'Not selected'}</span>
              </div>
              <div className="context-row">
                <span className="context-label">Client File</span>
                <span>{clientFile?.name ?? 'Not selected'}</span>
              </div>
              <div className="context-row">
                <span className="context-label">Engine</span>
                <span>{contextLabel}</span>
              </div>
            </div>
          </section>
          <ProgressPanel running={state.running} progress={state.progress} />
        </section>
      ) : null}

      {view === 'review' ? (
        <section className="view-shell">
          <HumanReviewPanel
            result={
              state.result
                ? {
                    fillPlan: state.result.fillPlan,
                    templateFields: state.result.template.fields,
                  }
                : undefined
            }
            sourceFile={clientFile}
            onApplyEdits={async (edits: Array<{ fieldId: string; value: string | boolean }>) => {
              if (!state.result || !templateFile) {
                return;
              }

              const updatedPlan = applyManualEdits(state.result.fillPlan, edits);
              await rerunFillOnly(templateFile, updatedPlan);
            }}
          />
          <section className="card view-footer-actions">
            <ResultsPanel result={state.result} title="Downloads" showContainer={false} />
            <div className="actions">
              <button type="button" disabled={!hasResult} onClick={goToFin}>
                Continue to Final
              </button>
            </div>
            {!hasUnresolved ? <p className="context-note">All fields are resolved.</p> : null}
          </section>
        </section>
      ) : null}

      {view === 'fin' ? (
        <section className="view-shell">
          <section className="card view-footer-actions">
            <ResultsPanel result={state.result} title="Final Downloads" showContainer={false} />
            <div className="actions">
              <button type="button" onClick={goToSetup}>
                Reset
              </button>
            </div>
          </section>
        </section>
      ) : null}
    </main>
  );
};
