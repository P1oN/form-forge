import type { BBoxOrigin } from '@form-forge/core';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useEffect, useRef } from 'react';

GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

interface SourcePreviewProps {
  sourceFile?: File | undefined;
  bbox?: [number, number, number, number] | undefined;
  bboxOrigin?: BBoxOrigin | undefined;
  pageIndex?: number | undefined;
  strokeColor?: string;
}

export const computePreviewDrawY = (
  y: number,
  h: number,
  bboxOrigin: BBoxOrigin | undefined,
): number => (bboxOrigin === 'bottom_left' ? 1 - y - h : y);

const drawBbox = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  bbox?: [number, number, number, number] | undefined,
  bboxOrigin?: BBoxOrigin,
  strokeColor = '#c9382b',
): void => {
  if (!bbox) {
    return;
  }
  const [x, y, w, h] = bbox;
  const drawY = computePreviewDrawY(y, h, bboxOrigin);

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x * canvas.width, drawY * canvas.height, w * canvas.width, h * canvas.height);
};

export const SourcePreview = ({
  sourceFile,
  bbox,
  bboxOrigin,
  pageIndex = 0,
  strokeColor = '#c9382b',
}: SourcePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderSequenceRef = useRef(0);

  useEffect(() => {
    if (!sourceFile || !canvasRef.current) {
      return;
    }

    renderSequenceRef.current += 1;
    const renderSequence = renderSequenceRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    let cancelled = false;
    let pdfRenderTask: { promise: Promise<void>; cancel: () => void } | null = null;
    let objectUrl: string | null = null;

    const render = async () => {
      if (sourceFile.type === 'application/pdf') {
        const bytes = await sourceFile.arrayBuffer();
        if (cancelled || renderSequence !== renderSequenceRef.current) {
          return;
        }

        const loadingTask = getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        if (cancelled || renderSequence !== renderSequenceRef.current) {
          await loadingTask.destroy();
          return;
        }

        const safePageIndex = Math.max(0, Math.min(pageIndex, doc.numPages - 1));
        const page = await doc.getPage(safePageIndex + 1);
        const viewport = page.getViewport({ scale: 0.8 });
        if (cancelled || renderSequence !== renderSequenceRef.current) {
          await loadingTask.destroy();
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        pdfRenderTask = page.render({ canvasContext: ctx, viewport });
        await pdfRenderTask.promise;
        if (cancelled || renderSequence !== renderSequenceRef.current) {
          await loadingTask.destroy();
          return;
        }

        drawBbox(ctx, canvas, bbox, bboxOrigin, strokeColor);
        await loadingTask.destroy();
        return;
      }

      const url = URL.createObjectURL(sourceFile);
      objectUrl = url;
      const image = new Image();
      image.onload = () => {
        if (cancelled || renderSequence !== renderSequenceRef.current) {
          URL.revokeObjectURL(url);
          return;
        }
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        drawBbox(ctx, canvas, bbox, bboxOrigin, strokeColor);
        URL.revokeObjectURL(url);
        objectUrl = null;
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        objectUrl = null;
      };
      image.src = url;
    };

    void render().catch((error: unknown) => {
      const maybeNamed = error as { name?: string };
      if (maybeNamed?.name === 'RenderingCancelledException') {
        return;
      }
      console.error('SourcePreview render failed', error);
    });

    return () => {
      cancelled = true;
      if (pdfRenderTask) {
        try {
          pdfRenderTask.cancel();
        } catch {
          // no-op
        }
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [sourceFile, bbox, bboxOrigin, pageIndex, strokeColor]);

  return <canvas ref={canvasRef} className="source-canvas" />;
};
