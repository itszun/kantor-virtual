import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from './config.ts';

export interface ModelPricing {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  cache_write_5m?: number;
  cache_write_1h?: number;
}

export interface PricingConfig {
  currency: string;
  unit: string;
  models: Record<string, ModelPricing>;
}

export interface UsageDetail {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  cache_write_5m?: number;
  cache_write_1h?: number;
}

export function loadPricing(filePath?: string): PricingConfig {
  const targetPath = filePath || path.join(PROJECT_ROOT, 'config', 'pricing.json');
  try {
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf8');
      return JSON.parse(content) as PricingConfig;
    }
  } catch {
    // Abaikan jika gagal baca
  }
  return {
    currency: 'USD',
    unit: 'per_million_tokens',
    models: {},
  };
}

export function costFor(
  model: string | null | undefined,
  usageDetail: UsageDetail,
  pricingTable?: PricingConfig | Record<string, ModelPricing>
): number | null {
  if (!model) return null;

  let models: Record<string, ModelPricing>;
  if (pricingTable) {
    if ('models' in pricingTable) {
      models = pricingTable.models;
    } else {
      models = pricingTable;
    }
  } else {
    models = loadPricing().models;
  }

  const modelPricing = models[model];
  if (!modelPricing) {
    return null;
  }

  const hasGranularCacheWrite =
    usageDetail.cache_write_5m !== undefined || usageDetail.cache_write_1h !== undefined;

  const w5m = hasGranularCacheWrite
    ? (usageDetail.cache_write_5m ?? 0)
    : (usageDetail.cache_write ?? 0);
  const w1h = hasGranularCacheWrite ? (usageDetail.cache_write_1h ?? 0) : 0;

  const pInput = modelPricing.input ?? 0;
  const pOutput = modelPricing.output ?? 0;
  const pCacheRead = modelPricing.cache_read ?? 0;
  const pCacheWrite5m = modelPricing.cache_write_5m ?? modelPricing.cache_write ?? 0;
  const pCacheWrite1h = modelPricing.cache_write_1h ?? modelPricing.cache_write ?? 0;

  const inputTokens = usageDetail.input ?? 0;
  const outputTokens = usageDetail.output ?? 0;
  const cacheReadTokens = usageDetail.cache_read ?? 0;

  const totalCost =
    (inputTokens * pInput +
      outputTokens * pOutput +
      cacheReadTokens * pCacheRead +
      w5m * pCacheWrite5m +
      w1h * pCacheWrite1h) /
    1_000_000;

  return Math.round(totalCost * 1_000_000) / 1_000_000;
}
