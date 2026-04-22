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
