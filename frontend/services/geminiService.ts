import { GoogleGenAI, Type } from "@google/genai";
import { API_KEY } from "../constants";
import { AIShiftSuggestion } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: API_KEY });
    }
  }

  async parseShiftRequest(userPrompt: string): Promise<AIShiftSuggestion> {
    if (!this.ai) {
      throw new Error("Gemini API Key is missing. Please check your configuration.");
    }

    const now = new Date();
    const currentISO = now.toISOString();

    const prompt = `
      Current time: ${currentISO}.
      The user manages casual workers. They want to create a shift based on this request: "${userPrompt}".
      
      Extract:
      1. Start time (ISO string)
      2. End time (ISO string)
      3. Spots needed (number)
      4. A short reasoning string explaining how you derived the dates relative to 'now'.
      
      If dates are relative (e.g. "tomorrow"), calculate them based on the current time provided.
      If duration isn't specified, assume 4 hours.
      If spots aren't specified, assume 1.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              startsAt: { type: Type.STRING, description: "Start time in ISO format" },
              endsAt: { type: Type.STRING, description: "End time in ISO format" },
              spotsNeeded: { type: Type.INTEGER, description: "Number of workers needed" },
              reasoning: { type: Type.STRING, description: "Explanation of date calculation" }
            },
            required: ["startsAt", "endsAt", "spotsNeeded", "reasoning"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      return JSON.parse(text) as AIShiftSuggestion;

    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to interpret shift request.");
    }
  }
}

export const geminiService = new GeminiService();
