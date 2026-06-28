"use client";

import { useState, type ChangeEvent } from "react";
import type { DebugSettings } from "@/lib/debug-settings";

type DebugSettingKey = keyof DebugSettings;

type DebugControlsProps = Readonly<{
  settings: DebugSettings;
  onSettingsChange: <Key extends DebugSettingKey>(key: Key, value: DebugSettings[Key]) => void;
  onReset: () => void;
}>;

type DebugRangeProps = Readonly<{
  id: string;
  label: string;
  max: number;
  min: number;
  step: number;
  unit: string;
  value: number;
  onInput: (value: number) => void;
}>;

function formatDebugValue(value: number, unit: string): string {
  return `${value.toFixed(2).replace(/\.?0+$/, "")}${unit}`;
}

function DebugRange({ id, label, max, min, onInput, step, unit, value }: DebugRangeProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onInput(event.currentTarget.valueAsNumber);
  };

  return (
    <label className="debug-range" htmlFor={id}>
      <span className="debug-range-label">{label}</span>
      <input id={id} max={max} min={min} step={step} type="range" value={value} onChange={handleChange} />
      <output htmlFor={id}>{formatDebugValue(value, unit)}</output>
    </label>
  );
}

export function DebugControls({ onReset, onSettingsChange, settings }: DebugControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="debug-controls">
      <button
        aria-expanded={open}
        aria-label={open ? "Close debug controls" : "Open debug controls"}
        className="debug-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        Debug
      </button>
      {open ? (
        <div className="debug-panel" role="group" aria-label="Debug scene parameters">
          <div className="debug-panel-header">
            <span>Scene Debug</span>
            <button type="button" onClick={onReset} aria-label="Reset debug controls">
              Reset
            </button>
          </div>
          <DebugRange
            id="debug-motion-scale"
            label="Global motion"
            max={4}
            min={0}
            step={0.05}
            unit="x"
            value={settings.motionScale}
            onInput={(value) => onSettingsChange("motionScale", value)}
          />
          <DebugRange
            id="debug-camera-speed"
            label="Camera orbit"
            max={4}
            min={0}
            step={0.01}
            unit="x"
            value={settings.cameraAutoRotateSpeed}
            onInput={(value) => onSettingsChange("cameraAutoRotateSpeed", value)}
          />
          <DebugRange
            id="debug-orbit-speed"
            label="Orbit sweep"
            max={5}
            min={0}
            step={0.05}
            unit="x"
            value={settings.orbitSpeedScale}
            onInput={(value) => onSettingsChange("orbitSpeedScale", value)}
          />
          <DebugRange
            id="debug-orbit-opacity"
            label="Orbit opacity"
            max={2}
            min={0}
            step={0.05}
            unit="x"
            value={settings.orbitOpacityScale}
            onInput={(value) => onSettingsChange("orbitOpacityScale", value)}
          />
          <DebugRange
            id="debug-starfield-speed"
            label="Starfield"
            max={5}
            min={0}
            step={0.05}
            unit="x"
            value={settings.starfieldSpeedScale}
            onInput={(value) => onSettingsChange("starfieldSpeedScale", value)}
          />
          <DebugRange
            id="debug-scene-scale"
            label="Scene scale"
            max={1.8}
            min={0.45}
            step={0.01}
            unit="x"
            value={settings.sceneScale}
            onInput={(value) => onSettingsChange("sceneScale", value)}
          />
          <DebugRange
            id="debug-light-intensity"
            label="Light intensity"
            max={2.4}
            min={0.2}
            step={0.05}
            unit="x"
            value={settings.lightIntensityScale}
            onInput={(value) => onSettingsChange("lightIntensityScale", value)}
          />
        </div>
      ) : null}
    </div>
  );
}
