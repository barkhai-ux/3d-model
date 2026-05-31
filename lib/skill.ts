import { promises as fs } from "fs";
import path from "path";

let cached: string | null = null;

/** Reads the CAD Master Builder system prompt from skill.md at the project root. */
export async function loadSkill(): Promise<string> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "skill.md");
  cached = await fs.readFile(file, "utf8");
  return cached;
}
