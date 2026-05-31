import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

/** Mesh/CAD file formats the viewer can import and preview. */
export const IMPORT_EXTENSIONS = [".stl", ".obj", ".ply", ".glb", ".gltf", ".3mf"] as const;
export type ImportExtension = (typeof IMPORT_EXTENSIONS)[number];

export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.join(",");

export interface LoadedMesh {
  object: THREE.Group;
  /** Bounding-box size in scene units after normalization. */
  size: THREE.Vector3;
  /** Number of triangles across the whole object (0 if not a triangle mesh). */
  triangles: number;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isImportableFile(name: string): boolean {
  return (IMPORT_EXTENSIONS as readonly string[]).includes(extOf(name));
}

const DEFAULT_MATERIAL = () =>
  new THREE.MeshStandardMaterial({
    color: 0xb8b8c0,
    metalness: 0.25,
    roughness: 0.55,
    side: THREE.DoubleSide,
    flatShading: false,
  });

function geometryToGroup(geometry: THREE.BufferGeometry): THREE.Group {
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, DEFAULT_MATERIAL());
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/** Parses raw file bytes for the given filename into an un-normalized object. */
async function parse(name: string, buffer: ArrayBuffer): Promise<THREE.Object3D> {
  switch (extOf(name)) {
    case ".stl":
      return geometryToGroup(new STLLoader().parse(buffer));
    case ".ply":
      return geometryToGroup(new PLYLoader().parse(buffer));
    case ".obj": {
      const text = new TextDecoder().decode(buffer);
      const obj = new OBJLoader().parse(text);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.material) {
          child.material = DEFAULT_MATERIAL();
        }
      });
      return obj;
    }
    case ".3mf":
      return new ThreeMFLoader().parse(buffer);
    case ".glb":
    case ".gltf": {
      const gltf = await new GLTFLoader().parseAsync(buffer, "");
      return gltf.scene;
    }
    default:
      throw new Error(`Unsupported file type: ${name}`);
  }
}

function countTriangles(object: THREE.Object3D): number {
  let tris = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry as THREE.BufferGeometry;
      if (geo.index) tris += geo.index.count / 3;
      else if (geo.attributes.position) tris += geo.attributes.position.count / 3;
    }
  });
  return Math.round(tris);
}

/**
 * Loads a mesh/CAD file and returns a group normalized to sit on the ground
 * plane, recentered horizontally, and scaled so the largest dimension is a
 * comfortable on-screen size — matching how generated models are framed.
 */
export async function loadMeshFile(file: File): Promise<LoadedMesh> {
  const buffer = await file.arrayBuffer();
  const parsed = await parse(file.name, buffer);

  // Many CAD/print formats are Z-up; orient toward the app's Y-up convention
  // only for formats that are conventionally Z-up (STL/PLY/3MF from CAD/slicers).
  const ext = extOf(file.name);
  if (ext === ".stl" || ext === ".ply" || ext === ".3mf") {
    parsed.rotation.x = -Math.PI / 2;
    parsed.updateMatrixWorld(true);
  }

  const group = new THREE.Group();
  group.add(parsed);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (!box.isEmpty()) {
    box.getSize(size);
    box.getCenter(center);

    // Fit so the largest dimension is ~4 scene units, like generated models.
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4 / maxDim;
    group.scale.setScalar(scale);

    // Recompute after scaling, then recenter horizontally and drop to y = 0.
    const scaledBox = new THREE.Box3().setFromObject(group);
    const sCenter = new THREE.Vector3();
    scaledBox.getCenter(sCenter);
    group.position.x -= sCenter.x;
    group.position.z -= sCenter.z;
    group.position.y -= scaledBox.min.y;
    scaledBox.getSize(size);
  }

  return { object: group, size, triangles: countTriangles(group) };
}
