import { BrowserTesseractOcrEngine, GeminiVisionProvider, fillPdf, runPipeline } from '@form-forge/core';
import type { FillPlan } from '@form-forge/core';
import { useMemo, useState } from 'react';

import type { PipelineState } from '../types';
import { fileToArrayBuffer } from '../utils/file';

export type RecognitionEngine = 'tesseract' | 'gemini';
const DEFAULT_GEMINI_CONFIDENCE_THRESHOLD = 0.4;

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      return `${error.message}\ncause: ${error.cause.message}`;
    }
    return error.message;
  }
  return 'Unknown pipeline error';
};

const resolveGeminiConfidenceThreshold = (rawValue?: string): number => {
  const value = rawValue?.trim();
  if (!value) {
    return DEFAULT_GEMINI_CONFIDENCE_THRESHOLD;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('VITE_GEMINI_CONFIDENCE_THRESHOLD must be a number between 0 and 1.');
  }

  return parsed;
};

export const usePipeline = () => {
  const [state, setState] = useState<PipelineState>({
    running: false,
    progress: [],
  });

  const run = useMemo(
    () => async (templateFile: File, clientFiles: File[], engine: RecognitionEngine) => {
      setState({ running: true, progress: [] });
      try {
        const templatePdf = await fileToArrayBuffer(templateFile);
        const payload = await Promise.all(
          clientFiles.map(async (file) => ({
            name: file.name,
            data: await file.arrayBuffer(),
            mime: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          })),
        );

        const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
        const geminiModel = import.meta.env.VITE_GEMINI_MODEL?.trim();
        const geminiConfidenceThreshold = resolveGeminiConfidenceThreshold(
          import.meta.env.VITE_GEMINI_CONFIDENCE_THRESHOLD,
        );

        const llm =
          engine === 'gemini'
            ? new GeminiVisionProvider({
                apiKey: geminiApiKey || '',
                logger: console,
                confidenceThreshold: geminiConfidenceThreshold,
                ...(geminiModel ? { model: geminiModel } : {}),
              })
            : undefined;

        if (engine === 'gemini' && !geminiApiKey) {
          throw new Error('Gemini selected but VITE_GEMINI_API_KEY is not configured.');
        }

        const result = await runPipeline({
          templatePdf,
          clientFiles: payload,
          ...(engine === 'tesseract' ? { ocrEngine: new BrowserTesseractOcrEngine() } : {}),
          ...(engine === 'gemini' ? { llm } : {}),
          config: {
            llmMode: engine === 'gemini' ? 'auto' : 'disabled',
          },
          onProgress: (event) => {
            console.info('Pipeline progress', {
              phase: event.phase,
              percent: event.percent,
              message: event.message,
            });
            setState((current) => ({
              ...current,
              progress: [...current.progress, event],
            }));
          },
        });

        setState((current) => ({
          ...current,
          running: false,
          result,
        }));
      } catch (error) {
        const message = extractErrorMessage(error);
        console.error('Pipeline run failed', { message });
        setState({ running: false, progress: [], error: message });
      }
    },
    [],
  );

  const rerunFillOnly = useMemo(
    () => async (templateFile: File, fillPlan: FillPlan) => {
      const templatePdf = await fileToArrayBuffer(templateFile);
      const pdfBytes = await fillPdf(templatePdf, fillPlan);
      setState((current) => {
        if (!current.result) {
          return current;
        }

        return {
          ...current,
          result: {
            ...current.result,
            pdfBytes,
            fillPlan,
          },
        };
      });
    },
    [],
  );

  return {
    state,
    run,
    rerunFillOnly,
  };
};
