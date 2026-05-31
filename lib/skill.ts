import { promises as fs } from "fs";
import path from "path";
import type { ProviderId } from "./types";

const cache = new Map<string, string>();

/**
 * Picks the system prompt for the given provider.
 *
 * - Capable cloud models (Claude / Gemini / OpenAI) get the full engineering
 *   prompt (`skill.md`) which demands industry-level decomposition.
 * - Small local models via Ollama get the simplified `skill_local.md`, which is
 *   tuned to stay reliable on 7B–9B models that choke on huge outputs.
 */
function skillFileFor(provider?: ProviderId): string {
  return provider === "ollama" ? "skill_local.md" : "skill.md";
}

export async function loadSkill(provider?: ProviderId): Promise<string> {
  const fileName = skillFileFor(provider);
  const cached = cache.get(fileName);
  if (cached) return cached;
  const file = path.join(process.cwd(), fileName);
  const contents = await fs.readFile(file, "utf8");
  cache.set(fileName, contents);
  return contents;
}
