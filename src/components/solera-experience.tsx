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
  const [scenePanelExpanded, setScenePanelExpanded] = useState(false);
  const [profile, setProfile] = useState<RenderingProfile>(() =>
    resolveRenderingProfile({ width: 1280, devicePixelRatio: 1, supportsWebGL: false, prefersReducedMotion: true, sceneVisible: true }),
  );
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(DEFAULT_DEBUG_SETTINGS);
  const buttonRefs = useRef(new Map<ModelId, HTMLButtonElement>());
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
    setScenePanelExpanded(false);
    setState(closeScene());
    if (window.location.hash) {
      window.history.replaceState({ selectedModelId: null }, "", window.location.pathname);
    }
    restoreOriginFocus();
  }, [restoreOriginFocus]);

  const openSelectedScene = useCallback((modelId: ModelId) => {
    originModelRef.current = modelId;
    setScenePanelExpanded(false);
    setState(openScene(modelId));
    window.history.pushState({ selectedModelId: modelId }, "", `#${modelId}`);
  }, []);

  const syncSceneFromLocation = useCallback(
    (shouldRestoreFocus: boolean) => {
      const hashModelId = modelIdFromLocationHash();
      if (hashModelId) {
        originModelRef.current = hashModelId;
        setScenePanelExpanded(false);
        setState(openScene(hashModelId));
        return;
      }
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
    const handlePopState = () => {
      syncSceneFromLocation(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
        <div className="model-grid" aria-label="Systema Solera model catalog">
          {models.map((model) => (
            <button
              className="model-card"
              data-model={model.id}
              key={model.id}
              ref={(node) => {
                if (node) {
                  buttonRefs.current.set(model.id, node);
                } else {
                  buttonRefs.current.delete(model.id);
                }
              }}
              type="button"
              onClick={() => openSelectedScene(model.id)}
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
            </button>
          ))}
        </div>
        <p className="home-disclaimer">Systema Solera is not affiliated with OpenAI.</p>
      </section>
      {selectedModel && selectedMetric ? (
        <section className="scene-view" data-model={selectedModel.id} aria-label={`${selectedModel.name} immersive scene`}>
          <button className="scene-back" ref={backButtonRef} type="button" onClick={closeSelectedScene}>
            Return to model grid
          </button>
          {profile.mode !== "css" ? (
            <ImmersiveCanvas debugSettings={debugSettings} modelId={selectedModel.id} profile={profile} />
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
      <DebugControls settings={debugSettings} onReset={() => setDebugSettings(DEFAULT_DEBUG_SETTINGS)} onSettingsChange={updateDebugSetting} />
      <span className="sr-only" aria-live="polite">{selectedModel ? `${selectedModel.name} scene open` : "Model grid visible"}</span>
    </main>
  );
}
