"use client";

import { Canvas } from "@react-three/fiber";
import { assertNever } from "@/lib/assert-never";
import type { DebugSettings } from "@/lib/debug-settings";
import type { ModelId } from "@/lib/models";
import type { RenderingProfile } from "@/lib/rendering-profile";
import { canvasDpr } from "@/lib/rendering-profile";
import { CelestialBody } from "./celestial-body";
import { configureRenderer, rendererSettings } from "./renderer-settings";
import { Starfield } from "./starfield";

type CelestialPreviewProps = Readonly<{
  debugSettings: DebugSettings;
  modelId: ModelId;
  profile: RenderingProfile;
}>;

type PreviewComposition = Readonly<{
  position: [number, number, number];
  scale: number;
}>;

function previewComposition(modelId: ModelId): PreviewComposition {
  switch (modelId) {
    case "sol":
      return { position: [-2.16, 0.06, 0], scale: 2.08 };
    case "terra":
      return { position: [-1.34, 0.76, 0], scale: 1.54 };
    case "luna":
      return { position: [-1.52, 0.52, 0], scale: 1.16 };
    default:
      return assertNever(modelId);
  }
}

export default function CelestialPreview({ debugSettings, modelId, profile }: CelestialPreviewProps) {
  const composition = previewComposition(modelId);

  return (
    <Canvas
      className="canvas-fill"
      fallback={<div className="orb-fallback" aria-hidden="true" />}
      dpr={canvasDpr(profile)}
      frameloop={profile.frameloop}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={rendererSettings(true)}
      onCreated={({ gl }) => configureRenderer(gl)}
    >
      <ambientLight intensity={0.44 * debugSettings.lightIntensityScale} />
      <pointLight position={[2, 2, 3]} intensity={2.65 * debugSettings.lightIntensityScale} />
      <Starfield debugSettings={debugSettings} profile={profile} />
      <group position={composition.position}>
        <CelestialBody debugSettings={debugSettings} modelId={modelId} profile={profile} scale={composition.scale * debugSettings.sceneScale} surface="preview" />
      </group>
    </Canvas>
  );
}
