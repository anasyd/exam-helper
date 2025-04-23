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

  async generateFlashcards(content: string, numberOfCards: number = 15): Promise<FlashcardData[]> {
    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      
      // Create a prompt that asks for flashcards with multiple choice options
      const prompt = `
        Based on the following content, generate ${numberOfCards} multiple-choice flashcards in JSON format.
        Each flashcard should have:
        1. A clear question
        2. A detailed answer explanation
        3. Four multiple choice options (one correct, three incorrect)
        4. The index of the correct option (0-3)
        
        Make sure to cover a variety of important topics from the content and create diverse question types.
        
        Content:
        ${content.slice(0, 30000)} // Limit content length to avoid token limits
        
        Response format (MUST follow this format exactly):
        [
          {
            "question": "Question text here",
            "answer": "Detailed answer explanation here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctOptionIndex": 0 // Index (0-3) of the correct option in the options array
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