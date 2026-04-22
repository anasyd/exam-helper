import { GoogleGenerativeAI } from "@google/generative-ai";
import { ProviderError } from "../errors";
import type {
  DocumentStructuredOpts,
  DocumentTextGenOpts,
  MultiImageStructuredOpts,
  MultiImageTextGenOpts,
  Provider,
  StructuredGenOpts,
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
