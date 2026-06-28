import { assertNever } from "./assert-never";

export const MODEL_IDS = ["sol", "terra", "luna"] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export type PriceCell = Readonly<{
  label: string;
  value: string;
}>;

export type SceneStat = Readonly<{
  label: string;
  value: string;
}>;

export type ModelProfile = Readonly<{
  id: ModelId;
  name: string;
  role: string;
  summary: string;
  orbitLabel: string;
  metrics: Readonly<{
    diameter: string;
    surfaceArea: string;
    distance: string;
    scale: string;
  }>;
  sceneStats: readonly SceneStat[];
  warnings: readonly string[];
  prices: readonly [PriceCell, PriceCell, PriceCell];
}>;

export const MODEL_CATALOG = [
  {
    id: "sol",
    name: "Sol",
    role: "Flagship model for ambitious agentic work",
    summary: "Highest-context synthesis for complex builds, research, and decisions that need gravitational authority.",
    orbitLabel: "Prime star",
    metrics: {
      diameter: "1,392,700 km",
      surfaceArea: "6.09 trillion km2",
      distance: "System center",
      scale: "109.2x Terra diameter",
    },
    sceneStats: [
      { label: "Luminosity", value: "High-energy reference" },
      { label: "Gravity", value: "System anchor" },
      { label: "Orbit role", value: "Central photosphere" },
      { label: "Activity", value: "Prominences and flares" },
      { label: "Temperature", value: "Plasma field" },
    ],
    warnings: ["Radiation zone", "High energy field", "Stable orbit required"],
    prices: [
      { label: "Input", value: "$5.00" },
      { label: "Cached Input", value: "$0.50" },
      { label: "Output", value: "$30.00" },
    ],
  },
  {
    id: "terra",
    name: "Terra",
    role: "Balanced model for efficient, everyday work",
    summary: "A grounded default for product teams that need steady reasoning, coding, and multimodal work at scale.",
    orbitLabel: "Habitable model",
    metrics: {
      diameter: "12,742 km",
      surfaceArea: "510.1 million km2",
      distance: "149.6M km from Sol",
      scale: "1x Terra diameter",
    },
    sceneStats: [
      { label: "Luminosity", value: "Day-side illumination" },
      { label: "Gravity", value: "Primary orbit body" },
      { label: "Orbit role", value: "Solar orbit" },
      { label: "Activity", value: "Clouds and night lights" },
      { label: "Temperature", value: "Habitable band" },
    ],
    warnings: ["Terminator visible", "Atmosphere active", "Cloud deck rotating"],
    prices: [
      { label: "Input", value: "$2.50" },
      { label: "Cached Input", value: "$0.25" },
      { label: "Output", value: "$15.00" },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    role: "Fast, affordable model for high-volume work",
    summary: "Low-latency throughput for routing, extraction, classification, and the repetitive work that keeps systems moving.",
    orbitLabel: "Rapid satellite",
    metrics: {
      diameter: "3,474.8 km",
      surfaceArea: "37.9 million km2",
      distance: "384,400 km from Terra",
      scale: "0.27x Terra diameter",
    },
    sceneStats: [
      { label: "Luminosity", value: "Reflected Sol light" },
      { label: "Gravity", value: "Satellite field" },
      { label: "Orbit role", value: "Terra satellite" },
      { label: "Activity", value: "Dry cratered regolith" },
      { label: "Temperature", value: "Airless surface" },
    ],
    warnings: ["Airless surface", "Low albedo", "Cratered terrain"],
    prices: [
      { label: "Input", value: "$1.00" },
      { label: "Cached Input", value: "$0.10" },
      { label: "Output", value: "$6.00" },
    ],
  },
] as const satisfies readonly ModelProfile[];

export function getModelById(modelId: ModelId): ModelProfile {
  switch (modelId) {
    case "sol":
      return MODEL_CATALOG[0];
    case "terra":
      return MODEL_CATALOG[1];
    case "luna":
      return MODEL_CATALOG[2];
    default:
      return assertNever(modelId);
  }
}
