"use client";

import { useRef } from "react";
import type { CadSpec } from "@/lib/types";
import type { Chat } from "@/lib/useChats";
import { IMPORT_ACCEPT, isImportableFile } from "@/lib/loadMesh";

export default function Sidebar({
  chats,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onImport,
  onImportMesh,
}: {
  chats: Chat[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onImport: (spec: CadSpec, filename: string) => void;
  onImportMesh: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;

    // Mesh/CAD files (STL/OBJ/PLY/GLB/GLTF/3MF) open in the viewer directly.
    if (isImportableFile(file.name)) {
      onImportMesh(file);
      return;
    }

    try {
      const spec = JSON.parse(await file.text());
      if (!spec || !Array.isArray(spec.geometry)) {
        alert("That file isn't a CAD Master Builder model (no 'geometry' array).");
        return;
      }
      onImport(spec as CadSpec, file.name.replace(/\.json$/i, ""));
    } catch {
      alert("Could not read that file — import a CAD Master Builder JSON or a mesh file (STL/OBJ/PLY/GLB/GLTF/3MF).");
    }
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="space-y-2 p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          <span className="text-lg leading-none">+</span> New chat
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          ↥ Import file
        </button>
        <p className="px-1 text-center text-[10px] leading-tight text-zinc-600">
          JSON spec or mesh (STL · OBJ · PLY · GLB · GLTF · 3MF)
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={`application/json,.json,${IMPORT_ACCEPT}`}
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Saved drawings
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 && (
          <p className="px-2 py-3 text-xs text-zinc-600">No chats yet.</p>
        )}
        {chats.map((c) => {
          const active = c.id === activeId;
          const hasModel = c.messages.some((m) => m.role === "assistant" && m.spec);
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm " +
                (active ? "bg-zinc-800 text-zinc-100" : "text-zinc-300 hover:bg-zinc-900")
              }
            >
              <span className="shrink-0 text-zinc-500">{hasModel ? "◆" : "○"}</span>
              <span className="min-w-0 flex-1 truncate">{c.title || "New chat"}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                title="Delete chat"
                className="hidden shrink-0 rounded px-1 text-zinc-500 hover:text-red-400 group-hover:block"
              >
                ✕
              </button>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-600">
        Chats &amp; models are saved in this browser.
      </div>
    </aside>
  );
}
