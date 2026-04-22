import type { JsonSchema, ProviderId } from "../types";

export type ConnectionResult =
  | { ok: true }
  | { ok: false; error: string };

export interface TextGenOpts {
  apiKey: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface StructuredGenOpts extends TextGenOpts {
  schema: JsonSchema;
}

export interface DocumentInput {
  mimeType: "application/pdf" | `image/${string}`;
  data: Uint8Array;
}

export interface DocumentTextGenOpts extends TextGenOpts {
  document: DocumentInput;
}

export interface DocumentStructuredOpts extends StructuredGenOpts {
  document: DocumentInput;
}

export interface MultiImageTextGenOpts extends TextGenOpts {
  images: DocumentInput[];
}

export interface MultiImageStructuredOpts extends StructuredGenOpts {
  images: DocumentInput[];
}

export interface Provider {
  readonly id: ProviderId;
  readonly displayName: string;

  testConnection(apiKey: string): Promise<ConnectionResult>;

  generateText(opts: TextGenOpts): Promise<string>;
  generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T>;

  generateTextFromDocument(opts: DocumentTextGenOpts): Promise<string>;
  generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T>;

  // For providers that don't accept PDFs directly (e.g., OpenAI) — caller rasterizes first
  generateTextFromImages(opts: MultiImageTextGenOpts): Promise<string>;
  generateStructuredJsonFromImages<T>(opts: MultiImageStructuredOpts): Promise<T>;
}
