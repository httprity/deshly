import Groq from "groq-sdk";
import Together from "together-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { callOllama, ollamaHealth } from "./ollama";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY! });
const gemini = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
  : null;

export interface LLMOptions {
  systemPrompt?: string;
  userPrompt: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  text: string;
  model: string;
  provider: string;
}

/**
 * Tries Groq → Together → Gemini in order.
 * Returns the first successful response.
 * Logs which provider was used (for /docs metrics).
 */
export async function callLLM(opts: LLMOptions): Promise<LLMResult> {
  const errors: Record<string, string> = {};

  // Provider 1: Groq (Llama 3.3 70B) — fastest + most reliable for free
  try {
    const messages: any[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: opts.userPrompt });

    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.3-70b-versatile",
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 8192,
      response_format: opts.jsonMode ? { type: "json_object" } : undefined,
    });

    const text = completion.choices[0]?.message?.content || "";
    if (text) {
      return { text, model: "llama-3.3-70b-versatile", provider: "groq" };
    }
    throw new Error("Empty response from Groq");
  } catch (err: any) {
    errors.groq = err.message;
    console.warn("[LLM] Groq failed, trying Together:", err.message);
  }

  // Provider 2: Together AI (Llama 3.3 70B Turbo)
  try {
    const messages: any[] = [];
    if (opts.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: opts.userPrompt });

    const completion = await together.chat.completions.create({
      messages,
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 8192,
      response_format: opts.jsonMode ? { type: "json_object" } : undefined,
    });

    const text = completion.choices[0]?.message?.content || "";
    if (text) {
      return { text, model: "Llama-3.3-70B-Turbo", provider: "together" };
    }
    throw new Error("Empty response from Together");
  } catch (err: any) {
    errors.together = err.message;
    console.warn("[LLM] Together failed, trying Gemini:", err.message);
  }

  // Provider 3: Gemini (last resort, often quota-limited)
  if (gemini) {
    try {
      const model = gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: opts.temperature ?? 0.6,
          maxOutputTokens: opts.maxTokens ?? 8192,
          responseMimeType: opts.jsonMode ? "application/json" : "text/plain",
        },
      });

      const fullPrompt = (opts.systemPrompt ? opts.systemPrompt + "\n\n" : "") + opts.userPrompt;
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();

      if (text) {
        return { text, model: "gemini-2.0-flash", provider: "gemini" };
      }
      throw new Error("Empty response from Gemini");
    } catch (err: any) {
      errors.gemini = err.message;
      console.warn("[LLM] Gemini failed:", err.message);
    }
  }

  // Provider 4: Ollama (local) — runs if installed
  try {
    const health = await ollamaHealth();
    if (health.available && health.models && health.models.length > 0) {
      const result = await callOllama({
        model: health.models[0],
        prompt: opts.userPrompt,
        system: opts.systemPrompt,
        temperature: opts.temperature ?? 0.6,
        format: opts.jsonMode ? "json" : "text",
      });
      return {
        text: result.text,
        model: result.model,
        provider: "ollama",
      };
    }
  } catch (err: any) {
    errors.ollama = err.message;
    console.warn("[LLM] Ollama failed:", err.message);
  }

// Provider 4: Ollama (local) — runs if installed
try {
  const health = await ollamaHealth();
  if (health.available && health.models && health.models.length > 0) {
    const result = await callOllama({
      model: health.models[0],
      prompt: opts.userPrompt,
      system: opts.systemPrompt,
      temperature: opts.temperature ?? 0.6,
      format: opts.jsonMode ? "json" : "text",
    });
    return {
      text: result.text,
      model: result.model,
      provider: "ollama",
    };
  }
} catch (err: any) {
  errors.ollama = err.message;
  console.warn("[LLM] Ollama failed:", err.message);
}

// All failed
throw new Error(
  "All LLM providers failed. Errors: " + JSON.stringify(errors, null, 2)
);
}

/**
 * Embeddings — Gemini's text-embedding has separate quota from generation,
 * so it may still work even when generation is rate-limited.
 * If Gemini embeddings fail, we return null — vector search becomes a no-op gracefully.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!gemini) return null;
  try {
    const model = gemini.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err: any) {
    console.warn("[LLM] Embedding failed:", err.message);
    return null;
  }
}