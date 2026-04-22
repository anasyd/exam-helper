import { ProviderError } from "../errors";
import type { JsonSchema } from "../types";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
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
