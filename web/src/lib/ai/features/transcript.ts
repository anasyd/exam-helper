import { resolveModelFor, type RouterDependencies } from "../router";

const FORMAT_SYSTEM = `You are a transcript-formatter. Reformat the raw transcript into well-structured
markdown with paragraph breaks, section headings where topics change, and bullet lists for enumerations.
Preserve all information; only improve formatting.`;

const LINK_SYSTEM = `You are a concept-linker. Given a markdown transcript, identify key concepts and add
inline bold emphasis on them. Do not add links or external references — only markdown emphasis. Keep all
original wording.`;

export async function formatTranscriptToMarkdown(
  rawTranscript: string,
  deps: RouterDependencies
): Promise<string> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    throw new Error("No transcript to format.");
  }
  const resolved = resolveModelFor("transcript", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: FORMAT_SYSTEM,
    prompt: `Format the following raw transcript:\n\n${rawTranscript}`,
  });
}

export async function linkTranscriptConcepts(
  formattedTranscript: string,
  deps: RouterDependencies
): Promise<string> {
  if (!formattedTranscript || formattedTranscript.trim().length === 0) {
    throw new Error("No formatted transcript provided.");
  }
  const resolved = resolveModelFor("transcript", deps);
  return resolved.provider.generateText({
    apiKey: resolved.apiKey,
    model: resolved.model.modelId,
    systemPrompt: LINK_SYSTEM,
    prompt: `Add concept emphasis to the following transcript:\n\n${formattedTranscript}`,
  });
}
