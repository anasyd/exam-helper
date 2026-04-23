import type { ModelMeta, ProviderId } from "./types";

// Hardcoded flagship models for Gemini, OpenAI, Anthropic.
// OpenRouter models are fetched at runtime and merged in via setOpenRouterCatalog().

const HARDCODED_MODELS: ModelMeta[] = [
  // Gemini — newest first
  {
    providerId: "gemini",
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 2_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash Lite",
    supportsStructuredOutput: true,
    supportsLongContext: false,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 2_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },

  // OpenAI
  {
    providerId: "openai",
    modelId: "gpt-5",
    displayName: "GPT-5",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 400_000,
  },
  {
    providerId: "openai",
    modelId: "gpt-5-mini",
    displayName: "GPT-5 mini",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 400_000,
  },
  {
    providerId: "openai",
    modelId: "gpt-5-nano",
    displayName: "GPT-5 nano",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 128_000,
  },

  // Anthropic
  {
    providerId: "anthropic",
    modelId: "claude-opus-4-7",
    displayName: "Claude Opus 4.7",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 200_000,
  },
  {
    providerId: "anthropic",
    modelId: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 200_000,
  },
  {
    providerId: "anthropic",
    modelId: "claude-haiku-4-5-20251001",
    displayName: "Claude Haiku 4.5",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 200_000,
  },
];

// OpenRouter catalog is set at runtime by the store.
// We keep it as a module-level var that the store mirrors into.
let openRouterModels: ModelMeta[] = [];

export function setOpenRouterCatalog(models: ModelMeta[]): void {
  openRouterModels = models;
}

export function all(): ModelMeta[] {
  return [...HARDCODED_MODELS, ...openRouterModels];
}

export function listForProvider(providerId: ProviderId): ModelMeta[] {
  return all().filter((m) => m.providerId === providerId);
}

export function lookup(providerId: ProviderId, modelId: string): ModelMeta | null {
  return all().find((m) => m.providerId === providerId && m.modelId === modelId) ?? null;
}

export function lookupOrThrow(providerId: ProviderId, modelId: string): ModelMeta {
  const m = lookup(providerId, modelId);
  if (!m) {
    throw new Error(`Unknown model ${providerId}:${modelId}`);
  }
  return m;
}
