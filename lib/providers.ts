import { query } from "@anthropic-ai/claude-agent-sdk";
import type { ChatMessageWire, ProviderId } from "./types";

export const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

export interface RunParams {
  provider: ProviderId;
  model: string;
  system: string;
  messages: ChatMessageWire[];
  /** Per-request API key (Gemini/OpenAI), overrides env when present. */
  apiKey?: string;
  /** Per-request Ollama host, overrides OLLAMA_HOST when present. */
  ollamaHost?: string;
}

/** Routes a generation request to the chosen provider and returns raw text. */
export async function runProvider(params: RunParams): Promise<string> {
  switch (params.provider) {
    case "claude":
      return runClaude(params);
    case "ollama":
      return runOllama(params);
    case "gemini":
      return runGemini(params);
    case "openai":
      return runOpenAI(params);
    default:
      throw new Error(`Unknown provider: ${params.provider}`);
  }
}

// --- Claude via the Agent SDK (uses local Claude Code auth, no API key) ---

async function runClaude({ model, system, messages }: RunParams): Promise<string> {
  // The Agent SDK takes a single prompt string. Flatten the conversation so the
  // model has the prior context (including the current model JSON) to refine.
  const prompt = messages
    .map((m) =>
      m.role === "user"
        ? `USER REQUEST:\n${m.content}`
        : `PREVIOUS MODEL (JSON you generated earlier):\n${m.content}`
    )
    .join("\n\n---\n\n");

  const response = query({
    prompt,
    options: {
      systemPrompt: system,
      allowedTools: [],
      maxTurns: 20,
      ...(model ? { model } : {}),
    },
  });

  let result = "";
  let assistantText = "";
  try {
    for await (const message of response) {
      if (message.type === "assistant") {
        for (const block of message.message.content) {
          if (block.type === "text") assistantText += block.text;
        }
      } else if (message.type === "result" && message.subtype === "success") {
        result = message.result;
      }
    }
  } catch (err) {
    if (!assistantText) throw err;
  }
  return result || assistantText;
}

// --- Ollama (local models: llama, gemma, mistral, qwen, ...) ---

async function runOllama({ model, system, messages, ollamaHost }: RunParams): Promise<string> {
  const host = ollamaHost || OLLAMA_HOST;
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json", // ask the local model for strict JSON
      options: { temperature: 0.3 },
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data?.message?.content ?? "";
}

// --- Google Gemini (REST) ---

async function runGemini({ model, system, messages, apiKey }: RunParams): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("No Gemini API key. Add one in the model popup.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ?? "";
}

// --- OpenAI (REST) ---

async function runOpenAI({ model, system, messages, apiKey }: RunParams): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("No OpenAI API key. Add one in the model popup.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
