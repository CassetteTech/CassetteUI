'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * WebGL ordered-dither background. Two stages in one fragment shader:
 * (a) SCENE — a continuous, softly lit stage composition: warm haze band up
 *     top, three stagelight cones panning slowly through it, and a near-flat
 *     dark stage floor along the bottom that catches warm pools of beam
 *     light; graded with a coverage curve and content well;
 * (b) QUANTIZE — multi-level ordered dither into the brand palette: one Bayer
 *     threshold decides coverage vs transparent (the page background is itself
 *     a quantization level), a second decorrelated threshold interleaves the
 *     two nearest palette colors, hero-halftone style.
 *
 * Rendered at 1/PIXEL of viewport resolution (backing store clamped to
 * ~1024px on the long edge) and upscaled with image-rendering: pixelated —
 * chunky cells are the aesthetic AND the entire perf budget.
 */
const PIXEL = 2;

/** Cap the backing store long edge so 4K monitors don't quadruple the
 *  fragment count; CSS + pixelated upscale covers the difference. */
const MAX_EDGE = 1024;

/** Redraws per second. Deliberately low: stop-motion suits the pixel art
 *  and rAF still auto-pauses in hidden tabs. */
const FPS = 10;

/** Fixed field time for reduced-motion / first paint: far enough in that the
 *  field is fully developed instead of the t=0 composition. */
const STATIC_T = 120;

const VERT = `#version 300 es
void main() {
  // Fullscreen triangle from gl_VertexID; no buffers needed.
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_pal[6]; // 0 pink, 1 gold, 2 sun, 3 blue, 4 violet, 5 shadow
out vec4 fragColor;

// Classic recursive Bayer ordered-dither threshold in [0,1).
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer8(vec2 a) {
  return bayer2(a * 0.25) * 0.0625 + bayer2(a * 0.5) * 0.25 + bayer2(a);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

// One stagelight: a soft-edged cone of light from origin o, hanging above
// the top edge and pointing down at angle a (radians off vertical). Width
// spreads with distance; intensity decays along the throw.
float beamI(vec2 p, vec2 o, float a, float w0, float spread) {
  vec2 dir = vec2(sin(a), -cos(a));
  vec2 q = p - o;
  float along = dot(q, dir);
  if (along < 0.0) return 0.0;
  float perp = q.x * dir.y - q.y * dir.x;
  float w = w0 + spread * along;
  float core = 1.0 - smoothstep(0.0, w, abs(perp));
  return core * core * smoothstep(2.3, 0.2, along);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.y;
  float aspect = u_res.x / u_res.y;
  float t = u_time;

  // ---------- SCENE: continuous color + coverage ----------

  // Atmosphere: a warm haze band along the top edge; fbm gives it structure
  // and slow drift. Pink-dominant like the hero, gold where it thins.
  float cl = fbm(uv * vec2(1.5, 2.1) + vec2(t * 0.028, -t * 0.011));
  float band = smoothstep(0.70, 1.02, uv.y + (cl - 0.5) * 0.3);
  vec3 col = mix(u_pal[0], u_pal[1], 0.15 + 0.55 * smoothstep(0.52, 0.82, cl));
  float cov = band * (0.6 + 0.4 * smoothstep(0.3, 0.65, cl)) * 0.8;

  // Stagelights: three soft cones panning slowly through the haze — pink
  // from the left, gold near center, sun from the right. Airy coverage so
  // they read as light through fog (lattice interleaved with the page),
  // never solid shapes.
  float bm1 = beamI(uv, vec2(aspect * 0.14, 1.06), 0.45 + 0.17 * sin(t * 0.16), 0.07, 0.20);
  float bm2 = beamI(uv, vec2(aspect * 0.68, 1.08), -0.16 + 0.19 * sin(t * 0.13 + 2.0), 0.06, 0.17);
  float bm3 = beamI(uv, vec2(aspect * 0.98, 1.05), -0.50 + 0.17 * sin(t * 0.145 + 4.0), 0.07, 0.19);
  float bsum = bm1 + bm2 + bm3;
  vec3 beamC = (u_pal[0] * bm1 + u_pal[1] * bm2 + u_pal[2] * bm3) / max(bsum, 1e-4);
  float beamA = clamp(bsum, 0.0, 1.0) * (0.6 + 0.4 * cl);
  col = mix(col, beamC, beamA * 0.9);
  cov = max(cov, beamA * 0.85);

  // Stage floor: a flat platform along the bottom edge, lightened by
  // letting the page show through a looser lattice (coverage, not tint, is
  // what lightens dithered masses). Beam light stays a shallow surface
  // glow — deep penetration made the moving pools read as waves.
  float tex = noise(uv * vec2(5.0, 8.0) + t * 0.05);
  float yW = 0.105 + 0.006 * (noise(vec2(uv.x * 2.8, 9.4)) - 0.5);
  float dW = yW - uv.y;
  float inW = smoothstep(-0.008, 0.01, dW);
  vec3 floorC = mix(u_pal[5], u_pal[3], 0.18 + 0.08 * tex);
  float pool = clamp(bsum, 0.0, 1.0) * smoothstep(0.05, 0.0, dW);
  floorC = mix(floorC, mix(beamC, u_pal[1], 0.25), pool * 0.55);
  float crest = smoothstep(0.03, 0.0, dW);
  floorC = mix(floorC, mix(u_pal[2], u_pal[1], 0.5 + 0.3 * tex),
               crest * (0.12 + 0.35 * clamp(bsum, 0.0, 1.0)));
  col = mix(col, floorC, inW);
  cov = max(cov, inW * 0.62);

  // ---------- GRADE ----------
  // Content well: an elliptical quiet zone over the title/tagline/CTA band,
  // then an s-curve on coverage so areas read as dense fields or long
  // dissolves, never sparse all-over speckle.
  vec2 cuv = (uv - vec2(aspect * 0.42, 0.40)) * vec2(0.9, 1.6);
  cov *= 1.0 - 0.6 * exp(-dot(cuv, cuv) * 5.0);
  cov = smoothstep(0.06, 0.9, cov);

  // ---------- QUANTIZE: multi-level ordered dither ----------
  float b = bayer8(gl_FragCoord.xy);
  if (cov <= b) { fragColor = vec4(0.0); return; }

  // Two nearest palette levels to the graded scene color; a decorrelated
  // Bayer phase interleaves them (gold-in-pink, teal-in-blue, hero style).
  float d1 = 1e9, d2 = 1e9;
  vec3 c1 = u_pal[0], c2 = u_pal[0];
  for (int i = 0; i < 6; i++) {
    vec3 pc = u_pal[i];
    float d = dot(col - pc, col - pc);
    if (d < d1) { d2 = d1; c2 = c1; d1 = d; c1 = pc; }
    else if (d < d2) { d2 = d; c2 = pc; }
  }
  // Scaled up so blends interleave visibly even when one anchor is closest —
  // the hero's masses always show a minority color inside the lattice.
  float f = min(1.35 * sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-6), 0.5);
  float b2 = bayer8(gl_FragCoord.xy + vec2(19.0, 53.0));
  fragColor = vec4(b2 < f ? c2 : c1, 1.0); // opaque dots, premultiplied-safe
}`;

/**
 * Palette rooted in hero-halftone.webp and pre-toned per theme, with the
 * hero's teal swapped for a stage violet (teal sits between navy and blue in
 * luminance, so the quantizer kept hijacking dark blends into a green cast).
 * These are artwork colors (like the hero image's own pixels), not UI
 * chrome, so they are baked rather than derived from theme tokens. Order:
 * pink, gold, sun, blue, violet, shadow.
 */
// prettier-ignore
const PALETTE_LIGHT = new Float32Array([
  0.894, 0.529, 0.639, // pink   #E487A3
  0.788, 0.659, 0.271, // gold   #C9A845
  0.871, 0.353, 0.255, // sun    #DE5A41
  0.435, 0.580, 0.808, // blue   #6F94CE
  0.490, 0.420, 0.750, // violet #7D6BC0
  0.220, 0.251, 0.361, // shadow #38405C
]);
// prettier-ignore
const PALETTE_DARK = new Float32Array([
  0.525, 0.243, 0.373, // pink   #863E5F — rosier than light-mode ratio so the
  0.471, 0.353, 0.157, // gold   #785A28   sky doesn't drift toward khaki camo
  0.800, 0.310, 0.196, // sun    #CC4F32
  0.290, 0.380, 0.545, // blue   #4A618B
  0.290, 0.240, 0.470, // violet #4A3D78
  0.129, 0.149, 0.224, // shadow #212639
]);

export const DitherBackground: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) return; // no WebGL2: page background alone is fine

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uPal = gl.getUniformLocation(prog, 'u_pal');

    const readTheme = () => {
      const dark = document.documentElement.classList.contains('dark');
      gl.uniform3fv(uPal, dark ? PALETTE_DARK : PALETTE_LIGHT);
    };

    const draw = (t: number) => {
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      let w = canvas.clientWidth / PIXEL;
      let h = canvas.clientHeight / PIXEL;
      const k = MAX_EDGE / Math.max(w, h);
      if (k < 1) { w *= k; h *= k; }
      canvas.width = Math.max(1, Math.ceil(w));
      canvas.height = Math.max(1, Math.ceil(h));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const staticOnly = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let lastStep = -1;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const step = Math.floor(t * FPS);
      if (step !== lastStep) {
        lastStep = step;
        draw(STATIC_T + step / FPS);
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    readTheme();
    draw(STATIC_T);
    setReady(true);
    if (!staticOnly) raf = requestAnimationFrame(frame);

    const onResize = () => {
      resize();
      if (staticOnly) draw(STATIC_T);
    };
    window.addEventListener('resize', onResize);
    const themeObserver = new MutationObserver(() => {
      readTheme();
      if (staticOnly) draw(STATIC_T);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      themeObserver.disconnect();
      // Deliberately no loseContext(): StrictMode re-runs this effect on the
      // same canvas, and getContext would hand back the killed context.
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none transition-opacity duration-700 ${
        ready ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      // Canvas is a replaced element: inset-0 alone won't stretch it, so the
      // CSS size must be explicit (and decoupled from the low-res backing store).
      style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}
    />
  );
};
