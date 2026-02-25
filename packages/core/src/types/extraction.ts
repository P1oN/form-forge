import type { BBoxOrigin, RelativeBBox } from './common';

export interface ExtractedBlock {
  text: string;
  bbox: RelativeBBox;
  bboxOrigin: BBoxOrigin;
  confidence: number;
  sourceHint: 'pdf_text' | 'ocr' | 'manual';
}

export interface ExtractedPage {
  pageIndex: number;
  blocks: ExtractedBlock[];
}

export interface ExtractedBlocks {
  pages: ExtractedPage[];
  createdAt: string;
  filesProcessed: string[];
}
