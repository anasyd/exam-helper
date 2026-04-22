import type { ProviderId } from "../types";
import { geminiProvider } from "./gemini";
import type { Provider } from "./provider";

// Other providers are added as their implementations land.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial registry during staged landing
const REGISTRY: Partial<Record<ProviderId, Provider>> = {
  gemini: geminiProvider,
};

export function getProvider(id: ProviderId): Provider {
  const p = REGISTRY[id];
  if (!p) throw new Error(`Provider not yet registered: ${id}`);
  return p;
}

export function allProviders(): Provider[] {
  return Object.values(REGISTRY).filter((p): p is Provider => Boolean(p));
}

export type { Provider } from "./provider";
