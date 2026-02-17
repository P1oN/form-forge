import type { ExtractedBlocks } from './extraction';
import type { FillPlan } from './fill-plan';
import type { TemplateInventory } from './template';

export interface LLMMappingResult {
  fillPlan: FillPlan;
  csv: string;
}

export interface LLMProvider {
  readonly name: string;
  map(args: {
    template: TemplateInventory;
    extracted: ExtractedBlocks;
    unresolvedFieldIds: string[];
    clientFiles?: Array<{ name: string; data: ArrayBuffer; mime: string }> | undefined;
  }): Promise<LLMMappingResult>;
}
