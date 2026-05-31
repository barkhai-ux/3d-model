"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { buildGroup } from "@/lib/buildMeshes";
import type { GeometryItem } from "@/lib/types";

/** Builds the group, frames the camera, and exposes the group via ref for export. */
function Scene({
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
    // Frame the model: pull the camera back based on bounding size.
    const radius = Math.max(built.size.x, built.size.y, built.size.z) || 4;
    const dist = radius * 1.8 + 2;
    camera.position.set(dist, dist * 0.8, dist);
    camera.near = 0.01;
    camera.far = dist * 20;
    camera.lookAt(0, built.size.y / 2, 0);
    camera.updateProjectionMatrix();
  }, [built, camera, groupRef]);

  return <primitive object={built.group} />;
}

export default function ModelViewer({
  geometry,
  groupRef,
}: {
  geometry: GeometryItem[];
  groupRef: React.MutableRefObject<THREE.Group | null>;
}) {
  const hasGeometry = geometry && geometry.length > 0;

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

        {hasGeometry && <Scene geometry={geometry} groupRef={groupRef} />}

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

      {!hasGeometry && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-zinc-500">
            Your 3D model will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
