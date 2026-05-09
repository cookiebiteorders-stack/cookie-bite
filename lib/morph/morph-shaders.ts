/**
 * Fullscreen morph pass — directional wave + fbm distortion + chroma tint.
 * uDirection: +1 = EN→AR (wave sweeps right → left), -1 = AR→EN (left → right).
 * uOrigin: نقطة البداية في مساحة vUv (0–1)، تُستخدم لانبثاق جبهة الموجة من نقرة المستخدم.
 */

export const morphVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const morphFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform float uProgress;
uniform float uDirection;
uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform vec2 uOrigin;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

vec4 sampleDistorted(sampler2D tex, vec2 uv, vec2 disp, float blurAmt) {
  vec2 off = disp * blurAmt;
  vec4 c = texture2D(tex, uv + off);
  c += 0.35 * texture2D(tex, uv + off * 1.7 + vec2(0.0015, -0.001));
  c += 0.25 * texture2D(tex, uv - off * 1.2 + vec2(-0.0012, 0.0011));
  return c / 1.6;
}

void main() {
  vec2 uv = vUv;
  float z = mix(1.0, uZoom, sin(3.14159265 * uProgress));
  uv = (uv - 0.5) / z + 0.5;

  float n = fbm(uv * 9.0 + uTime * 0.12);
  float n2 = fbm(uv * 14.0 - uTime * 0.08);
  float ripple = sin(uv.x * 38.0 + uTime * 2.4) * 0.0022 + sin(uv.y * 28.0 - uTime * 1.9) * 0.0016;

  vec2 dUV = uv - uOrigin;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 dS = dUV * vec2(1.0, aspect);
  float d2 = dot(dS, dS);
  float bump = 0.26 * exp(-d2 / 0.12) * (1.0 - smoothstep(0.68, 1.0, uProgress));
  float coord = uv.x + bump * uDirection;

  float width = 0.14 + n * 0.07;
  float boundary;

  float m;
  if (uDirection > 0.0) {
    boundary = mix(1.0 + width, -width, pow(clamp(uProgress, 0.0, 1.0), 0.62));
    m = smoothstep(boundary - width, boundary + width, coord + (n - 0.5) * 0.08 + ripple * 12.0);
  } else {
    boundary = mix(-width, 1.0 + width, pow(clamp(uProgress, 0.0, 1.0), 0.62));
    m = 1.0 - smoothstep(boundary - width, boundary + width, coord - (n - 0.5) * 0.08 - ripple * 12.0);
  }

  float edge = smoothstep(0.35, 0.65, m) * (1.0 - smoothstep(0.35, 0.65, m));
  edge = max(edge, smoothstep(0.0, 0.08, m) * (1.0 - smoothstep(0.92, 1.0, m)) * 0.35);

  vec2 disp = vec2(n2 - 0.5, n - 0.5);
  float warp = (1.0 - abs(m - 0.5) * 2.0);
  warp = pow(max(warp, 0.001), 1.25);
  vec2 liquid = disp * 0.055 * warp + vec2(ripple * 18.0, ripple * 12.0) * warp;

  float blurK = 0.018 * warp * sin(3.14159265 * uProgress);

  vec4 A = sampleDistorted(uTex0, uv, liquid, blurK);
  vec4 B = sampleDistorted(uTex1, uv, liquid, blurK);

  vec3 col = mix(A.rgb, B.rgb, m);

  float glow = exp(-pow((m - 0.5) * 3.2, 2.0)) * 0.55;
  vec3 cya = vec3(0.15, 0.85, 0.95);
  vec3 pur = vec3(0.65, 0.25, 0.95);
  float phase = smoothstep(0.0, 0.45, uProgress) * (1.0 - smoothstep(0.55, 1.0, uProgress));
  col = mix(col, cya, glow * phase * 0.55 * (1.0 - m));
  col = mix(col, pur, glow * phase * 0.45 * m);

  float dust = step(0.985, hash(uv * uResolution * 0.02 + uTime)) * warp * 0.35;
  col += dust * vec3(0.9, 0.95, 1.0);

  float vign = smoothstep(1.15, 0.35, length(uv - 0.5));
  col *= mix(0.94, 1.0, vign);

  gl_FragColor = vec4(col, 1.0);
}
`;
