import type { ExtractedBlock } from '../types/extraction';

export interface OcrInput {
  imageData: Uint8Array;
  pageIndex: number;
  language?: string | undefined;
}

export interface OcrEngine {
  run(input: OcrInput): Promise<ExtractedBlock[]>;
}

interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrResult {
  data: {
    words?: OcrWord[];
    width?: number;
    height?: number;
  };
}

export class BrowserTesseractOcrEngine implements OcrEngine {
  public async run(input: OcrInput): Promise<ExtractedBlock[]> {
    const tesseract = await import('tesseract.js');
    const bytes = new Uint8Array(input.imageData);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const imageBlob = new Blob([buffer]);
    const result = (await tesseract.recognize(imageBlob, input.language ?? 'eng')) as unknown as OcrResult;

    const width = result.data.width ?? 1;
    const height = result.data.height ?? 1;

    return (result.data.words ?? []).map((word) => ({
      text: word.text,
      bbox: [
        word.bbox.x0 / width,
        word.bbox.y0 / height,
        (word.bbox.x1 - word.bbox.x0) / width,
        (word.bbox.y1 - word.bbox.y0) / height,
      ],
      bboxOrigin: 'top_left' as const,
      confidence: Math.max(0, Math.min(1, word.confidence / 100)),
      sourceHint: 'ocr' as const,
    }));
  }
}

export class NoopOcrEngine implements OcrEngine {
  public async run(): Promise<ExtractedBlock[]> {
    return [];
  }
}
