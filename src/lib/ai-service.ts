import { GoogleGenerativeAI } from "@google/generative-ai";

interface FlashcardData {
  question: string;
  answer: string;
  options: string[]; // Array of options including the correct answer
  correctOptionIndex: number; // Index of the correct option in the array
}

export class GeminiService {
  private client: GoogleGenerativeAI;
  private modelName = "gemini-1.5-pro"; // Updated to the latest model name

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateFlashcards(
    content: string,
    numberOfCards: number = 15,
    existingFlashcards: { question: string; answer: string }[] = [],
    topicTitle?: string, // Added: For topic-specific context
    topicContent?: string // Added: For topic-specific context
  ): Promise<FlashcardData[]> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      const existingFlashcardsText = existingFlashcards.length > 0
        ? `EXISTING FLASHCARD QUESTIONS TO AVOID DUPLICATING (especially for this topic if provided):\n${existingFlashcards.map((card, i) => `${i + 1}. ${card.question}`).join("\n")}`
        : "";

      let prompt = `Generate ${numberOfCards} substantive multiple-choice flashcards in valid JSON format.

IMPORTANT GUIDELINES:
1. Focus ONLY on the technical/academic content - concepts, theories, definitions, methods, etc.
2. DO NOT create questions about administrative details like study hours, course codes, due dates, etc.
3. Each question should test understanding of important concepts from the material.
4. Create challenging questions that test real understanding, not just memorization.
5. DO NOT duplicate or create similar questions to any of the existing questions provided below.
6. CRITICAL: Your response MUST be a valid, parseable JSON array with no extra text before or after.
${existingFlashcardsText}

Each flashcard MUST include:
1. A clear, substantive question about the academic content.
2. A detailed answer explanation that thoroughly explains the concept.
3. Four plausible multiple choice options, with only one being correct.
4. The index (0-3) of the correct option in the options array.
`;

      if (topicTitle && topicContent) {
        prompt += `
SPECIFIC TOPIC CONTEXT:
The following questions should be FOCUSED ON the topic titled "${topicTitle}".
Use the main content below for broader context if needed, but prioritize the specific topic content.

Topic Title: "${topicTitle}"
Topic Content:
${topicContent.slice(0, 15000)}

Main Document Content (for broader context, if necessary):
${content.slice(0, 15000)} // Main content is also sliced
`;
      } else {
        prompt += `
Content to analyze:
${content.slice(0, 30000)} // Limit content length
`;
      }

      prompt += `
Response format (MUST follow exactly, with no additional text or markdown):
        [
          {
            "question": "Substantive question about a concept in the material",
            "answer": "Detailed explanation of the correct answer and why it's correct",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOptionIndex": 0 // Index of correct option (0-3)
          },
          ...more flashcards
        ]
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Raw AI response:", text.substring(0, 200) + "..."); // Log the beginning of the response for debugging
      
      // Try several approaches to extract valid JSON
      let parsedData: FlashcardData[] = [];
      
      try {
        // First attempt: Direct parsing
        parsedData = JSON.parse(text) as FlashcardData[];
      } catch (parseError) {
        // Second attempt: Extract JSON array pattern
        const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          try {
            parsedData = JSON.parse(jsonMatch[0]) as FlashcardData[];
          } catch (matchError) {
            // Third attempt: Find content between triple backticks if it looks like markdown code blocks
            const codeBlockMatch = text.match(/```(?:json)?\s*(\[\s*\{[\s\S]*\}\s*\])\s*```/);
            if (codeBlockMatch) {
              try {
                parsedData = JSON.parse(codeBlockMatch[1]) as FlashcardData[];
              } catch (codeBlockError) {
                throw new Error("Failed to parse AI response as JSON after multiple attempts");
              }
            } else {
              throw new Error("Could not locate valid JSON in the AI response");
            }
          }
        } else {
          throw new Error("No JSON-like structure found in the AI response");
        }
      }
      
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("Parsed data is not a valid array or is empty");
      }

      // Validate the data structure
      const validatedData = parsedData.filter(card => {
        try {
          return (
            card && 
            typeof card === 'object' &&
            typeof card.question === 'string' && 
            typeof card.answer === 'string' && 
            Array.isArray(card.options) && 
            card.options.length >= 2 &&
            typeof card.correctOptionIndex === 'number' &&
            card.correctOptionIndex >= 0 && 
            card.correctOptionIndex < card.options.length
          );
        } catch (validationError) {
          return false;
        }
      });
      
      if (validatedData.length === 0) {
        throw new Error("No valid flashcards could be extracted from the response");
      }
      
      return validatedData;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to generate flashcards: ${errorMessage}`);
    }
  }
}

// Create and export a factory function that creates the service instance
export function createGeminiService(apiKey: string) {
  return new GeminiService(apiKey);
}

export interface StudySection {
  title: string;
  content: string;
  topics?: StudyTopic[];
  audioSummaryText?: string;
  isCompleted?: boolean;
  mcqsGenerated?: boolean;
  xpAwardedOnCompletion?: number; // XP for completing this section
}

export interface StudyTopic {
  title: string;
  content: string;
  audioSummaryText?: string;
  isCompleted?: boolean;
  mcqsGenerated?: boolean;
  xpAwardedOnCompletion?: number; // XP for completing this topic
  // quizAttempts?: number;
  // quizBestScore?: number;
}

export interface StudyGuide {
  title: string;
  sections: StudySection[];
}

// Add this method to the GeminiService class
export async function generateStudyContent(
  this: GeminiService, // Important for 'this' context
  content: string
): Promise<StudyGuide> {
  try {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const prompt = `
      Based on the following document content, generate a comprehensive study guide.
      The study guide should be structured with a main title, and then broken down into logical sections (e.g., chapters, main parts).
      Each section should have a title and detailed content.
      Within each section, further break down the content into specific topics, each with its own title and detailed explanation.

      IMPORTANT GUIDELINES:
      1.  The overall response MUST be a single valid JSON object.
      2.  The JSON object should have a "title" (string) for the overall study guide, and an array of "sections".
      3.  Each object in the "sections" array should have a "title" (string) and "content" (string).
      4.  Each section object can optionally have an array of "topics".
      5.  Each object in the "topics" array (if present) should have a "title" (string) and "content" (string).
      6.  Ensure the content is well-organized, clear, and directly derived from the provided text.
      7.  Focus on extracting and structuring the core information.

      Document Content to Analyze:
      ${content.slice(0, 100000)} // Limiting content to avoid token limits, adjust as needed

      Response format (MUST follow exactly, with no additional text or markdown):
      {
        "title": "Comprehensive Study Guide for [Document Topic]",
        "sections": [
          {
            "title": "Section 1: [Section Title]",
            "content": "Detailed summary and explanation of content in section 1...",
            "isCompleted": false,
            "mcqsGenerated": false,
            "xpAwardedOnCompletion": 50, // Default XP for section
            "topics": [
              {
                "title": "Topic 1.1: [Specific Topic Title]",
                "content": "Detailed explanation of topic 1.1...",
                "isCompleted": false,
                "mcqsGenerated": false,
                "xpAwardedOnCompletion": 10 // Default XP for topic
              },
              {
                "title": "Topic 1.2: [Specific Topic Title]",
                "content": "Detailed explanation of topic 1.2...",
                "isCompleted": false,
                "mcqsGenerated": false,
                "xpAwardedOnCompletion": 10
              }
            ]
          },
          {
            "title": "Section 2: [Section Title]",
            "content": "Detailed summary and explanation of content in section 2...",
            "isCompleted": false,
            "mcqsGenerated": false,
            "xpAwardedOnCompletion": 50,
            "topics": [
              {
                "title": "Topic 2.1: [Specific Topic Title]",
                "content": "Detailed explanation of topic 2.1...",
                "isCompleted": false,
                "mcqsGenerated": false,
                "xpAwardedOnCompletion": 10
              }
            ]
          }
          // ... more sections
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("Raw AI response for study content:", text.substring(0, 500) + "...");

    let parsedData: StudyGuide;
    try {
      parsedData = JSON.parse(text) as StudyGuide;
    } catch (parseError) {
      const jsonMatch = text.match(/\{\s*"title"[\s\S]*\}\s*\}/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[0]) as StudyGuide;
        } catch (matchError) {
          const codeBlockMatch = text.match(/```(?:json)?\s*(\{\s*"title"[\s\S]*\}\s*\})\s*```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            try {
              parsedData = JSON.parse(codeBlockMatch[1]) as StudyGuide;
            } catch (codeBlockError) {
              console.error("Failed to parse study content JSON from code block:", codeBlockError);
              throw new Error("Failed to parse study content JSON after multiple attempts (code block).");
            }
          } else {
            console.error("Could not locate valid JSON in the AI response for study content (jsonMatch failed):", matchError);
            throw new Error("Could not locate valid JSON in the AI response for study content.");
          }
        }
      } else {
        console.error("No JSON-like structure found in the AI response for study content:", parseError);
        throw new Error("No JSON-like structure found in the AI response for study content.");
      }
    }

    // Basic validation
    if (!parsedData || typeof parsedData.title !== 'string' || !Array.isArray(parsedData.sections)) {
      console.error("Validation failed for parsed study guide:", parsedData);
      throw new Error("Generated study content is not in the expected format.");
    }

    // Generate audio summaries for sections and topics
    for (const section of parsedData.sections) {
      if (!section || typeof section.title !== 'string' || typeof section.content !== 'string') {
        console.warn("Skipping invalid section during summary generation:", section);
        continue;
      }
      section.audioSummaryText = await this.generateTextSummary(section.content, 80); // Summarize section content

      if (section.topics && Array.isArray(section.topics)) {
        await Promise.all(section.topics.map(async (topic) => {
          if (topic && typeof topic.title === 'string' && typeof topic.content === 'string') {
            topic.audioSummaryText = await this.generateTextSummary(topic.content, 50); // Summarize topic content
          } else {
            console.warn("Skipping invalid topic during summary generation:", topic);
          }
        }));
      }
    }

    // Re-validate after adding summaries and completion flags
    for (const section of parsedData.sections) {
      if (!section || typeof section.title !== 'string' || typeof section.content !== 'string' ||
          typeof section.isCompleted !== 'boolean' || typeof section.mcqsGenerated !== 'boolean' ||
          (section.xpAwardedOnCompletion !== undefined && typeof section.xpAwardedOnCompletion !== 'number') ) { // Validate XP
        throw new Error("Invalid section format or missing/invalid completion/XP flags in generated study content.");
      }
      if (section.audioSummaryText && typeof section.audioSummaryText !== 'string') {
        throw new Error("Invalid audio summary format for section.");
      }
      if (section.topics) {
        if (!Array.isArray(section.topics)) throw new Error("Invalid topics format (not an array).");
        for (const topic of section.topics) {
          if (!topic || typeof topic.title !== 'string' || typeof topic.content !== 'string' ||
              typeof topic.isCompleted !== 'boolean' || typeof topic.mcqsGenerated !== 'boolean' ||
              (topic.xpAwardedOnCompletion !== undefined && typeof topic.xpAwardedOnCompletion !== 'number') ) { // Validate XP
            throw new Error("Invalid topic format or missing/invalid completion/XP flags in generated study content topic.");
          }
          if (topic.audioSummaryText && typeof topic.audioSummaryText !== 'string') {
            throw new Error("Invalid audio summary format for topic.");
          }
        }
      }
    }

    return parsedData;
  } catch (error) {
    console.error("Error generating study content, summaries, or init flags:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to generate study content: ${errorMessage}`);
  }
}

// Add generateStudyContent to the GeminiService prototype
GeminiService.prototype.generateStudyContent = generateStudyContent;

async function generateTextSummary(
  this: GeminiService,
  textToSummarize: string,
  maxLength: number = 100 // Max length in words for the summary
): Promise<string> {
  if (!textToSummarize || textToSummarize.trim().length === 0) {
    return "";
  }
  try {
    const model = this.client.getGenerativeModel({ model: this.modelName }); // Use the same model
    const prompt = `
      Provide a concise audio summary for the following text.
      The summary should be clear, engaging, and suitable for voice narration.
      It should capture the absolute key points of the text.
      The summary MUST be approximately ${maxLength} words or less. Do not exceed this significantly.
      Do not include any introductory phrases like "This text is about..." or "The summary is...". Just provide the summary directly.

      Text to summarize:
      ${textToSummarize.slice(0, 15000)} // Limit input to avoid token issues for summary

      Concise Audio Summary (max ${maxLength} words):
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().trim();

    // Simple word count check (optional, but good for adherence)
    // const wordCount = summary.split(/\s+/).length;
    // if (wordCount > maxLength + 20) { // Allow some leeway
    //   console.warn(`Generated summary exceeded word count: ${wordCount} words. Text: ${summary}`);
    //   // Potentially truncate or ask for regeneration, but for now, accept it.
    // }

    return summary;
  } catch (error) {
    console.error("Error generating text summary:", error);
    // Return empty string or a placeholder error message if needed
    return ""; // Fallback to empty string on error
  }
}

// Add generateTextSummary to the GeminiService prototype
GeminiService.prototype.generateTextSummary = generateTextSummary;

// Function to format a raw transcript into Markdown
async function formatTranscriptToMarkdown(
  this: GeminiService,
  rawTranscript: string
): Promise<string> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return "";
  }
  try {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const prompt = `
      Format the following raw lecture transcript into well-structured Markdown.
      Ensure good readability with clear paragraph breaks.
      If speaker changes are evident (e.g., "Speaker 1:", "Interviewer:"), try to preserve or denote them clearly (e.g., using bold for speaker labels).
      Correct obvious punctuation errors if possible, but prioritize preserving the original content.
      Do not summarize or alter the core meaning. The goal is formatting for readability.

      Raw Transcript:
      ${rawTranscript.slice(0, 150000)} // Process a large chunk

      Formatted Markdown Transcript:
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error formatting transcript to Markdown:", error);
    return rawTranscript; // Fallback to raw transcript on error
  }
}
GeminiService.prototype.formatTranscriptToMarkdown = formatTranscriptToMarkdown;

// Function to identify and link concepts in a formatted transcript
async function linkTranscriptConcepts(
  this: GeminiService,
  formattedTranscript: string
): Promise<string> {
  if (!formattedTranscript || formattedTranscript.trim().length === 0) {
    return "";
  }
  try {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const prompt = `
      Analyze the following Markdown-formatted lecture transcript.
      Identify key terms, concepts, people, or technologies mentioned.
      For each identified key item, reformat it as a Markdown link.
      For the link URL, use a Google search query URL for that term (e.g., for "machine learning", the link would be [machine learning](https://www.google.com/search?q=machine+learning)).
      Ensure the output is still valid Markdown, preserving the original structure and just adding the links.
      Do not link common words; focus on significant nouns, technical terms, or proper names.

      Formatted Transcript with Placeholders for Links:
      ${formattedTranscript.slice(0, 150000)}

      Transcript with Markdown Links:
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error linking transcript concepts:", error);
    return formattedTranscript; // Fallback to formatted transcript on error
  }
}
GeminiService.prototype.linkTranscriptConcepts = linkTranscriptConcepts;

// Function to generate automated notes from content
async function generateAutomatedNotes(
  this: GeminiService,
  content: string,
  contentType: "document" | "video_transcript" // To tailor the prompt
): Promise<string> {
  if (!content || content.trim().length === 0) {
    return "";
  }
  try {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const prompt = `
      Generate structured and concise notes from the following ${contentType === "document" ? "document" : "lecture transcript"} content.
      The notes should be in Markdown format.
      Identify key information, main points, definitions, and important concepts.
      Structure the notes logically, for example using headings for main sections and bullet points for details or lists.
      Aim for clarity and conciseness, capturing the essence of the content.

      Content for Note Generation:
      ${content.slice(0, 150000)} // Process a large chunk

      Structured Markdown Notes:
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error(`Error generating automated notes for ${contentType}:`, error);
    return `Error generating notes: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
GeminiService.prototype.generateAutomatedNotes = generateAutomatedNotes;