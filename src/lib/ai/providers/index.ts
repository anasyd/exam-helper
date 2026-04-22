import type { ProviderId } from "../types";
import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";
import { openrouterProvider } from "./openrouter";
import type { Provider } from "./provider";

const REGISTRY: Record<ProviderId, Provider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
};

export function getProvider(id: ProviderId): Provider {
  return REGISTRY[id];
}

export function allProviders(): Provider[] {
  return Object.values(REGISTRY);
}

export type { Provider } from "./provider";
