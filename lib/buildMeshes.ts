import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { GeometryItem } from "./types";

// Scene is modeled in millimeters; scale down so typical objects sit at a
// comfortable size for the camera (1 unit = 100 mm).
export const MM_TO_UNIT = 1 / 100;

const DEG_TO_RAD = Math.PI / 180;

interface MatSpec {
  metalness: number;
  roughness: number;
  /** Multiplier applied to the part color for emissive glow (screens). */
  emissiveIntensity?: number;
  /** 0..1 opacity for transparent materials. */
  opacity?: number;
  /** Use MeshPhysicalMaterial transmission for real glass. */
  transmission?: number;
  clearcoat?: number;
}

// PBR presets keyed by the `material` string from the spec.
const MATERIALS: Record<string, MatSpec> = {
  aluminum: { metalness: 0.95, roughness: 0.35, clearcoat: 0.2 },
  steel: { metalness: 0.9, roughness: 0.4 },
  chrome: { metalness: 1, roughness: 0.05, clearcoat: 0.5 },
  copper: { metalness: 0.95, roughness: 0.3 },
  brass: { metalness: 0.9, roughness: 0.35 },
  gold: { metalness: 1, roughness: 0.2 },
  matte_metal: { metalness: 0.8, roughness: 0.7 },
  plastic: { metalness: 0, roughness: 0.45, clearcoat: 0.3 },
  abs_plastic: { metalness: 0, roughness: 0.6 },
  rubber: { metalness: 0, roughness: 0.95 },
  glass: { metalness: 0, roughness: 0.03, opacity: 0.35, transmission: 0.9, clearcoat: 1 },
  screen: { metalness: 0.1, roughness: 0.2, emissiveIntensity: 0.55 },
  wood: { metalness: 0, roughness: 0.7 },
  fabric: { metalness: 0, roughness: 1 },
  leather: { metalness: 0, roughness: 0.85 },
  carbon_fiber: { metalness: 0.5, roughness: 0.4, clearcoat: 0.6 },
  ceramic: { metalness: 0, roughness: 0.25, clearcoat: 0.5 },
  concrete: { metalness: 0, roughness: 0.9 },
  paper: { metalness: 0, roughness: 0.95 },
};

function makeMaterial(item: GeometryItem): THREE.Material {
  const color = new THREE.Color(item.color || "#b8b8c0");
  const spec = MATERIALS[(item.material || "plastic").toLowerCase()] || MATERIALS.plastic;

  if (spec.transmission) {
    return new THREE.MeshPhysicalMaterial({
      color,
      metalness: spec.metalness,
      roughness: spec.roughness,
      transmission: spec.transmission,
      thickness: 0.5,
      transparent: true,
      opacity: spec.opacity ?? 1,
      clearcoat: spec.clearcoat ?? 0,
    });
  }

  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat ?? 0,
    clearcoatRoughness: 0.3,
  });
  if (spec.emissiveIntensity) {
    mat.emissive = color.clone();
    mat.emissiveIntensity = spec.emissiveIntensity;
  }
  return mat;
}

function makeGeometry(item: GeometryItem): THREE.BufferGeometry {
  const s = MM_TO_UNIT;
  switch (item.primitive) {
    case "cylinder": {
      const r = (item.radius ?? 10) * s;
      const h = (item.height ?? 10) * s;
      return new THREE.CylinderGeometry(r, r, h, 48);
    }
    case "cone": {
      const r = (item.radius ?? 10) * s;
      const h = (item.height ?? 10) * s;
      return new THREE.ConeGeometry(r, h, 48);
    }
    case "sphere": {
      const r = (item.radius ?? 10) * s;
      return new THREE.SphereGeometry(r, 48, 24);
    }
    case "torus": {
      const r = (item.radius ?? 10) * s;
      const tube = (item.tube ?? Math.max(r * 0.2, 1)) * s;
      return new THREE.TorusGeometry(r, tube, 24, 64);
    }
    case "box":
    default: {
      const x = Math.max((item.size?.x ?? 10) * s, 0.001);
      const y = Math.max((item.size?.y ?? 10) * s, 0.001);
      const z = Math.max((item.size?.z ?? 10) * s, 0.001);
      // Soften edges: use the requested corner radius, else a small auto bevel,
      // clamped so it never exceeds half the smallest dimension.
      const requested = (item.corner_radius ?? 0) * s;
      const auto = Math.min(x, y, z) * 0.08;
      const radius = Math.min(requested || auto, Math.min(x, y, z) * 0.49);
      if (radius > 0.0005) {
        return new RoundedBoxGeometry(x, y, z, 3, radius);
      }
      return new THREE.BoxGeometry(x, y, z);
    }
  }
}

/**
 * Builds a THREE.Group from a geometry spec. The group is recentered on the
 * origin and rests on y = 0 so the camera framing is consistent. Returns the
 * group plus its bounding size (in scene units) for camera fitting.
 */
export function buildGroup(geometry: GeometryItem[]): {
  group: THREE.Group;
  size: THREE.Vector3;
  center: THREE.Vector3;
} {
  const group = new THREE.Group();

  for (const item of geometry ?? []) {
    const geo = makeGeometry(item);
    const mesh = new THREE.Mesh(geo, makeMaterial(item));
    mesh.name = item.component || item.primitive;

    const p = item.position ?? { x: 0, y: 0, z: 0 };
    mesh.position.set(p.x * MM_TO_UNIT, p.y * MM_TO_UNIT, p.z * MM_TO_UNIT);

    const r = item.rotation ?? { x: 0, y: 0, z: 0 };
    mesh.rotation.set(r.x * DEG_TO_RAD, r.y * DEG_TO_RAD, r.z * DEG_TO_RAD);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Recenter horizontally and drop the model onto the ground plane.
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  if (!box.isEmpty()) {
    box.getSize(size);
    box.getCenter(center);
    group.position.x -= center.x;
    group.position.z -= center.z;
    group.position.y -= box.min.y;
  }

  return { group, size, center };
}
