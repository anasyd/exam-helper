import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { JsonSchema, ProjectSource, StudyGuide } from "../types";

const STUDY_GUIDE_SYSTEM = `You are an expert course designer. Organize the provided content into a
structured study guide with a title, logically-ordered sections, and a list of topics per section.
Each section and topic has a short summary. Cover the material comprehensively.`;

const STUDY_GUIDE_SCHEMA: JsonSchema = {
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
            },
          },
        },
        required: ["title", "summary", "topics"],
      },
    },
  },
  required: ["title", "sections"],
};

export async function generateStudyContent(
  source: ProjectSource,
  deps: RouterDependencies
): Promise<StudyGuide> {
  const resolved = resolveModelFor("study-guide", deps);
  const input = await buildDocumentInput(source, resolved.model);
  const userPrompt =
    "Build a structured study guide with sections and topics, each with concise summaries.";

  if (input.kind === "text") {
    return resolved.provider.generateStructuredJson<StudyGuide>({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: STUDY_GUIDE_SYSTEM,
      prompt: `${userPrompt}\n\nSource:\n${input.content}`,
      schema: STUDY_GUIDE_SCHEMA,
    });
  }
  if (input.kind === "file") {
    return resolved.provider.generateStructuredJsonFromDocument<StudyGuide>({
      apiKey: resolved.apiKey,
      model: resolved.model.modelId,
      systemPrompt: STUDY_GUIDE_SYSTEM,
      prompt: userPrompt,
      schema: STUDY_GUIDE_SCHEMA,
      document: { mimeType: input.mimeType, data: input.data },
    });
  }
  return resolved.provider.generateStructuredJsonFromImages<StudyGuide>({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: STUDY_GUIDE_SYSTEM,
    prompt: userPrompt,
    schema: STUDY_GUIDE_SCHEMA,
    images: input.images,
  });
}
