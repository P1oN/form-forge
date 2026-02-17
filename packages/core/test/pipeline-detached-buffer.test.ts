import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { runPipeline } from '../src/pipeline/run-pipeline';
import type { ExtractedBlock } from '../src/types/extraction';
import type { LLMMappingResult, LLMProvider } from '../src/types/provider';
import type { OcrEngine, OcrInput } from '../src/workers/ocr';

const createPdf = async (): Promise<ArrayBuffer> => {
  const doc = await PDFDocument.create();
  doc.addPage([500, 500]);
  return doc.save();
};

class DetachingOcrEngine implements OcrEngine {
  public async run(input: OcrInput): Promise<ExtractedBlock[]> {
    // Simulate worker transfer side effects where OCR consumes/transfer-detaches input bytes.
    structuredClone({ ok: true }, { transfer: [input.imageData.buffer] });
    return [];
  }
}

class BytesCheckingLlm implements LLMProvider {
  public readonly name = 'bytes-checking';

  public async map(args: {
    unresolvedFieldIds: string[];
    clientFiles?: Array<{ name: string; data: ArrayBuffer; mime: string }> | undefined;
  }): Promise<LLMMappingResult> {
    const client = args.clientFiles?.[0];
    expect(client).toBeDefined();
    expect(() => new Uint8Array(client!.data)).not.toThrow();

    return {
      fillPlan: {
        entries: args.unresolvedFieldIds.map((fieldId) => ({
          fieldId,
          fieldType: 'text',
          value: 'LLM_VALUE',
          confidence: 0.95,
          source: { pageIndex: 0, sourceHint: 'llm-test' },
        })),
        unresolved: [],
        createdAt: new Date().toISOString(),
      },
      csv: '',
    };
  }
}

describe('runPipeline buffer lifecycle', () => {
  it('keeps LLM client files usable even if OCR detaches extraction buffers', async () => {
    const templatePdf = await createPdf();
    const scannedPdf = await createPdf();

    const result = await runPipeline({
      templatePdf,
      clientFiles: [{ name: 'scan.pdf', data: scannedPdf, mime: 'application/pdf' }],
      templateRegionConfig: {
        fields: [
          {
            fieldId: 'handwritten_name',
            fieldType: 'text',
            pageIndex: 0,
            bbox: [0.1, 0.1, 0.3, 0.05],
          },
        ],
      },
      ocrEngine: new DetachingOcrEngine(),
      llm: new BytesCheckingLlm(),
      config: {
        llmMode: 'auto',
      },
    });

    expect(result.fillPlan.entries[0]?.value).toBe('LLM_VALUE');
  });
});
