"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

type SolarArcConfig = Readonly<{
  baseY: number;
  baseZ: number;
  height: number;
  lift: number;
  phase: number;
  rotation: [number, number, number];
  span: number;
  color: string;
  opacity: number;
  speed: number;
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

const SOLAR_ARCS: readonly SolarArcConfig[] = [
  { baseY: 0.42, baseZ: 0.8, height: 0.34, lift: 0.27, phase: 0.3, rotation: [0.12, -0.58, 0.26], span: 0.42, color: "#ff7a2b", opacity: 0.26, speed: 0.026, tubeRadius: 0.007 },
  { baseY: -0.43, baseZ: 0.82, height: 0.22, lift: 0.2, phase: 1.9, rotation: [-0.24, 0.36, -0.36], span: 0.32, color: "#ff3516", opacity: 0.22, speed: -0.018, tubeRadius: 0.01 },
  { baseY: -0.08, baseZ: 0.86, height: 0.44, lift: 0.46, phase: 2.7, rotation: [0.08, 0.86, 0.58], span: 0.18, color: "#ffd06a", opacity: 0.16, speed: 0.012, tubeRadius: 0.005 },
  { baseY: 0.14, baseZ: 0.76, height: 0.22, lift: 0.18, phase: 3.4, rotation: [0.42, -1.02, 0.94], span: 0.52, color: "#fff1b0", opacity: 0.12, speed: -0.012, tubeRadius: 0.004 },
];

const arcVertexShader = `
varying float vArcProgress;

void main() {
  vArcProgress = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const arcFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vArcProgress;

void main() {
  float endFade = smoothstep(0.0, 0.16, vArcProgress) * (1.0 - smoothstep(0.84, 1.0, vArcProgress));
  float filament = 0.74 + sin(vArcProgress * 37.0) * 0.16 + sin(vArcProgress * 83.0) * 0.1;
  float alpha = uOpacity * endFade * filament;
  gl_FragColor = vec4(uColor * (0.72 + endFade * 1.18), alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createSolarArcGeometry(arc: SolarArcConfig): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  const segmentCount = 72;
  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const angle = Math.PI * progress;
    const wobble = Math.sin(progress * Math.PI * 5.7 + arc.phase) * 0.018 + Math.sin(progress * Math.PI * 11.0 + arc.phase * 0.7) * 0.009;
    const x = Math.cos(angle) * arc.span + wobble;
    const y = arc.baseY + Math.sin(angle) * arc.height + Math.sin(progress * Math.PI * 2 + arc.phase) * 0.014;
    const z = arc.baseZ + Math.sin(angle) * arc.lift + Math.sin(progress * Math.PI * 3 + arc.phase) * 0.018;
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segmentCount, arc.tubeRadius, 8, false);
}

function SolarMagneticArc({ animated, arc, motionScale, scale }: SolarMagneticArcProps) {
  const geometry = useMemo(() => createSolarArcGeometry(arc), [arc]);
  const arcMesh = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(arc.color) },
        uOpacity: { value: arc.opacity },
      },
      vertexShader: arcVertexShader,
      fragmentShader: arcFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    const magneticArc = new THREE.Mesh(geometry, material);
    magneticArc.rotation.set(...arc.rotation);
    magneticArc.scale.setScalar(scale);
    return magneticArc;
  }, [arc, geometry, scale]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      if (Array.isArray(arcMesh.material)) {
        arcMesh.material.forEach((material) => material.dispose());
      } else {
        arcMesh.material.dispose();
      }
    };
  }, [arcMesh, geometry]);

  useFrame((_, delta) => {
    if (animated) {
      arcMesh.rotation.z += delta * arc.speed * motionScale;
    }
  });

  return <primitive object={arcMesh} />;
}

export function SolarMagneticArcs({ animated, motionScale, scale }: SolarMagneticArcsProps) {
  return (
    <group>
      {SOLAR_ARCS.map((arc) => (
        <SolarMagneticArc animated={animated} arc={arc} key={`${arc.span}-${arc.baseY}-${arc.phase}`} motionScale={motionScale} scale={scale} />
      ))}
    </group>
  );
}
