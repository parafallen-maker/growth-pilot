export type HomeworkAiProviderMode = 'mock' | 'openai-compatible';

const OPENAI_COMPATIBLE_PROVIDER_ALIASES = new Set([
  'openai',
  'openai-compatible',
  'openai_compatible',
  'openai-compatible-http',
  'doubao',
  'deepseek',
  'siliconflow',
  'openrouter',
]);

export function resolveHomeworkAiProvider(raw = process.env.AI_PROVIDER): HomeworkAiProviderMode {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized || normalized === 'mock') {
    return 'mock';
  }

  if (OPENAI_COMPATIBLE_PROVIDER_ALIASES.has(normalized)) {
    return 'openai-compatible';
  }

  throw new Error(`Unsupported AI_PROVIDER: ${raw}`);
}

export function resolveHomeworkProviderLabel(raw = process.env.AI_PROVIDER) {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) {
    return 'mock';
  }

  resolveHomeworkAiProvider(normalized);
  return normalized;
}

export function resolveHomeworkModelName(raw = process.env.AI_MODEL_HOMEWORK) {
  return raw?.trim() || 'gpt-4o-mini';
}

export function resolveHomeworkPromptVersion(raw = process.env.AI_PROMPT_VERSION_HOMEWORK) {
  return raw?.trim() || 'homework-review-v3';
}

export function resolveOpenAiCompatibleBaseUrl(raw = process.env.OPENAI_BASE_URL ?? process.env.AI_BASE_URL) {
  return raw?.trim() || 'https://api.openai.com/v1';
}

export function resolveOpenAiCompatibleApiKey(raw = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY) {
  return raw?.trim() || undefined;
}
