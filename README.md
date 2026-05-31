# CAD Master Builder

A ChatGPT-style web app that turns a short prompt (e.g. *"draw a bookshelf"*) into an
engineering-grade 3D model. It renders the model interactively in the browser and lets you
download it as a glTF/GLB CAD file.

The AI runs the `skill.md` system prompt through the **Claude Agent SDK**, which uses the
credentials of the Claude Code installation already logged in on this machine — **no
separate API key is required**.

## How it works

```
prompt ──▶ /api/generate ──▶ Claude Agent SDK (skill.md system prompt)
                                   │
                                   ▼
                       engineering JSON + geometry[]
                                   │
            ┌──────────────────────┴───────────────────────┐
            ▼                                                ▼
   Three.js 3D viewer                              Download GLB / JSON
```

- `skill.md` — the CAD Master Builder prompt, extended with a render-ready `geometry`
  schema (primitive, size, position, rotation, color per part).
- `app/api/generate/route.ts` — runs the skill via the Agent SDK and returns parsed JSON.
- `lib/buildMeshes.ts` — converts `geometry[]` into a Three.js group (used for both the
  live view and the GLB export).
- `components/` — `Chat`, `ModelViewer` (react-three-fiber), `SpecPanel`.

## Prerequisites

- Node.js 20+
- Claude Code installed and authenticated (`claude` on your PATH). Run `claude` once and
  log in if you haven't.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, type a prompt, and watch the model build. Use **Download GLB**
to export the CAD file (open it in Blender or https://gltf-viewer.donmccurdy.com).

## Configuration

Everything works with no env vars. Optionally set `CAD_MODEL` to pick a model:

```bash
CAD_MODEL=claude-opus-4-8 npm run dev
```
