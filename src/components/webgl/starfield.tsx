"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { DebugSettings } from "@/lib/debug-settings";
import type { RenderingProfile } from "@/lib/rendering-profile";

type StarfieldProps = Readonly<{
  debugSettings: DebugSettings;
  profile: RenderingProfile;
}>;

type StarBuffers = Readonly<{
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}>;
type SceneUniforms = Readonly<{
  uTime: THREE.IUniform<number>;
}>;

const STARFIELD_SEED = 0x51_4f_4c;
const STARFIELD_ROTATION_SPEED = 0.2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const STARFIELD_RADIUS_MIN = 54;
const STARFIELD_RADIUS_SPAN = 34;

const starVertexShader = `
uniform float uTime;
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vTwinkle = 0.68 + sin(uTime * 2.7 + position.x * 4.1 + position.y * 3.7) * 0.32;
  vColor = aColor * (0.72 + vTwinkle * 0.48);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (0.78 + vTwinkle * 0.55) * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const starFragmentShader = `
varying vec3 vColor;
varying float vTwinkle;
void main() {
  vec2 point = gl_PointCoord - vec2(0.5);
  float falloff = smoothstep(0.5, 0.05, length(point));
  gl_FragColor = vec4(vColor, falloff * (0.58 + vTwinkle * 0.42));
}
`;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function starLayer(index: number): number {
  return index % 3;
}

function writeStar(buffers: StarBuffers, index: number, random: () => number): void {
  const layer = starLayer(index);
  const offset = index * 3;
  const particleCount = Math.max(1, buffers.sizes.length);
  const distribution = (index + random() * 0.72) / particleCount;
  const vertical = 1 - distribution * 2;
  const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const theta = index * GOLDEN_ANGLE + (random() - 0.5) * 0.42;
  const depth = STARFIELD_RADIUS_MIN + layer * 5 + random() * STARFIELD_RADIUS_SPAN;
  const bright = random() > 0.93;
  const warmth = random();
  const dimming = 0.72 + random() * 0.28;

  buffers.positions[offset] = Math.cos(theta) * radial * depth;
  buffers.positions[offset + 1] = vertical * depth;
  buffers.positions[offset + 2] = Math.sin(theta) * radial * depth;
  buffers.colors[offset] = (bright ? 1 : 0.62 + warmth * 0.24) * dimming;
  buffers.colors[offset + 1] = (bright ? 0.9 + warmth * 0.08 : 0.68 + warmth * 0.2) * dimming;
  buffers.colors[offset + 2] = (bright ? 0.72 + warmth * 0.26 : 0.88 + warmth * 0.12) * dimming;
  buffers.sizes[index] = (bright ? 0.18 + random() * 0.2 : 0.075 + random() * 0.11) * (0.9 + layer * 0.08);
}

function createStarBuffers(particleCount: number): StarBuffers {
  const buffers: StarBuffers = {
    positions: new Float32Array(particleCount * 3),
    colors: new Float32Array(particleCount * 3),
    sizes: new Float32Array(particleCount),
  };
  const random = seededRandom(STARFIELD_SEED);
  for (let index = 0; index < particleCount; index += 1) {
    writeStar(buffers, index, random);
  }
  return buffers;
}

export function Starfield({ debugSettings, profile }: StarfieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const uniforms = useMemo<SceneUniforms>(() => ({ uTime: { value: 0 } }), []);
  const buffers = useMemo(() => createStarBuffers(profile.particleCount), [profile.particleCount]);

  useFrame((_, delta) => {
    if (profile.animated && pointsRef.current) {
      const scaledDelta = delta * debugSettings.motionScale * debugSettings.starfieldSpeedScale;
      pointsRef.current.rotation.y += scaledDelta * STARFIELD_ROTATION_SPEED;
      uniforms.uTime.value += scaledDelta;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
