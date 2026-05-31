"use client";

import { useState } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import type { CadSpec } from "@/lib/types";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(spec: CadSpec) {
  return (spec.model_name || "model").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "model";
}

export default function SpecPanel({
  spec,
  groupRef,
}: {
  spec: CadSpec;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const [open, setOpen] = useState(false);

  function exportGlb() {
    const group = groupRef.current;
    if (!group) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], {
          type: "model/gltf-binary",
        });
        download(blob, `${safeName(spec)}.glb`);
      },
      (err) => console.error("GLB export failed", err),
      { binary: true }
    );
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    download(blob, `${safeName(spec)}.json`);
  }

  const counts = [
    ["Components", spec.components?.length],
    ["Fasteners", spec.fasteners?.length],
    ["Materials", spec.materials?.length],
    ["Parts drawn", spec.geometry?.length],
  ] as const;

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/60">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto">
          <div className="text-sm font-medium text-zinc-100">
            {spec.model_name || "Untitled model"}
          </div>
          <div className="text-xs text-zinc-500">
            {spec.category || "uncategorized"} · units: {spec.units || "mm"}
          </div>
        </div>
        <button
          onClick={exportGlb}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Download GLB
        </button>
        <button
          onClick={exportJson}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Download JSON
        </button>
      </div>

      <div className="flex flex-wrap gap-4 px-4 pb-3 text-xs text-zinc-400">
        {counts.map(([label, n]) => (
          <span key={label}>
            <span className="font-semibold text-zinc-200">{n ?? 0}</span> {label}
          </span>
        ))}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full border-t border-zinc-800 px-4 py-2 text-left text-xs text-zinc-400 hover:bg-zinc-900"
      >
        {open ? "▾ Hide" : "▸ Show"} full JSON spec
      </button>
      {open && (
        <pre className="scroll-thin max-h-72 overflow-auto bg-black/40 px-4 py-3 text-xs leading-relaxed text-zinc-300">
          {JSON.stringify(spec, null, 2)}
        </pre>
      )}
    </div>
  );
}
