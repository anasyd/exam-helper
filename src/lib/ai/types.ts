// Provider & feature IDs

export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";

export const PROVIDER_IDS: readonly ProviderId[] = [
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
] as const;

export type FeatureId =
  | "flashcards"
  | "notes"
  | "study-guide"
  | "transcript"
  | "summary";

export const FEATURE_IDS: readonly FeatureId[] = [
  "flashcards",
  "notes",
  "study-guide",
  "transcript",
  "summary",
] as const;

// Capabilities

export type Capability =
  | "supportsStructuredOutput"
  | "supportsLongContext"
  | "supportsVision";

export interface ModelMeta {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  supportsStructuredOutput: boolean;
  supportsLongContext: boolean;
  supportsVision: boolean;
  contextWindowTokens?: number;
}

export interface ModelSelection {
  providerId: ProviderId;
  modelId: string;
}

// Domain types migrated from the old ai-service.ts

export interface FlashcardData {
  question: string;
  answer: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: number;
}

export interface StudyTopic {
  title: string;
  summary: string;
  isCompleted?: boolean;
  audioSummaryText?: string;
  expandedSummary?: string;
}

export interface StudySection {
  title: string;
  summary: string;
  topics: StudyTopic[];
  audioSummaryText?: string;
}

export interface StudyGuide {
  title: string;
  sections: StudySection[];
}

// Document-input types

export type ProjectSource =
  | { kind: "pdf"; bytes: Uint8Array }
  | { kind: "docx"; text: string }
  | { kind: "text"; text: string };

export type DocumentGenerationInput =
  | { kind: "text"; content: string }
  | { kind: "file"; mimeType: "application/pdf"; data: Uint8Array }
  | { kind: "multi-image"; images: { mimeType: "image/png"; data: Uint8Array }[] };

// JSON schema (draft-07 subset used by our providers)

export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  description?: string;
  enum?: unknown[];
  additionalProperties?: boolean;
};
