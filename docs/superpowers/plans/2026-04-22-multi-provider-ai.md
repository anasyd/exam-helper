# Multi-Provider AI Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 893-line `src/lib/ai-service.ts` Gemini-only class with a capability-oriented multi-provider AI layer (Gemini, OpenAI, Anthropic, OpenRouter), adding per-feature model routing, a capability-gated settings UI, and vision support for PDF-native models.

**Architecture:** Capability-oriented `Provider` interface with 4 methods (`generateText`, `generateStructuredJson`, `generateTextFromDocument`, `generateStructuredJsonFromDocument`). Features (flashcards, notes, study-guide, transcript, summary) live in their own files and call providers through a router that resolves `{provider, model, apiKey}` based on user settings. Hardcoded catalog for Gemini/OpenAI/Anthropic; OpenRouter catalog fetched at runtime. Vision via `document-input.ts` util that branches on `supportsVision` and rasterizes PDFs with `pdfjs-dist` for providers that don't accept PDFs natively.

**Tech Stack:** TypeScript 6, React 19, Next.js 16 (App Router, client components), Zustand 5 with `persist` middleware, `@google/generative-ai` SDK (Gemini only), direct `fetch` for OpenAI / Anthropic / OpenRouter, `pdfjs-dist` for PDF rasterization, shadcn `Tabs` / `Dialog` / `Select` for settings UI.

**Spec:** `docs/superpowers/specs/2026-04-22-multi-provider-ai-design.md`

---

## File Structure

**New files (13):**

```
src/lib/ai/
├── types.ts                       # ProviderId, FeatureId, ModelMeta, FlashcardData, StudyGuide, etc.
├── errors.ts                      # NoApiKeyError, IncompatibleModelError, ProviderError
├── document-input.ts              # buildDocumentInput + rasterizePdfPages
├── providers/
│   ├── provider.ts                # Provider interface + shared opt types
│   ├── index.ts                   # getProvider(id) registry
│   ├── gemini.ts                  # GeminiProvider class
│   ├── openai.ts                  # OpenAIProvider class
│   ├── anthropic.ts               # AnthropicProvider class
│   └── openrouter.ts              # OpenRouterProvider + fetchOpenRouterCatalog()
├── catalog.ts                     # HARDCODED_MODELS + lookup + all()
├── router.ts                      # resolveModelFor, isCompatible, listCompatibleModels
└── features/
    ├── flashcards.ts              # generateFlashcards
    ├── notes.ts                   # generateAutomatedNotes
    ├── study-guide.ts             # generateStudyContent
    ├── transcript.ts              # formatTranscriptToMarkdown + linkTranscriptConcepts
    ├── summary.ts                 # generateTextSummary
    └── generate-all.ts            # generateAllContentTypes orchestrator
```

**Modified files (4):**
- `src/lib/store.ts` — add AIConfigSlice, migration from v2 schema, keep transitional `geminiApiKey` getter, remove it at end.
- `src/components/app-settings.tsx` — full body rewrite: Providers tab + Models tab.
- `src/components/project-view.tsx` — replace `createGeminiService(key).generateX(...)` call sites with feature-module imports.
- `src/components/study-content-view.tsx` — same replacement.

**Deleted files (1):**
- `src/lib/ai-service.ts` — after all call-sites migrate.

---

## Validation model (same as sub-project #1)

No automated tests exist in the repo. Every task ends with an implicit `npm run build`, `npm run lint`, and `npx tsc --noEmit` check. Per-task commits keep the branch bisectable. A dedicated smoke test via Playwright MCP runs at the end.

The plan's "test" steps are therefore build+lint+tsc gates rather than unit tests. When a task requires specific runtime validation (e.g., an actual API call to verify a provider works), that is called out with a manual step.

---

## Task 1: Create feature branch and foundation types

**Files:**
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/errors.ts`

- [ ] **Step 1: Confirm clean tree on `main`, pull latest, create branch**

```bash
git status
git pull --ff-only origin main
git checkout -b feat/multi-provider-ai
```

- [ ] **Step 2: Create `src/lib/ai/types.ts` with this content**

```ts
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
```

- [ ] **Step 3: Create `src/lib/ai/errors.ts` with this content**

```ts
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
```

- [ ] **Step 4: Verify build still passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/types.ts src/lib/ai/errors.ts
git commit -m "feat(ai): add types and errors for multi-provider layer"
```

---

## Task 2: Provider interface

**Files:**
- Create: `src/lib/ai/providers/provider.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/provider.ts`**

```ts
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/provider.ts
git commit -m "feat(ai): define Provider interface"
```

---

## Task 3: Hardcoded model catalog

**Files:**
- Create: `src/lib/ai/catalog.ts`

- [ ] **Step 1: Create `src/lib/ai/catalog.ts`**

```ts
import type { ModelMeta, ProviderId } from "./types";

// Hardcoded flagship models for Gemini, OpenAI, Anthropic.
// OpenRouter models are fetched at runtime and merged in via setOpenRouterCatalog().

const HARDCODED_MODELS: ModelMeta[] = [
  // Gemini
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/catalog.ts
git commit -m "feat(ai): add hardcoded model catalog for Gemini/OpenAI/Anthropic"
```

---

## Task 4: Gemini provider

**Files:**
- Create: `src/lib/ai/providers/gemini.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/gemini.ts`**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProviderError } from "../errors";
import type {
  ConnectionResult,
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
  TextGenOpts,
} from "./provider";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export const geminiProvider: Provider = {
  id: "gemini",
  displayName: "Google Gemini",

  async testConnection(apiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
      );
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async generateText({ apiKey, model, prompt, systemPrompt, maxTokens }) {
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: maxTokens ? { maxOutputTokens: maxTokens } : undefined,
    });
    const result = await gen.generateContent(prompt);
    return result.response.text();
  },

  async generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T> {
    const { apiKey, model, prompt, systemPrompt, schema, maxTokens } = opts;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Gemini SDK accepts draft-07 JsonSchema at runtime
        responseSchema: schema as any,
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      },
    });
    const result = await gen.generateContent(prompt);
    const text = result.response.text();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new ProviderError(
        "gemini",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },

  async generateTextFromDocument(opts: DocumentTextGenOpts) {
    const { apiKey, model, prompt, systemPrompt, document, maxTokens } = opts;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: maxTokens ? { maxOutputTokens: maxTokens } : undefined,
    });
    const result = await gen.generateContent([
      { inlineData: { mimeType: document.mimeType, data: toBase64(document.data) } },
      { text: prompt },
    ]);
    return result.response.text();
  },

  async generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T> {
    const { apiKey, model, prompt, systemPrompt, schema, document, maxTokens } = opts;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Gemini SDK accepts draft-07 JsonSchema at runtime
        responseSchema: schema as any,
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      },
    });
    const result = await gen.generateContent([
      { inlineData: { mimeType: document.mimeType, data: toBase64(document.data) } },
      { text: prompt },
    ]);
    const text = result.response.text();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new ProviderError(
        "gemini",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },

  async generateTextFromImages(opts: MultiImageTextGenOpts) {
    const { apiKey, model, prompt, systemPrompt, images, maxTokens } = opts;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: maxTokens ? { maxOutputTokens: maxTokens } : undefined,
    });
    const parts = [
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: toBase64(img.data) },
      })),
      { text: prompt },
    ];
    const result = await gen.generateContent(parts);
    return result.response.text();
  },

  async generateStructuredJsonFromImages<T>(opts: MultiImageStructuredOpts): Promise<T> {
    const { apiKey, model, prompt, systemPrompt, schema, images, maxTokens } = opts;
    const client = new GoogleGenerativeAI(apiKey);
    const gen = client.getGenerativeModel({
      model,
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: "application/json",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Gemini SDK accepts draft-07 JsonSchema at runtime
        responseSchema: schema as any,
        ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
      },
    });
    const parts = [
      ...images.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: toBase64(img.data) },
      })),
      { text: prompt },
    ];
    const result = await gen.generateContent(parts);
    const text = result.response.text();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      throw new ProviderError(
        "gemini",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/gemini.ts
git commit -m "feat(ai): add GeminiProvider"
```

---

## Task 5: OpenAI provider

**Files:**
- Create: `src/lib/ai/providers/openai.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/openai.ts`**

```ts
import { ProviderError } from "../errors";
import type {
  ConnectionResult,
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
  TextGenOpts,
} from "./provider";

const API_BASE = "https://api.openai.com/v1";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function toDataUri(img: { mimeType: string; data: Uint8Array }): string {
  return `data:${img.mimeType};base64,${toBase64(img.data)}`;
}

type OpenAIMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
    };

async function chatCompletion(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ content: string }> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ProviderError("openai", `HTTP ${res.status}: ${text}`, res.status);
  }
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return { content: json.choices[0]?.message?.content ?? "" };
}

export const openaiProvider: Provider = {
  id: "openai",
  displayName: "OpenAI",

  async testConnection(apiKey) {
    try {
      const res = await fetch(`${API_BASE}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async generateText({ apiKey, model, prompt, systemPrompt, maxTokens }) {
    const messages: OpenAIMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    const { content } = await chatCompletion(apiKey, {
      model,
      messages,
      ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
    });
    return content;
  },

  async generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T> {
    const { apiKey, model, prompt, systemPrompt, schema, maxTokens } = opts;
    const messages: OpenAIMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    const { content } = await chatCompletion(apiKey, {
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema, strict: true },
      },
      ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
    });
    try {
      return JSON.parse(content) as T;
    } catch (e) {
      throw new ProviderError(
        "openai",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },

  // OpenAI chat completions don't accept raw PDFs; caller should rasterize and use generateXFromImages instead.
  // We implement these to throw a clear error so misrouting surfaces early.
  async generateTextFromDocument(opts: DocumentTextGenOpts) {
    if (opts.document.mimeType === "application/pdf") {
      throw new ProviderError(
        "openai",
        "OpenAI does not accept PDFs directly. Rasterize to images first (use generateTextFromImages)."
      );
    }
    return this.generateTextFromImages({
      apiKey: opts.apiKey,
      model: opts.model,
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      images: [opts.document],
    });
  },

  async generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T> {
    if (opts.document.mimeType === "application/pdf") {
      throw new ProviderError(
        "openai",
        "OpenAI does not accept PDFs directly. Rasterize to images first (use generateStructuredJsonFromImages)."
      );
    }
    return this.generateStructuredJsonFromImages<T>({
      apiKey: opts.apiKey,
      model: opts.model,
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      schema: opts.schema,
      images: [opts.document],
    });
  },

  async generateTextFromImages(opts: MultiImageTextGenOpts) {
    const { apiKey, model, prompt, systemPrompt, images, maxTokens } = opts;
    const messages: OpenAIMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({
      role: "user",
      content: [
        ...images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: toDataUri(img) },
        })),
        { type: "text" as const, text: prompt },
      ],
    });
    const { content } = await chatCompletion(apiKey, {
      model,
      messages,
      ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
    });
    return content;
  },

  async generateStructuredJsonFromImages<T>(opts: MultiImageStructuredOpts): Promise<T> {
    const { apiKey, model, prompt, systemPrompt, schema, images, maxTokens } = opts;
    const messages: OpenAIMessage[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({
      role: "user",
      content: [
        ...images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: toDataUri(img) },
        })),
        { type: "text" as const, text: prompt },
      ],
    });
    const { content } = await chatCompletion(apiKey, {
      model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema, strict: true },
      },
      ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
    });
    try {
      return JSON.parse(content) as T;
    } catch (e) {
      throw new ProviderError(
        "openai",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/openai.ts
git commit -m "feat(ai): add OpenAIProvider (chat completions + JSON schema + image input)"
```

---

## Task 6: Anthropic provider

**Files:**
- Create: `src/lib/ai/providers/anthropic.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/anthropic.ts`**

```ts
import { ProviderError } from "../errors";
import type { JsonSchema } from "../types";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
  TextGenOpts,
} from "./provider";

const API_BASE = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION = "2023-06-01";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

async function anthropicRequest(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{
  content: { type: string; text?: string; input?: unknown; name?: string }[];
}> {
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ProviderError("anthropic", `HTTP ${res.status}: ${text}`, res.status);
  }
  return res.json() as Promise<{
    content: { type: string; text?: string; input?: unknown; name?: string }[];
  }>;
}

function jsonToolWrap(schema: JsonSchema) {
  return {
    name: "emit",
    description: "Emit the structured response matching the schema.",
    input_schema: schema,
  };
}

function extractToolUseInput(
  content: { type: string; input?: unknown; name?: string }[]
): unknown {
  for (const block of content) {
    if (block.type === "tool_use" && block.name === "emit") return block.input;
  }
  throw new ProviderError("anthropic", "Model did not produce tool_use output with name=emit.");
}

function extractText(content: { type: string; text?: string }[]): string {
  return content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

export const anthropicProvider: Provider = {
  id: "anthropic",
  displayName: "Anthropic Claude",

  async testConnection(apiKey) {
    try {
      // /v1/messages is the authoritative auth endpoint; /v1/models works too.
      const res = await fetch(`${API_BASE}/models`, {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async generateText({ apiKey, model, prompt, systemPrompt, maxTokens }) {
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens ?? 4096,
      messages: [{ role: "user", content: prompt }],
    };
    if (systemPrompt) body.system = systemPrompt;
    const result = await anthropicRequest(apiKey, body);
    return extractText(result.content);
  },

  async generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T> {
    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content: opts.prompt }],
      tools: [jsonToolWrap(opts.schema)],
      tool_choice: { type: "tool", name: "emit" },
    };
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    const result = await anthropicRequest(opts.apiKey, body);
    return extractToolUseInput(result.content) as T;
  },

  async generateTextFromDocument(opts: DocumentTextGenOpts) {
    const content: ContentBlock[] = [];
    if (opts.document.mimeType === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: toBase64(opts.document.data),
        },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: opts.document.mimeType,
          data: toBase64(opts.document.data),
        },
      });
    }
    content.push({ type: "text", text: opts.prompt });

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content }],
    };
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    const result = await anthropicRequest(opts.apiKey, body);
    return extractText(result.content);
  },

  async generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T> {
    const content: ContentBlock[] = [];
    if (opts.document.mimeType === "application/pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: toBase64(opts.document.data),
        },
      });
    } else {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: opts.document.mimeType,
          data: toBase64(opts.document.data),
        },
      });
    }
    content.push({ type: "text", text: opts.prompt });

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content }],
      tools: [jsonToolWrap(opts.schema)],
      tool_choice: { type: "tool", name: "emit" },
    };
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    const result = await anthropicRequest(opts.apiKey, body);
    return extractToolUseInput(result.content) as T;
  },

  async generateTextFromImages(opts: MultiImageTextGenOpts) {
    const content: ContentBlock[] = opts.images.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mimeType,
        data: toBase64(img.data),
      },
    }));
    content.push({ type: "text", text: opts.prompt });

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content }],
    };
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    const result = await anthropicRequest(opts.apiKey, body);
    return extractText(result.content);
  },

  async generateStructuredJsonFromImages<T>(opts: MultiImageStructuredOpts): Promise<T> {
    const content: ContentBlock[] = opts.images.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mimeType,
        data: toBase64(img.data),
      },
    }));
    content.push({ type: "text", text: opts.prompt });

    const body: Record<string, unknown> = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [{ role: "user", content }],
      tools: [jsonToolWrap(opts.schema)],
      tool_choice: { type: "tool", name: "emit" },
    };
    if (opts.systemPrompt) body.system = opts.systemPrompt;
    const result = await anthropicRequest(opts.apiKey, body);
    return extractToolUseInput(result.content) as T;
  },
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/anthropic.ts
git commit -m "feat(ai): add AnthropicProvider (messages API + tool-use JSON + PDF/image input)"
```

---

## Task 7: OpenRouter provider + catalog fetch

**Files:**
- Create: `src/lib/ai/providers/openrouter.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/openrouter.ts`**

```ts
import { ProviderError } from "../errors";
import type { ModelMeta } from "../types";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
  TextGenOpts,
} from "./provider";

const API_BASE = "https://openrouter.ai/api/v1";

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function toDataUri(img: { mimeType: string; data: Uint8Array }): string {
  return `data:${img.mimeType};base64,${toBase64(img.data)}`;
}

type Message =
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "user";
      content: (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      )[];
    };

async function chat(apiKey: string, body: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
      "X-Title": "exam-helper",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ProviderError("openrouter", `HTTP ${res.status}: ${await res.text()}`, res.status);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

export async function fetchOpenRouterCatalog(): Promise<ModelMeta[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) {
    throw new Error(`OpenRouter /models HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data: {
      id: string;
      name: string;
      context_length?: number;
      architecture?: { input_modalities?: string[] };
      supported_parameters?: string[];
    }[];
  };
  return json.data.map((m) => {
    const params = m.supported_parameters ?? [];
    const modalities = m.architecture?.input_modalities ?? [];
    return {
      providerId: "openrouter" as const,
      modelId: m.id,
      displayName: m.name,
      supportsStructuredOutput:
        params.includes("response_format") || params.includes("tools"),
      supportsLongContext: (m.context_length ?? 0) >= 100_000,
      supportsVision: modalities.includes("image") || modalities.includes("file"),
      contextWindowTokens: m.context_length,
    };
  });
}

export const openrouterProvider: Provider = {
  id: "openrouter",
  displayName: "OpenRouter",

  async testConnection(apiKey) {
    try {
      const res = await fetch(`${API_BASE}/auth/key`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async generateText({ apiKey, model, prompt, systemPrompt, maxTokens }) {
    const messages: Message[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });
    return chat(apiKey, {
      model,
      messages,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    });
  },

  async generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T> {
    const messages: Message[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: opts.prompt });
    const content = await chat(opts.apiKey, {
      model: opts.model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema: opts.schema, strict: true },
      },
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });
    try {
      return JSON.parse(content) as T;
    } catch (e) {
      throw new ProviderError(
        "openrouter",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },

  // OpenRouter passes through underlying model. For PDFs, we rasterize (same strategy as OpenAI)
  // because not all routed models accept PDFs directly and there's no reliable per-model flag.
  async generateTextFromDocument(opts: DocumentTextGenOpts) {
    if (opts.document.mimeType === "application/pdf") {
      throw new ProviderError(
        "openrouter",
        "OpenRouter routes to heterogeneous models; rasterize PDFs first (use generateTextFromImages)."
      );
    }
    return this.generateTextFromImages({
      apiKey: opts.apiKey,
      model: opts.model,
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      images: [opts.document],
    });
  },

  async generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T> {
    if (opts.document.mimeType === "application/pdf") {
      throw new ProviderError(
        "openrouter",
        "OpenRouter routes to heterogeneous models; rasterize PDFs first (use generateStructuredJsonFromImages)."
      );
    }
    return this.generateStructuredJsonFromImages<T>({
      apiKey: opts.apiKey,
      model: opts.model,
      prompt: opts.prompt,
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      schema: opts.schema,
      images: [opts.document],
    });
  },

  async generateTextFromImages(opts: MultiImageTextGenOpts) {
    const messages: Message[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({
      role: "user",
      content: [
        ...opts.images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: toDataUri(img) },
        })),
        { type: "text" as const, text: opts.prompt },
      ],
    });
    return chat(opts.apiKey, {
      model: opts.model,
      messages,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });
  },

  async generateStructuredJsonFromImages<T>(opts: MultiImageStructuredOpts): Promise<T> {
    const messages: Message[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({
      role: "user",
      content: [
        ...opts.images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: toDataUri(img) },
        })),
        { type: "text" as const, text: opts.prompt },
      ],
    });
    const content = await chat(opts.apiKey, {
      model: opts.model,
      messages,
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema: opts.schema, strict: true },
      },
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    });
    try {
      return JSON.parse(content) as T;
    } catch (e) {
      throw new ProviderError(
        "openrouter",
        `Failed to parse JSON response: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/openrouter.ts
git commit -m "feat(ai): add OpenRouterProvider + catalog fetcher"
```

---

## Task 8: Provider registry

**Files:**
- Create: `src/lib/ai/providers/index.ts`

- [ ] **Step 1: Create `src/lib/ai/providers/index.ts`**

```ts
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

export type { Provider, ConnectionResult, TextGenOpts, StructuredGenOpts } from "./provider";
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/providers/index.ts
git commit -m "feat(ai): add provider registry"
```

---

## Task 9: Router with capability gating

**Files:**
- Create: `src/lib/ai/router.ts`

- [ ] **Step 1: Create `src/lib/ai/router.ts`**

```ts
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/router.ts
git commit -m "feat(ai): add router with capability gating"
```

---

## Task 10: Document-input util with PDF rasterization

**Files:**
- Create: `src/lib/ai/document-input.ts`

- [ ] **Step 1: Create `src/lib/ai/document-input.ts`**

```ts
import * as pdfjs from "pdfjs-dist";
import type {
  DocumentGenerationInput,
  ModelMeta,
  ProjectSource,
} from "./types";

// Client-side worker setup. Mirrors src/lib/document-service.ts.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
}

// Providers that don't accept PDFs directly — we rasterize for them.
const NEEDS_RASTERIZATION: ModelMeta["providerId"][] = ["openai", "openrouter"];

const DEFAULT_MAX_PAGES = 20;
const RENDER_SCALE = 1.5; // ~150 DPI when base is 72; adjust if output too large

export async function rasterizePdfPages(
  bytes: Uint8Array,
  opts: { maxPages?: number } = {}
): Promise<{ mimeType: "image/png"; data: Uint8Array }[]> {
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const pdf = await pdfjs.getDocument(bytes).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const images: { mimeType: "image/png"; data: Uint8Array }[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d canvas context");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
    const buf = new Uint8Array(await blob.arrayBuffer());
    images.push({ mimeType: "image/png", data: buf });
  }

  return images;
}

// Text extraction fallback (same impl as src/lib/document-service.ts, duplicated here to avoid cycle).
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await pdfjs.getDocument(bytes).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem types don't ship a discriminator
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    full += pageText + "\n\n";
  }
  return full;
}

export async function buildDocumentInput(
  source: ProjectSource,
  model: ModelMeta
): Promise<DocumentGenerationInput> {
  if (source.kind === "pdf" && model.supportsVision) {
    if (NEEDS_RASTERIZATION.includes(model.providerId)) {
      const images = await rasterizePdfPages(source.bytes);
      return { kind: "multi-image", images };
    }
    return { kind: "file", mimeType: "application/pdf", data: source.bytes };
  }

  if (source.kind === "pdf") {
    const text = await extractPdfText(source.bytes);
    return { kind: "text", content: text };
  }

  // docx and text sources are already extracted text
  return { kind: "text", content: source.text };
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/document-input.ts
git commit -m "feat(ai): add document-input util with PDF rasterization"
```

---

## Task 11: Store slice + migration

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Read the current store top to locate the `FlashcardState` interface and persist options**

```bash
grep -n "FlashcardState\|geminiApiKey\|setGeminiApiKey\|partialize\|persist(" src/lib/store.ts | head -20
```

- [ ] **Step 2: Add imports at the top of `src/lib/store.ts`**

Add after existing imports:

```ts
import type {
  FeatureId,
  ModelMeta,
  ModelSelection,
  ProviderId,
} from "./ai/types";
import { setOpenRouterCatalog } from "./ai/catalog";
import {
  fetchOpenRouterCatalog,
  openrouterProvider,
} from "./ai/providers/openrouter";
import { getProvider } from "./ai/providers";
```

- [ ] **Step 3: Extend the `FlashcardState` interface**

Locate the `FlashcardState` interface. Add these fields adjacent to `geminiApiKey`:

```ts
  // ... existing fields ...

  // Multi-provider AI config (sub-project #2)
  providers: Record<ProviderId, { apiKey: string | null; lastValidatedAt?: number }>;
  modelRouting: {
    default: ModelSelection;
    overrides: Partial<Record<FeatureId, ModelSelection>>;
  };
  openRouterCatalog?: { fetchedAt: number; models: ModelMeta[] };

  // Actions for multi-provider AI
  setProviderKey: (id: ProviderId, key: string | null) => void;
  setProviderValidated: (id: ProviderId, at: number) => void;
  setDefaultModel: (sel: ModelSelection) => void;
  setFeatureOverride: (feature: FeatureId, sel: ModelSelection | null) => void;
  refreshOpenRouterCatalog: () => Promise<void>;
```

Keep the existing `geminiApiKey: string | null` field AND `setGeminiApiKey` for one release — they act as the transitional getter/setter (see step 6).

- [ ] **Step 4: Add initial state + actions inside the `create()` body**

Locate the `create(persist(...))` block. Inside the state object (where `geminiApiKey: null` is set), add:

```ts
      providers: {
        gemini: { apiKey: null },
        openai: { apiKey: null },
        anthropic: { apiKey: null },
        openrouter: { apiKey: null },
      },
      modelRouting: {
        default: { providerId: "gemini", modelId: "gemini-2.5-flash" },
        overrides: {},
      },
```

After `setGeminiApiKey`, add:

```ts
      setProviderKey: (id, key) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], apiKey: key },
          },
          // Keep transitional geminiApiKey mirror in sync for any stragglers.
          ...(id === "gemini" ? { geminiApiKey: key } : {}),
        })),
      setProviderValidated: (id, at) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [id]: { ...state.providers[id], lastValidatedAt: at },
          },
        })),
      setDefaultModel: (sel) =>
        set((state) => ({
          modelRouting: { ...state.modelRouting, default: sel },
        })),
      setFeatureOverride: (feature, sel) =>
        set((state) => {
          const overrides = { ...state.modelRouting.overrides };
          if (sel === null) delete overrides[feature];
          else overrides[feature] = sel;
          return { modelRouting: { ...state.modelRouting, overrides } };
        }),
      refreshOpenRouterCatalog: async () => {
        const models = await fetchOpenRouterCatalog();
        setOpenRouterCatalog(models);
        set({ openRouterCatalog: { fetchedAt: Date.now(), models } });
      },
```

- [ ] **Step 5: Update `partialize` + add `version` and `migrate`**

Find the `persist(...)` second-argument object. Update `partialize` to include the new fields, and add `version` + `migrate`:

```ts
    {
      name: "flashcards-storage-v2",
      version: 3,
      partialize: (state) => ({
        projects: state.projects.map(/* ... existing ... */),
        activeProjectId: state.activeProjectId,
        geminiApiKey: state.geminiApiKey,                       // transitional
        providers: state.providers,
        modelRouting: state.modelRouting,
        openRouterCatalog: state.openRouterCatalog,
        currentStreak: state.currentStreak,
        lastStudiedDate: state.lastStudiedDate,
        gamificationEnabled: state.gamificationEnabled,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zustand migrate gives untyped persisted state
      migrate: (persisted: any, version: number) => {
        if (version < 3) {
          const oldKey: string | null = persisted?.geminiApiKey ?? null;
          return {
            ...persisted,
            geminiApiKey: oldKey,                               // transitional
            providers: {
              gemini: { apiKey: oldKey },
              openai: { apiKey: null },
              anthropic: { apiKey: null },
              openrouter: { apiKey: null },
            },
            modelRouting: {
              default: { providerId: "gemini", modelId: "gemini-2.5-flash" },
              overrides: {},
            },
          };
        }
        return persisted;
      },
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.projects) {
          // ... existing onRehydrateStorage ...
        }
        // Re-seed catalog from persisted state
        if (state?.openRouterCatalog?.models) {
          setOpenRouterCatalog(state.openRouterCatalog.models);
        }
      },
    }
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

Both must exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(ai): add multi-provider config slice + v3 migration"
```

---

## Task 12: Feature — summary

**Files:**
- Create: `src/lib/ai/features/summary.ts`

- [ ] **Step 1: Create `src/lib/ai/features/summary.ts`**

```ts
import { resolveModelFor, type RouterDependencies } from "../router";

const SUMMARY_SYSTEM = `You are an expert educational summarizer. Produce a concise, well-structured
summary of the provided content suitable for study purposes. Use markdown formatting.`;

export async function generateTextSummary(
  content: string,
  deps: RouterDependencies
): Promise<string> {
  if (!content || content.trim().length === 0) {
    throw new Error("No content provided to summarize.");
  }
  const resolved = resolveModelFor("summary", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: SUMMARY_SYSTEM,
    prompt: `Summarize the following content for exam preparation:\n\n${content}`,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/summary.ts
git commit -m "feat(ai): add summary feature module"
```

---

## Task 13: Feature — transcript

**Files:**
- Create: `src/lib/ai/features/transcript.ts`

- [ ] **Step 1: Create `src/lib/ai/features/transcript.ts`**

```ts
import { resolveModelFor, type RouterDependencies } from "../router";

const FORMAT_SYSTEM = `You are a transcript-formatter. Reformat the raw transcript into well-structured
markdown with paragraph breaks, section headings where topics change, and bullet lists for enumerations.
Preserve all information; only improve formatting.`;

const LINK_SYSTEM = `You are a concept-linker. Given a markdown transcript, identify key concepts and add
inline bold emphasis on them. Do not add links or external references — only markdown emphasis. Keep all
original wording.`;

export async function formatTranscriptToMarkdown(
  rawTranscript: string,
  deps: RouterDependencies
): Promise<string> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    throw new Error("No transcript to format.");
  }
  const resolved = resolveModelFor("transcript", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: FORMAT_SYSTEM,
    prompt: `Format the following raw transcript:\n\n${rawTranscript}`,
  });
}

export async function linkTranscriptConcepts(
  formattedTranscript: string,
  deps: RouterDependencies
): Promise<string> {
  if (!formattedTranscript || formattedTranscript.trim().length === 0) {
    throw new Error("No formatted transcript provided.");
  }
  const resolved = resolveModelFor("transcript", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: LINK_SYSTEM,
    prompt: `Add concept emphasis to the following transcript:\n\n${formattedTranscript}`,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/transcript.ts
git commit -m "feat(ai): add transcript feature module"
```

---

## Task 14: Feature — notes

**Files:**
- Create: `src/lib/ai/features/notes.ts`

- [ ] **Step 1: Create `src/lib/ai/features/notes.ts`**

```ts
import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { ProjectSource } from "../types";

const NOTES_SYSTEM = `You are an expert educational note-taker. Convert the provided content into
comprehensive study notes using well-structured markdown: headings for topics, bullet points for facts,
tables for comparisons, and callouts for key definitions. Be thorough but not verbose.`;

export async function generateAutomatedNotes(
  source: ProjectSource,
  deps: RouterDependencies
): Promise<string> {
  const resolved = resolveModelFor("notes", deps);
  const input = await buildDocumentInput(source, resolved.model);

  if (input.kind === "text") {
    if (input.content.trim().length === 0) {
      throw new Error("No content to generate notes from.");
    }
    return resolved.provider.generateText({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: NOTES_SYSTEM,
      prompt: `Generate study notes from the following content:\n\n${input.content}`,
    });
  }
  if (input.kind === "file") {
    return resolved.provider.generateTextFromDocument({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: NOTES_SYSTEM,
      prompt: "Generate comprehensive study notes from the attached document.",
      document: { mimeType: input.mimeType, data: input.data },
    });
  }
  // multi-image
  return resolved.provider.generateTextFromImages({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: NOTES_SYSTEM,
    prompt: "Generate comprehensive study notes from the attached document pages (images).",
    images: input.images,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/notes.ts
git commit -m "feat(ai): add notes feature module"
```

---

## Task 15: Feature — flashcards

**Files:**
- Create: `src/lib/ai/features/flashcards.ts`

- [ ] **Step 1: Create `src/lib/ai/features/flashcards.ts`**

```ts
import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { FlashcardData, JsonSchema, ProjectSource } from "../types";

const FLASHCARDS_SYSTEM = `You generate high-quality exam-preparation flashcards from source material.
Each flashcard is a multiple-choice question with one correct answer and three plausible distractors.
Keep questions clear and self-contained. Difficulty is 1 (easy) to 5 (hard).`;

const FLASHCARDS_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctOptionIndex: { type: "integer" },
          difficulty: { type: "integer" },
        },
        required: ["question", "answer", "options", "correctOptionIndex", "difficulty"],
      },
    },
  },
  required: ["flashcards"],
};

export async function generateFlashcards(
  source: ProjectSource,
  count: number,
  deps: RouterDependencies
): Promise<FlashcardData[]> {
  const resolved = resolveModelFor("flashcards", deps);
  const input = await buildDocumentInput(source, resolved.model);
  const userPrompt = `Generate exactly ${count} flashcards covering the most important concepts. For each, include the question, the correct answer text, a four-element options array (with the answer as one of them), the correctOptionIndex (0-based), and a difficulty from 1 to 5.`;

  let result: { flashcards: FlashcardData[] };

  if (input.kind === "text") {
    result = await resolved.provider.generateStructuredJson({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: FLASHCARDS_SYSTEM,
      prompt: `${userPrompt}\n\nSource:\n${input.content}`,
      schema: FLASHCARDS_SCHEMA,
    });
  } else if (input.kind === "file") {
    result = await resolved.provider.generateStructuredJsonFromDocument({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: FLASHCARDS_SYSTEM,
      prompt: userPrompt,
      schema: FLASHCARDS_SCHEMA,
      document: { mimeType: input.mimeType, data: input.data },
    });
  } else {
    result = await resolved.provider.generateStructuredJsonFromImages({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: FLASHCARDS_SYSTEM,
      prompt: userPrompt,
      schema: FLASHCARDS_SCHEMA,
      images: input.images,
    });
  }

  return result.flashcards;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/flashcards.ts
git commit -m "feat(ai): add flashcards feature module"
```

---

## Task 16: Feature — study-guide

**Files:**
- Create: `src/lib/ai/features/study-guide.ts`

- [ ] **Step 1: Create `src/lib/ai/features/study-guide.ts`**

```ts
import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { JsonSchema, ProjectSource, StudyGuide } from "../types";

const STUDY_GUIDE_SYSTEM = `You are an expert course designer. Organize the provided content into a
structured study guide with a title, logically-ordered sections, and a list of topics per section.
Each section and topic has a short summary. Cover the material comprehensively.`;

const STUDY_GUIDE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          topics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
              },
              required: ["title", "summary"],
            },
          },
        },
        required: ["title", "summary", "topics"],
      },
    },
  },
  required: ["title", "sections"],
};

export async function generateStudyContent(
  source: ProjectSource,
  deps: RouterDependencies
): Promise<StudyGuide> {
  const resolved = resolveModelFor("study-guide", deps);
  const input = await buildDocumentInput(source, resolved.model);
  const userPrompt =
    "Build a structured study guide with sections and topics, each with concise summaries.";

  if (input.kind === "text") {
    return resolved.provider.generateStructuredJson<StudyGuide>({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: STUDY_GUIDE_SYSTEM,
      prompt: `${userPrompt}\n\nSource:\n${input.content}`,
      schema: STUDY_GUIDE_SCHEMA,
    });
  }
  if (input.kind === "file") {
    return resolved.provider.generateStructuredJsonFromDocument<StudyGuide>({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: STUDY_GUIDE_SYSTEM,
      prompt: userPrompt,
      schema: STUDY_GUIDE_SCHEMA,
      document: { mimeType: input.mimeType, data: input.data },
    });
  }
  return resolved.provider.generateStructuredJsonFromImages<StudyGuide>({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: STUDY_GUIDE_SYSTEM,
    prompt: userPrompt,
    schema: STUDY_GUIDE_SCHEMA,
    images: input.images,
  });
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/study-guide.ts
git commit -m "feat(ai): add study-guide feature module"
```

---

## Task 17: Feature — generateAllContentTypes orchestrator

**Files:**
- Create: `src/lib/ai/features/generate-all.ts`

- [ ] **Step 1: Create `src/lib/ai/features/generate-all.ts`**

```ts
import type { RouterDependencies } from "../router";
import type { FlashcardData, ProjectSource, StudyGuide } from "../types";
import { generateFlashcards } from "./flashcards";
import { generateAutomatedNotes } from "./notes";
import { generateStudyContent } from "./study-guide";

export interface GenerateAllFlags {
  generateStudyGuide: boolean;
  generateNotes: boolean;
  generateFlashcards: boolean;
  flashcardCount?: number;
}

export interface GenerateAllResult {
  studyGuide?: StudyGuide;
  notes?: string;
  flashcards?: FlashcardData[];
}

export async function generateAllContentTypes(
  source: ProjectSource,
  flags: GenerateAllFlags,
  deps: RouterDependencies
): Promise<GenerateAllResult> {
  const result: GenerateAllResult = {};

  if (flags.generateStudyGuide) {
    result.studyGuide = await generateStudyContent(source, deps);
  }
  if (flags.generateNotes) {
    result.notes = await generateAutomatedNotes(source, deps);
  }
  if (flags.generateFlashcards) {
    result.flashcards = await generateFlashcards(source, flags.flashcardCount ?? 10, deps);
  }

  return result;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/features/generate-all.ts
git commit -m "feat(ai): add generate-all orchestrator"
```

---

## Task 18: Settings UI — providers tab

**Files:**
- Modify: `src/components/app-settings.tsx`

This task rewrites the settings dialog body. Existing export/import logic stays; only the API-key + provider section is replaced.

- [ ] **Step 1: Read the current file to capture what stays**

```bash
cat src/components/app-settings.tsx | head -60
```

Preserve: imports of store, Dialog, Button, Separator, toast; the Project Data Management (export/import) section; the dialog open/close state.

- [ ] **Step 2: Replace the dialog body**

The new `AppSettings` component renders a dialog with a shadcn `Tabs` root, two `TabsContent` panels, and the existing Data Management below.

Key structure:

```tsx
<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
  <DialogTrigger asChild>{/* existing trigger */}</DialogTrigger>
  <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Application Settings</DialogTitle>
      <DialogDescription>Configure AI providers, per-feature models, and project data.</DialogDescription>
    </DialogHeader>

    <Tabs defaultValue="providers" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="models">Models</TabsTrigger>
      </TabsList>

      <TabsContent value="providers" className="space-y-4 pt-4">
        <ProviderCard providerId="gemini" />
        <ProviderCard providerId="openai" />
        <ProviderCard providerId="anthropic" />
        <ProviderCard providerId="openrouter" />
      </TabsContent>

      <TabsContent value="models" className="space-y-4 pt-4">
        <DefaultModelPicker />
        <Separator />
        <FeatureOverridesSection />
      </TabsContent>
    </Tabs>

    <Separator className="my-4" />
    {/* Existing Project Data Management block stays here */}

    <DialogFooter>
      <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Define `ProviderCard`, `DefaultModelPicker`, and `FeatureOverridesSection` as components in the same file. Each is about 30-60 lines.

**`ProviderCard` implementation:**

```tsx
function ProviderCard({ providerId }: { providerId: ProviderId }) {
  const provider = getProvider(providerId);
  const stored = useFlashcardStore((s) => s.providers[providerId]);
  const setProviderKey = useFlashcardStore((s) => s.setProviderKey);
  const setProviderValidated = useFlashcardStore((s) => s.setProviderValidated);

  const [localKey, setLocalKey] = useState(stored.apiKey ?? "");
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"ok" | "invalid" | "unknown">(
    stored.lastValidatedAt ? "ok" : stored.apiKey ? "unknown" : "unknown"
  );

  const saveKey = () => {
    setProviderKey(providerId, localKey.trim() || null);
    toast.success(`${provider.displayName} key saved`);
  };

  const testKey = async () => {
    if (!localKey.trim()) return;
    setTesting(true);
    const result = await provider.testConnection(localKey.trim());
    setTesting(false);
    if (result.ok) {
      setStatus("ok");
      setProviderKey(providerId, localKey.trim());
      setProviderValidated(providerId, Date.now());
      toast.success(`${provider.displayName} connection OK`);
    } else {
      setStatus("invalid");
      toast.error(`${provider.displayName} error: ${result.error}`);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{provider.displayName}</h3>
        {status === "ok" && <span className="text-green-600 text-xs">Connected</span>}
        {status === "invalid" && <span className="text-red-600 text-xs">Invalid</span>}
        {status === "unknown" && stored.apiKey && (
          <span className="text-muted-foreground text-xs">Untested</span>
        )}
        {!stored.apiKey && (
          <span className="text-muted-foreground text-xs">Not configured</span>
        )}
      </div>
      <Input
        type="password"
        value={localKey}
        onChange={(e) => setLocalKey(e.target.value)}
        placeholder="API key"
      />
      <div className="flex gap-2">
        <Button onClick={saveKey} size="sm">Save</Button>
        <Button onClick={testKey} size="sm" variant="outline" disabled={!localKey.trim() || testing}>
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/app-settings.tsx
git commit -m "feat(ui): rewrite settings dialog with Providers tab"
```

---

## Task 19: Settings UI — models tab

**Files:**
- Modify: `src/components/app-settings.tsx`

Adds the `DefaultModelPicker` and `FeatureOverridesSection` components referenced by Task 18.

- [ ] **Step 1: Add imports**

```ts
import * as catalog from "@/lib/ai/catalog";
import { listCompatibleModels } from "@/lib/ai/router";
import { FEATURE_IDS, PROVIDER_IDS } from "@/lib/ai/types";
```

- [ ] **Step 2: Add `DefaultModelPicker` component**

```tsx
function DefaultModelPicker() {
  const selection = useFlashcardStore((s) => s.modelRouting.default);
  const setDefaultModel = useFlashcardStore((s) => s.setDefaultModel);
  const providers = useFlashcardStore((s) => s.providers);

  const availableProviders = PROVIDER_IDS.filter((id) => providers[id].apiKey);
  const modelsForProvider = catalog.listForProvider(selection.providerId);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Default model</h3>
      <p className="text-sm text-muted-foreground">
        Used for any feature without a specific override.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selection.providerId}
          onChange={(e) => {
            const providerId = e.target.value as ProviderId;
            const first = catalog.listForProvider(providerId)[0];
            if (first) setDefaultModel({ providerId, modelId: first.modelId });
          }}
          className="border rounded px-2 py-1"
        >
          {PROVIDER_IDS.map((id) => (
            <option key={id} value={id} disabled={!availableProviders.includes(id)}>
              {getProvider(id).displayName}
              {!availableProviders.includes(id) ? " (no key)" : ""}
            </option>
          ))}
        </select>
        <select
          value={selection.modelId}
          onChange={(e) =>
            setDefaultModel({ providerId: selection.providerId, modelId: e.target.value })
          }
          className="border rounded px-2 py-1"
        >
          {modelsForProvider.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayName}
              {m.supportsVision ? " 👁" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `FeatureOverridesSection` component**

```tsx
function FeatureOverridesSection() {
  const overrides = useFlashcardStore((s) => s.modelRouting.overrides);
  const setFeatureOverride = useFlashcardStore((s) => s.setFeatureOverride);
  const providers = useFlashcardStore((s) => s.providers);
  const availableProviders = PROVIDER_IDS.filter((id) => providers[id].apiKey);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Per-feature overrides</h3>
      <p className="text-sm text-muted-foreground">
        Optional. Toggle a feature to route it to a different model than the default.
      </p>
      {FEATURE_IDS.map((feature) => {
        const sel = overrides[feature];
        const compatible = listCompatibleModels(feature);
        return (
          <div key={feature} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="capitalize">{feature.replace("-", " ")}</span>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!sel}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const first = compatible.find((m) =>
                        availableProviders.includes(m.providerId)
                      );
                      if (first) {
                        setFeatureOverride(feature, {
                          providerId: first.providerId,
                          modelId: first.modelId,
                        });
                      }
                    } else {
                      setFeatureOverride(feature, null);
                    }
                  }}
                />
                Override
              </label>
            </div>
            {sel && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sel.providerId}
                  onChange={(e) => {
                    const providerId = e.target.value as ProviderId;
                    const first = compatible.find((m) => m.providerId === providerId);
                    if (first) {
                      setFeatureOverride(feature, { providerId, modelId: first.modelId });
                    }
                  }}
                  className="border rounded px-2 py-1"
                >
                  {PROVIDER_IDS.map((id) => (
                    <option key={id} value={id} disabled={!availableProviders.includes(id)}>
                      {getProvider(id).displayName}
                    </option>
                  ))}
                </select>
                <select
                  value={sel.modelId}
                  onChange={(e) =>
                    setFeatureOverride(feature, {
                      providerId: sel.providerId,
                      modelId: e.target.value,
                    })
                  }
                  className="border rounded px-2 py-1"
                >
                  {compatible
                    .filter((m) => m.providerId === sel.providerId)
                    .map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.displayName}
                        {m.supportsVision ? " 👁" : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Kick off OpenRouter catalog fetch on first mount**

In the `AppSettings` component, add inside the function body:

```tsx
useEffect(() => {
  const store = useFlashcardStore.getState();
  if (!store.openRouterCatalog) {
    store.refreshOpenRouterCatalog().catch(() => {
      // Silent fail; OpenRouter option just won't populate
    });
  }
}, []);
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/app-settings.tsx
git commit -m "feat(ui): add Models tab with default picker + per-feature overrides"
```

---

## Task 20: Replace call sites in project-view.tsx

**Files:**
- Modify: `src/components/project-view.tsx`

Replace every `createGeminiService(geminiApiKey).generateX(...)` with a direct feature-module call. The router needs `RouterDependencies` — provide them from the store.

- [ ] **Step 1: Add imports at the top**

```ts
import { generateFlashcards } from "@/lib/ai/features/flashcards";
import { generateAutomatedNotes } from "@/lib/ai/features/notes";
import {
  formatTranscriptToMarkdown,
  linkTranscriptConcepts,
} from "@/lib/ai/features/transcript";
import { generateAllContentTypes } from "@/lib/ai/features/generate-all";
import type { RouterDependencies } from "@/lib/ai/router";
```

- [ ] **Step 2: Add a `useRouterDeps` helper near the component top**

Inside the component function (before the JSX), after the existing store destructuring:

```tsx
const providers = useFlashcardStore((s) => s.providers);
const modelRouting = useFlashcardStore((s) => s.modelRouting);

const routerDeps: RouterDependencies = useMemo(
  () => ({
    getSelection: (feature) => modelRouting.overrides[feature] ?? modelRouting.default,
    getApiKey: (providerId) => providers[providerId].apiKey,
  }),
  [providers, modelRouting]
);
```

Add `useMemo` to the React imports if missing.

- [ ] **Step 3: Replace the six call sites**

Find each of these and update:

```ts
// OLD:
const aiService = createGeminiService(geminiApiKey);
const newMcqs = await aiService.generateFlashcards(content, count);

// NEW:
const newMcqs = await generateFlashcards(
  { kind: "text", text: content },       // or whatever the source is
  count,
  routerDeps
);
```

Specifics per line (based on current file — line numbers may drift; grep for each pattern):

- Line ~337: `aiService.generateFlashcards(...)` → `generateFlashcards(source, count, routerDeps)`
- Line ~431: `aiService.generateFlashcards(...)` → same pattern
- Line ~1008: `aiService.generateAllContentTypes(documentText, flags)` → `generateAllContentTypes(source, flags, routerDeps)`
- Line ~1084, ~1112: `aiService.generateAutomatedNotes(...)` → `generateAutomatedNotes(source, routerDeps)`
- Line ~1153: `aiService.formatTranscriptToMarkdown(raw)` → `formatTranscriptToMarkdown(raw, routerDeps)`
- Line ~1159: `aiService.linkTranscriptConcepts(formatted)` → `linkTranscriptConcepts(formatted, routerDeps)`

The `source` arg for PDF-backed calls: `{ kind: "pdf", bytes: activeProject.pdfBytes }` if the project stores bytes, otherwise `{ kind: "text", text: activeProject.pdfContent }`. In the current codebase projects store text (`pdfContent`), so use `{ kind: "text", text: activeProject.pdfContent }` until a later sub-project adds PDF byte storage.

Also remove the line `const aiService = createGeminiService(geminiApiKey);` in each block (it's replaced by direct feature-module calls).

Also replace `geminiApiKey` key-presence guards with a friendlier check using the default model's provider:

```ts
// OLD:
if (!geminiApiKey) { /* show toast */ return; }

// NEW:
const defaultProviderId = modelRouting.default.providerId;
if (!providers[defaultProviderId].apiKey) {
  toast.error(`Configure a ${defaultProviderId} API key in Settings.`);
  return;
}
```

- [ ] **Step 4: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -10
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

All must exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/project-view.tsx
git commit -m "feat(ai): migrate project-view call sites to feature modules"
```

---

## Task 21: Replace call sites in study-content-view.tsx

**Files:**
- Modify: `src/components/study-content-view.tsx`

- [ ] **Step 1: Add imports**

```ts
import { generateStudyContent } from "@/lib/ai/features/study-guide";
import type { RouterDependencies } from "@/lib/ai/router";
```

- [ ] **Step 2: Add router deps helper (same pattern as Task 20)**

```tsx
const providers = useFlashcardStore((s) => s.providers);
const modelRouting = useFlashcardStore((s) => s.modelRouting);
const routerDeps: RouterDependencies = useMemo(
  () => ({
    getSelection: (feature) => modelRouting.overrides[feature] ?? modelRouting.default,
    getApiKey: (providerId) => providers[providerId].apiKey,
  }),
  [providers, modelRouting]
);
```

- [ ] **Step 3: Find and replace the study-content call**

```bash
grep -n "createGeminiService\|generateStudyContent\|generateStudy" src/components/study-content-view.tsx
```

Replace:
```ts
const aiService = createGeminiService(geminiApiKey);
const studyGuide = await aiService.generateStudyContent(activeProject.pdfContent);
```
with:
```ts
const studyGuide = await generateStudyContent(
  { kind: "text", text: activeProject.pdfContent },
  routerDeps
);
```

Replace the `!geminiApiKey` guard with the default-provider check (same pattern as Task 20).

- [ ] **Step 4: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/components/study-content-view.tsx
git commit -m "feat(ai): migrate study-content-view call sites to feature modules"
```

---

## Task 22: Delete ai-service.ts, remove transitional shim

**Files:**
- Delete: `src/lib/ai-service.ts`
- Modify: `src/lib/store.ts` (remove transitional `geminiApiKey` + `setGeminiApiKey`)

- [ ] **Step 1: Confirm nothing imports `ai-service.ts` anymore**

```bash
grep -rn "from \"@/lib/ai-service\"\|from \"./ai-service\"\|from \"../lib/ai-service\"" src/ 2>/dev/null | grep -v "ai-service.ts"
```
Expected: no matches. If any, fix them before deletion.

- [ ] **Step 2: Delete the file**

```bash
git rm src/lib/ai-service.ts
```

- [ ] **Step 3: Remove transitional `geminiApiKey` from store**

In `src/lib/store.ts`:
- Remove `geminiApiKey: string | null;` from `FlashcardState` interface.
- Remove `setGeminiApiKey: (apiKey: string | null) => void;` from interface.
- Remove `geminiApiKey: null,` from initial state.
- Remove `setGeminiApiKey: (apiKey) => set({ geminiApiKey: apiKey }),` action.
- Remove `...(id === "gemini" ? { geminiApiKey: key } : {})` mirror from `setProviderKey`.
- Remove `geminiApiKey: state.geminiApiKey,` from `partialize`.

The `migrate` function keeps reading `persisted?.geminiApiKey` — that's still correct for users upgrading from v2.

- [ ] **Step 4: Fix any orphaned references**

```bash
grep -rn "geminiApiKey\|setGeminiApiKey" src/ 2>/dev/null
```
Expected: only persisted-state migration references in `store.ts`. If any components still read `geminiApiKey`, migrate them to `providers.gemini.apiKey`.

- [ ] **Step 5: Verify build + lint + tsc**

```bash
npm run build 2>&1 | tail -10
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ai): delete ai-service.ts and remove transitional geminiApiKey shim"
```

---

## Task 23: Final verification gate + Playwright smoke test

**Files:** none modified unless a gate fails.

- [ ] **Step 1: Full build + lint + tsc from clean**

```bash
rm -rf .next
npm run build 2>&1 | tail -10
npm run lint 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

All must exit 0.

- [ ] **Step 2: Start dev server**

```bash
npm run dev > /tmp/dev-server.log 2>&1 &
sleep 5
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
```
Expected: `HTTP 200`.

- [ ] **Step 3: Run Playwright smoke test**

Use the MCP Playwright tools to execute:

1. Navigate to `http://localhost:3000`. Verify project list renders, 0 console errors.
2. Open Settings. Click **Providers** tab. Each of the four provider cards renders with its name, status, key input, Save / Test Connection buttons.
3. Paste an invalid string into Gemini (e.g., `"test-key-fake"`), click Test — expect status to go to "Invalid".
4. Click **Models** tab. Verify Default Model picker shows Gemini as the default and the model dropdown contains at least 3 Gemini models.
5. Toggle the Flashcards override ON. Verify a nested provider/model picker appears.
6. Close the dialog. Verify project-list page still renders.

Save screenshots of each step to `/tmp/ai-smoke-*.png`. Commit nothing from this step — artifacts are for verification only.

- [ ] **Step 4: Stop dev server**

```bash
lsof -ti:3000 | xargs kill 2>/dev/null
```

- [ ] **Step 5: Manual checks that don't fit Playwright**

With real API keys (user-provided, not in CI):
1. Save each provider key and Test Connection → all four report OK.
2. Generate flashcards with the Gemini default → succeeds.
3. Override flashcards → OpenAI gpt-5-mini → generate → succeeds.
4. Override flashcards → Anthropic Claude Haiku 4.5 → generate → succeeds.
5. Override flashcards → OpenRouter pick any JSON-supporting model → generate → succeeds.
6. With PDF source + a vision-capable model (Gemini 2.5 Flash), generate flashcards → network trace shows the PDF bytes are sent inline, not extracted text.

If any step fails, loop back to the relevant task.

- [ ] **Step 6: Commit nothing here** — this task is verification only.

---

## Task 24: Finalize PR

**Files:**
- No code changes unless the verification gate surfaced something.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/multi-provider-ai
```

- [ ] **Step 2: Create PR body at `/tmp/pr-body.md`**

```markdown
## Summary

Replaces the 893-line Gemini-only `ai-service.ts` with a capability-oriented multi-provider AI layer supporting Gemini, OpenAI, Anthropic, and OpenRouter. Adds per-feature model routing, a capability-gated settings UI, and vision support for PDF-native models. BYOK only; no backend changes.

## What's new

- **Four providers** (`src/lib/ai/providers/{gemini,openai,anthropic,openrouter}.ts`), each implementing the `Provider` interface with 6 methods (text, structured JSON, document, image variants).
- **Model catalog** (`src/lib/ai/catalog.ts`) — hardcoded Gemini 2.5 Pro/Flash/Flash-Lite, GPT-5/mini/nano, Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5. OpenRouter fetched from `/api/v1/models` and mapped to capability flags.
- **Router** (`src/lib/ai/router.ts`) with capability gating — features declare required capabilities; the settings UI filters incompatible models.
- **Feature modules** (`src/lib/ai/features/*`) — flashcards, notes, study-guide, transcript, summary, generate-all. Each consumes the router and branches on `supportsVision` for PDF sources.
- **Vision support via `document-input.ts`** — rasterizes PDFs to images for OpenAI / OpenRouter (using `pdfjs-dist` canvas render @ 1.5× scale, cap 20 pages); sends raw bytes to Gemini and Anthropic (native PDF support).
- **Settings UI rewrite** — `<Tabs>` with Providers tab (per-provider cards with Test Connection) and Models tab (default picker + per-feature overrides with capability-filtered dropdowns).
- **Zustand v3 migration** — old `geminiApiKey` auto-migrates to `providers.gemini.apiKey`; default model set to `gemini-2.5-flash` so existing users keep working without opening settings.
- **Deleted**: `src/lib/ai-service.ts`, including three dead TTS methods.

## Test plan

- [x] `npm install` clean
- [x] `npm run build` exits 0
- [x] `npm run lint` exits 0
- [x] `npx tsc --noEmit` exits 0
- [x] Playwright smoke: settings dialog tabs render, provider cards render, default model picker works, feature override toggles work, no console errors
- [ ] **Manual before merge** (requires live API keys):
  - [ ] Gemini flashcard generation
  - [ ] OpenAI flashcard generation
  - [ ] Anthropic flashcard generation
  - [ ] OpenRouter flashcard generation
  - [ ] PDF source with vision-capable default model — verify network request carries PDF bytes

## Out of scope (future sub-projects)

- Backend/auth/MongoDB (#3), server-side project storage (#4), Stripe + hosted-model proxy (#7).
- TTS/audio, `.pptx` support, fallback chains, streaming.
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "feat: multi-provider AI layer (Gemini/OpenAI/Anthropic/OpenRouter) with per-feature routing and vision" --body "$(cat /tmp/pr-body.md)"
```

Expected: PR URL printed.

- [ ] **Step 4: Done — return the PR URL to the user.**

---

## Self-Review Summary

**Spec coverage:**
- §1 Scope (all four providers, BYOK, capability gating, vision, dead-code removal) → Tasks 1-22.
- §2 File structure → Tasks 1-17 create every new file; Tasks 18-22 modify the four existing files and delete ai-service.ts.
- §3 Provider interface → Task 2 defines, Tasks 4-7 implement.
- §4 Router with feature-requirement table → Task 9.
- §5 Settings UI (Providers + Models tabs, capability gating in UI, vision eye-badge) → Tasks 18-19.
- §6 Data model + zustand v3 migration + transitional getter → Tasks 11 (add) + 22 (remove shim).

**Placeholder scan:** zero. Every step has a concrete command or code block. The "specific fixes to expect" lists in implementation steps are anchored to known file sections and concrete grep patterns.

**Type consistency:**
- `ProviderId`, `FeatureId`, `ModelMeta`, `ModelSelection`, `RouterDependencies`, `ProjectSource`, `DocumentGenerationInput` used consistently across tasks.
- `Provider` interface signature matches across gemini.ts, openai.ts, anthropic.ts, openrouter.ts.
- Feature modules all take `(..., deps: RouterDependencies)` — consistent.
- Store actions' names (`setProviderKey`, `setDefaultModel`, `setFeatureOverride`) match between the interface addition (Task 11) and the UI consumers (Tasks 18-19).

**Tasks total:** 24 (vs. 20 for sub-project #1). Fine granularity is deliberate — the Big Bang pattern worked for deps but provider plumbing has more integration seams where per-task commits are bisect value.
