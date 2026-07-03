"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

type SceneWarmupProps = Readonly<{
  cacheKey: string;
}>;

export function SceneWarmup({ cacheKey }: SceneWarmupProps) {
  const { camera, gl, invalidate, scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    const warmup = async (): Promise<void> => {
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        try {
          gl.compile(scene, camera);
        } catch {
          return;
        }
      }
      if (!cancelled) {
        invalidate();
      }
    };

    const timeoutId = window.setTimeout(() => {
      void warmup();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [cacheKey, camera, gl, invalidate, scene]);

  return null;
}
