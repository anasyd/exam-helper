import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FlashcardData {
  question: string;
  answer: string;
  options: string[]; // Array of options including the correct answer
  correctOptionIndex: number; // Index of the correct option in the array
}

interface TTSOptions {
  voice?: "male" | "female" | "neutral";
  speed?: number; // 0.25 to 4.0
  pitch?: number; // -20.0 to 20.0
  language?: string; // Language code like 'en-US'
}

interface SpeechOptions {
  voice?: "male" | "female" | "neutral";
  tone?: "professional" | "casual" | "educational";
  speed?: number;
  pitch?: number;
  language?: string;
}

export class GeminiService {
  protected client: GoogleGenerativeAI;

  // Model selection based on use case and rate limits
  protected models = {
    // High-frequency, lightweight tasks (30 RPM, 1M tokens)
    fast: "gemini-2.0-flash-lite",
    // Complex generation tasks (15 RPM, 1M tokens)
    standard: "gemini-2.0-flash",
    // Fallback model (15 RPM, 250K tokens)
    fallback: "gemini-2.5-flash-lite-preview-06-17",
    // Text-to-Speech for converting lectures (3 RPM, 10K tokens)
    tts: "gemini-2.5-flash-preview-tts",
    // Speech generation and live interactions
    speechLive: "gemini-2.5-flash-live",
  };

  private lastRequestTime = 0;
  private requestCount = 0;

  // Rate limits per model (requests per minute)
  private readonly rateLimits = {
    "gemini-2.0-flash-lite": { rpm: 28, interval: 2200 }, // Conservative: 28 RPM = ~2.2s interval
    "gemini-2.0-flash": { rpm: 13, interval: 4800 }, // Conservative: 13 RPM = ~4.8s interval
    "gemini-2.5-flash-lite-preview-06-17": { rpm: 13, interval: 4800 }, // Conservative: 13 RPM = ~4.8s interval
    "gemini-2.5-flash": { rpm: 8, interval: 7500 }, // Conservative: 8 RPM = ~7.5s interval
    "gemini-2.5-flash-preview-tts": { rpm: 2, interval: 20000 }, // Conservative: 2 RPM = ~20s interval for TTS
    "gemini-2.5-flash-live": { rpm: 10, interval: 6000 }, // Estimated rate limit for live model
  };

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  // Get optimal model for task type
  protected getModelForTask(
    taskType: "summary" | "generation" | "formatting" | "tts" | "speech-live"
  ): string {
    switch (taskType) {
      case "summary":
        return this.models.fast; // Use fastest model for summaries
      case "generation":
        return this.models.standard; // Use standard model for complex generation
      case "formatting":
        return this.models.fast; // Use fast model for formatting tasks
      case "tts":
        return this.models.tts; // Use TTS model for lecture-to-speech conversion
      case "speech-live":
        return this.models.speechLive; // Use live model for speech generation
      default:
        return this.models.standard;
    }
  }

  // Dynamic rate limiting based on model
  protected async waitForRateLimit(modelName: string): Promise<void> {
    const rateLimit =
      this.rateLimits[modelName as keyof typeof this.rateLimits] ||
      this.rateLimits["gemini-2.5-flash"]; // Default fallback

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset request count every minute
    if (timeSinceLastRequest > 60000) {
      this.requestCount = 0;
    }

    // If we're approaching the limit, wait longer
    if (this.requestCount >= rateLimit.rpm) {
      const waitTime = 60000 - timeSinceLastRequest + 1000; // Wait until next minute + buffer
      console.log(
        `Rate limit reached for ${modelName}: waiting ${Math.round(
          waitTime / 1000
        )}s before next request`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
    } else if (timeSinceLastRequest < rateLimit.interval) {
      const waitTime = rateLimit.interval - timeSinceLastRequest;
      console.log(
        `Rate limiting ${modelName}: waiting ${Math.round(
          waitTime / 1000
        )}s before next request`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  // Retry mechanism for handling rate limit errors
  protected async executeWithRetry<T>(
    operation: (modelName: string) => Promise<T>,
    modelName: string,
    maxRetries: number = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation(modelName);
      } catch (error: any) {
        if (
          error?.message?.includes("429") ||
          error?.message?.includes("503")
        ) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 1 minute
          console.log(
            `Rate limit hit on ${modelName}, attempt ${attempt}/${maxRetries}. Waiting ${Math.round(
              waitTime / 1000
            )}s before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          if (attempt === maxRetries) {
            throw new Error(
              `Rate limit exceeded after ${maxRetries} attempts. Please try again later.`
            );
          }
        } else {
          throw error;
        }
      }
    }
    throw new Error("Unexpected error in retry mechanism");
  }

  async generateTextSummary(
    textToSummarize: string,
    maxLength: number = 100
  ): Promise<string> {
    if (!textToSummarize || textToSummarize.trim().length === 0) {
      return "";
    }
    try {
      const modelName = this.getModelForTask("summary");

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
        const prompt = `
        Provide a concise audio summary for the following text.
        The summary should be clear, engaging, and suitable for voice narration.
        It should capture the absolute key points of the text.
        The summary MUST be approximately ${maxLength} words or less. Do not exceed this significantly.
        Do not include any introductory phrases like "This text is about..." or "The summary is...". Just provide the summary directly.

        Text to summarize:
        ${textToSummarize.slice(0, 15000)}

        Concise Audio Summary (max ${maxLength} words):
      `;
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      const summary = response.text().trim();

      return summary;
    } catch (error) {
      console.error("Error generating text summary:", error);
      return "";
    }
  }

  async formatTranscriptToMarkdown(rawTranscript: string): Promise<string> {
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return "";
    }
    try {
      const modelName = this.getModelForTask("formatting");

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
        const prompt = `
        Format the following raw lecture transcript into well-structured Markdown.
        Ensure good readability with clear paragraph breaks.
        If speaker changes are evident (e.g., "Speaker 1:", "Interviewer:"), try to preserve or denote them clearly (e.g., using bold for speaker labels).
        Correct obvious punctuation errors if possible, but prioritize preserving the original content.
        Do not summarize or alter the core meaning. The goal is formatting for readability.

        Raw Transcript:
        ${rawTranscript.slice(0, 150000)}

        Formatted Markdown Transcript:
      `;
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error formatting transcript to Markdown:", error);
      return rawTranscript;
    }
  }

  async linkTranscriptConcepts(formattedTranscript: string): Promise<string> {
    if (!formattedTranscript || formattedTranscript.trim().length === 0) {
      return "";
    }
    try {
      const modelName = this.getModelForTask("formatting");

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
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
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error("Error linking transcript concepts:", error);
      return formattedTranscript;
    }
  }

  async generateAutomatedNotes(
    content: string,
    contentType: "document" | "video_transcript"
  ): Promise<string> {
    if (!content || content.trim().length === 0) {
      return "";
    }
    try {
      const modelName = this.getModelForTask("generation");

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
        const prompt = `
        Generate structured and concise notes from the following ${
          contentType === "document" ? "document" : "lecture transcript"
        } content.
        The notes should be in Markdown format.
        Identify key information, main points, definitions, and important concepts.
        Structure the notes logically, for example using headings for main sections and bullet points for details or lists.
        Aim for clarity and conciseness, capturing the essence of the content.

        Content for Note Generation:
        ${content.slice(0, 150000)}

        Structured Markdown Notes:
      `;
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error(
        `Error generating automated notes for ${contentType}:`,
        error
      );
      return `Error generating notes: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }

  async convertLectureToSpeech(
    lectureText: string,
    options: TTSOptions = {}
  ): Promise<ArrayBuffer> {
    if (!lectureText || lectureText.trim().length === 0) {
      throw new Error("Lecture text cannot be empty");
    }

    // Note: The current Gemini API doesn't support direct audio output in the expected format
    // This functionality should be implemented using browser's speech synthesis API instead
    console.warn(
      "TTS via Gemini API is not currently supported. Consider using browser's speechSynthesis API."
    );

    throw new Error(
      "TTS functionality is currently not supported by the Gemini API. Please use the browser's built-in speech synthesis for audio playback."
    );
  }

  async generateLiveSpeech(
    prompt: string,
    options: SpeechOptions = {}
  ): Promise<ArrayBuffer> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error("Speech prompt cannot be empty");
    }

    try {
      const modelName = this.getModelForTask("speech-live");

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });

        // Prepare speech generation prompt
        const speechPrompt = `
          Generate natural, engaging speech based on the following prompt.
          Voice characteristics: ${options.voice || "neutral"} voice
          Tone: ${options.tone || "educational"}
          Speed: ${options.speed || 1.0}
          Language: ${options.language || "en-US"}
          
          Content to speak: ${prompt}
          
          Please generate clear, well-paced speech that would be suitable for educational content.
        `;

        return await geminiModel.generateContent(speechPrompt);
      }, modelName);

      const response = await result.response;

      // Note: Similar to TTS, the actual implementation will depend on
      // how Gemini 2.5 Flash Live handles speech generation
      console.log("Live speech generation completed");
      return new ArrayBuffer(0); // Placeholder - replace with actual audio data
    } catch (error) {
      console.error("Error generating live speech:", error);
      throw new Error(
        `Failed to generate live speech: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateStudyAudioNarration(
    studyGuide: StudyGuide,
    options: TTSOptions = {}
  ): Promise<{
    sectionAudios: ArrayBuffer[];
    topicAudios: { [sectionIndex: number]: ArrayBuffer[] };
  }> {
    const sectionAudios: ArrayBuffer[] = [];
    const topicAudios: { [sectionIndex: number]: ArrayBuffer[] } = {};

    try {
      console.log("Starting audio narration generation for study guide...");

      // Generate audio for each section
      for (let i = 0; i < studyGuide.sections.length; i++) {
        const section = studyGuide.sections[i];

        if (section.audioSummaryText) {
          console.log(
            `Generating audio for section ${i + 1}: ${section.title}`
          );
          const sectionAudio = await this.convertLectureToSpeech(
            `Section ${i + 1}: ${section.title}. ${section.audioSummaryText}`,
            options
          );
          sectionAudios.push(sectionAudio);
        }

        // Generate audio for topics within the section
        if (section.topics && section.topics.length > 0) {
          topicAudios[i] = [];

          for (let j = 0; j < section.topics.length; j++) {
            const topic = section.topics[j];

            if (topic.audioSummaryText) {
              console.log(
                `Generating audio for topic ${j + 1} in section ${i + 1}: ${
                  topic.title
                }`
              );
              const topicAudio = await this.convertLectureToSpeech(
                `Topic: ${topic.title}. ${topic.audioSummaryText}`,
                options
              );
              topicAudios[i].push(topicAudio);
            }
          }
        }
      }

      return { sectionAudios, topicAudios };
    } catch (error) {
      console.error("Error generating study audio narration:", error);
      throw new Error(
        `Failed to generate study audio narration: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
  async generateAllContentTypes(
    documentText: string,
    options: {
      generateFlashcards?: boolean;
      generateNotes?: boolean;
      generateStudyGuide?: boolean;
      numberOfFlashcards?: number;
      ttsOptions?: TTSOptions;
    } = {}
  ): Promise<{
    studyGuide?: StudyGuide;
    notes?: string;
    flashcards?: FlashcardData[];
    audioNarration?: {
      sectionAudios: ArrayBuffer[];
      topicAudios: { [sectionIndex: number]: ArrayBuffer[] };
    };
  }> {
    const {
      generateFlashcards = true,
      generateNotes = true,
      generateStudyGuide = true,
      numberOfFlashcards = 15,
      ttsOptions = {},
    } = options;

    const results: any = {};

    try {
      console.log("Starting comprehensive content generation...");

      // 1. Generate Study Guide (primary content structure)
      if (generateStudyGuide) {
        console.log("Generating study guide...");
        results.studyGuide = await this.generateStudyContent(documentText);
      }

      // 2. Generate Notes (quick overview)
      if (generateNotes) {
        console.log("Generating automated notes...");
        results.notes = await this.generateAutomatedNotes(
          documentText,
          "document"
        );
      }

      // 3. Generate Flashcards (for testing knowledge)
      if (generateFlashcards) {
        console.log("Generating flashcards...");
        results.flashcards = await this.generateFlashcards(
          documentText,
          numberOfFlashcards
        );
      }

      // 4. Audio Narration is currently disabled due to Gemini API limitations
      // Note: TTS functionality would need to be implemented using browser's speechSynthesis API
      // or alternative TTS services until Gemini provides proper audio output support
      if (false && generateStudyGuide && results.studyGuide) {
        console.log(
          "Audio narration is currently disabled due to API limitations"
        );
      }

      console.log("Comprehensive content generation completed successfully!");
      return results;
    } catch (error) {
      console.error("Error in comprehensive content generation:", error);
      throw new Error(
        `Failed to generate all content types: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateFlashcards(
    content: string,
    numberOfCards: number = 15,
    existingFlashcards: { question: string; answer: string }[] = [],
    topicTitle?: string,
    topicContent?: string
  ): Promise<FlashcardData[]> {
    try {
      const modelName = this.getModelForTask("generation");

      const existingFlashcardsText =
        existingFlashcards.length > 0
          ? `EXISTING FLASHCARD QUESTIONS TO AVOID DUPLICATING (especially for this topic if provided):\n${existingFlashcards
              .map((card, i) => `${i + 1}. ${card.question}`)
              .join("\n")}`
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
${content.slice(0, 15000)}
`;
      } else {
        prompt += `
Content to analyze:
${content.slice(0, 30000)}
`;
      }

      prompt += `
Response format (MUST follow exactly, with no additional text or markdown):
        [
          {
            "question": "Substantive question about a concept in the material",
            "answer": "Detailed explanation of the correct answer and why it's correct",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOptionIndex": 0
          },
          ...more flashcards
        ]
      `;

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      const text = response.text();

      console.log("Raw AI response:", text.substring(0, 200) + "...");

      // Try several approaches to extract valid JSON
      let parsedData: FlashcardData[] = [];

      try {
        // First attempt: Direct parsing
        parsedData = JSON.parse(text) as FlashcardData[];
      } catch (parseError) {
        // Second attempt: Extract JSON from code blocks first
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          try {
            parsedData = JSON.parse(codeBlockMatch[1]) as FlashcardData[];
          } catch (codeBlockError) {
            console.error(
              "Failed to parse flashcard JSON from code block:",
              codeBlockError
            );
          }
        }

        // Third attempt: Extract JSON array pattern if code block parsing failed
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0]) as FlashcardData[];
            } catch (matchError) {
              console.error("Could not parse JSON array pattern:", matchError);
            }
          }
        }

        // If all parsing attempts failed, throw error
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          console.error("No valid JSON found in the AI response:", parseError);
          console.log("Full response text:", text.substring(0, 1000));
          throw new Error("Could not locate valid JSON in the AI response");
        }
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("Parsed data is not a valid array or is empty");
      }

      // Validate the data structure
      const validatedData = parsedData.filter((card) => {
        try {
          return (
            card &&
            typeof card === "object" &&
            typeof card.question === "string" &&
            typeof card.answer === "string" &&
            Array.isArray(card.options) &&
            card.options.length >= 2 &&
            typeof card.correctOptionIndex === "number" &&
            card.correctOptionIndex >= 0 &&
            card.correctOptionIndex < card.options.length
          );
        } catch (validationError) {
          return false;
        }
      });

      if (validatedData.length === 0) {
        throw new Error(
          "No valid flashcards could be extracted from the response"
        );
      }

      return validatedData;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to generate flashcards: ${errorMessage}`);
    }
  }

  async generateStudyContent(content: string): Promise<StudyGuide> {
    try {
      const modelName = this.getModelForTask("generation");

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
        ${content.slice(0, 100000)}

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
                }
              ]
            }
          ]
        }
      `;

      const result = await this.executeWithRetry(async (model) => {
        await this.waitForRateLimit(model);
        const geminiModel = this.client.getGenerativeModel({ model });
        return await geminiModel.generateContent(prompt);
      }, modelName);

      const response = await result.response;
      const text = response.text();

      console.log(
        "Raw study content response:",
        text.substring(0, 300) + "..."
      );

      let parsedData: StudyGuide;
      try {
        parsedData = JSON.parse(text) as StudyGuide;
      } catch (parseError) {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          try {
            parsedData = JSON.parse(codeBlockMatch[1]) as StudyGuide;
          } catch (codeBlockError) {
            console.error(
              "Failed to parse study content JSON from code block:",
              codeBlockError
            );
            throw new Error("Could not parse study content from AI response");
          }
        } else {
          console.error("No valid JSON found in AI response:", parseError);
          throw new Error("Could not parse study content from AI response");
        }
      }

      // Enhanced validation
      if (
        !parsedData ||
        typeof parsedData !== "object" ||
        typeof parsedData.title !== "string" ||
        !Array.isArray(parsedData.sections)
      ) {
        throw new Error("Invalid study content format received from AI");
      }

      // Initialize completion flags and XP values for sections and topics
      for (const section of parsedData.sections) {
        // Initialize section properties if not present
        section.isCompleted = section.isCompleted ?? false;
        section.mcqsGenerated = section.mcqsGenerated ?? false;
        section.xpAwardedOnCompletion = section.xpAwardedOnCompletion ?? 50;

        if (section.topics && Array.isArray(section.topics)) {
          for (const topic of section.topics) {
            // Initialize topic properties if not present
            topic.isCompleted = topic.isCompleted ?? false;
            topic.mcqsGenerated = topic.mcqsGenerated ?? false;
            topic.xpAwardedOnCompletion = topic.xpAwardedOnCompletion ?? 10;
          }
        }
      }

      // Process sections sequentially to avoid rate limits
      for (const section of parsedData.sections) {
        section.audioSummaryText = await this.generateTextSummary(
          section.content,
          80
        );

        if (section.topics && Array.isArray(section.topics)) {
          for (const topic of section.topics) {
            if (
              topic &&
              typeof topic.title === "string" &&
              typeof topic.content === "string"
            ) {
              topic.audioSummaryText = await this.generateTextSummary(
                topic.content,
                50
              );
            } else {
              console.warn(
                "Skipping invalid topic during summary generation:",
                topic
              );
            }
          }
        }
      }

      // Re-validate after adding summaries and completion flags
      for (const section of parsedData.sections) {
        if (
          !section ||
          typeof section.title !== "string" ||
          typeof section.content !== "string" ||
          typeof section.isCompleted !== "boolean" ||
          typeof section.mcqsGenerated !== "boolean" ||
          (section.xpAwardedOnCompletion !== undefined &&
            typeof section.xpAwardedOnCompletion !== "number")
        ) {
          throw new Error(
            "Invalid section format or missing/invalid completion/XP flags in generated study content."
          );
        }
        if (
          section.audioSummaryText &&
          typeof section.audioSummaryText !== "string"
        ) {
          throw new Error("Invalid audio summary format for section.");
        }
        if (section.topics) {
          if (!Array.isArray(section.topics))
            throw new Error("Invalid topics format (not an array).");
          for (const topic of section.topics) {
            if (
              !topic ||
              typeof topic.title !== "string" ||
              typeof topic.content !== "string" ||
              typeof topic.isCompleted !== "boolean" ||
              typeof topic.mcqsGenerated !== "boolean" ||
              (topic.xpAwardedOnCompletion !== undefined &&
                typeof topic.xpAwardedOnCompletion !== "number")
            ) {
              throw new Error(
                "Invalid topic format or missing/invalid completion/XP flags in generated study content."
              );
            }
            if (
              topic.audioSummaryText &&
              typeof topic.audioSummaryText !== "string"
            ) {
              throw new Error("Invalid audio summary format for topic.");
            }
          }
        }
      }

      return parsedData;
    } catch (error) {
      console.error("Error generating study content or summaries:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to generate study content: ${errorMessage}`);
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
