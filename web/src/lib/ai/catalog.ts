import type { ModelMeta, ProviderId } from "./types";

// Hardcoded flagship models for Gemini, OpenAI, Anthropic.
// OpenRouter models are fetched at runtime and merged in via setOpenRouterCatalog().

const HARDCODED_MODELS: ModelMeta[] = [
  // ── Google Gemini (newest first) ─────────────────────────────────────────
  // 3.x series — preview
  {
    providerId: "gemini",
    modelId: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro (Preview)",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash (Preview)",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "gemini",
    modelId: "gemini-3.1-flash-lite-preview",
    displayName: "Gemini 3.1 Flash Lite (Preview)",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  // 2.5 series — stable
  {
    providerId: "gemini",
    modelId: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
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
  // 2.0 series
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
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  // 1.5 series
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

  // ── OpenAI (newest first) ────────────────────────────────────────────────
  // GPT-5.4 series
  {
    providerId: "openai",
    modelId: "gpt-5.4",
    displayName: "GPT-5.4",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_050_000,
  },
  {
    providerId: "openai",
    modelId: "gpt-5.4-mini",
    displayName: "GPT-5.4 mini",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 400_000,
  },
  {
    providerId: "openai",
    modelId: "gpt-5.4-nano",
    displayName: "GPT-5.4 nano",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 400_000,
  },
  // GPT-5.1
  {
    providerId: "openai",
    modelId: "gpt-5.1",
    displayName: "GPT-5.1",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 400_000,
  },
  // GPT-5
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
  // o-series reasoning models
  {
    providerId: "openai",
    modelId: "o4-mini",
    displayName: "o4-mini",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 200_000,
  },
  {
    providerId: "openai",
    modelId: "o3",
    displayName: "o3",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 200_000,
  },
  // GPT-4o
  {
    providerId: "openai",
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 128_000,
  },
  {
    providerId: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    supportsStructuredOutput: true,
    supportsLongContext: false,
    supportsVision: true,
    contextWindowTokens: 128_000,
  },

  // ── Anthropic Claude (newest first) ─────────────────────────────────────
  {
    providerId: "anthropic",
    modelId: "claude-opus-4-7",
    displayName: "Claude Opus 4.7",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
  },
  {
    providerId: "anthropic",
    modelId: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    supportsStructuredOutput: true,
    supportsLongContext: true,
    supportsVision: true,
    contextWindowTokens: 1_000_000,
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
