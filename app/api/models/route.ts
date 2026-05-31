import { NextRequest, NextResponse } from "next/server";
import { OLLAMA_HOST } from "@/lib/providers";
import type { ModelsResponse, ProviderInfo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAUDE_MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
];

const GEMINI_MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
];

/** Query the local Ollama server for installed models (short timeout). */
async function ollamaModels(
  host: string
): Promise<{ ok: boolean; models: { id: string; label: string }[] }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${host}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, models: [] };
    const data = await res.json();
    const models = (data?.models ?? []).map((m: { name: string }) => ({
      id: m.name,
      label: m.name,
    }));
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
}

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("ollamaHost") || OLLAMA_HOST;
  const ollama = await ollamaModels(host);

  const providers: ProviderInfo[] = [
    {
      id: "claude",
      label: "Claude (Claude Code)",
      available: true,
      models: CLAUDE_MODELS,
    },
    {
      id: "ollama",
      label: "Local (Ollama)",
      available: ollama.ok && ollama.models.length > 0,
      models: ollama.models,
      note: ollama.ok
        ? ollama.models.length
          ? undefined
          : "Ollama is running but has no models. Pull one, e.g. `ollama pull gemma2`."
        : "Ollama not detected on " + host + ". Start it with `ollama serve`.",
    },
    {
      id: "gemini",
      label: "Google Gemini",
      available: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      models: GEMINI_MODELS,
      note: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        ? undefined
        : "Set GEMINI_API_KEY to enable.",
    },
    {
      id: "openai",
      label: "OpenAI",
      available: Boolean(process.env.OPENAI_API_KEY),
      models: OPENAI_MODELS,
      note: process.env.OPENAI_API_KEY ? undefined : "Set OPENAI_API_KEY to enable.",
    },
  ];

  return NextResponse.json<ModelsResponse>({ providers });
}
