"use client";

import { useState } from "react";
import * as THREE from "three";
import { EXPORT_FORMATS, exportObject, safeName, type ExportFormat } from "@/lib/exporters";

export interface MeshView {
  name: string;
  object: THREE.Group;
  size: THREE.Vector3;
  triangles: number;
}

export default function MeshPanel({
  mesh,
  onClose,
}: {
  mesh: MeshView;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (busy) return;
    setBusy(format);
    try {
      await exportObject(mesh.object, format, safeName(mesh.name.replace(/\.[^.]+$/, "")));
    } catch (err) {
      console.error(`${format.toUpperCase()} export failed`, err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-950/60">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto min-w-0">
          <div className="truncate text-sm font-medium text-zinc-100">{mesh.name}</div>
          <div className="text-xs text-zinc-500">
            imported mesh · {mesh.triangles.toLocaleString()} triangles
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {EXPORT_FORMATS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => handleExport(f.id)}
              disabled={busy !== null}
              title={`Convert & download ${f.label}`}
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
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
      <div className="px-4 pb-3 text-[11px] text-zinc-600">
        Imported files preview locally and can be re-exported to any format (a quick mesh converter).
      </div>
    </div>
  );
}
