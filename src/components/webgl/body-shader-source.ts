export const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform vec3 uGlowColor;
uniform float uNoiseScale;
uniform float uRimPower;
uniform float uMode;
uniform float uTextureInfluence;
uniform float uHasCloudMap;
uniform float uHasNightMap;
uniform float uLightIntensity;
uniform sampler2D uColorMap;
uniform sampler2D uCloudMap;
uniform sampler2D uNightMap;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y), mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  return n;
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 5; octave += 1) {
    value += noise(p) * amplitude;
    p = p * 2.03 + vec3(7.1, 13.7, 3.4);
    amplitude *= 0.5;
  }
  return value;
}

float ridge(float value) {
  float centered = abs(value * 2.0 - 1.0);
  return 1.0 - centered;
}

float magneticSpot(vec3 normal, vec3 center, float radius, float feather) {
  float distanceToCenter = length(normalize(normal) - normalize(center));
  return 1.0 - smoothstep(radius, radius + feather, distanceToCenter);
}

float uvMagneticSpot(vec2 uv, vec2 center, vec2 radius) {
  vec2 delta = (uv - center) / radius;
  return 1.0 - smoothstep(0.28, 1.0, dot(delta, delta));
}

vec3 solSurface(vec3 normal, float day, float rim) {
  vec3 flow = normal * uNoiseScale + vec3(uTime * 0.16, uTime * 0.05, -uTime * 0.11);
  vec3 shearFlow = normal * (uNoiseScale * 1.74) + vec3(-uTime * 0.11, uTime * 0.18, uTime * 0.07);
  float convection = fbm(flow * 2.35);
  float granuleSeed = fbm(flow * 10.8 + convection * 2.4);
  float granuleCenters = smoothstep(0.46, 0.86, granuleSeed);
  float granuleEdges = pow(ridge(granuleSeed), 2.7);
  float braidedCells = ridge(fbm(shearFlow * 6.6 + vec3(convection * 1.8, -uTime * 0.3, granuleSeed)));
  float filaments = pow(ridge(fbm(shearFlow * 14.0 + vec3(braidedCells * 2.1, -uTime * 0.24, convection))), 6.0);
  float magneticBands = sin((vUv.y + convection * 0.13 + uTime * 0.032) * 62.0) * 0.5 + 0.5;
  float spotField = fbm(normal * 1.18 + vec3(-uTime * 0.012, 1.7, uTime * 0.018));
  float spotCluster = fbm(normal * 2.65 + vec3(1.2, -uTime * 0.035, 3.6));
  float penumbra = smoothstep(0.58, 0.76, spotField) * smoothstep(0.42, 0.82, spotCluster) * smoothstep(0.08, 0.72, day) * 0.28;
  float umbra = smoothstep(0.7, 0.9, spotField) * smoothstep(0.6, 0.88, spotCluster) * penumbra * 0.24;
  float anchoredSpots = max(max(magneticSpot(normal, vec3(-0.36, 0.18, 0.92), 0.17, 0.11), magneticSpot(normal, vec3(0.22, -0.28, 0.94), 0.14, 0.09)), max(magneticSpot(normal, vec3(-0.16, 0.62, 0.76), 0.19, 0.12), magneticSpot(normal, vec3(0.32, 0.38, 0.86), 0.15, 0.1)));
  float visibleSpots = max(
    max(uvMagneticSpot(vUv, vec2(0.18, 0.61), vec2(0.088, 0.052)), uvMagneticSpot(vUv, vec2(0.33, 0.42), vec2(0.064, 0.042))),
    max(
      max(uvMagneticSpot(vUv, vec2(0.56, 0.72), vec2(0.092, 0.054)), uvMagneticSpot(vUv, vec2(0.73, 0.47), vec2(0.076, 0.046))),
      max(uvMagneticSpot(vUv, vec2(0.46, 0.33), vec2(0.052, 0.034)), uvMagneticSpot(vUv, vec2(0.64, 0.57), vec2(0.048, 0.032)))
    )
  );
  float limbSpots = smoothstep(0.18, 0.68, rim) * max(1.0 - smoothstep(0.0, 0.085, abs(vUv.y - 0.61)), 1.0 - smoothstep(0.0, 0.07, abs(vUv.y - 0.38)));
  float magneticActivity = max(max(anchoredSpots, visibleSpots), limbSpots * 0.92) * smoothstep(0.08, 0.72, day);
  penumbra = max(penumbra, magneticActivity);
  umbra = max(umbra, pow(magneticActivity, 2.45));
  vec3 coolPlasma = vec3(0.84, 0.17, 0.026);
  vec3 hotPlasma = vec3(1.0, 0.5, 0.085);
  vec3 whiteHot = vec3(1.0, 0.82, 0.28);
  float centerHeat = smoothstep(0.18, 0.95, day) * pow(1.0 - smoothstep(0.02, 0.72, rim), 2.0);
  float limbShade = mix(1.12, 0.48, smoothstep(0.08, 1.0, rim));
  float chromosphereRing = smoothstep(0.62, 1.0, rim);
  vec3 plasma = mix(coolPlasma, hotPlasma, smoothstep(0.12, 0.96, convection + magneticBands * 0.22));
  plasma = mix(plasma, whiteHot, granuleCenters * 0.16 + centerHeat * 0.28);
  plasma = mix(plasma, vec3(0.72, 0.1, 0.018), chromosphereRing * 0.38);
  plasma *= 1.0 - granuleEdges * 0.29;
  plasma = mix(plasma, plasma * vec3(0.2, 0.05, 0.014), penumbra * 0.88);
  plasma = mix(plasma, vec3(0.035, 0.011, 0.004), umbra * 0.96);
  plasma += vec3(1.0, 0.18, 0.035) * chromosphereRing * 0.58;
  plasma += uGlowColor * (pow(rim, 1.8) * 0.62 + braidedCells * 0.12);
  plasma += vec3(1.0, 0.48, 0.12) * (pow(braidedCells, 5.0) * 0.62 + filaments * 1.45);
  plasma *= limbShade;
  return plasma * (0.62 + day * 0.48);
}

vec3 terraSurface(vec3 normal, float day, float night, float rim) {
  vec3 dayTexture = texture2D(uColorMap, vUv).rgb;
  vec2 cloudUv = vec2(fract(vUv.x + uTime * 0.0028), vUv.y);
  vec3 cloudTexture = texture2D(uCloudMap, cloudUv).rgb;
  vec3 nightTexture = texture2D(uNightMap, vUv).rgb;
  vec3 terrainPoint = normal * uNoiseScale + vec3(0.0, uTime * 0.012, 0.0);
  float continents = fbm(terrainPoint * 0.9 + vec3(4.0, 0.0, 1.0));
  float coastal = smoothstep(0.46, 0.57, continents);
  float mountains = ridge(fbm(terrainPoint * 4.2)) * coastal;
  vec3 ocean = mix(uBaseColor * 0.52, uBaseColor, smoothstep(-0.45, 0.82, normal.y));
  vec3 land = mix(vec3(0.15, 0.27, 0.16), uAccentColor, mountains * 0.55 + coastal * 0.2);
  vec3 surface = mix(ocean, land, coastal);
  float cloudBands = fbm(normal * 7.4 + vec3(uTime * 0.018, 2.0, -uTime * 0.026));
  float proceduralClouds = smoothstep(0.58, 0.78, cloudBands + sin(vUv.y * 38.0) * 0.035);
  float textureClouds = smoothstep(0.42, 0.74, max(max(cloudTexture.r, cloudTexture.g), cloudTexture.b));
  float clouds = mix(proceduralClouds, textureClouds, uHasCloudMap * uTextureInfluence);
  float seaMask = 1.0 - smoothstep(0.2, 0.5, dayTexture.g + dayTexture.r * 0.45);
  float glint = pow(max(dot(reflect(-normalize(vec3(-0.42, 0.28, 0.86)), normal), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * seaMask * day;
  surface = mix(surface, dayTexture, uTextureInfluence * 0.94);
  surface = mix(surface, vec3(0.92, 0.95, 0.96), clouds * (0.28 + day * 0.42));
  surface += nightTexture * night * uHasNightMap * uTextureInfluence * 1.55;
  surface += vec3(0.64, 0.82, 1.0) * glint * 0.42;
  surface += uGlowColor * rim * 1.75;
  return surface * (0.2 + day * 0.94);
}

vec3 lunaSurface(vec3 normal, float day, float rim) {
  vec3 textureColor = texture2D(uColorMap, vUv).rgb;
  vec3 craterPoint = normal * uNoiseScale;
  float basin = ridge(fbm(craterPoint * 1.7));
  float smallCraters = ridge(fbm(craterPoint * 9.5 + vec3(2.0, 6.0, 1.0)));
  float dust = fbm(craterPoint * 5.0);
  float craterShadow = smoothstep(0.38, 0.9, basin * smallCraters);
  vec3 regolith = mix(uBaseColor * 0.62, uAccentColor, dust * 0.48 + craterShadow * 0.18);
  regolith = mix(regolith, textureColor * (0.86 + craterShadow * 0.16), uTextureInfluence * 0.9);
  regolith += vec3(0.05, 0.055, 0.07) * ridge(fbm(craterPoint * 16.0)) * 0.28;
  regolith += uGlowColor * rim * 0.9;
  return regolith * (0.14 + day * 0.9);
}

void main() {
  vec3 normal = normalize(vPosition);
  vec3 lightDirection = normalize(vec3(-0.42, 0.28, 0.86));
  float light = dot(normal, lightDirection);
  float day = smoothstep(-0.18, 0.78, light);
  float night = 1.0 - smoothstep(-0.34, 0.18, light);
  float rim = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), uRimPower);
  vec3 color;
  if (uMode < 0.5) {
    color = solSurface(normal, day, rim);
  } else if (uMode < 1.5) {
    color = terraSurface(normal, day, night, rim);
  } else {
    color = lunaSurface(normal, day, rim);
  }
  float debugLight = clamp(uLightIntensity, 0.05, 3.2);
  float debugExposure = debugLight * debugLight * debugLight;
  color *= debugExposure;
  color += uGlowColor * rim * max(debugLight - 1.0, 0.0) * 2.0;
  color = mix(color, vec3(1.0), clamp((debugLight - 1.0) * 0.48, 0.0, 0.72));
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
