import { ConfigError } from '../errors';
import type { PipelineConfig } from '../types/pipeline';
import { defaultLogger } from '../utils/logger';

export const defaultPipelineConfig: PipelineConfig = {
  llmMode: 'auto',
  deterministicThreshold: 0.75,
  limits: {
    maxFileSizeBytes: 15 * 1024 * 1024,
    maxPagesPerFile: 25,
    maxTotalPages: 100,
  },
  logger: defaultLogger,
};

export const resolvePipelineConfig = (config?: Partial<PipelineConfig>): PipelineConfig => {
  const merged: PipelineConfig = {
    ...defaultPipelineConfig,
    ...config,
    limits: {
      ...defaultPipelineConfig.limits,
      ...config?.limits,
    },
    logger: config?.logger ?? defaultPipelineConfig.logger,
  };

  if (merged.deterministicThreshold < 0 || merged.deterministicThreshold > 1) {
    throw new ConfigError('deterministicThreshold must be in range [0,1]');
  }

  return merged;
};
