export type RenderMode = "css" | "webgl-static" | "webgl-live";
export type FrameLoopMode = "always" | "demand";

export type CapabilityInput = Readonly<{
  width: number;
  devicePixelRatio: number;
  supportsWebGL: boolean;
  prefersReducedMotion: boolean;
  sceneVisible: boolean;
}>;

export type RenderingProfile = Readonly<{
  mode: RenderMode;
  dpr: readonly [number, number];
  frameloop: FrameLoopMode;
  compact: boolean;
  textureQuality: "2k" | "8k";
  particleCount: number;
  sphereSegments: number;
  animated: boolean;
}>;

export function canvasDpr(profile: RenderingProfile): [number, number] {
  return [profile.dpr[0], profile.dpr[1]];
}

export function resolveRenderingProfile(input: CapabilityInput): RenderingProfile {
  const mobile = input.width < 760;
  const liveMaxDpr = mobile ? 1 : Math.min(input.devicePixelRatio, 2);
  const staticMaxDpr = mobile ? 1 : Math.min(input.devicePixelRatio, 1.5);

  if (!input.supportsWebGL) {
    return {
      mode: "css",
      dpr: [1, 1],
      frameloop: "demand",
      compact: mobile,
      textureQuality: "2k",
      particleCount: 0,
      sphereSegments: 32,
      animated: false,
    };
  }

  if (input.prefersReducedMotion || !input.sceneVisible) {
    return {
      mode: "webgl-static",
      dpr: [1, staticMaxDpr],
      frameloop: "demand",
      compact: mobile,
      textureQuality: "2k",
      particleCount: mobile ? 320 : 900,
      sphereSegments: mobile ? 48 : 64,
      animated: false,
    };
  }

  return {
    mode: "webgl-live",
    dpr: [1, liveMaxDpr],
    frameloop: "always",
    compact: mobile,
    textureQuality: mobile ? "2k" : "8k",
    particleCount: mobile ? 900 : 2600,
    sphereSegments: mobile ? 48 : 128,
    animated: true,
  };
}
