import { generateCsv } from '../csv/generate-csv';
import type { ExtractedBlocks } from '../types/extraction';
import type { LLMMappingResult, LLMProvider } from '../types/provider';
import type { TemplateInventory } from '../types/template';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock';

  public async map(args: {
    template: TemplateInventory;
    extracted: ExtractedBlocks;
    unresolvedFieldIds: string[];
  }): Promise<LLMMappingResult> {
    const entries = args.template.fields
      .filter((field) => args.unresolvedFieldIds.includes(field.fieldId))
      .map((field) => ({
        fieldId: field.fieldId,
        fieldType: field.fieldType,
        value: '[LLM_REVIEW_REQUIRED]',
        confidence: 0.6,
        source: {
          pageIndex: field.pageIndex,
          sourceHint: 'llm-mock',
        },
        targetPdfFieldName: field.pdfFieldName,
      }));

    const fillPlan = {
      entries,
      unresolved: [],
      createdAt: new Date().toISOString(),
    };

    return {
      fillPlan,
      csv: generateCsv(fillPlan),
    };
  }
}
