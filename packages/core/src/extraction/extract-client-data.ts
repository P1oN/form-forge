import { getDocument } from 'pdfjs-dist';

import { InputValidationError, OcrError, PdfParseError } from '../errors';
import { extractedBlocksSchema } from '../schemas';
import { validateClientFiles } from './input-validation';
import type { ExtractedBlock, ExtractedBlocks } from '../types/extraction';
import type { PipelineConfig } from '../types/pipeline';
import { nowIso } from '../utils/clock';
import { hashBytes } from '../utils/hash';
import { normalizePdfArrayBuffer } from '../utils/pdf-bytes';
import { NoopOcrEngine } from '../workers/ocr';
import type { OcrEngine } from '../workers/ocr';


interface ExtractOptions {
  config: PipelineConfig;
  ocrEngine?: OcrEngine;
}

const normalizeFromPdf = (
  item: { transform: number[]; width: number; height: number; str: string },
  pageWidth: number,
  pageHeight: number,
): ExtractedBlock => {
  const x = item.transform[4] ?? 0;
  const y = item.transform[5] ?? 0;
  const h = item.height || 12;
  const w = item.width || Math.max(10, item.str.length * 5);

  return {
    text: item.str,
    bbox: [x / pageWidth, Math.max(0, (y - h) / pageHeight), w / pageWidth, h / pageHeight],
    bboxOrigin: 'top_left',
    confidence: 1,
    sourceHint: 'pdf_text',
  };
};

const loadPdfTextBlocks = async (
  pdfBytes: ArrayBuffer,
  limits: PipelineConfig['limits'],
): Promise<Array<{ pageIndex: number; blocks: ExtractedBlock[] }>> => {
  try {
    const task = getDocument({ data: normalizePdfArrayBuffer(pdfBytes) });
    const doc = await task.promise;
    if (doc.numPages > limits.maxPagesPerFile) {
      throw new InputValidationError('PDF exceeds maxPagesPerFile limit.', {
        pages: doc.numPages,
        maxPagesPerFile: limits.maxPagesPerFile,
      });
    }

    const pages: Array<{ pageIndex: number; blocks: ExtractedBlock[] }> = [];

    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const blocks: ExtractedBlock[] = [];

      for (const raw of textContent.items as Array<Record<string, unknown>>) {
        const str = typeof raw.str === 'string' ? raw.str : '';
        const transform = Array.isArray(raw.transform)
          ? raw.transform.filter((n): n is number => typeof n === 'number')
          : [];
        const width = typeof raw.width === 'number' ? raw.width : 0;
        const height = typeof raw.height === 'number' ? raw.height : 0;

        if (str.trim().length === 0 || transform.length < 6) {
          continue;
        }

        blocks.push(
          normalizeFromPdf(
            {
              str,
              transform,
              width,
              height,
            },
            viewport.width,
            viewport.height,
          ),
        );
      }

      pages.push({ pageIndex: i - 1, blocks });
    }

    return pages;
  } catch (error) {
    if (error instanceof InputValidationError) {
      throw error;
    }
    throw new PdfParseError('Failed to parse client PDF.', error);
  }
};

const readImageAsBytes = (data: ArrayBuffer): Uint8Array => new Uint8Array(data);

export const extractClientData = async (
  files: Array<{ name: string; data: ArrayBuffer; mime: string }>,
  options: ExtractOptions,
): Promise<ExtractedBlocks> => {
  const { config } = options;
  const ocrEngine = options.ocrEngine ?? new NoopOcrEngine();

  validateClientFiles(files, config.limits);

  const pages: Array<{ pageIndex: number; blocks: ExtractedBlock[] }> = [];

  for (const file of files) {
    config.logger?.info('Extracting file', { fileName: file.name, mime: file.mime });
    if (file.mime === 'application/pdf') {
      const pdfPages = await loadPdfTextBlocks(file.data, config.limits);
      if (pages.length + pdfPages.length > config.limits.maxTotalPages) {
        throw new InputValidationError('Total extracted pages exceed maxTotalPages limit.', {
          currentTotal: pages.length,
          incoming: pdfPages.length,
          maxTotalPages: config.limits.maxTotalPages,
        });
      }

      const hasText = pdfPages.some((p) => p.blocks.length > 0);
      if (!hasText) {
        const hash = await hashBytes(file.data);
        const cached = (await config.ocrCache?.get(hash)) as ExtractedBlock[] | undefined;
        const attachToFirstPage = (blocks: ExtractedBlock[]) => {
          if (blocks.length === 0) {
            return;
          }
          const firstPage = pdfPages[0];
          if (!firstPage) {
            return;
          }
          firstPage.blocks = [...firstPage.blocks, ...blocks];
        };

        if (cached) {
          attachToFirstPage(cached);
        } else {
          try {
            const blocks = await ocrEngine.run({ imageData: new Uint8Array(file.data), pageIndex: 0 });
            attachToFirstPage(blocks);
            await config.ocrCache?.set(hash, blocks);
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'unknown OCR error';
            config.logger?.warn('OCR skipped for scanned PDF; continuing without OCR blocks.', {
              fileName: file.name,
              reason,
            });
          }
        }
      }

      pdfPages.forEach((page) => pages.push(page));
      continue;
    }

    if (pages.length + 1 > config.limits.maxTotalPages) {
      throw new InputValidationError('Total extracted pages exceed maxTotalPages limit.', {
        currentTotal: pages.length,
        maxTotalPages: config.limits.maxTotalPages,
      });
    }

    const hash = await hashBytes(file.data);
    const cached = (await config.ocrCache?.get(hash)) as ExtractedBlock[] | undefined;
    if (cached) {
      pages.push({ pageIndex: 0, blocks: cached });
      continue;
    }

    try {
      const blocks = await ocrEngine.run({ imageData: readImageAsBytes(file.data), pageIndex: 0 });
      pages.push({ pageIndex: 0, blocks });
      await config.ocrCache?.set(hash, blocks);
    } catch (error) {
      throw new OcrError('OCR failed for image document.', error);
    }
  }

  const payload = extractedBlocksSchema.parse({
    pages,
    createdAt: nowIso(),
    filesProcessed: files.map((file) => file.name),
  });

  return payload;
};
