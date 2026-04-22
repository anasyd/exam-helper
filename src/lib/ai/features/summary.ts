import { resolveModelFor, type RouterDependencies } from "../router";

const SUMMARY_SYSTEM = `You are an expert educational summarizer. Produce a concise, well-structured
summary of the provided content suitable for study purposes. Use markdown formatting.`;

export async function generateTextSummary(
  content: string,
  deps: RouterDependencies
): Promise<string> {
  if (!content || content.trim().length === 0) {
    throw new Error("No content provided to summarize.");
  }
  const resolved = resolveModelFor("summary", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: SUMMARY_SYSTEM,
    prompt: `Summarize the following content for exam preparation:\n\n${content}`,
  });
}
