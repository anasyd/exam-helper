# Multi-Provider AI Layer — Design

**Status:** approved (awaiting user spec review)
**Date:** 2026-04-22
**Sub-project:** 2 of 7 (revised roadmap; see section "Roadmap Position")
**Branch target:** `feat/multi-provider-ai`

## Context

The current AI layer (`src/lib/ai-service.ts`, 893 lines) is a single `GeminiService` class tightly coupled to `@google/generative-ai`. Every feature (flashcards, notes, study guide, transcript processing, summaries) calls it directly as `createGeminiService(apiKey).generateX(...)`. The class also carries three dead-code TTS methods never called from any UI component.

This sub-project replaces that layer with a provider abstraction that supports **Gemini, OpenAI, Anthropic, and OpenRouter** (all BYOK on the client — no backend), routes each feature to a **user-selected model**, and **gates incompatible selections in the settings UI** based on capability flags. It also adds **vision support** — flagship models that accept PDFs or images directly process them without the lossy `pdf-parse` text-extraction step.

Keys remain client-side in Zustand. Vercel deployment is unchanged. No backend, no auth, no billing in this sub-project.

## Goal

Replace the Gemini-only AI layer with a capability-oriented multi-provider abstraction so users can choose, per feature, which provider + model to use; the settings UI prevents incompatible selections; and vision-capable models read source PDFs directly.

## Roadmap Position

Revised site-wide roadmap (sub-project #2 is this one):

| # | Sub-project | Status |
|---|---|---|
| 1 | Package updates | shipped |
| **2** | **Multi-provider AI + vision + per-feature routing + capability gating (client-side BYOK)** | **this spec** |
| 3 | Express backend scaffold + auth + MongoDB user accounts | future |
| 4 | Server-side project storage for logged-in users | future |
| 5 | App polish | future |
| 6 | Landing page + demo | future |
| 7 | Stripe billing + hosted-model proxy (paid tier) | future |

Sub-projects 3+ are not blocked by or enabled by this one — #2 ships standalone on top of the current Vercel deployment.

## Scope

### In scope

- **Four providers**, all BYOK client-side: Gemini, OpenAI, Anthropic, OpenRouter.
- **Provider interface**: `testConnection`, `generateText`, `generateStructuredJson`, `generateTextFromDocument`, `generateStructuredJsonFromDocument`.
- **Feature modules** for flashcards, notes, study guide, transcript processing, and text summary. Features consume the router; they don't know which provider they're using.
- **Router** — `resolveModelFor(featureId)` returns `{ provider, model, apiKey }` based on user settings (default + per-feature overrides).
- **Capability flags**: `supportsStructuredOutput`, `supportsLongContext`, `supportsVision`. UI disables incompatible selections.
- **Vision**: any feature operating on a `.pdf` / image source uses the raw file when the routed model has `supportsVision: true`, otherwise falls back to existing text extraction. For OpenAI (no native PDF input), the `document-input` util rasterizes PDF pages via `pdfjs-dist` and sends them as `image_url` data URIs.
- **Model catalog**: hardcoded flagship lists for Gemini/OpenAI/Anthropic; OpenRouter fetched from `/api/v1/models` (cached in store).
- **Settings UI**: provider key management with Test Connection + validation status, default-model picker, per-feature override pickers.
- **Zustand migration**: `geminiApiKey: string | null` becomes `providers.gemini.apiKey`; default model seeds to a Gemini flagship so existing users keep working without opening settings.
- **Delete dead code**: remove `convertLectureToSpeech`, `generateLiveSpeech`, `generateStudyAudioNarration` — they were never called from the UI.

### Out of scope

- TTS / audio (returns as a later sub-project if wanted).
- `.pptx` document support (would require `pptx2json` or rasterization — defer).
- Fallback chains between providers.
- Backend proxy, auth, MongoDB, billing (sub-projects #3, #4, #7).
- Cost tracking or token counting visible to the user.
- Manual "refresh models" UI for the three hardcoded providers (OpenRouter has auto-fetch on first open).
- Streaming responses (all current features accumulate full responses).

## Approach

Capability-oriented provider interface + feature-level orchestrator. Providers implement two low-level methods each for text and document input (4 total). Features call the router to resolve the right model, then call one of the provider's methods. Providers do not know about "flashcards" or "notes." Features do not know about "Gemini" or "OpenAI." The seam is the `Provider` interface.

Rationale: the Gemini-only class had 10 methods that each encoded feature logic *and* provider logic. Four times over would have 40 methods to maintain. The new shape: one provider file (~150 lines) + one feature file (~80 lines) each, with strict separation.

## File Structure

**New files under `src/lib/ai/`:**

```
src/lib/ai/
├── types.ts                    # ProviderId, FeatureId, ModelMeta, Capability, GenOpts types
├── errors.ts                   # NoApiKeyError, IncompatibleModelError, ProviderError
├── document-input.ts           # buildDocumentInput(source, model) — text-vs-file branching + PDF rasterization
├── providers/
│   ├── provider.ts             # Provider interface
│   ├── index.ts                # ProviderRegistry + getProvider(id)
│   ├── gemini.ts               # GeminiProvider (uses @google/generative-ai SDK)
│   ├── openai.ts               # OpenAIProvider (direct fetch)
│   ├── anthropic.ts            # AnthropicProvider (direct fetch)
│   └── openrouter.ts           # OpenRouterProvider (direct fetch + catalog fetch)
├── catalog.ts                  # HARDCODED_MODELS map + OpenRouter catalog fetcher
├── router.ts                   # resolveModelFor(feature), isCompatible, listCompatibleModels
└── features/
    ├── flashcards.ts           # generateFlashcards(projectSource, opts)
    ├── notes.ts                # generateAutomatedNotes(content | projectSource, opts)
    ├── study-guide.ts          # generateStudyContent(projectSource, opts)
    ├── transcript.ts           # formatTranscriptToMarkdown + linkTranscriptConcepts
    └── summary.ts              # generateTextSummary(content, opts)
```

**Modified files:**

- `src/lib/store.ts` — add `AIConfigSlice` (providers + modelRouting); add zustand persist migration for the schema change.
- `src/components/app-settings.tsx` — full rewrite of the dialog body. Adds Providers section with per-provider card; adds Models section with default picker + per-feature override pickers.
- `src/components/project-view.tsx` — replace `createGeminiService(geminiApiKey).generateX(...)` calls with direct feature-module imports.
- `src/components/study-content-view.tsx` — same replacement as above.

**Deleted files:**

- `src/lib/ai-service.ts` — replaced by `src/lib/ai/*`. Types (`FlashcardData`, `StudyGuide`, `StudySection`, `StudyTopic`) migrate to `src/lib/ai/types.ts`.

## Provider Interface

```ts
// src/lib/ai/providers/provider.ts

export interface Provider {
  readonly id: ProviderId;                     // "gemini" | "openai" | "anthropic" | "openrouter"
  readonly displayName: string;                // user-visible name

  testConnection(apiKey: string): Promise<ConnectionResult>;

  generateText(opts: TextGenOpts): Promise<string>;
  generateStructuredJson<T>(opts: StructuredGenOpts): Promise<T>;

  generateTextFromDocument(opts: DocumentTextGenOpts): Promise<string>;
  generateStructuredJsonFromDocument<T>(opts: DocumentStructuredOpts): Promise<T>;
}

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
  schema: JsonSchema;                          // draft-07 subset
}

export type DocumentInput = {
  mimeType: "application/pdf" | `image/${string}`;
  data: Uint8Array;                            // raw bytes; providers base64-encode internally
};

export interface DocumentTextGenOpts extends TextGenOpts {
  document: DocumentInput;
}

export interface DocumentStructuredOpts extends StructuredGenOpts {
  document: DocumentInput;
}
```

### Per-provider plumbing

- **Gemini** — `@google/generative-ai`'s `generateContent` with `generationConfig.responseMimeType: "application/json"` and `responseSchema` for structured output. Documents sent via `inlineData: { mimeType, data: base64 }`.
- **OpenAI** — `POST /v1/chat/completions` with `response_format: { type: "json_schema", json_schema: { schema, strict: true } }`. Documents: rasterize PDF pages with `pdfjs-dist`, send as `image_url: { url: "data:image/png;base64,..." }` content parts. Images pass through unchanged.
- **Anthropic** — `POST /v1/messages`. Structured output via single-tool `tool_use`: tool name `emit`, `input_schema` = the user's schema, set `tool_choice: { type: "tool", name: "emit" }`. Documents: `content: [{ type: "document", source: { type: "base64", media_type, data } }, { type: "text", text: prompt }]`. Requires `anthropic-version: 2023-06-01` and `x-api-key` header.
- **OpenRouter** — `POST /api/v1/chat/completions`. Structured output via `response_format: { type: "json_schema", json_schema }` (passes through to the underlying model). Documents: if routed underlying model natively accepts PDFs (e.g., a Claude route), send the raw PDF; otherwise rasterize via the same util as OpenAI. OpenRouter's model metadata indicates PDF support via `architecture.input_modalities`.

All providers set `anthropic-dangerous-direct-browser-access: true` (Anthropic) and equivalent headers where needed for BYOK-from-browser. CORS is permissive on all four providers' BYOK endpoints as of 2026-04-22.

### Capability flags on models

```ts
export interface ModelMeta {
  providerId: ProviderId;
  modelId: string;                             // e.g., "gemini-2.5-pro", "gpt-5", "claude-opus-4-7"
  displayName: string;                         // e.g., "Gemini 2.5 Pro"
  supportsStructuredOutput: boolean;
  supportsLongContext: boolean;                // >= 100k tokens
  supportsVision: boolean;
  contextWindowTokens?: number;                // informational; for display
}
```

Hardcoded catalog lives in `src/lib/ai/catalog.ts`. OpenRouter entries are fetched from its `/api/v1/models` endpoint and mapped:

- `supportsStructuredOutput` ← `supported_parameters` contains `response_format` OR `tools`
- `supportsLongContext` ← `context_length >= 100_000`
- `supportsVision` ← `architecture.input_modalities` contains `image` or `file`

## Router

```ts
// src/lib/ai/router.ts

export function resolveModelFor(feature: FeatureId): ResolvedModel {
  const sel = store.modelRouting.overrides[feature] ?? store.modelRouting.default;
  const model = catalog.lookup(sel.providerId, sel.modelId);
  const provider = getProvider(sel.providerId);
  const apiKey = store.providers[sel.providerId].apiKey;
  if (!apiKey) throw new NoApiKeyError(sel.providerId);
  return { provider, model, apiKey };
}

export function isCompatible(model: ModelMeta, feature: FeatureId): boolean {
  const reqs = FEATURE_REQUIREMENTS[feature];
  return reqs.every((r) => model[r] === true);
}

export function listCompatibleModels(feature: FeatureId): ModelMeta[] {
  return catalog.all().filter((m) => isCompatible(m, feature));
}
```

### Feature requirements

| Feature | Hard requirements | Uses vision when available |
|---|---|---|
| Flashcards | `supportsStructuredOutput` | Yes (PDF source) |
| Study guide | `supportsStructuredOutput`, `supportsLongContext` | Yes |
| Notes | — | Yes |
| Summary | `supportsLongContext` | No |
| Transcript (format + link) | `supportsLongContext` | No |

**Vision is an augmentation, not a hard requirement.** Every feature still works with text-only models via the text-extraction path. Capability gating in the settings UI only hides/disables models for features whose **hard** requirements they fail.

## Vision — `document-input.ts`

```ts
export async function buildDocumentInput(
  source: ProjectSource,                       // { kind: 'pdf', bytes } | { kind: 'docx', text } | { kind: 'text', text }
  model: ModelMeta
): Promise<DocumentGenerationInput> {
  // Returns either { kind: 'file', mimeType, data } for vision-capable PDF/image flows,
  // or { kind: 'text', content } for the fallback path.
  
  if (source.kind === 'pdf' && model.supportsVision) {
    if (model.providerId === 'openai' || needsRasterization(model)) {
      const pageImages = await rasterizePdfPages(source.bytes, { maxPages: 20 });
      return { kind: 'multi-image', images: pageImages };
    }
    return { kind: 'file', mimeType: 'application/pdf', data: source.bytes };
  }

  // Fallback: text extraction (existing pdf-parse / mammoth path)
  if (source.kind === 'pdf') {
    const text = await extractPdfText(source.bytes);       // uses pdf-parse
    return { kind: 'text', content: text };
  }
  if (source.kind === 'docx') return { kind: 'text', content: source.text };
  return { kind: 'text', content: source.text };
}
```

Features then call either `provider.generateStructuredJson` or `provider.generateStructuredJsonFromDocument` based on the `kind` of the returned input.

The `rasterizePdfPages` util uses `pdfjs-dist` (already installed) to render each page to a canvas at 150 DPI, then `canvas.toBlob('image/png')` → base64. Maximum default 20 pages. Exposed as a setting later; constant in v1.

## Settings UI

Single `<Dialog>` rewrite of `app-settings.tsx`. Dialog body uses shadcn `Tabs` with two panels: **Providers** and **Models**. Project Data Management section stays unchanged below.

### Providers tab

Card per provider (Gemini, OpenAI, Anthropic, OpenRouter). Each card:

- Title with status badge: `Connected` (green) / `Invalid` (red) / `Not configured` (gray).
- Password-masked API key input.
- `Test connection` button — calls `provider.testConnection(apiKey)`. On success, stores `lastValidatedAt = Date.now()` and shows a toast. On failure, shows inline error with the provider's message.
- `Save` button — persists to store.
- Link to the provider's API-keys console.

### Models tab

Two sections:

**Default model** — two-step picker:
1. Provider dropdown (only providers with valid keys are enabled; others show "Configure in Providers tab first").
2. Model dropdown (populated from catalog for the chosen provider; disabled until provider chosen).

Used by any feature without an explicit override. The default is set during migration to `{ providerId: "gemini", modelId: "gemini-2.5-flash" }`.

**Per-feature overrides** — list of features (Flashcards, Notes, Study guide, Transcript, Summary). Each row:

- Toggle: "Use default" ↔ "Override".
- When overridden: Provider + Model dropdowns, filtered by that feature's `isCompatible` check.
- Incompatible options appear disabled with a tooltip explaining the missing capability (e.g., "Haiku 4.5 doesn't support structured output; flashcards need this.").
- Vision-capable models show an eye icon next to the name so users can prefer them for PDF-heavy features.

## Data Model + Zustand Migration

```ts
// src/lib/store.ts additions

export type ProviderId = "gemini" | "openai" | "anthropic" | "openrouter";
export type FeatureId = "flashcards" | "notes" | "study-guide" | "transcript" | "summary";

export interface ModelSelection {
  providerId: ProviderId;
  modelId: string;
}

export interface ProviderConfig {
  apiKey: string | null;
  lastValidatedAt?: number;
}

export interface AIConfigSlice {
  providers: Record<ProviderId, ProviderConfig>;
  modelRouting: {
    default: ModelSelection;
    overrides: Partial<Record<FeatureId, ModelSelection>>;
  };
  openRouterCatalog?: { fetchedAt: number; models: ModelMeta[] };

  // actions
  setProviderKey: (id: ProviderId, key: string | null) => void;
  setProviderValidated: (id: ProviderId, at: number) => void;
  setDefaultModel: (sel: ModelSelection) => void;
  setFeatureOverride: (feature: FeatureId, sel: ModelSelection | null) => void;
  refreshOpenRouterCatalog: () => Promise<void>;
}
```

### Migration (zustand `persist` `version: N → N+1`)

Existing persisted state has `state.geminiApiKey: string | null`. Migration:

```ts
migrate: (persisted, version) => {
  if (version < NEW_VERSION) {
    const oldKey = (persisted as any).geminiApiKey ?? null;
    return {
      ...persisted,
      providers: {
        gemini:     { apiKey: oldKey },
        openai:     { apiKey: null },
        anthropic:  { apiKey: null },
        openrouter: { apiKey: null },
      },
      modelRouting: {
        default: { providerId: "gemini", modelId: "gemini-2.5-flash" },
        overrides: {},
      },
      geminiApiKey: undefined,      // drop the old key on next write
    };
  }
  return persisted;
}
```

Existing users keep working: their Gemini key moves over, default model is set to a Gemini flagship, all features use it. No settings touch required.

### Transitional getter (deleted before merge)

```ts
// Bridge during refactor so in-flight components keep compiling:
get geminiApiKey(): string | null {
  return this.providers.gemini.apiKey;
}
```

Every call site is expected to be updated in the same PR. The getter is a safety net while the refactor lands.

## Error Handling

Three typed errors live in `src/lib/ai/errors.ts`:

- `NoApiKeyError(providerId)` — thrown by `resolveModelFor` when the routed provider has no key. Call sites catch and show a toast with a "Open Settings" action.
- `IncompatibleModelError(feature, model)` — thrown by router if an invalid override snuck through (shouldn't happen via UI, but catches store tampering).
- `ProviderError(providerId, message, status?)` — wraps provider HTTP failures. Call sites catch and show a toast with the provider's error message.

No automatic provider fallback. Feature errors bubble to the user — either the key is missing / wrong, the model was deprecated upstream, or the provider is down. The user resolves in settings.

## Validation

No automated test suite exists in the repo (confirmed in sub-project #1). Validation is the same four-gate pattern that worked there.

### Build-time gates (all exit 0)

1. `npm install` — no peer-dep conflicts.
2. `npm run build` — exits 0 with `ignoreBuildErrors: false`.
3. `npm run lint` — exits 0 (warnings from sub-project #1 remain).
4. `npx tsc --noEmit` — exits 0.

### Runtime smoke test via Playwright MCP

Same harness as sub-project #1. Additional cases specific to this change:

1. Settings → Providers tab: each provider card renders, key fields accept text, Test Connection triggers a real network call, status badge updates.
2. Settings → Models tab: Default picker populates with Gemini models by default; switching provider repopulates the Model dropdown.
3. Feature override: enabling an override reveals picker; saving it persists; re-opening shows the saved selection.
4. Capability gating: set an override to a model missing `supportsStructuredOutput`, save — the feature's dropdown should filter that model out (UI should never allow the invalid state). Manually set the state via devtools to an invalid combo and confirm the feature throws `IncompatibleModelError` instead of silent corruption.
5. Zustand migration: add an in-memory state with the old `geminiApiKey` shape, hydrate, confirm `providers.gemini.apiKey` is populated and default model is set.
6. Generate flashcards via each of the four providers — at least one small real-PDF generation per provider to verify end-to-end (requires live API keys; this is manual and out of CI).
7. Vision path: with a Gemini/Claude flagship selected, generate flashcards from a PDF source; verify the network request carries the PDF bytes rather than extracted text. Compare with a text-only OpenRouter model selection — request should carry extracted text.

### No-go signals

- Any provider's BYOK endpoint starts rejecting CORS preflight in 2026. Mitigation: document a fallback (Vercel route handler as proxy) as a one-commit escape hatch.
- A provider's schema for `response_format` / tool-use changes between design and implementation. Mitigation: versioned provider clients; reviewer bumps the SDK and adjusts.

## Rollback

Branch `feat/multi-provider-ai`. If the branch stalls:

- **Full rollback**: delete the branch, close the PR. `main` is untouched. Users keep the current single-Gemini flow.
- **Partial rollback**: revert problematic commits on the branch. The provider plumbing for Gemini + OpenAI is likely stable; Anthropic and OpenRouter are riskier. If one provider's implementation stalls, ship with `getProvider('anthropic')` throwing `NotImplementedError` and the Anthropic card in Settings disabled with a "Coming soon" label. Out-of-scope, but an option.

Worst-case cost: time. No data migration to reverse; the zustand migration is idempotent and the old `geminiApiKey` is preserved until the new shape is confirmed in state.

## Success Criteria

1. All four providers (Gemini, OpenAI, Anthropic, OpenRouter) successfully generate flashcards from a text source with a valid key.
2. Gemini + Anthropic + at least one OpenRouter model successfully generate flashcards from a raw PDF (vision path).
3. Settings UI prevents the user from selecting an incompatible model for a feature (confirmed in smoke test step 4).
4. An existing user with only a Gemini key configured in pre-migration state can generate flashcards without opening settings after the upgrade (migration seed works).
5. `npm run build`, `npm run lint`, `npx tsc --noEmit` all exit 0.
6. The three dead TTS methods are removed; no residual references remain.
7. `src/lib/ai-service.ts` is deleted and all its types live in `src/lib/ai/types.ts`.
8. PR description lists every file added, every file deleted, and a short "how to test each provider" section with the provider's API-key URL and one smoke-test step per provider.
