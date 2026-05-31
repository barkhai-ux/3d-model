"use client";

import { useState } from "react";
import * as THREE from "three";
import type { CadSpec } from "@/lib/types";
import { EXPORT_FORMATS, exportObject, download, safeName, type ExportFormat } from "@/lib/exporters";

export default function SpecPanel({
  spec,
  groupRef,
}: {
  spec: CadSpec;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    const group = groupRef.current;
    if (!group || busy) return;
    setBusy(format);
    try {
      await exportObject(group, format, safeName(spec.model_name));
    } catch (err) {
      console.error(`${format.toUpperCase()} export failed`, err);
    } finally {
      setBusy(null);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    download(blob, `${safeName(spec.model_name)}.json`);
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
        <div className="flex flex-wrap items-center gap-1.5">
          {EXPORT_FORMATS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              disabled={busy !== null}
              title={`Download ${f.label}`}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 " +
                (i === 0
                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                  : "border border-zinc-700 text-zinc-200 hover:bg-zinc-800")
              }
            >
              {busy === f.id ? "…" : f.label}
            </button>
          ))}
          <button
            onClick={exportJson}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            JSON
          </button>
        </div>
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
