# AGENTS

## Purpose

This repository builds a deterministic-first, browser-first scan-to-fillable-PDF pipeline.

## Engineering rules

- Prefer deterministic parsing/mapping/filling before any LLM call.
- Keep all public contracts schema-validated with `zod`.
- Use strict TypeScript, no implicit `any`.
- Maintain typed error classes with stable error codes.
- Use relative bboxes (`0..1`) everywhere.

## Security and privacy

- Do not send document content externally unless LLM provider is explicitly configured.
- Minimize data passed to LLM providers.
- Never log full raw extracted content or PII values in plaintext.

## Testing expectations

Before submitting changes:
- Repository tests must be run through Docker:
  - `npm run docker:lint`
  - `npm run docker:typecheck`
  - `npm run docker:test`
- Native fallback:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`

Include tests for:
- schema validation paths
- deterministic mapping behavior
- CSV RFC4180 output
- fill behavior (acroform + flat)
- LLM fallback behavior with mock provider

## Contribution checklist

- Preserve API compatibility in `packages/core/src/index.ts` exports.
- Add/update docs for any config or behavior change.
- Keep modules small and explicit; avoid hidden side effects.
