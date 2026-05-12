/**
 * Ollama local LLM integration
 * Talks to a local Ollama instance via its HTTP API (http://localhost:11434)
 * 
 * Used as the final fallback in the LLM chain when cloud providers fail
 * or when user explicitly wants on-device inference for privacy.
 * 
 * Models supported:
 *   - phi3:mini (2.2GB, fast, low memory)
 *   - llama3 (4.7GB, higher quality, more memory)
 *   - llama3.2:1b (1.3GB, smallest, fastest)
 */

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "phi3:mini";

export interface OllamaOptions {
  model?: string;
  prompt: string;
  system?: string;
  temperature?: number;
  format?: "json" | "text";
}

export interface OllamaResult {
  text: string;
  model: string;
  durationMs: number;
}

/**
 * Check if Ollama is running locally
 */
export async function ollamaHealth(): Promise<{
  available: boolean;
  models?: string[];
  error?: string;
}> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) {
      return { available: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const models = (data.models || []).map((m: any) => m.name);
    return { available: true, models };
  } catch (err: any) {
    return { available: false, error: err.message };
  }
}

/**
 * Generate text via Ollama
 * Returns the response and metadata about the call.
 */
export async function callOllama(opts: OllamaOptions): Promise<OllamaResult> {
  const model = opts.model || DEFAULT_MODEL;
  const startTime = Date.now();

  const body: any = {
    model,
    prompt: opts.prompt,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.6,
    },
  };

  if (opts.system) {
    body.system = opts.system;
  }

  if (opts.format === "json") {
    body.format = "json";
  }

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // 60s timeout — local inference can be slow on low-memory machines
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const durationMs = Date.now() - startTime;

  return {
    text: data.response || "",
    model,
    durationMs,
  };
}

/**
 * Use Ollama for caption pre-screening — a fast, cheap classification
 * to filter out low-quality captions before the heavier brand voice extraction.
 * 
 * Returns true if the caption is high-signal enough to include in analysis.
 */
export async function ollamaPreScreenCaption(caption: string): Promise<boolean> {
  try {
    const result = await callOllama({
      model: "phi3:mini",
      prompt: `Is this Instagram caption substantive marketing content (not just an emoji or one-word post)? Answer only "yes" or "no".\n\nCaption: ${caption}`,
      temperature: 0.1,
    });
    return result.text.toLowerCase().includes("yes");
  } catch {
    // If Ollama is unavailable, default to true (let the cloud LLM decide)
    return true;
  }
}