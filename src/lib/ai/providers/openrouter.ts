import { ProviderError } from "../errors";
import type { ModelMeta } from "../types";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
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
