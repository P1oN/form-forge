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

## Zed Remote SSH Into Dev Container

This lets Zed use container-installed dependencies (no host install needed).

1. Create an SSH key for container access (if you do not already have one):
```bash
ssh-keygen -t ed25519 -f ~/.ssh/form_forge_dev -C "form-forge-dev"
```
2. Prepare authorized keys file for the container:
```bash
mkdir -p .devcontainer
cp ~/.ssh/form_forge_dev.pub .devcontainer/authorized_keys
```
3. Start the SSH dev container:
```bash
docker compose up -d dev-ssh
```
4. Install dependencies inside container (one-time per volume):
```bash
docker compose exec dev-ssh pnpm install
```
5. Add this SSH host to `~/.ssh/config`:
```sshconfig
Host form-forge-dev
  HostName 127.0.0.1
  Port 2222
  User node
  IdentityFile ~/.ssh/form_forge_dev
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
```
6. In Zed, use Remote SSH and connect to `form-forge-dev`, then open `/workspace`.

## Native setup (optional)

```bash
pnpm install
pnpm build
pnpm test
pnpm dev
```

### Gemini configuration (web app)

For local Gemini vision fallback in `apps/web`, set:

```bash
VITE_GEMINI_API_KEY=your_api_key
# Optional override (default: gemini-2.5-flash-lite)
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
```

Env file location:
- In this monorepo, `apps/web` is configured to read env vars from the repo root (`/Users/bm/Documents/repos/form-forge/.env`).

In the UI, choose recognition engine:
- `Tesseract`: browser OCR fallback
- `Gemini`: vision LLM fallback for unresolved fields (checkboxes + handwriting/text)

## Field test walkthrough

1. Start web app.
2. Click `Use Field Test Files`.
3. Run pipeline.
4. Download outputs.
5. Use Human Review to correct unresolved fields.
6. Click `Apply Manual Edits and Refill` to regenerate PDF without rerunning OCR.

Note: field-test loader uses Vite dev `@fs` path access and is intended for local demo.

## Tradeoffs

- Deterministic mapping is prioritized for repeatability.
- Flat templates are reliable when `TemplateRegionConfig` is provided.
- OCR quality varies by scan quality and handwriting legibility.
