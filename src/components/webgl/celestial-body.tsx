"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DebugSettings } from "@/lib/debug-settings";
import type { ModelId } from "@/lib/models";
import type { RenderingProfile } from "@/lib/rendering-profile";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  fragmentShader,
  getBodyShader,
  vertexShader,
} from "./shaders";
import { SolarMagneticArcs } from "./solar-magnetic-arcs";
import { getBodyTextureAssets, type BodyTextureSurface } from "./texture-assets";

type BodyUniforms = Readonly<{
  uTime: THREE.IUniform<number>;
  uBaseColor: THREE.IUniform<THREE.Vector3>;
  uAccentColor: THREE.IUniform<THREE.Vector3>;
  uGlowColor: THREE.IUniform<THREE.Vector3>;
  uNoiseScale: THREE.IUniform<number>;
  uRimPower: THREE.IUniform<number>;
  uMode: THREE.IUniform<number>;
  uTextureInfluence: THREE.IUniform<number>;
  uHasCloudMap: THREE.IUniform<number>;
  uHasNightMap: THREE.IUniform<number>;
  uLightIntensity: THREE.IUniform<number>;
  uColorMap: THREE.IUniform<THREE.Texture>;
  uCloudMap: THREE.IUniform<THREE.Texture>;
  uNightMap: THREE.IUniform<THREE.Texture>;
}>;

type AtmosphereUniforms = Readonly<{
  uTime: THREE.IUniform<number>;
  uGlowColor: THREE.IUniform<THREE.Vector3>;
  uAtmospherePower: THREE.IUniform<number>;
  uAtmosphereIntensity: THREE.IUniform<number>;
  uMode: THREE.IUniform<number>;
  uLightIntensity: THREE.IUniform<number>;
}>;

type LoadedBodyTextures = Readonly<{
  colorMap: THREE.Texture;
  cloudMap: THREE.Texture;
  nightMap: THREE.Texture;
}>;

type CelestialBodyProps = Readonly<{
  debugSettings: DebugSettings;
  modelId: ModelId;
  profile: RenderingProfile;
  scale: number;
  surface: BodyTextureSurface;
}>;

const textureCache = new Map<string, Promise<THREE.Texture>>();

const BODY_ROTATION_SPEED = {
  sol: 0.16,
  terra: 0.85,
  luna: 0.58,
} as const satisfies Record<ModelId, number>;
const DEFAULT_LIGHT_INTENSITY = 1;
const SOLAR_CORONA_TEXTURE_SIZE = 512;

function createFallbackTexture(): THREE.Texture {
  const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createTransparentTexture(): THREE.Texture {
  const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function pseudoRandom(index: number): number {
  return Math.sin(index * 12.9898) * 43758.5453 % 1;
}

function createSolarCoronaTexture(): THREE.Texture {
  if (typeof document === "undefined") {
    return createTransparentTexture();
  }

  const canvas = document.createElement("canvas");
  canvas.width = SOLAR_CORONA_TEXTURE_SIZE;
  canvas.height = SOLAR_CORONA_TEXTURE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    return createTransparentTexture();
  }

  const center = SOLAR_CORONA_TEXTURE_SIZE / 2;
  const halo = context.createRadialGradient(center, center, center * 0.34, center, center, center);
  halo.addColorStop(0, "rgba(255, 88, 18, 0.28)");
  halo.addColorStop(0.2, "rgba(255, 188, 70, 0.18)");
  halo.addColorStop(0.52, "rgba(255, 238, 184, 0.08)");
  halo.addColorStop(1, "rgba(255, 238, 184, 0)");
  context.fillStyle = halo;
  context.fillRect(0, 0, SOLAR_CORONA_TEXTURE_SIZE, SOLAR_CORONA_TEXTURE_SIZE);

  context.save();
  context.globalCompositeOperation = "lighter";
  context.lineCap = "round";
  for (let index = 0; index < 28; index += 1) {
    const jitter = Math.abs(pseudoRandom(index));
    const angle = (index / 28) * Math.PI * 2 + (jitter - 0.5) * 0.34;
    const inner = center * (0.42 + jitter * 0.08);
    const outer = center * (0.62 + Math.abs(pseudoRandom(index + 11)) * 0.32);
    const alpha = 0.018 + Math.abs(pseudoRandom(index + 23)) * 0.042;
    context.strokeStyle = `rgba(255, 224, 168, ${alpha})`;
    context.lineWidth = 1 + jitter * 2.2;
    context.shadowColor = "rgba(255, 130, 38, 0.16)";
    context.shadowBlur = 12;
    context.beginPath();
    context.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
    context.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
    context.stroke();
  }

  const drawProminence = (startAngle: number, peakAngle: number, endAngle: number, radius: number, reach: number, width: number) => {
    const start = { x: center + Math.cos(startAngle) * radius, y: center + Math.sin(startAngle) * radius };
    const peak = { x: center + Math.cos(peakAngle) * reach, y: center + Math.sin(peakAngle) * reach };
    const end = { x: center + Math.cos(endAngle) * radius, y: center + Math.sin(endAngle) * radius };

    context.shadowColor = "rgba(255, 64, 20, 0.42)";
    context.shadowBlur = 10;
    context.strokeStyle = "rgba(255, 68, 20, 0.3)";
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(peak.x, peak.y, end.x, end.y);
    context.stroke();

    context.shadowBlur = 4;
    context.strokeStyle = "rgba(255, 194, 88, 0.32)";
    context.lineWidth = Math.max(1, width * 0.42);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(peak.x, peak.y, end.x, end.y);
    context.stroke();
  };

  drawProminence(-0.84, -0.62, -0.4, center * 0.43, center * 0.65, 5.4);
  drawProminence(2.34, 2.18, 2.02, center * 0.43, center * 0.57, 3.6);
  drawProminence(1.24, 1.16, 1.1, center * 0.44, center * 0.68, 2.4);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function configureColorTexture(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function loadTexture(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => resolve(configureColorTexture(texture)),
      undefined,
      (error) => reject(error),
    );
  });
  textureCache.set(url, promise);
  return promise;
}

function useBodyTextures(modelId: ModelId, surface: BodyTextureSurface, profile: RenderingProfile): LoadedBodyTextures | null {
  const assets = useMemo(() => getBodyTextureAssets(modelId, surface, profile.textureQuality), [modelId, profile.textureQuality, surface]);
  const invalidate = useThree((state) => state.invalidate);
  const [textures, setTextures] = useState<LoadedBodyTextures | null>(null);

  useEffect(() => {
    let active = true;
    setTextures(null);

    const loadTextures = async (): Promise<void> => {
      const [colorMap, cloudMap, nightMap] = await Promise.all([
        loadTexture(assets.colorMap),
        loadTexture(assets.cloudMap ?? assets.colorMap),
        loadTexture(assets.nightMap ?? assets.colorMap),
      ] as const);

      if (active) {
        setTextures({ colorMap, cloudMap, nightMap });
        invalidate();
      }
    };

    loadTextures().catch((error: unknown) => {
      if (!active) {
        return;
      }
      if (error instanceof Error) {
        console.error(error.message);
        return;
      }
      console.error("Texture load failed.");
    });

    return () => {
      active = false;
    };
  }, [assets, invalidate]);

  return textures;
}

function SolarCorona({ scale }: Readonly<{ scale: number }>) {
  const texture = useMemo(() => createSolarCoronaTexture(), []);
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [texture],
  );

  useEffect(() => {
    return () => {
      material.dispose();
      texture.dispose();
    };
  }, [material, texture]);

  return (
    <sprite renderOrder={-1} scale={[scale * 4.2, scale * 4.2, 1]}>
      <primitive object={material} attach="material" />
    </sprite>
  );
}

export function CelestialBody({ debugSettings, modelId, profile, scale, surface }: CelestialBodyProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const shader = useMemo(() => getBodyShader(modelId), [modelId]);
  const fallbackTexture = useMemo(() => createFallbackTexture(), []);
  const textures = useBodyTextures(modelId, surface, profile);
  const assets = useMemo(() => getBodyTextureAssets(modelId, surface, profile.textureQuality), [modelId, profile.textureQuality, surface]);
  const invalidate = useThree((state) => state.invalidate);
  const uniforms = useMemo<BodyUniforms>(
    () => ({
      uTime: { value: 0 },
      uBaseColor: { value: shader.baseColor },
      uAccentColor: { value: shader.accentColor },
      uGlowColor: { value: shader.glowColor },
      uNoiseScale: { value: shader.noiseScale },
      uRimPower: { value: shader.rimPower },
      uMode: { value: shader.mode },
      uTextureInfluence: { value: 0 },
      uHasCloudMap: { value: 0 },
      uHasNightMap: { value: 0 },
      uLightIntensity: { value: DEFAULT_LIGHT_INTENSITY },
      uColorMap: { value: fallbackTexture },
      uCloudMap: { value: fallbackTexture },
      uNightMap: { value: fallbackTexture },
    }),
    [fallbackTexture, shader],
  );
  const atmosphereUniforms = useMemo<AtmosphereUniforms>(
    () => ({
      uTime: { value: 0 },
      uGlowColor: { value: shader.glowColor },
      uAtmospherePower: { value: shader.atmospherePower },
      uAtmosphereIntensity: { value: shader.atmosphereIntensity },
      uMode: { value: shader.mode },
      uLightIntensity: { value: DEFAULT_LIGHT_INTENSITY },
    }),
    [shader],
  );
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthWrite: true,
      }),
    [uniforms],
  );
  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: atmosphereUniforms,
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    [atmosphereUniforms],
  );

  useEffect(() => {
    return () => {
      material.dispose();
      atmosphereMaterial.dispose();
      fallbackTexture.dispose();
    };
  }, [atmosphereMaterial, fallbackTexture, material]);

  useEffect(() => {
    uniforms.uColorMap.value = textures?.colorMap ?? fallbackTexture;
    uniforms.uCloudMap.value = textures?.cloudMap ?? fallbackTexture;
    uniforms.uNightMap.value = textures?.nightMap ?? fallbackTexture;
    uniforms.uTextureInfluence.value = textures ? shader.textureInfluence : 0;
    uniforms.uHasCloudMap.value = textures && assets.cloudMap ? 1 : 0;
    uniforms.uHasNightMap.value = textures && assets.nightMap ? 1 : 0;
    invalidate();
  }, [assets, fallbackTexture, invalidate, shader, textures, uniforms]);

  useEffect(() => {
    uniforms.uLightIntensity.value = debugSettings.lightIntensityScale;
    atmosphereUniforms.uLightIntensity.value = debugSettings.lightIntensityScale;
    invalidate();
  }, [atmosphereUniforms, debugSettings.lightIntensityScale, invalidate, uniforms]);

  useFrame((_, delta) => {
    if (profile.animated) {
      const scaledDelta = delta * debugSettings.motionScale;
      uniforms.uTime.value += scaledDelta;
      atmosphereUniforms.uTime.value += scaledDelta;
      if (bodyRef.current) {
        bodyRef.current.rotation.y += scaledDelta * BODY_ROTATION_SPEED[modelId];
      }
    }
  });

  return (
    <group ref={bodyRef} rotation={[0.18, -0.44, 0]}>
      {modelId === "sol" ? <SolarCorona scale={scale} /> : null}
      <mesh scale={scale}>
        <sphereGeometry args={[1, profile.sphereSegments, profile.sphereSegments]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh scale={scale * shader.atmosphereScale}>
        <sphereGeometry args={[1, profile.sphereSegments, profile.sphereSegments]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
      {modelId === "sol" ? <SolarMagneticArcs animated={profile.animated} motionScale={debugSettings.motionScale} scale={scale} /> : null}
    </group>
  );
}
