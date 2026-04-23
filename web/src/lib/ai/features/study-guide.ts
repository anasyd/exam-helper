import { buildDocumentInput } from "../document-input";
import { resolveModelFor, type RouterDependencies } from "../router";
import type { JsonSchema, ProjectSource, StudyGuide } from "../types";

const STUDY_GUIDE_SYSTEM = `You are an expert curriculum designer. Analyse the provided material and produce a logical, comprehensive study guide optimised for progressive learning.

Requirements:
- Organise content from foundational concepts to advanced applications — earlier sections should be prerequisites for later ones
- Each section represents a coherent learning unit (theme, module, or chapter)
- Each topic within a section is learnable in one focused study session (15–30 min)
- Section summaries must describe what the learner will understand after studying it — not just name the topic
- Topic summaries must be specific: include the key idea, a concrete example or mechanism, and why it matters
- Cover all material comprehensively; do not omit edge cases, advanced topics, or nuanced distinctions
- Aim for 4–8 sections, each with 3–6 topics`;

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
    "Build a structured study guide with logically ordered sections and topics, each with specific and informative summaries. Ensure comprehensive coverage of all material.";

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
