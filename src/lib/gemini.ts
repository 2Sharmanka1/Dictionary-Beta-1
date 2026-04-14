import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function enrichTerm(term: string, sourceLang: string, targetLang: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide linguistic information for the word/phrase "${term}" from ${sourceLang} to ${targetLang}. 
      Include translations, a short definition, and an example sentence.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            pronunciation: { type: Type.STRING, description: "Phonetic transcription if applicable" }
          },
          required: ["translations", "definition", "example"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini enrichment error:", error);
    return null;
  }
}
