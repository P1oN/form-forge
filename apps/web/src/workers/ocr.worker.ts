/// <reference lib="webworker" />

import { BrowserTesseractOcrEngine } from '@form-forge/core';

const engine = new BrowserTesseractOcrEngine();

self.onmessage = async (event: MessageEvent<{ imageData: Uint8Array; pageIndex: number }>) => {
  try {
    const blocks = await engine.run({
      imageData: event.data.imageData,
      pageIndex: event.data.pageIndex,
    });
    self.postMessage({ ok: true, blocks });
  } catch (error) {
    self.postMessage({ ok: false, message: error instanceof Error ? error.message : 'OCR worker error' });
  }
};
