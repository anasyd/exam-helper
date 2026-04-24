// Server-side AI generation — text-only path (PDF extraction already done client-side).
// Mirrors the web feature files but uses raw fetch instead of browser SDKs.

export interface FlashcardData {
  question: string;
  answer: string;
  explanation: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: number;
}

export interface StudyTopic {
  title: string;
  summary: string;
}

export interface StudySection {
  title: string;
  summary: string;
  topics: StudyTopic[];
}

export interface StudyGuide {
  title: string;
  sections: StudySection[];
}

export interface GenerateAllFlags {
  generateStudyGuide: boolean;
  generateNotes: boolean;
  generateFlashcards: boolean;
  flashcardCount: number;
}

export interface GenerateAllResult {
  studyGuide?: StudyGuide;
  notes?: string;
  flashcards?: FlashcardData[];
}

// ── Shared JSON schemas (same as web feature files) ──────────────────────────

const FLASHCARDS_SCHEMA = {
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
        additionalProperties: false,
      },
    },
  },
  required: ["flashcards"],
  additionalProperties: false,
} as const;

const STUDY_GUIDE_SCHEMA = {
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
              additionalProperties: false,
            },
          },
        },
        required: ["title", "summary", "topics"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "sections"],
  additionalProperties: false,
} as const;

// ── System prompts (same as web feature files) ────────────────────────────────

const FLASHCARDS_SYSTEM = `You are an expert exam coach generating high-quality multiple-choice flashcards from source material.

Rules:
- Each question must be clear, self-contained, and test understanding rather than pure recall.
- Write one definitively correct answer and three plausible but wrong distractors.
- Distractors should represent common misconceptions — not obviously wrong options.
- The explanation must state WHY the correct answer is right and clarify the underlying concept in 2–4 sentences. Do not just restate the answer.
- Difficulty: 1 = foundational definition, 3 = applied understanding, 5 = nuanced edge case or analysis.
- Vary difficulty across the set. Do not cluster all cards at the same level.`;

const STUDY_GUIDE_SYSTEM = `You are an expert curriculum designer. Analyse the provided material and produce a logical, comprehensive study guide optimised for progressive learning.

Requirements:
- Organise content from foundational concepts to advanced applications — earlier sections should be prerequisites for later ones
- Each section represents a coherent learning unit (theme, module, or chapter)
- Each topic within a section is learnable in one focused study session (15–30 min)
- Section summaries must describe what the learner will understand after studying it — not just name the topic
- Topic summaries must be specific: include the key idea, a concrete example or mechanism, and why it matters
- Cover all material comprehensively; do not omit edge cases, advanced topics, or nuanced distinctions
- Aim for 4–8 sections, each with 3–6 topics`;

const NOTES_SYSTEM = `You are an expert study note-taker and educator. Transform the provided material into comprehensive, well-structured study notes optimised for exam preparation.

Format requirements:
- Use ## for major topic headings, ### for subtopics
- Use bullet points for key facts; numbered lists for processes, steps, or ordered concepts
- Include comparison tables where relevant (algorithms, techniques, trade-offs)
- Bold (**term**) key vocabulary and definitions on first use
- Add a short "Key Takeaways" callout at the end of each major section
- Be thorough but concise — no filler, every sentence must add value
- Explain concepts clearly in plain language, not just name them`;

// ── Provider implementations (text-only) ─────────────────────────────────────

async function geminiGenerateText(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return json.candidates[0]?.content?.parts[0]?.text ?? "";
}

async function geminiGenerateJson<T>(apiKey: string, model: string, systemPrompt: string, prompt: string, schema: object): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  const text = json.candidates[0]?.content?.parts[0]?.text ?? "{}";
  return JSON.parse(text) as T;
}

async function openaiGenerateText(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

async function openaiGenerateJson<T>(apiKey: string, model: string, systemPrompt: string, prompt: string, schema: object): Promise<T> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name: "response", schema, strict: true } },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  const text = json.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

async function anthropicGenerateText(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { content: { type: string; text?: string }[] };
  return json.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

async function anthropicGenerateJson<T>(apiKey: string, model: string, systemPrompt: string, prompt: string, schema: object): Promise<T> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      tools: [{ name: "emit", description: "Emit the structured response.", input_schema: schema }],
      tool_choice: { type: "tool", name: "emit" },
    }),
  });
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { content: { type: string; name?: string; input?: unknown }[] };
  for (const block of json.content) {
    if (block.type === "tool_use" && block.name === "emit") return block.input as T;
  }
  throw new Error("Anthropic did not emit tool_use output");
}

async function openrouterGenerateText(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "exam-helper",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

async function openrouterGenerateJson<T>(apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<T> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "exam-helper",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  const text = json.choices[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}

// ── Dispatch helpers ──────────────────────────────────────────────────────────

function generateText(providerId: string, apiKey: string, model: string, systemPrompt: string, prompt: string): Promise<string> {
  switch (providerId) {
    case "gemini": return geminiGenerateText(apiKey, model, systemPrompt, prompt);
    case "openai": return openaiGenerateText(apiKey, model, systemPrompt, prompt);
    case "anthropic": return anthropicGenerateText(apiKey, model, systemPrompt, prompt);
    case "openrouter": return openrouterGenerateText(apiKey, model, systemPrompt, prompt);
    default: throw new Error(`Unknown provider: ${providerId}`);
  }
}

function generateJson<T>(providerId: string, apiKey: string, model: string, systemPrompt: string, prompt: string, schema: object): Promise<T> {
  switch (providerId) {
    case "gemini": return geminiGenerateJson<T>(apiKey, model, systemPrompt, prompt, schema);
    case "openai": return openaiGenerateJson<T>(apiKey, model, systemPrompt, prompt, schema);
    case "anthropic": return anthropicGenerateJson<T>(apiKey, model, systemPrompt, prompt, schema);
    case "openrouter": return openrouterGenerateJson<T>(apiKey, model, systemPrompt, prompt);
    default: throw new Error(`Unknown provider: ${providerId}`);
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function generateAll(
  text: string,
  providerId: string,
  modelId: string,
  apiKey: string,
  flags: GenerateAllFlags,
): Promise<GenerateAllResult> {
  const result: GenerateAllResult = {};

  if (flags.generateStudyGuide) {
    const prompt = "Build a structured study guide with logically ordered sections and topics, each with specific and informative summaries. Ensure comprehensive coverage of all material.\n\nSource:\n" + text;
    result.studyGuide = await generateJson<StudyGuide>(providerId, apiKey, modelId, STUDY_GUIDE_SYSTEM, prompt, STUDY_GUIDE_SCHEMA);
  }

  if (flags.generateNotes) {
    const prompt = "Generate comprehensive study notes from the following content:\n\n" + text;
    result.notes = await generateText(providerId, apiKey, modelId, NOTES_SYSTEM, prompt);
  }

  if (flags.generateFlashcards) {
    const count = flags.flashcardCount ?? 15;
    const prompt = `Generate exactly ${count} flashcards covering the most important concepts. For each flashcard:
- question: a clear, self-contained question
- answer: the exact text of the correct option (must match one of the options)
- explanation: 2–4 sentences explaining why the answer is correct and clarifying the concept
- options: array of exactly 4 strings (correct answer + 3 distractors)
- correctOptionIndex: 0-based index of the correct answer within the options array
- difficulty: integer 1–5

Source:
${text}`;
    const raw = await generateJson<{ flashcards: FlashcardData[] }>(providerId, apiKey, modelId, FLASHCARDS_SYSTEM, prompt, FLASHCARDS_SCHEMA);
    result.flashcards = raw.flashcards;
  }

  return result;
}
