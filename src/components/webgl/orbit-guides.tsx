"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getCelestialMetric } from "@/lib/celestial-metrics";
import type { DebugSettings } from "@/lib/debug-settings";
import type { ModelId } from "@/lib/models";
import type { RenderingProfile } from "@/lib/rendering-profile";
import { renderedSceneRadius } from "@/lib/scene-composition";
import { CelestialBody } from "./celestial-body";

type OrbitPathProps = Readonly<{
  color: string;
  opacity: number;
  position?: [number, number, number];
  radius: number;
}>;

type OrbitSweepProps = Readonly<{
  animated: boolean;
  color: string;
  opacity: number;
  position?: [number, number, number];
  radius: number;
  speed: number;
}>;

type SceneBodyProps = Readonly<{
  debugSettings: DebugSettings;
  modelId: ModelId;
  profile: RenderingProfile;
  selectedModelId: ModelId;
}>;

type SceneBodiesProps = Readonly<{
  debugSettings: DebugSettings;
  profile: RenderingProfile;
  selectedModelId: ModelId;
}>;

const TERRA_ORBIT_COLOR = "#c89745";
const LUNA_ORBIT_COLOR = "#bfc7d4";
const ORBIT_SWEEP_SEGMENTS = 48;
const ORBIT_SWEEP_ARC_RADIANS = Math.PI * 0.82;
const ORBIT_TUBE_RADIUS = 0.05;

function createOrbitSweepGeometry(radius: number): THREE.BufferGeometry {
  const points = Array.from({ length: ORBIT_SWEEP_SEGMENTS + 1 }, (_, index) => {
    const angle = (index / ORBIT_SWEEP_SEGMENTS) * ORBIT_SWEEP_ARC_RADIANS;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
  return new THREE.BufferGeometry().setFromPoints(points);
}

function orbitMotionScale(debugSettings: DebugSettings): number {
  return debugSettings.motionScale * debugSettings.orbitSpeedScale;
}

function scaledOpacity(opacity: number, debugSettings: DebugSettings): number {
  return Math.min(1, opacity * debugSettings.orbitOpacityScale * debugSettings.orbitOpacityScale * debugSettings.orbitOpacityScale);
}

function disposeLine(line: THREE.Line, geometry: THREE.BufferGeometry): void {
  geometry.dispose();
  if (Array.isArray(line.material)) {
    line.material.forEach((material) => material.dispose());
    return;
  }
  line.material.dispose();
}

function OrbitPath({ color, opacity, position, radius }: OrbitPathProps) {
  const [x, y, z] = position ?? [0, 0, 0];

  return (
    <mesh position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, ORBIT_TUBE_RADIUS, 8, 192]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

function OrbitSweep({ animated, color, opacity, position, radius, speed }: OrbitSweepProps) {
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => createOrbitSweepGeometry(radius), [radius]);
  const line = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Line(geometry, material);
  }, [color, geometry, opacity]);
  const [x, y, z] = position ?? [0, 0, 0];

  useFrame((_, delta) => {
    if (animated && groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
    }
  });

  useEffect(() => () => disposeLine(line, geometry), [geometry, line]);

  return (
    <group ref={groupRef} position={[x, y, z]}>
      <primitive object={line} />
    </group>
  );
}

function SceneBody({ debugSettings, modelId, profile, selectedModelId }: SceneBodyProps) {
  const metric = getCelestialMetric(modelId);
  const scale = renderedSceneRadius(modelId, selectedModelId) * debugSettings.sceneScale;
  return (
    <group position={metric.scenePosition}>
      <CelestialBody debugSettings={debugSettings} modelId={modelId} profile={profile} scale={scale} surface="immersive" />
    </group>
  );
}

function OrbitingLuna({ debugSettings, profile, selectedModelId }: Omit<SceneBodyProps, "modelId">) {
  const orbitRef = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);
  const terraMetric = getCelestialMetric("terra");
  const lunaMetric = getCelestialMetric("luna");
  const lunaOffset = useMemo(
    () =>
      new THREE.Vector3(...lunaMetric.scenePosition).sub(
        new THREE.Vector3(...terraMetric.scenePosition),
      ),
    [lunaMetric.scenePosition, terraMetric.scenePosition],
  );

  useEffect(() => {
    if (selectedModelId === "luna" && orbitRef.current) {
      orbitRef.current.rotation.y = 0;
      invalidate();
    }
  }, [invalidate, selectedModelId]);

  useFrame((_, delta) => {
    if (profile.animated && selectedModelId !== "luna" && orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.62 * orbitMotionScale(debugSettings);
    }
  });

  return (
    <group position={terraMetric.scenePosition} ref={orbitRef}>
      <group position={[lunaOffset.x, lunaOffset.y, lunaOffset.z]}>
        <CelestialBody debugSettings={debugSettings} modelId="luna" profile={profile} scale={renderedSceneRadius("luna", selectedModelId) * debugSettings.sceneScale} surface="immersive" />
      </group>
    </group>
  );
}

function OrbitGuides({ debugSettings, profile, selectedModelId }: Readonly<{ debugSettings: DebugSettings; profile: RenderingProfile; selectedModelId: ModelId }>) {
  const terraMetric = getCelestialMetric("terra");
  const lunaMetric = getCelestialMetric("luna");
  const lunaOrbitRadius = Math.hypot(
    lunaMetric.scenePosition[0] - terraMetric.scenePosition[0],
    lunaMetric.scenePosition[2] - terraMetric.scenePosition[2],
  );
  const speedScale = orbitMotionScale(debugSettings);
  const selectedSolOpacity = selectedModelId === "sol" ? 0.045 : 1;

  return (
    <>
      <OrbitPath color={TERRA_ORBIT_COLOR} opacity={scaledOpacity(0.18 * selectedSolOpacity, debugSettings)} radius={terraMetric.scenePosition[0]} />
      <OrbitSweep animated={profile.animated} color={TERRA_ORBIT_COLOR} opacity={scaledOpacity(0.5 * selectedSolOpacity, debugSettings)} radius={terraMetric.scenePosition[0]} speed={0.28 * speedScale} />
      <OrbitPath color={LUNA_ORBIT_COLOR} opacity={scaledOpacity(0.32 * selectedSolOpacity, debugSettings)} position={[terraMetric.scenePosition[0], lunaMetric.scenePosition[1], 0]} radius={lunaOrbitRadius} />
      <OrbitSweep
        animated={profile.animated}
        color={LUNA_ORBIT_COLOR}
        opacity={scaledOpacity(0.72 * selectedSolOpacity, debugSettings)}
        position={[terraMetric.scenePosition[0], lunaMetric.scenePosition[1], 0]}
        radius={lunaOrbitRadius}
        speed={1.45 * speedScale}
      />
    </>
  );
}

export function SceneBodies({ debugSettings, profile, selectedModelId }: SceneBodiesProps) {
  return (
    <>
      <OrbitGuides debugSettings={debugSettings} profile={profile} selectedModelId={selectedModelId} />
      <SceneBody debugSettings={debugSettings} modelId="sol" profile={profile} selectedModelId={selectedModelId} />
      <SceneBody debugSettings={debugSettings} modelId="terra" profile={profile} selectedModelId={selectedModelId} />
      <OrbitingLuna debugSettings={debugSettings} profile={profile} selectedModelId={selectedModelId} />
    </>
  );
}
