export const atmosphereVertexShader = `
uniform float uTime;
uniform float uMode;
varying vec3 vNormal;
varying float vCoronaWarp;
void main() {
  vNormal = normalize(normalMatrix * normal);
  float solarMask = 1.0 - step(0.5, uMode);
  float coronaSpikes = max(sin(position.y * 17.0 + uTime * 0.84) * sin(position.x * 11.0 - uTime * 0.58), 0.0);
  float coronaLobes = max(sin((position.x + position.y) * 6.0 + uTime * 0.31), 0.0);
  float coronaWarp = solarMask * (0.002 + coronaSpikes * 0.014 + coronaLobes * 0.008);
  vCoronaWarp = coronaWarp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * coronaWarp, 1.0);
}
`;

export const atmosphereFragmentShader = `
uniform float uTime;
uniform vec3 uGlowColor;
uniform float uAtmospherePower;
uniform float uAtmosphereIntensity;
uniform float uMode;
uniform float uLightIntensity;
varying vec3 vNormal;
varying float vCoronaWarp;

float localizedProminence(vec2 normalXY, vec2 center, float radius, float feather) {
  return 1.0 - smoothstep(radius, radius + feather, length(normalXY - center));
}

void main() {
  vec3 normal = normalize(vNormal);
  float limb = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
  float rim = pow(limb, uAtmospherePower);
  float solarPulse = 0.88 + sin(uTime * 0.72 + vNormal.y * 9.0) * 0.12;
  float solarMask = 1.0 - step(0.5, uMode);
  float coronaJets = pow(max(sin(vNormal.y * 23.0 + uTime * 0.98) * sin(vNormal.x * 13.0 - uTime * 0.64), 0.0), 4.6) * solarMask;
  float spicules = pow(max(sin(vNormal.y * 68.0 + uTime * 1.5) * sin(vNormal.x * 29.0 - uTime * 0.92), 0.0), 6.0) * solarMask;
  float magneticLoops = pow(smoothstep(0.48, 0.98, sin(vNormal.x * 6.4 + uTime * 0.24) * sin((vNormal.y + 0.28) * 10.0 - uTime * 0.42)), 3.4) * solarMask;
  float irregularBloom = (vCoronaWarp * 2.8 + coronaJets * 0.26 + spicules * 0.11 + magneticLoops * 0.16) * solarMask;
  float prominenceArcs = (
    localizedProminence(normal.xy, vec2(0.56, 0.48), 0.16, 0.18) * 0.94 +
    localizedProminence(normal.xy, vec2(-0.58, -0.42), 0.13, 0.16) * 0.72 +
    localizedProminence(normal.xy, vec2(0.08, -0.72), 0.08, 0.2) * 0.48
  ) * smoothstep(0.42, 1.0, limb) * solarMask;
  float innerHalo = pow(limb, 4.8) * solarPulse * solarMask;
  float outerCorona = pow(limb, 1.38) * (0.22 + irregularBloom + coronaJets * 0.22 + magneticLoops * 0.18) * solarMask;
  float terraMask = step(0.5, uMode) * step(uMode, 1.5);
  float atmosphericBand = smoothstep(0.04, 0.78, vNormal.y) * 0.035 * terraMask;
  float debugLight = clamp(uLightIntensity, 0.05, 3.2);
  float debugExposure = debugLight * debugLight * debugLight;
  float solarAlpha = (innerHalo * 0.18 + outerCorona * 0.16 + prominenceArcs * 0.34) * uAtmosphereIntensity * debugExposure;
  float terraAlpha = (rim * uAtmosphereIntensity * solarPulse + atmosphericBand) * terraMask * debugExposure;
  vec3 terraColor = mix(uGlowColor, vec3(0.36, 0.67, 1.0), terraMask * 0.35) * (0.82 + rim * 1.55);
  vec3 solarColor = vec3(1.0, 0.78, 0.42) * (0.42 + outerCorona * 2.4 + coronaJets * 1.3);
  solarColor += vec3(1.0, 0.16, 0.035) * (innerHalo * 2.0 + spicules * 0.34 + prominenceArcs * 2.8);
  vec3 color = mix(terraColor, solarColor, solarMask);
  float alphaLimit = mix(0.74, 0.28, solarMask);
  gl_FragColor = vec4(color * debugExposure, clamp(solarAlpha + terraAlpha, 0.0, alphaLimit));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
