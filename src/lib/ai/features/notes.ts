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
