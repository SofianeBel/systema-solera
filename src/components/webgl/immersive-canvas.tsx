"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getCelestialMetric } from "@/lib/celestial-metrics";
import { DEFAULT_DEBUG_SETTINGS, type DebugSettings } from "@/lib/debug-settings";
import type { ModelId } from "@/lib/models";
import type { RenderingProfile } from "@/lib/rendering-profile";
import { canvasDpr } from "@/lib/rendering-profile";
import { selectedCameraComposition } from "@/lib/scene-composition";
import { SceneBodies } from "./orbit-guides";
import { configureRenderer, rendererSettings } from "./renderer-settings";
import { SceneWarmup } from "./scene-warmup";
import { Starfield } from "./starfield";

type ImmersiveCanvasProps = Readonly<{
  cameraAutoRotatePaused: boolean;
  debugSettings: DebugSettings;
  modelId: ModelId;
  profile: RenderingProfile;
}>;

const SPACE_DEEP_RGB: [number, number, number] = [0.003, 0.003, 0.003];

function CameraRig({
  cameraOffset,
  cameraAutoRotatePaused,
  debugSettings,
  maxDistance,
  minDistance,
  profile,
  target,
}: Readonly<{
  cameraOffset: THREE.Vector3;
  cameraAutoRotatePaused: boolean;
  debugSettings: DebugSettings;
  maxDistance: number;
  minDistance: number;
  profile: RenderingProfile;
  target: THREE.Vector3;
}>) {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    camera.position.copy(target).add(cameraOffset);
    camera.lookAt(target);

    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.autoRotate = profile.animated;
    controls.autoRotateSpeed = DEFAULT_DEBUG_SETTINGS.cameraAutoRotateSpeed;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    const handleControlsChange = () => invalidate();
    controls.addEventListener("change", handleControlsChange);
    controls.update();
    controlsRef.current = controls;
    invalidate();

    return () => {
      controls.removeEventListener("change", handleControlsChange);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, cameraOffset, gl, invalidate, maxDistance, minDistance, profile.animated, target]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(target);
      invalidate();
    }
  }, [invalidate, target]);

  useFrame(() => {
    const controls = controlsRef.current;
    if (controls) {
      controls.autoRotate = profile.animated && !cameraAutoRotatePaused;
      controls.autoRotateSpeed = debugSettings.cameraAutoRotateSpeed * debugSettings.motionScale;
      controls.update();
    }
  });
  return null;
}

export default function ImmersiveCanvas({ cameraAutoRotatePaused, debugSettings, modelId, profile }: ImmersiveCanvasProps) {
  const selectedMetric = getCelestialMetric(modelId);
  const cameraComposition = useMemo(() => selectedCameraComposition(modelId, profile.compact), [modelId, profile.compact]);
  const cameraOffset = useMemo(() => new THREE.Vector3(...cameraComposition.offset), [cameraComposition]);
  const target = useMemo(() => new THREE.Vector3(...cameraComposition.target), [cameraComposition]);

  return (
    <Canvas
      className="canvas-fill"
      fallback={<div className="orb-fallback" aria-hidden="true" />}
      dpr={canvasDpr(profile)}
      frameloop={profile.frameloop}
      camera={{ position: [0, 0, 5.8], fov: 54 }}
      gl={rendererSettings(false)}
      onCreated={({ gl }) => configureRenderer(gl)}
    >
      <color attach="background" args={SPACE_DEEP_RGB} />
      <ambientLight intensity={0.46 * debugSettings.lightIntensityScale} />
      <pointLight position={[selectedMetric.scenePosition[0] + 3.2, selectedMetric.scenePosition[1] + 2.4, selectedMetric.scenePosition[2] + 4]} intensity={5.6 * debugSettings.lightIntensityScale} />
      <Starfield debugSettings={debugSettings} profile={profile} />
      <CameraRig
        cameraOffset={cameraOffset}
        cameraAutoRotatePaused={cameraAutoRotatePaused}
        debugSettings={debugSettings}
        maxDistance={cameraComposition.maxDistance}
        minDistance={cameraComposition.minDistance}
        profile={profile}
        target={target}
      />
      <SceneBodies debugSettings={debugSettings} selectedModelId={modelId} profile={profile} />
      <SceneWarmup cacheKey={`${modelId}:${profile.textureQuality}:${profile.sphereSegments}`} />
    </Canvas>
  );
}
