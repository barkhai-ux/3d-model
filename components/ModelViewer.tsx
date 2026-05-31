"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { buildGroup } from "@/lib/buildMeshes";
import type { GeometryItem } from "@/lib/types";

function frameCamera(camera: THREE.Camera, size: THREE.Vector3) {
  const radius = Math.max(size.x, size.y, size.z) || 4;
  const dist = radius * 1.8 + 2;
  camera.position.set(dist, dist * 0.8, dist);
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.near = 0.01;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
  }
  camera.lookAt(0, size.y / 2, 0);
}

/** Builds the group from a primitive spec, frames the camera, exposes it via ref. */
function GeneratedScene({
  geometry,
  groupRef,
}: {
  geometry: GeometryItem[];
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const built = useMemo(() => buildGroup(geometry), [geometry]);

  useEffect(() => {
    groupRef.current = built.group;
    frameCamera(camera, built.size);
  }, [built, camera, groupRef]);

  return <primitive object={built.group} />;
}

/** Renders an already-loaded mesh/CAD object and frames the camera. */
function ImportedScene({
  object,
  size,
  groupRef,
}: {
  object: THREE.Group;
  size: THREE.Vector3;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    groupRef.current = object;
    frameCamera(camera, size);
  }, [object, size, camera, groupRef]);

  return <primitive object={object} />;
}

export default function ModelViewer({
  geometry,
  importedObject,
  importedSize,
  groupRef,
}: {
  geometry: GeometryItem[];
  importedObject?: THREE.Group | null;
  importedSize?: THREE.Vector3 | null;
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const hasImport = Boolean(importedObject);
  const hasGeometry = !hasImport && geometry && geometry.length > 0;
  const hasContent = hasImport || hasGeometry;

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        camera={{ position: [6, 5, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMappingExposure: 1.1 }}
      >
        <color attach="background" args={["#0d0d14"]} />
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0002}
        />
        <directionalLight position={[-6, 4, -8]} intensity={0.5} />

        {/* Local studio environment for reflections — generated from these
            lightformers, so it needs NO network/HDR download. */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={3} position={[0, 6, -4]} scale={[12, 12, 1]} color="#ffffff" />
          <Lightformer intensity={1.5} position={[-6, 2, 4]} scale={[8, 8, 1]} color="#cfd6ff" />
          <Lightformer intensity={1.5} position={[6, 3, 4]} scale={[8, 8, 1]} color="#fff2e0" />
          <Lightformer intensity={1} position={[0, -4, 0]} scale={[10, 10, 1]} color="#222233" />
        </Environment>

        {hasImport && importedObject && (
          <ImportedScene
            object={importedObject}
            size={importedSize ?? new THREE.Vector3(4, 4, 4)}
            groupRef={groupRef}
          />
        )}
        {hasGeometry && <GeneratedScene geometry={geometry} groupRef={groupRef} />}

        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.55}
          scale={30}
          blur={2.2}
          far={12}
          resolution={1024}
          color="#000000"
        />
        <Grid
          args={[40, 40]}
          cellColor="#1d1d28"
          sectionColor="#2c2c3d"
          infiniteGrid
          fadeDistance={45}
          followCamera={false}
        />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>

      {!hasContent && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-500">
            Your 3D model will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
