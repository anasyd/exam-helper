import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { ProjectSource } from "../types";

const NOTES_SYSTEM = `You are an expert study note-taker and educator. Transform the provided material into comprehensive, well-structured study notes optimised for exam preparation.

Format requirements:
- Use ## for major topic headings, ### for subtopics
- Use bullet points for key facts; numbered lists for processes, steps, or ordered concepts
- Include comparison tables where relevant (algorithms, techniques, trade-offs)
- Bold (**term**) key vocabulary and definitions on first use
- Add a short "Key Takeaways" callout at the end of each major section
- Be thorough but concise — no filler, every sentence must add value
- Explain concepts clearly in plain language, not just name them`;

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
      prompt: `Generate comprehensive study notes from the following content:\n\n${input.content}`,
    });
  }
  if (input.kind === "file") {
    return resolved.provider.generateTextFromDocument({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: NOTES_SYSTEM,
      prompt: "Generate comprehensive study notes from the attached document, following the format requirements precisely.",
      document: { mimeType: input.mimeType, data: input.data },
    });
  }
  return resolved.provider.generateTextFromImages({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: NOTES_SYSTEM,
    prompt: "Generate comprehensive study notes from the attached document pages, following the format requirements precisely.",
    images: input.images,
  });
}
