import * as catalog from "./catalog";
import { IncompatibleModelError, NoApiKeyError } from "./errors";
import { getProvider } from "./providers";
import type { Provider } from "./providers/provider";
import type { Capability, FeatureId, ModelMeta, ModelSelection } from "./types";

export const FEATURE_REQUIREMENTS: Record<FeatureId, Capability[]> = {
  flashcards: ["supportsStructuredOutput"],
  "study-guide": ["supportsStructuredOutput", "supportsLongContext"],
  notes: [],
  summary: ["supportsLongContext"],
  transcript: ["supportsLongContext"],
};

export interface ResolvedModel {
  provider: Provider;
  model: ModelMeta;
  apiKey: string;
}

export interface RouterDependencies {
  getSelection: (feature: FeatureId) => ModelSelection;
  getApiKey: (providerId: ModelSelection["providerId"]) => string | null;
}

export function isCompatible(model: ModelMeta, feature: FeatureId): boolean {
  return FEATURE_REQUIREMENTS[feature].every((cap) => model[cap] === true);
}

export function listCompatibleModels(feature: FeatureId): ModelMeta[] {
  return catalog.all().filter((m) => isCompatible(m, feature));
}

export function resolveModelFor(feature: FeatureId, deps: RouterDependencies): ResolvedModel {
  const sel = deps.getSelection(feature);
  const model = catalog.lookupOrThrow(sel.providerId, sel.modelId);
  if (!isCompatible(model, feature)) {
    throw new IncompatibleModelError(feature, model);
  }
  const apiKey = deps.getApiKey(sel.providerId);
  if (!apiKey) {
    throw new NoApiKeyError(sel.providerId);
  }
  const provider = getProvider(sel.providerId);
  return { provider, model, apiKey };
}
