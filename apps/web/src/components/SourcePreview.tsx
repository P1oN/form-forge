import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useEffect, useRef } from 'react';

GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

interface SourcePreviewProps {
  sourceFile?: File | undefined;
  bbox?: [number, number, number, number] | undefined;
}

const drawBbox = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  bbox?: [number, number, number, number] | undefined,
): void => {
  if (!bbox) {
    return;
  }
  const [x, y, w, h] = bbox;
  ctx.strokeStyle = '#c9382b';
  ctx.lineWidth = 2;
  ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height);
};

export const SourcePreview = ({ sourceFile, bbox }: SourcePreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!sourceFile || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const render = async () => {
      if (sourceFile.type === 'application/pdf') {
        const bytes = await sourceFile.arrayBuffer();
        const doc = await getDocument({ data: bytes }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
        drawBbox(ctx, canvas, bbox);
        return;
      }

      const url = URL.createObjectURL(sourceFile);
      const image = new Image();
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        drawBbox(ctx, canvas, bbox);
        URL.revokeObjectURL(url);
      };
      image.src = url;
    };

    void render();
  }, [sourceFile, bbox]);

  return <canvas ref={canvasRef} className="source-canvas" />;
};
