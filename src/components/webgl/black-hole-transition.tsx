"use client";

import { useEffect, useRef } from "react";
import type { ModelId } from "@/lib/models";
import type { RenderingProfile } from "@/lib/rendering-profile";
import { canvasDpr } from "@/lib/rendering-profile";
import { getBodyShader } from "./shaders";

type BlackHoleTransitionProps = Readonly<{
  modelId: ModelId;
  profile: RenderingProfile;
  onMidpoint: () => void;
  onComplete: () => void;
}>;

type ShaderUniforms = Readonly<{
  time: WebGLUniformLocation | null;
  progress: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  accentColor: WebGLUniformLocation | null;
  seed: WebGLUniformLocation | null;
}>;

const BLACK_HOLE_DURATION_MS = 1900;
const BLACK_HOLE_MIDPOINT = 0.62;
const MODEL_SEEDS: Record<ModelId, number> = {
  sol: 11,
  terra: 29,
  luna: 47,
};

const vertexShaderSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform float uTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform vec3 uAccentColor;
uniform float uSeed;

varying vec2 vUv;

#define PI 3.14159265359
#define TAU 6.28318530718

float sat(float value) {
  return clamp(value, 0.0, 1.0);
}

float hash(vec2 point) {
  return fract(sin(dot(point + uSeed, vec2(127.1, 311.7))) * 43758.5453123);
}

float bell(float value, float center, float width) {
  float d = (value - center) / max(width, 0.0001);
  return exp(-d * d);
}

mat2 rot(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

vec3 tonemap(vec3 color) {
  return color / (1.0 + color);
}

float tunnelStars(vec2 point, float radius, float angle, float travel) {
  float angle01 = (angle + PI) / TAU;
  float sector = floor(angle01 * 96.0);
  float lane = abs(fract(angle01 * 96.0) - 0.5);
  float line = smoothstep(0.026, 0.0, lane);
  float dash = smoothstep(0.66, 1.0, hash(vec2(floor(1.0 / max(radius, 0.035) * 22.0 - travel * 88.0), sector)));
  float depth = smoothstep(0.06, 0.58, radius) * (1.0 - smoothstep(0.72, 1.06, radius));
  float pull = smoothstep(0.10, 0.70, travel);
  return line * dash * depth * pull;
}

void main() {
  vec2 point = vUv - 0.5;
  point.x *= uResolution.x / max(uResolution.y, 1.0);

  float radius = length(point);
  float angle = atan(point.y, point.x);
  float portrait = smoothstep(1.12, 1.90, uResolution.y / max(uResolution.x, 1.0));
  float portraitScale = mix(1.0, 0.66, portrait);
  float entry = smoothstep(0.04, 0.20, uProgress);
  float pull = smoothstep(0.18, 0.58, uProgress);
  float blackout = smoothstep(0.54, 0.62, uProgress) * (1.0 - smoothstep(0.68, 0.76, uProgress));
  float reveal = smoothstep(0.70, 1.0, uProgress);
  float fadeOut = 1.0 - smoothstep(0.86, 1.0, uProgress);

  vec2 swirl = rot(pull * 1.8 - reveal * 0.9) * point;
  float warpedRadius = length(swirl + normalize(point + 0.0001) * (0.018 * pull / max(radius, 0.05)));
  float horizonRadius = mix(0.035, 0.42, pull);
  horizonRadius = mix(horizonRadius, 0.06, reveal);
  horizonRadius *= portraitScale;
  float shadow = 1.0 - smoothstep(horizonRadius * 0.82, horizonRadius + 0.030, warpedRadius);
  float gravityWell = smoothstep(0.84, 0.12, radius) * entry * (1.0 - smoothstep(0.92, 1.0, uProgress));

  vec2 diskPoint = vec2(point.x, point.y * mix(3.25, 2.35, pull));
  diskPoint = rot(0.18 * sin(uTime * 0.7 + uSeed)) * diskPoint;
  float diskRadius = length(diskPoint);
  float diskTarget = mix(0.30, 0.56, pull);
  diskTarget = mix(diskTarget, 0.24, reveal);
  diskTarget *= mix(1.0, 0.72, portrait);
  float diskWidth = mix(0.075, 0.036, pull);
  float disk = bell(diskRadius, diskTarget, diskWidth);
  disk += bell(diskRadius, diskTarget * 0.76, diskWidth * 0.46) * 0.32;
  float hotSide = 0.58 + 0.42 * cos(angle - 0.7 + pull * 1.1);
  float diskBreakup = 0.78 + 0.22 * sin(angle * 9.0 + uTime * 2.1 + uSeed);
  disk *= hotSide * diskBreakup * entry * fadeOut;

  float photonRadius = horizonRadius + mix(0.034, 0.055, pull);
  float photonRing = bell(warpedRadius, photonRadius + sin(angle * 2.0 + uTime) * 0.004, 0.010);
  photonRing *= entry * fadeOut;

  float starTravel = uProgress + uTime * 0.035;
  float streaks = tunnelStars(swirl, radius, angle + pull * 0.65, starTravel);
  float rayLane = pow(abs(sin(angle * 31.0 + uSeed + pull * 3.2)), 18.0);
  float rayDash = smoothstep(0.40, 0.0, abs(fract(radius * 12.0 - uProgress * 8.0) - 0.5));
  streaks += rayLane * rayDash * smoothstep(0.12, 0.60, radius) * 0.42;
  streaks *= smoothstep(0.16, 0.52, uProgress) * (1.0 - smoothstep(0.72, 0.92, uProgress));

  vec3 warmCore = mix(vec3(1.0, 0.42, 0.10), uAccentColor, 0.55);
  vec3 coldEdge = mix(vec3(0.45, 0.68, 1.0), uAccentColor, 0.38);
  vec3 color = vec3(0.0);
  color += warmCore * disk * 3.2;
  color += mix(vec3(1.0), uAccentColor, 0.72) * photonRing * 4.8;
  color += coldEdge * streaks * (1.3 + pull * 2.2);
  color += uAccentColor * bell(radius, 0.72 - pull * 0.24, 0.18) * entry * 0.16;
  color = mix(color, vec3(0.0), sat(gravityWell * 0.62 + shadow * 0.98 + blackout));
  color = tonemap(color);

  float alpha = entry * fadeOut * sat(0.28 + gravityWell * 0.46 + disk * 0.72 + photonRing * 0.92 + streaks * 0.58 + shadow);
  alpha = max(alpha, blackout);
  alpha = sat(alpha);

  gl_FragColor = vec4(color, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Unable to create black-hole shader.");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Unable to create black-hole shader program.");
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGLRenderingContext, profile: RenderingProfile): void {
  const maxDpr = canvasDpr(profile)[1];
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  gl.viewport(0, 0, width, height);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

export default function BlackHoleTransition({ modelId, profile, onMidpoint, onComplete }: BlackHoleTransitionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const midpointRef = useRef(onMidpoint);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    midpointRef.current = onMidpoint;
  }, [onMidpoint]);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false }) ?? null;
    if (!canvas || !gl) {
      midpointRef.current();
      completeRef.current();
      return;
    }

    let animationFrame = 0;
    let midpointTimeout = 0;
    let completeTimeout = 0;
    let startedAt = 0;
    let midpointSent = false;
    let completeSent = false;
    const bodyShader = getBodyShader(modelId);
    let program: WebGLProgram;
    let positions: WebGLBuffer;
    try {
      program = createProgram(gl);
      const vertexBuffer = gl.createBuffer();
      if (!vertexBuffer) {
        gl.deleteProgram(program);
        throw new Error("Unable to create black-hole vertex buffer.");
      }
      positions = vertexBuffer;
    } catch (error) {
      console.error(error);
      midpointRef.current();
      completeRef.current();
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positions);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms: ShaderUniforms = {
      time: gl.getUniformLocation(program, "uTime"),
      progress: gl.getUniformLocation(program, "uProgress"),
      resolution: gl.getUniformLocation(program, "uResolution"),
      accentColor: gl.getUniformLocation(program, "uAccentColor"),
      seed: gl.getUniformLocation(program, "uSeed"),
    };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    const sendMidpoint = () => {
      if (!midpointSent) {
        midpointSent = true;
        midpointRef.current();
      }
    };
    const sendComplete = () => {
      if (!completeSent) {
        completeSent = true;
        completeRef.current();
      }
    };
    const handleResize = () => resizeCanvas(canvas, gl, profile);
    const draw = (timestamp: number) => {
      if (startedAt === 0) {
        startedAt = timestamp;
      }
      const progress = Math.min((timestamp - startedAt) / BLACK_HOLE_DURATION_MS, 1);
      root?.style.setProperty("--transition-shield-opacity", (1 - smoothstep(0.72, 0.98, progress)).toFixed(3));
      resizeCanvas(canvas, gl, profile);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform1f(uniforms.time, timestamp / 1000);
      gl.uniform1f(uniforms.progress, progress);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform3f(uniforms.accentColor, bodyShader.accentColor.x, bodyShader.accentColor.y, bodyShader.accentColor.z);
      gl.uniform1f(uniforms.seed, MODEL_SEEDS[modelId]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (progress >= BLACK_HOLE_MIDPOINT) {
        sendMidpoint();
      }

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(draw);
        return;
      }

      sendComplete();
    };

    midpointTimeout = window.setTimeout(sendMidpoint, BLACK_HOLE_DURATION_MS * BLACK_HOLE_MIDPOINT);
    completeTimeout = window.setTimeout(sendComplete, BLACK_HOLE_DURATION_MS + 120);
    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(midpointTimeout);
      window.clearTimeout(completeTimeout);
      window.removeEventListener("resize", handleResize);
      gl.deleteBuffer(positions);
      gl.deleteProgram(program);
    };
  }, [modelId, profile]);

  return (
    <div className="black-hole-transition" data-model={modelId} ref={rootRef} aria-hidden="true">
      <canvas className="black-hole-transition-canvas" ref={canvasRef} />
    </div>
  );
}
