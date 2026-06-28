export type DebugSettings = Readonly<{
  motionScale: number;
  cameraAutoRotateSpeed: number;
  orbitSpeedScale: number;
  orbitOpacityScale: number;
  starfieldSpeedScale: number;
  sceneScale: number;
  lightIntensityScale: number;
}>;

export const DEFAULT_DEBUG_SETTINGS = {
  motionScale: 1,
  cameraAutoRotateSpeed: 0.92,
  orbitSpeedScale: 1,
  orbitOpacityScale: 1,
  starfieldSpeedScale: 1,
  sceneScale: 1,
  lightIntensityScale: 1,
} as const satisfies DebugSettings;
