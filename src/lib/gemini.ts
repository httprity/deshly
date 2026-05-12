import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment");
}

export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Pre-configured models for different uses
export const geminiFlash = gemini.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.6,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  },
});

// Embedding model for vector search
export const geminiEmbedding = gemini.getGenerativeModel({
  model: "text-embedding-004",
});

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await geminiEmbedding.embedContent(text);
  return result.embedding.values;
}