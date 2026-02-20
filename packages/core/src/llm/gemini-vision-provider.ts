import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

import { generateCsv } from '../csv/generate-csv';
import { MappingError } from '../errors';
import { fillPlanSchema } from '../schemas';
import type { Logger } from '../types/common';
import type { ExtractedBlocks } from '../types/extraction';
import type { FillPlan } from '../types/fill-plan';
import type { LLMMappingResult, LLMProvider } from '../types/provider';
import type { TemplateInventory } from '../types/template';
import { nowIso } from '../utils/clock';

interface GeminiVisionOptions {
  apiKey: string;
  model?: string | undefined;
  logger?: Logger | undefined;
  confidenceThreshold?: number | undefined;
  maxRetries?: number | undefined;
  retryBaseMs?: number | undefined;
  client?: GeminiClientLike | undefined;
}

interface GeminiClientLike {
  models: {
    generateContent(args: {
      model: string;
      contents: Array<{ role: string; parts: Array<Record<string, unknown>> }>;
      config?: { temperature?: number; responseMimeType?: string };
    }): Promise<{ text?: string | undefined }>;
  };
}

const answerSchema = z
  .object({
    fieldId: z.string().min(1),
    typedText: z.string().optional(),
    checked: z.boolean().optional(),
    selectedOption: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    reason: z.string().nullable().optional(),
  })
  .strict();

const geminiResponseSchema = z
  .object({
    answers: z.array(answerSchema),
  })
  .strict();

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const bytesToBase64 = (bytes: Uint8Array): string => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  for (let idx = 0; idx < bytes.length; idx += 1) {
    binary += String.fromCharCode(bytes[idx] ?? 0);
  }
  return btoa(binary);
};

const extractJsonText = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced?.[1] ?? raw).trim();
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getErrorStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const obj = error as { status?: unknown; code?: unknown };
  if (typeof obj.status === 'number') {
    return obj.status;
  }
  if (typeof obj.code === 'number') {
    return obj.code;
  }
  return undefined;
};

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export class GeminiVisionProvider implements LLMProvider {
  public readonly name = 'gemini-vision';
  private readonly options: {
    model: string;
    confidenceThreshold: number;
    maxRetries: number;
    retryBaseMs: number;
    logger: Logger | undefined;
    client: GeminiClientLike;
  };

  public constructor(options: GeminiVisionOptions) {
    this.options = {
      model: options.model ?? DEFAULT_MODEL,
      confidenceThreshold: options.confidenceThreshold ?? 0.4,
      maxRetries: options.maxRetries ?? 2,
      retryBaseMs: options.retryBaseMs ?? 800,
      logger: options.logger,
      client: options.client ?? new GoogleGenAI({ apiKey: options.apiKey }),
    };
  }

  public async map(args: {
    template: TemplateInventory;
    extracted: ExtractedBlocks;
    unresolvedFieldIds: string[];
    clientFiles?: Array<{ name: string; data: ArrayBuffer; mime: string }> | undefined;
  }): Promise<LLMMappingResult> {
    const files = args.clientFiles ?? [];
    if (files.length === 0) {
      throw new MappingError('Gemini provider requires clientFiles.');
    }

    const unresolvedFields = args.template.fields.filter((field) =>
      args.unresolvedFieldIds.includes(field.fieldId),
    );
    if (unresolvedFields.length === 0) {
      const empty: FillPlan = { entries: [], unresolved: [], createdAt: nowIso() };
      return { fillPlan: empty, csv: generateCsv(empty) };
    }

    const prompt = [
      'You read form documents and return JSON only.',
      'For each field in unresolvedFields return one answer object.',
      'Checkbox fields: set checked true or false.',
      'Text-like fields: set typedText with exact handwriting transcription.',
      'Radio fields: set selectedOption.',
      'If unreadable set confidence below 0.6 and provide reason.',
      'Return shape: {"answers":[{"fieldId":"...","typedText?":"...","checked?":true,"selectedOption?":"...","confidence":0.0,"reason?":"..."}]}',
      `Template fields: ${JSON.stringify(unresolvedFields)}`,
      `Extracted text context: ${JSON.stringify(args.extracted)}`,
    ].join('\n');

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    files.forEach((file) => {
      parts.push({
        inlineData: {
          mimeType: file.mime || 'application/octet-stream',
          data: bytesToBase64(new Uint8Array(file.data)),
        },
      });
    });

    const requestPayload = {
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    };

    let rawContent: string | undefined;
    let lastStatus: number | undefined;
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      this.options.logger?.info('Gemini request attempt', {
        attempt: attempt + 1,
        maxAttempts: this.options.maxRetries + 1,
        model: this.options.model,
        files: files.length,
      });
      try {
        const response = await this.options.client.models.generateContent({
          model: this.options.model,
          contents: requestPayload.contents,
          config: requestPayload.config,
        });
        rawContent = response.text;
        this.options.logger?.info('Gemini request succeeded', {
          attempt: attempt + 1,
          rawContent,
        });
        break;
      } catch (error) {
        const status = getErrorStatus(error);
        lastStatus = status;
        const isRateLimit = status === 429;
        if (!isRateLimit || attempt === this.options.maxRetries) {
          this.options.logger?.warn('Gemini request failed', {
            status: status ?? 'unknown',
            attempt: attempt + 1,
          });
          break;
        }
        const retryAfterMs = this.options.retryBaseMs * 2 ** attempt;
        this.options.logger?.warn('Gemini rate-limited, retrying', {
          status: status ?? 'unknown',
          attempt: attempt + 1,
          retryAfterMs,
        });
        await sleep(retryAfterMs);
      }
    }

    if (!rawContent) {
      const status = lastStatus ?? 0;
      const isRateLimit = status === 429;
      const guidance = isRateLimit
        ? ' Rate limit hit. Retry later or reduce request frequency.'
        : '';
      throw new MappingError(`Gemini request failed: HTTP ${status}.${guidance}`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonText(rawContent));
    } catch (error) {
      throw new MappingError('Gemini returned invalid JSON.', error);
    }

    const structured = geminiResponseSchema.parse(parsed);
    const byFieldId = new Map(structured.answers.map((answer) => [answer.fieldId, answer]));
    const entries: FillPlan['entries'] = [];
    const unresolved: FillPlan['unresolved'] = [];

    unresolvedFields.forEach((field) => {
      const answer = byFieldId.get(field.fieldId);
      if (!answer) {
        unresolved.push({
          fieldId: field.fieldId,
          reason: 'Gemini did not return this field.',
          confidence: 0,
        });
        return;
      }

      const confidence = clamp01(answer.confidence ?? 0.5);
      let value: string | boolean | undefined;

      if (field.fieldType === 'checkbox') {
        value = answer.checked;
      } else if (field.fieldType === 'radio') {
        value = answer.selectedOption;
      } else {
        value = answer.typedText;
      }

      if (typeof value === 'undefined' || value === '') {
        unresolved.push({
          fieldId: field.fieldId,
          reason: answer.reason ?? 'No usable value returned by Gemini.',
          confidence,
        });
        return;
      }

      entries.push({
        fieldId: field.fieldId,
        fieldType: field.fieldType,
        value,
        confidence,
        source: {
          pageIndex: field.pageIndex,
          bbox: field.bbox,
          sourceHint: 'gemini_vlm',
        },
        targetPdfFieldName: field.pdfFieldName,
        ...(confidence < this.options.confidenceThreshold
          ? { unresolvedReason: answer.reason ?? 'Below confidence threshold.' }
          : {}),
      });

      if (confidence < this.options.confidenceThreshold) {
        unresolved.push({
          fieldId: field.fieldId,
          reason: answer.reason ?? 'Below confidence threshold.',
          confidence,
        });
      }
    });

    const fillPlan = fillPlanSchema.parse({
      entries,
      unresolved,
      createdAt: nowIso(),
    });

    return {
      fillPlan,
      csv: generateCsv(fillPlan),
    };
  }
}
