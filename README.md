# Form Forge

Browser-first scan-to-fillable-PDF solution.

## What it does

Users upload:
- `CLIENT_COMPLETED_DOCS` (PDF/JPEG/PNG, including scanned PDFs)
- `BLANK_TEMPLATE_PDF`

Pipeline output:
- `result_filled.pdf`
- `result.csv` (RFC4180)
- `fill_plan.json`
- `validation_report.json`

## Monorepo

- `packages/core`: deterministic pipeline engine (TypeScript)
- `apps/web`: Vite + React UI
- `examples/empty_form.pdf`: canonical field-test template
- `examples/raw_filled.pdf`: field-test source document

## Architecture

Phases:
1. A - Analyze template (AcroForm vs flat)
2. B - Extract client data (PDF text extraction + OCR fallback)
3. C - Map values (deterministic first, optional LLM fallback)
4. D - Fill PDF + validate

Core API:
- `analyzeTemplate`
- `extractClientData`
- `mapToTemplate`
- `fillPdf`
- `runPipeline`

## Security defaults

- Local-only processing by default.
- LLM usage is optional and configurable (`disabled | auto | required`).
- Redacted logging avoids full raw PII dumps.

## Docker-first setup (recommended)

Prerequisite: Docker + Docker Compose.

Run web app:

```bash
docker compose up web
```

Then open:
- [http://localhost:5173](http://localhost:5173)

Run workspace tasks in Docker:

```bash
docker compose run --rm workspace pnpm -w build
docker compose run --rm workspace pnpm -w test
docker compose run --rm workspace pnpm -w lint
docker compose run --rm workspace pnpm -w typecheck
```

Or use npm helpers:

```bash
npm run docker:dev
npm run docker:build
npm run docker:test
npm run docker:lint
npm run docker:typecheck
```

## Native setup (optional)

```bash
pnpm install
pnpm build
pnpm test
pnpm dev
```

## Field test walkthrough

1. Start web app.
2. Click `Use Field Test Files`.
3. Run pipeline.
4. Download outputs.
5. Use Human Review to correct unresolved fields.
6. Click `Apply Manual Edits and Refill` to regenerate PDF without rerunning OCR.

Note: field-test loader uses Vite dev `@fs` path access and is intended for local demo.

## Known issues

- Example PDFs currently fail in some runs during template analysis:
  - Input: `/Users/bm/Documents/repos/form-forge/examples/empty_form.pdf`
  - Error: `Pipeline execution failed: Failed to analyze template PDF. Failed to parse PDF document (line:38 col:0 offset=552): No PDF header found`
  - Status: known bug, not fixed yet.

## Tradeoffs

- Deterministic mapping is prioritized for repeatability.
- Flat templates are reliable when `TemplateRegionConfig` is provided.
- OCR quality varies by scan quality and handwriting legibility.
