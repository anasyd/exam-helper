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
        Based on the following academic content, generate ${numberOfCards} substantive multiple-choice flashcards in JSON format.

        IMPORTANT GUIDELINES:
        1. Focus ONLY on the technical/academic content - concepts, theories, definitions, methods, etc.
        2. DO NOT create questions about administrative details like study hours, course codes, due dates, etc.
        3. Each question should test understanding of important concepts from the material
        4. Create challenging questions that test real understanding, not just memorization
        5. DO NOT duplicate or create similar questions to any of the existing questions provided below

        ${existingFlashcards.length > 0 ? existingFlashcardsText : ''}

        Each flashcard should include:
        1. A clear, substantive question about the academic content
        2. A detailed answer explanation that thoroughly explains the concept
        3. Four plausible multiple choice options, with only one being correct
        4. The index (0-3) of the correct option in the options array
        
        Content to analyze:
        ${content.slice(0, 30000)} // Limit content length to avoid token limits
        
        Response format (MUST follow exactly):
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
      
      // Extract the JSON part from response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response as JSON");
      }
      
      const parsedData = JSON.parse(jsonMatch[0]) as FlashcardData[];
      
      // Validate the data structure
      const validatedData = parsedData.filter(card => 
        card.question && 
        card.answer && 
        Array.isArray(card.options) && 
        card.options.length === 4 &&
        typeof card.correctOptionIndex === 'number' &&
        card.correctOptionIndex >= 0 && 
        card.correctOptionIndex <= 3
      );
      
      return validatedData;
    } catch (error) {
      console.error("Error generating flashcards:", error);
      throw error;
    }
  }
}

// Create and export a factory function that creates the service instance
export function createGeminiService(apiKey: string) {
  return new GeminiService(apiKey);
}