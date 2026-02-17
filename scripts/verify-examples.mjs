import { readFile } from 'node:fs/promises';

import { runPipeline } from '../packages/core/dist/index.js';

const template = await readFile('../examples/empty_form.pdf', { encoding: null });
const raw = await readFile('../examples/raw_filled.pdf', { encoding: null });

const toArrayBuffer = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const out = await runPipeline({
  templatePdf: toArrayBuffer(template),
  clientFiles: [{ name: 'raw_filled.pdf', data: toArrayBuffer(raw), mime: 'application/pdf' }],
});

console.log(
  JSON.stringify(
    {
      pdfBytes: out.pdfBytes.length,
      csvLen: out.csv.length,
      entries: out.fillPlan.entries.length,
      unresolved: out.fillPlan.unresolved.length,
      valid: out.report.valid,
    },
    null,
    2,
  ),
);
