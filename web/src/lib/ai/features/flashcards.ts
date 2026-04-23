import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { FlashcardData, JsonSchema, ProjectSource } from "../types";

const FLASHCARDS_SYSTEM = `You are an expert exam coach generating high-quality multiple-choice flashcards from source material.

Rules:
- Each question must be clear, self-contained, and test understanding rather than pure recall.
- Write one definitively correct answer and three plausible but wrong distractors.
- Distractors should represent common misconceptions — not obviously wrong options.
- The explanation must state WHY the correct answer is right and clarify the underlying concept in 2–4 sentences. Do not just restate the answer.
- Difficulty: 1 = foundational definition, 3 = applied understanding, 5 = nuanced edge case or analysis.
- Vary difficulty across the set. Do not cluster all cards at the same level.`;

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
          explanation: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctOptionIndex: { type: "integer" },
          difficulty: { type: "integer" },
        },
        required: ["question", "answer", "explanation", "options", "correctOptionIndex", "difficulty"],
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
  const userPrompt = `Generate exactly ${count} flashcards covering the most important concepts. For each flashcard:
- question: a clear, self-contained question
- answer: the exact text of the correct option (must match one of the options)
- explanation: 2–4 sentences explaining why the answer is correct and clarifying the concept
- options: array of exactly 4 strings (correct answer + 3 distractors)
- correctOptionIndex: 0-based index of the correct answer within the options array
- difficulty: integer 1–5`;

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
