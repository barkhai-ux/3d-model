import { NextRequest, NextResponse } from "next/server";
import { runProvider } from "@/lib/providers";
import { loadSkill } from "@/lib/skill";
import type {
  ChatMessageWire,
  GenerateRequest,
  GenerateResponse,
  ProviderId,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const VALID_PROVIDERS: ProviderId[] = ["claude", "ollama", "gemini", "openai"];

/** Strip ```json fences and grab the outermost JSON object if prose leaks in. */
function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return t.trim();
}

/**
 * Keep all user turns (the design intent) but only the MOST RECENT assistant
 * model JSON — older versions are redundant context and waste tokens. This is
 * what lets the user iteratively refine ("make the legs taller") while keeping
 * the payload bounded.
 */
function boundHistory(messages: ChatMessageWire[]): ChatMessageWire[] {
  let lastAssistant = -1;
  messages.forEach((m, i) => {
    if (m.role === "assistant") lastAssistant = i;
  });
  return messages.map((m, i) => {
    if (m.role === "assistant" && i !== lastAssistant) {
      return { role: "assistant", content: "(earlier model version omitted)" };
    }
    return m;
  });
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<GenerateResponse>({ error: "Invalid request body." }, { status: 400 });
  }

  const provider = body?.provider;
  const model = (body?.model ?? "").toString();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey : undefined;
  const ollamaHost = typeof body?.ollamaHost === "string" ? body.ollamaHost : undefined;

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json<GenerateResponse>({ error: "Unknown provider." }, { status: 400 });
  }
  if (!messages.length || !messages.some((m) => m.role === "user")) {
    return NextResponse.json<GenerateResponse>({ error: "A prompt is required." }, { status: 400 });
  }

  let raw = "";
  try {
    const system = await loadSkill(provider);
    raw = await runProvider({
      provider,
      model,
      system,
      messages: boundHistory(messages),
      apiKey,
      ollamaHost,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json<GenerateResponse>(
      { error: `Generation failed: ${msg}` },
      { status: 500 }
    );
  }

  if (!raw) {
    return NextResponse.json<GenerateResponse>({ error: "The model returned no output." }, { status: 502 });
  }

  try {
    const spec = JSON.parse(extractJson(raw));
    return NextResponse.json<GenerateResponse>({ spec });
  } catch {
    return NextResponse.json<GenerateResponse>({
      raw,
      error: "Model output was not valid JSON.",
    });
  }
}
