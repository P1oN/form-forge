import { fillPdf, runPipeline } from '@form-forge/core';
import type { FillPlan } from '@form-forge/core';
import { useMemo, useState } from 'react';

import type { PipelineState } from '../types';
import { fileToArrayBuffer } from '../utils/file';

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.cause instanceof Error) {
      return `${error.message}\ncause: ${error.cause.message}`;
    }
    return error.message;
  }
  return 'Unknown pipeline error';
};

export const usePipeline = () => {
  const [state, setState] = useState<PipelineState>({
    running: false,
    progress: [],
  });

  const run = useMemo(
    () => async (templateFile: File, clientFiles: File[]) => {
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

        const result = await runPipeline({
          templatePdf,
          clientFiles: payload,
          onProgress: (event) => {
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
