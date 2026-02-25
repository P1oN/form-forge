import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { extractClientData } from '../src/extraction/extract-client-data';
import type { ExtractedBlock } from '../src/types/extraction';
import type { PipelineConfig } from '../src/types/pipeline';
import type { OcrEngine, OcrInput } from '../src/workers/ocr';

const createBlankPdf = async (): Promise<ArrayBuffer> => {
  const doc = await PDFDocument.create();
  doc.addPage([400, 400]);
  return doc.save();
};

const makeConfig = (): PipelineConfig => ({
  llmMode: 'disabled',
  deterministicThreshold: 0.75,
  limits: {
    maxFileSizeBytes: 15 * 1024 * 1024,
    maxPagesPerFile: 25,
    maxTotalPages: 100,
  },
});

class ThrowingOcrEngine implements OcrEngine {
  public async run(input: OcrInput): Promise<ExtractedBlock[]> {
    void input;
    throw new Error('ocr backend unavailable');
  }
}

class TopLeftOcrEngine implements OcrEngine {
  public async run(input: OcrInput): Promise<ExtractedBlock[]> {
    void input;
    return [
      {
        text: 'Ada',
        bbox: [0.1, 0.2, 0.3, 0.1],
        bboxOrigin: 'top_left',
        confidence: 0.9,
        sourceHint: 'ocr',
      },
    ];
  }
}

describe('extractClientData', () => {
  it('continues when OCR fails for scanned PDF', async () => {
    const pdf = await createBlankPdf();

    const extracted = await extractClientData(
      [{ name: 'scanned.pdf', data: pdf, mime: 'application/pdf' }],
      {
        config: makeConfig(),
        ocrEngine: new ThrowingOcrEngine(),
      },
    );

    expect(extracted.pages.length).toBe(1);
    expect(extracted.pages[0]?.blocks ?? []).toEqual([]);
  });

  it('preserves top-left bbox origin for OCR image blocks', async () => {
    const extracted = await extractClientData(
      [{ name: 'scan.png', data: new Uint8Array([1, 2, 3]).buffer, mime: 'image/png' }],
      {
        config: makeConfig(),
        ocrEngine: new TopLeftOcrEngine(),
      },
    );

    expect(extracted.pages[0]?.blocks[0]?.bboxOrigin).toBe('top_left');
  });
});
