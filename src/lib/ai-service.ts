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
    existingFlashcards: { question: string; answer: string }[] = []
  ): Promise<FlashcardData[]> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      
      // Format existing flashcards for the prompt - only sending questions to avoid duplicates
      const existingFlashcardsText = existingFlashcards.length > 0 
        ? `EXISTING FLASHCARD QUESTIONS TO AVOID DUPLICATING:
          ${existingFlashcards.map((card, i) => `${i + 1}. ${card.question}`).join('\n')}`
        : '';
      
      // Enhanced prompt that focuses on substantive content and avoids administrative details
      const prompt = `
        Based on the following academic content, generate ${numberOfCards} substantive multiple-choice flashcards in valid JSON format.

        IMPORTANT GUIDELINES:
        1. Focus ONLY on the technical/academic content - concepts, theories, definitions, methods, etc.
        2. DO NOT create questions about administrative details like study hours, course codes, due dates, etc.
        3. Each question should test understanding of important concepts from the material
        4. Create challenging questions that test real understanding, not just memorization
        5. DO NOT duplicate or create similar questions to any of the existing questions provided below
        6. CRITICAL: Your response MUST be a valid, parseable JSON array with no extra text before or after

        ${existingFlashcards.length > 0 ? existingFlashcardsText : ''}

        Each flashcard should include:
        1. A clear, substantive question about the academic content
        2. A detailed answer explanation that thoroughly explains the concept
        3. Four plausible multiple choice options, with only one being correct
        4. The index (0-3) of the correct option in the options array
        
        Content to analyze:
        ${content.slice(0, 30000)} // Limit content length to avoid token limits
        
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