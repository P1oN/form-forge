import { MappingError } from '../errors';
import { fillPlanSchema } from '../schemas';
import type { ExtractedBlocks } from '../types/extraction';
import type { LLMMappingResult, LLMProvider } from '../types/provider';
import type { TemplateInventory } from '../types/template';

interface OpenAiCompatibleOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
}

export class OpenAiCompatibleProvider implements LLMProvider {
  public readonly name = 'openai-compatible';
  private readonly options: OpenAiCompatibleOptions;

  public constructor(options: OpenAiCompatibleOptions) {
    this.options = options;
  }

  public async map(args: {
    template: TemplateInventory;
    extracted: ExtractedBlocks;
    unresolvedFieldIds: string[];
  }): Promise<LLMMappingResult> {
    const doFetch = this.options.fetchImpl ?? fetch;

    const response = await doFetch(`${this.options.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.options.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Return JSON with keys fillPlan and csv. FillPlan must satisfy strict schema with entries/unresolved/createdAt.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              template: args.template,
              extracted: args.extracted,
              unresolvedFieldIds: args.unresolvedFieldIds,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new MappingError(`LLM provider request failed: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new MappingError('LLM provider returned empty content.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new MappingError('LLM provider returned invalid JSON.', error);
    }

    const json = parsed as { fillPlan?: unknown; csv?: unknown };
    const fillPlan = fillPlanSchema.parse(json.fillPlan);
    const csv = typeof json.csv === 'string' ? json.csv : '';

    return { fillPlan, csv };
  }
}
