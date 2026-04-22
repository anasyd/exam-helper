import type { FeatureId, ModelMeta, ProviderId } from "./types";

export class NoApiKeyError extends Error {
  constructor(public providerId: ProviderId) {
    super(`No API key configured for ${providerId}. Open Settings to add one.`);
    this.name = "NoApiKeyError";
  }
}

export class IncompatibleModelError extends Error {
  constructor(public feature: FeatureId, public model: ModelMeta) {
    super(
      `Model ${model.displayName} is not compatible with feature ${feature}. ` +
      `Pick a different model in Settings.`
    );
    this.name = "IncompatibleModelError";
  }
}

export class ProviderError extends Error {
  constructor(
    public providerId: ProviderId,
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
