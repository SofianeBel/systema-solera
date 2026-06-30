"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatDiameter,
  formatDistance,
  formatScaleMode,
  formatSurfaceMetric,
  getCelestialMetric,
  getDistantMetrics,
} from "@/lib/celestial-metrics";
import { DEFAULT_DEBUG_SETTINGS, type DebugSettings } from "@/lib/debug-settings";
import type { ModelId, ModelProfile } from "@/lib/models";
import { getModelById, MODEL_IDS } from "@/lib/models";
import { closeScene, openScene, selectedModelId, type SceneState } from "@/lib/scene-state";
import { resolveRenderingProfile, type RenderingProfile } from "@/lib/rendering-profile";
import { DebugControls } from "./debug-controls";
import { SoleraLivePanel } from "./solera-live-panel";

const CelestialPreview = dynamic(() => import("./webgl/celestial-preview"), {
  ssr: false,
  loading: () => null,
});

const ImmersiveCanvas = dynamic(() => import("./webgl/immersive-canvas"), {
  ssr: false,
  loading: () => <div className="orb-fallback" aria-hidden="true" />,
});

type SoleraExperienceProps = Readonly<{
  models: readonly ModelProfile[];
}>;

function modelIdFromLocationHash(): ModelId | null {
  const candidateId = window.location.hash.slice(1);
  return MODEL_IDS.find((modelId) => modelId === candidateId) ?? null;
}

export function SoleraExperience({ models }: SoleraExperienceProps) {
  const [state, setState] = useState<SceneState>({ status: "grid" });
  const [cameraAutoRotatePaused, setCameraAutoRotatePaused] = useState(false);
  const [scenePanelExpanded, setScenePanelExpanded] = useState(false);
  const [profile, setProfile] = useState<RenderingProfile>(() =>
    resolveRenderingProfile({ width: 1280, devicePixelRatio: 1, supportsWebGL: false, prefersReducedMotion: true, sceneVisible: true }),
  );
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(DEFAULT_DEBUG_SETTINGS);
  const buttonRefs = useRef(new Map<ModelId, HTMLAnchorElement>());
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const originModelRef = useRef<ModelId | null>(null);
  const currentModelId = selectedModelId(state);

  const updateDebugSetting = useCallback(<Key extends keyof DebugSettings>(key: Key, value: DebugSettings[Key]) => {
    setDebugSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const restoreOriginFocus = useCallback(() => {
    const originModelId = originModelRef.current;
    if (originModelId) {
      window.requestAnimationFrame(() => buttonRefs.current.get(originModelId)?.focus());
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateProfile = () => {
      const canvas = document.createElement("canvas");
      const supportsWebGL = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
      setProfile(
        resolveRenderingProfile({
          width: window.innerWidth,
          devicePixelRatio: window.devicePixelRatio,
          supportsWebGL,
          prefersReducedMotion: media.matches,
          sceneVisible: document.visibilityState === "visible",
        }),
      );
    };
    updateProfile();
    window.addEventListener("resize", updateProfile);
    document.addEventListener("visibilitychange", updateProfile);
    media.addEventListener("change", updateProfile);
    return () => {
      window.removeEventListener("resize", updateProfile);
      document.removeEventListener("visibilitychange", updateProfile);
      media.removeEventListener("change", updateProfile);
    };
  }, []);

  const closeSelectedScene = useCallback(() => {
    setCameraAutoRotatePaused(false);
    setScenePanelExpanded(false);
    setState(closeScene());
    if (window.location.hash) {
      window.history.replaceState({ selectedModelId: null }, "", window.location.pathname);
    }
    restoreOriginFocus();
  }, [restoreOriginFocus]);

  const openSelectedScene = useCallback((modelId: ModelId) => {
    originModelRef.current = modelId;
    setCameraAutoRotatePaused(false);
    setScenePanelExpanded(false);
    setState(openScene(modelId));
    window.history.pushState({ selectedModelId: modelId }, "", `#${modelId}`);
  }, []);

  const syncSceneFromLocation = useCallback(
    (shouldRestoreFocus: boolean) => {
      const hashModelId = modelIdFromLocationHash();
      if (hashModelId) {
        originModelRef.current = hashModelId;
        setCameraAutoRotatePaused(false);
        setScenePanelExpanded(false);
        setState(openScene(hashModelId));
        return;
      }
      setCameraAutoRotatePaused(false);
      setScenePanelExpanded(false);
      setState(closeScene());
      if (shouldRestoreFocus) {
        restoreOriginFocus();
      }
    },
    [restoreOriginFocus],
  );

  useEffect(() => {
    if (currentModelId) {
      window.requestAnimationFrame(() => backButtonRef.current?.focus());
    }
  }, [currentModelId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && currentModelId) {
        closeSelectedScene();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSelectedScene, currentModelId]);

  useEffect(() => {
    syncSceneFromLocation(false);
    const handleLocationChange = () => {
      syncSceneFromLocation(true);
    };
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, [syncSceneFromLocation]);

  const selectedModel = useMemo(() => (currentModelId ? getModelById(currentModelId) : null), [currentModelId]);
  const selectedMetric = useMemo(() => (currentModelId ? getCelestialMetric(currentModelId) : null), [currentModelId]);
  const distantMetrics = useMemo(() => (currentModelId ? getDistantMetrics(currentModelId) : []), [currentModelId]);

  return (
    <main className="solera-shell">
      <section className="landing-view" aria-hidden={Boolean(selectedModel)} inert={selectedModel ? true : undefined}>
        <header className="site-header">
          <h1 className="brand-lockup">Systema Solera</h1>
          <p className="header-dek">A model system with gravity.</p>
          <div className="system-label">Sol / Terra / Luna</div>
        </header>
        <a className="github-link" href="https://github.com/SofianeBel" target="_blank" rel="noopener noreferrer" aria-label="Open SofianeBel on GitHub">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 .5C5.65.5.5 5.78.5 12.29c0 5.2 3.29 9.61 7.86 11.17.57.11.78-.26.78-.57 0-.28-.01-1.02-.02-2-3.2.71-3.87-1.58-3.87-1.58-.52-1.36-1.28-1.72-1.28-1.72-1.05-.73.08-.72.08-.72 1.15.08 1.76 1.22 1.76 1.22 1.03 1.8 2.7 1.28 3.35.98.1-.76.4-1.28.73-1.57-2.55-.3-5.23-1.31-5.23-5.82 0-1.29.45-2.34 1.18-3.16-.12-.3-.51-1.5.11-3.12 0 0 .97-.32 3.16 1.21.92-.26 1.9-.39 2.88-.39.98.01 1.96.14 2.88.39 2.2-1.53 3.16-1.21 3.16-1.21.62 1.62.23 2.82.11 3.12.73.82 1.18 1.87 1.18 3.16 0 4.52-2.69 5.52-5.25 5.81.41.37.78 1.09.78 2.2 0 1.59-.01 2.87-.01 3.26 0 .32.2.69.79.57 4.56-1.56 7.85-5.97 7.85-11.17C23.5 5.78 18.35.5 12 .5Z" />
          </svg>
        </a>
        <div className="model-grid" aria-label="Systema Solera model catalog">
          {models.map((model) => (
            <a
              className="model-card"
              data-model={model.id}
              href={`#${model.id}`}
              key={model.id}
              ref={(node) => {
                if (node) {
                  buttonRefs.current.set(model.id, node);
                } else {
                  buttonRefs.current.delete(model.id);
                }
              }}
              role="button"
              onClick={(event) => {
                event.preventDefault();
                openSelectedScene(model.id);
              }}
              aria-label={`Enter ${model.name} immersive scene`}
            >
              <div className="preview-layer" aria-hidden="true">
                {!selectedModel && profile.mode !== "css" ? (
                  <CelestialPreview debugSettings={debugSettings} modelId={model.id} profile={profile} />
                ) : (
                  <div className="orb-fallback" />
                )}
              </div>
              <div className="card-wash" aria-hidden="true" />
              <div className="card-content">
                <h2>{model.name}</h2>
                <p className="model-role">{model.role}</p>
                <div className="price-grid" aria-label={`${model.name} price cells`}>
                  {model.prices.map((price) => (
                    <span className="price-cell" key={price.label}>
                      <span className="price-label">{price.label}</span>
                      <span className="price-value">{price.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
        <p className="home-disclaimer">Systema Solera is not affiliated with OpenAI.</p>
      </section>
      {selectedModel && selectedMetric ? (
        <section className="scene-view" data-model={selectedModel.id} aria-label={`${selectedModel.name} immersive scene`}>
          <div className="scene-controls">
            <button className="scene-back" ref={backButtonRef} type="button" onClick={closeSelectedScene}>
              Return to model grid
            </button>
            <button
              aria-label={cameraAutoRotatePaused ? "Resume camera orbit" : "Pause camera orbit"}
              aria-pressed={cameraAutoRotatePaused}
              className="camera-rotation-toggle"
              title={cameraAutoRotatePaused ? "Resume camera orbit" : "Pause camera orbit"}
              type="button"
              onClick={() => setCameraAutoRotatePaused((paused) => !paused)}
            >
              {cameraAutoRotatePaused ? (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M8 5.6v12.8l10-6.4-10-6.4Z" />
                </svg>
              ) : (
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M7 5h3.6v14H7V5Zm6.4 0H17v14h-3.6V5Z" />
                </svg>
              )}
            </button>
          </div>
          {profile.mode !== "css" ? (
            <ImmersiveCanvas cameraAutoRotatePaused={cameraAutoRotatePaused} debugSettings={debugSettings} modelId={selectedModel.id} profile={profile} />
          ) : (
            <div className="orb-fallback" aria-hidden="true" />
          )}
          <div className="scene-copy" data-expanded={scenePanelExpanded}>
            <button
              aria-expanded={scenePanelExpanded}
              aria-label={`${scenePanelExpanded ? "Collapse" : "Expand"} ${selectedModel.name} scene details, ${selectedModel.prices[0].label} ${selectedModel.prices[0].value}`}
              className="scene-card-summary"
              type="button"
              onClick={() => setScenePanelExpanded((expanded) => !expanded)}
            >
              <span className="card-orbit-label">{selectedModel.orbitLabel}</span>
              <strong className="scene-card-name">{selectedModel.name}</strong>
              <span className="scene-card-price">
                <span>{selectedModel.prices[0].label}</span>
                <strong>{selectedModel.prices[0].value}</strong>
              </span>
            </button>
            {scenePanelExpanded ? (
              <>
                <h2>{selectedModel.name}</h2>
                <p className="model-summary">{selectedModel.summary}</p>
                <div className="scene-navigation" role="group" aria-label="Scene navigation controls">
                  <span>{formatScaleMode()}</span>
                  <span>Drag to orbit</span>
                  <span>Scroll to zoom</span>
                  <span>Esc to return</span>
                </div>
                <div className="metric-grid" aria-label={`${selectedModel.name} real metrics`}>
                  <span>{formatDiameter(selectedMetric)}</span>
                  <span>{formatSurfaceMetric(selectedMetric)}</span>
                  <span>
                    {selectedModel.id === "sol" ? "Reference star" : `${formatDistance("sol", selectedModel.id).replace(" away", "")} from Sol`}
                  </span>
                </div>
                <div className="scene-stats" aria-label={`${selectedModel.name} astronomical stats`}>
                  {selectedModel.sceneStats.map((stat) => (
                    <span className="scene-stat" key={stat.label}>
                      <strong>{stat.label}</strong>
                      <span>{stat.value}</span>
                    </span>
                  ))}
                </div>
                <div className="scene-warnings" aria-label={`${selectedModel.name} orbital warnings`}>
                  {selectedModel.warnings.map((warning) => (
                    <span className="scene-warning" key={warning}>
                      {warning}
                    </span>
                  ))}
                </div>
                <div className="distant-astres" aria-label="Distant astres">
                  <span>Distant astres</span>
                  {distantMetrics.map((metric) => (
                    <span className="distant-astre-card" key={metric.id}>
                      {metric.name} {formatDistance(selectedModel.id, metric.id)}
                      <small>{formatSurfaceMetric(metric)}</small>
                    </span>
                  ))}
                </div>
                <div className="price-grid" aria-label={`${selectedModel.name} immersive price cells`}>
                  {selectedModel.prices.map((price) => (
                    <span className="price-cell" key={price.label}>
                      <span className="price-label">{price.label}</span>
                      <span className="price-value">{price.value}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
      <SoleraLivePanel selectedModelId={currentModelId ?? "sol"} />
      <DebugControls settings={debugSettings} onReset={() => setDebugSettings(DEFAULT_DEBUG_SETTINGS)} onSettingsChange={updateDebugSetting} />
      <span className="sr-only" aria-live="polite">{selectedModel ? `${selectedModel.name} scene open` : "Model grid visible"}</span>
    </main>
  );
}
