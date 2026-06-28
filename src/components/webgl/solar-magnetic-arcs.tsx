"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

type SolarArcConfig = Readonly<{
  center: [number, number, number];
  color: string;
  flowSpeed: number;
  footSpan: number;
  height: number;
  opacity: number;
  phase: number;
  pulseAmplitude: number;
  tangent: [number, number, number];
  tubeRadius: number;
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
const SOLAR_ARC_SEGMENTS = 96;

const SOLAR_ARCS: readonly SolarArcConfig[] = [
  { center: [0.78, 0.48, 0.3], color: "#ff5a18", flowSpeed: 0.46, footSpan: 0.36, height: 0.42, opacity: 0.66, phase: 0.3, pulseAmplitude: 0.052, tangent: [-0.18, 0.38, 0.06], tubeRadius: 0.012 },
  { center: [-0.78, -0.44, 0.28], color: "#ff2f12", flowSpeed: 0.55, footSpan: 0.3, height: 0.3, opacity: 0.5, phase: 1.9, pulseAmplitude: 0.042, tangent: [0.28, -0.26, 0.06], tubeRadius: 0.012 },
  { center: [0.03, 0.95, 0.24], color: "#ffb23f", flowSpeed: 0.72, footSpan: 0.14, height: 0.64, opacity: 0.46, phase: 2.7, pulseAmplitude: 0.066, tangent: [0.28, 0.02, 0.08], tubeRadius: 0.007 },
  { center: [-0.94, 0.12, 0.22], color: "#ffe08a", flowSpeed: 0.38, footSpan: 0.24, height: 0.34, opacity: 0.38, phase: 3.4, pulseAmplitude: 0.034, tangent: [-0.02, 0.34, 0.05], tubeRadius: 0.006 },
];

const arcVertexShader = `
uniform float uPhase;
uniform float uPulseAmplitude;
uniform float uTime;
varying float vArcProgress;
varying float vProminencePulse;

void main() {
  vArcProgress = uv.x;
  float anchor = sin(vArcProgress * 3.14159265);
  float pulse = 0.5 + 0.5 * sin(uTime * 1.16 + uPhase + vArcProgress * 6.28318);
  vec3 radial = normalize(position);
  vec3 animatedPosition = position + radial * anchor * anchor * uPulseAmplitude * (0.38 + pulse);
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

void main() {
  float loopBody = smoothstep(0.0, 0.12, vArcProgress) * (1.0 - smoothstep(0.88, 1.0, vArcProgress));
  float footGlow = min(1.0, 1.0 - smoothstep(0.0, 0.16, vArcProgress) + smoothstep(0.84, 1.0, vArcProgress));
  float flow = fract(uTime * uFlowSpeed + uPhase * 0.13);
  float flowDistance = abs(vArcProgress - flow);
  flowDistance = min(flowDistance, 1.0 - flowDistance);
  float hotFront = exp(-flowDistance * flowDistance * 210.0);
  float wake = exp(-flowDistance * flowDistance * 42.0) * 0.46;
  float filament = 0.72 + sin(vArcProgress * 58.0 + uTime * 2.4 + uPhase) * 0.14 + sin(vArcProgress * 127.0 - uTime * 3.1) * 0.08;
  float alpha = uOpacity * (0.48 + loopBody * 0.94 + footGlow * 0.42) * filament * (0.82 + hotFront * 1.36 + wake);
  vec3 color = uColor * (1.12 + loopBody * 1.26 + footGlow * 0.72 + hotFront * (2.1 + vProminencePulse * 0.58));
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createSolarArcGeometry(arc: SolarArcConfig): THREE.BufferGeometry {
  const center = new THREE.Vector3(...arc.center).normalize();
  const tangent = new THREE.Vector3(...arc.tangent);
  tangent.addScaledVector(center, -tangent.dot(center)).normalize();
  const firstFoot = center.clone().addScaledVector(tangent, -arc.footSpan).normalize();
  const secondFoot = center.clone().addScaledVector(tangent, arc.footSpan).normalize();
  const points = Array.from({ length: SOLAR_ARC_SEGMENTS + 1 }, (_, index) => {
    const progress = index / SOLAR_ARC_SEGMENTS;
    const surfacePoint = firstFoot.clone().lerp(secondFoot, progress).normalize();
    const magneticRise = Math.sin(progress * Math.PI);
    const strandWobble = Math.sin(progress * Math.PI * 5.0 + arc.phase) * 0.012 * magneticRise;
    return surfacePoint
      .multiplyScalar(SOLAR_SURFACE_RADIUS + arc.height * magneticRise)
      .addScaledVector(tangent, strandWobble);
  });

  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), SOLAR_ARC_SEGMENTS, arc.tubeRadius, 8, false);
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
          uFlowSpeed: { value: arc.flowSpeed },
          uOpacity: { value: arc.opacity },
          uPhase: { value: arc.phase },
          uPulseAmplitude: { value: arc.pulseAmplitude },
          uTime: { value: 0 },
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
        <SolarMagneticArc animated={animated} arc={arc} key={`${arc.center.join(":")}-${arc.phase}`} motionScale={motionScale} scale={scale} />
      ))}
    </group>
  );
}
