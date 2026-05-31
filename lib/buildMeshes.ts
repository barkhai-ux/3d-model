import * as THREE from "three";
import type { GeometryItem } from "./types";

// Scene is modeled in millimeters; scale down so typical objects sit at a
// comfortable size for the camera (1 unit = 100 mm).
export const MM_TO_UNIT = 1 / 100;

const DEG_TO_RAD = Math.PI / 180;

function makeGeometry(item: GeometryItem): THREE.BufferGeometry {
  const s = MM_TO_UNIT;
  switch (item.primitive) {
    case "cylinder": {
      const r = (item.radius ?? 10) * s;
      const h = (item.height ?? 10) * s;
      return new THREE.CylinderGeometry(r, r, h, 32);
    }
    case "cone": {
      const r = (item.radius ?? 10) * s;
      const h = (item.height ?? 10) * s;
      return new THREE.ConeGeometry(r, h, 32);
    }
    case "sphere": {
      const r = (item.radius ?? 10) * s;
      return new THREE.SphereGeometry(r, 32, 16);
    }
    case "torus": {
      const r = (item.radius ?? 10) * s;
      const tube = (item.tube ?? Math.max(r * 0.2, 1)) * s;
      return new THREE.TorusGeometry(r, tube, 16, 48);
    }
    case "box":
    default: {
      const x = (item.size?.x ?? 10) * s;
      const y = (item.size?.y ?? 10) * s;
      const z = (item.size?.z ?? 10) * s;
      return new THREE.BoxGeometry(Math.max(x, 0.001), Math.max(y, 0.001), Math.max(z, 0.001));
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
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(item.color || "#b8b8c0"),
      metalness: 0.15,
      roughness: 0.65,
    });
    const mesh = new THREE.Mesh(geo, mat);
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
