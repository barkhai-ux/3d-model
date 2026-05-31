import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { PLYExporter } from "three/examples/jsm/exporters/PLYExporter.js";

export type ExportFormat = "glb" | "stl" | "obj" | "ply";

export const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "glb", label: "GLB" },
  { id: "stl", label: "STL" },
  { id: "obj", label: "OBJ" },
  { id: "ply", label: "PLY" },
];

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportGlb(object: THREE.Object3D): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      object,
      (result) => resolve(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" })),
      (err) => reject(err),
      { binary: true }
    );
  });
}

/**
 * Exports any THREE.Object3D to the requested mesh format and triggers a
 * browser download. STL/OBJ/PLY are the common interchange formats used by
 * CAD tools and slicers; GLB preserves materials for render/viewer tools.
 */
export async function exportObject(
  object: THREE.Object3D,
  format: ExportFormat,
  baseName: string
) {
  const name = `${baseName}.${format}`;
  switch (format) {
    case "glb": {
      download(await exportGlb(object), name);
      return;
    }
    case "stl": {
      const data = new STLExporter().parse(object, { binary: true }) as unknown as DataView;
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      download(new Blob([buffer], { type: "model/stl" }), name);
      return;
    }
    case "obj": {
      const text = new OBJExporter().parse(object);
      download(new Blob([text], { type: "text/plain" }), name);
      return;
    }
    case "ply": {
      const data = new PLYExporter().parse(object, () => {}, { binary: false });
      download(new Blob([data as string], { type: "text/plain" }), name);
      return;
    }
  }
}

export function safeName(raw: string): string {
  return (
    (raw || "model").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "model"
  );
}
