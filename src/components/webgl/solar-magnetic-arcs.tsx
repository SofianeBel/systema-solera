"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

type SolarArcConfig = Readonly<{
  bend: number;
  center: [number, number, number];
  color: string;
  cycleDuration: number;
  flowSpeed: number;
  height: number;
  id: string;
  lifeOffset: number;
  opacity: number;
  phase: number;
  pulseAmplitude: number;
  tangent: [number, number, number];
  tubeRadius: number;
  visiblePortion: number;
  wobble: number;
}>;

type SolarMagneticArcProps = Readonly<{
  animated: boolean;
  arc: SolarArcConfig;
  motionScale: number;
  scale: number;
}>;

type SolarMagneticArcsProps = Readonly<{
  animated: boolean;
  motionScale: number;
  scale: number;
}>;

const SOLAR_SURFACE_RADIUS = 1;
const SOLAR_ARC_SEGMENTS = 42;
const SOLAR_JET_COUNT = 28;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TAU = Math.PI * 2;
const JET_COLORS = ["#ff461a", "#ff6b1d", "#ff9d2e", "#ffd06a", "#fff0a4"] as const;

function pseudoRandom(seed: number): number {
  return Math.sin(seed * 12.9898 + 78.233) * 43758.5453 % 1;
}

function randomBetween(seed: number, min: number, max: number): number {
  return min + (max - min) * Math.abs(pseudoRandom(seed));
}

function createSolarJet(index: number): SolarArcConfig {
  const seed = index + 1;
  const angle = index * GOLDEN_ANGLE + randomBetween(seed * 3, -0.18, 0.18);
  const z = randomBetween(seed * 5, 0.12, 0.32);
  const xyRadius = Math.sqrt(1 - z * z);
  const colorIndex = Math.floor(randomBetween(seed * 31, 0, JET_COLORS.length - 0.001));

  return {
    bend: randomBetween(seed * 7, -0.055, 0.055),
    center: [Math.cos(angle) * xyRadius, Math.sin(angle) * xyRadius, z],
    color: JET_COLORS[colorIndex] ?? JET_COLORS[0],
    cycleDuration: randomBetween(seed * 11, 3.8, 7.4),
    flowSpeed: randomBetween(seed * 13, 0.72, 1.45),
    height: randomBetween(seed * 17, 0.055, 0.17),
    id: `solar-plasma-jet-${index}`,
    lifeOffset: randomBetween(seed * 19, 0, 1),
    opacity: randomBetween(seed * 23, 0.22, 0.52),
    phase: randomBetween(seed * 29, 0, TAU),
    pulseAmplitude: randomBetween(seed * 37, 0.004, 0.014),
    tangent: [-Math.sin(angle), Math.cos(angle), randomBetween(seed * 41, -0.035, 0.035)],
    tubeRadius: randomBetween(seed * 43, 0.0028, 0.0062),
    visiblePortion: randomBetween(seed * 47, 0.32, 0.58),
    wobble: randomBetween(seed * 53, 0.004, 0.018),
  };
}

const SOLAR_ARCS: readonly SolarArcConfig[] = Array.from({ length: SOLAR_JET_COUNT }, (_, index) => createSolarJet(index));

const arcVertexShader = `
uniform float uPhase;
uniform float uPulseAmplitude;
uniform float uCycleDuration;
uniform float uLifeOffset;
uniform float uTime;
uniform float uVisiblePortion;
varying float vArcProgress;
varying float vProminencePulse;
varying float vProminenceVisibility;

float lifeEnvelope() {
  float life = fract(uTime / uCycleDuration + uLifeOffset);
  float appear = smoothstep(0.0, 0.10, life);
  float fadeStart = min(0.92, uVisiblePortion);
  float disappear = 1.0 - smoothstep(fadeStart, min(1.0, fadeStart + 0.18), life);
  return appear * disappear;
}

void main() {
  vArcProgress = uv.x;
  float anchor = smoothstep(0.04, 0.62, vArcProgress) * (1.0 - smoothstep(0.92, 1.0, vArcProgress));
  float pulse = 0.5 + 0.5 * sin(uTime * 1.16 + uPhase + vArcProgress * 6.28318);
  vProminenceVisibility = lifeEnvelope();
  vec3 radial = normalize(position);
  vec3 animatedPosition = position + radial * anchor * anchor * uPulseAmplitude * (0.18 + pulse * 0.66) * vProminenceVisibility;
  vProminencePulse = pulse;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}
`;

const arcFragmentShader = `
uniform vec3 uColor;
uniform float uFlowSpeed;
uniform float uOpacity;
uniform float uPhase;
uniform float uTime;
varying float vArcProgress;
varying float vProminencePulse;
varying float vProminenceVisibility;

void main() {
  float jetBody = smoothstep(0.02, 0.18, vArcProgress) * (1.0 - smoothstep(0.92, 1.0, vArcProgress));
  float footGlow = 1.0 - smoothstep(0.0, 0.24, vArcProgress);
  float tipGlow = smoothstep(0.68, 1.0, vArcProgress);
  float flow = fract(uTime * uFlowSpeed + uPhase * 0.13);
  float flowDistance = abs(vArcProgress - flow);
  float hotFront = exp(-flowDistance * flowDistance * 240.0);
  float wake = exp(-flowDistance * flowDistance * 52.0) * 0.34;
  float filament = 0.7 + sin(vArcProgress * 64.0 + uTime * 2.7 + uPhase) * 0.14 + sin(vArcProgress * 139.0 - uTime * 3.4) * 0.07;
  float taper = 1.0 - smoothstep(0.82, 1.0, vArcProgress) * 0.58;
  float alpha = uOpacity * vProminenceVisibility * (0.24 + jetBody * 0.88 + footGlow * 0.5 + tipGlow * 0.18) * filament * taper * (0.76 + hotFront * 1.24 + wake);
  vec3 color = uColor * (1.0 + jetBody * 1.16 + footGlow * 0.86 + hotFront * (2.0 + vProminencePulse * 0.42));
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createSolarArcGeometry(arc: SolarArcConfig): THREE.BufferGeometry {
  const root = new THREE.Vector3(...arc.center).normalize();
  const tangent = new THREE.Vector3(...arc.tangent);
  tangent.addScaledVector(root, -tangent.dot(root)).normalize();
  const crossAxis = new THREE.Vector3().crossVectors(root, tangent).normalize();
  const points = Array.from({ length: SOLAR_ARC_SEGMENTS + 1 }, (_, index) => {
    const progress = index / SOLAR_ARC_SEGMENTS;
    const lift = Math.sin(progress * Math.PI * 0.5);
    const magneticBend = Math.sin(progress * Math.PI) * arc.bend;
    const tipDrift = progress * progress * arc.bend * 0.54;
    const strandWobble = Math.sin(progress * Math.PI * 5.0 + arc.phase) * arc.wobble * Math.sin(progress * Math.PI);

    return root
      .clone()
      .multiplyScalar(SOLAR_SURFACE_RADIUS + arc.height * lift)
      .addScaledVector(tangent, magneticBend + tipDrift)
      .addScaledVector(crossAxis, strandWobble);
  });

  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), SOLAR_ARC_SEGMENTS, arc.tubeRadius, 6, false);
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }
  material.dispose();
}

function SolarMagneticArc({ animated, arc, motionScale, scale }: SolarMagneticArcProps) {
  const geometry = useMemo(() => createSolarArcGeometry(arc), [arc]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(arc.color) },
          uCycleDuration: { value: arc.cycleDuration },
          uFlowSpeed: { value: arc.flowSpeed },
          uLifeOffset: { value: arc.lifeOffset },
          uOpacity: { value: arc.opacity },
          uPhase: { value: arc.phase },
          uPulseAmplitude: { value: arc.pulseAmplitude },
          uTime: { value: 0 },
          uVisiblePortion: { value: arc.visiblePortion },
        },
        vertexShader: arcVertexShader,
        fragmentShader: arcFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [arc],
  );
  const arcMesh = useMemo(() => {
    const magneticArc = new THREE.Mesh(geometry, material);
    magneticArc.renderOrder = 3;
    magneticArc.scale.setScalar(scale);
    return magneticArc;
  }, [geometry, material, scale]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      disposeMaterial(arcMesh.material);
    };
  }, [arcMesh, geometry]);

  useFrame((_, delta) => {
    if (animated) {
      material.uniforms["uTime"]!.value += delta * motionScale;
    }
  });

  return <primitive object={arcMesh} />;
}

export function SolarMagneticArcs({ animated, motionScale, scale }: SolarMagneticArcsProps) {
  return (
    <group>
      {SOLAR_ARCS.map((arc) => (
        <SolarMagneticArc animated={animated} arc={arc} key={arc.id} motionScale={motionScale} scale={scale} />
      ))}
    </group>
  );
}
