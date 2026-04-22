import { ProviderError } from "../errors";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
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
