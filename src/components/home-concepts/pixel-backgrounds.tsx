'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { noiseAt } from '@/components/pages/home-dither-field';
import { cn } from '@/lib/utils';

/** One frame's inputs for a painter. `context` is scaled to CSS px. */
interface Frame {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  ratio: number;
  seconds: number;
  /** The canvas's CSS `color`, so the theme owns the ink. */
  ink: string;
  /** Pointer in 0–1 canvas space; strength eases to 0 when it leaves. */
  pointer: { x: number; y: number; strength: number };
}

type Painter = (frame: Frame) => void;

/**
 * Shared loop for the canvas backdrops: sizes to the element, paints at
 * most `fps` times a second while on screen and the tab is visible, eases
 * the pointer, and paints one still frame under reduced motion.
 */
function useCanvasField(canvasRef: RefObject<HTMLCanvasElement | null>, makePainter: () => Painter, fps: number) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const paint = makePainter();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mountedAt = performance.now();
    const pointer = { x: 0.5, y: 0.5, strength: 0 };
    const target = { x: 0.5, y: 0.5, strength: 0 };
    let width = 0;
    let height = 0;
    let ratio = 1;
    let frame = 0;
    let paintedAt = -Infinity;
    let visible = true;

    const draw = (now: number) => {
      if (!width || !height) return;
      pointer.x += (target.x - pointer.x) * 0.12;
      pointer.y += (target.y - pointer.y) * 0.12;
      pointer.strength += (target.strength - pointer.strength) * 0.08;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint({
        context,
        width,
        height,
        ratio,
        seconds: still.matches ? 0 : (now - mountedAt) / 1000,
        ink: getComputedStyle(canvas).color,
        pointer,
      });
      paintedAt = now;
    };
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      draw(performance.now());
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden || still.matches) return;
      if (now - paintedAt >= 1000 / fps) draw(now);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = (event.clientY - rect.top) / rect.height;
      target.strength = target.x >= 0 && target.x <= 1 && target.y >= 0 && target.y <= 1 ? 1 : 0;
    };
    const leave = () => {
      target.strength = 0;
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(canvas);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);
    still.addEventListener('change', measure);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      still.removeEventListener('change', measure);
    };
  }, [canvasRef, makePainter, fps]);
}

/* ── Halftone blobs ──────────────────────────────────────────────────────
   A print screen on a hex lattice. Unseen blobs ride slow orbits under it,
   and each dot swells with the blob field at its centre, so ink pools and
   drains without any dot leaving its cell. */
function halftonePainter(spacing: number, blobs: number): Painter {
  const orbits = Array.from({ length: blobs }, (_, index) => ({
    fx: 0.07 + 0.045 * ((index * 3) % 4),
    fy: 0.06 + 0.05 * ((index * 5) % 3),
    ax: 0.28 + 0.14 * ((index * 2) % 3),
    ay: 0.22 + 0.16 * ((index * 7) % 3),
    phase: index * 2.1,
    size: 0.16 + 0.08 * ((index * 5) % 3),
  }));
  return ({ context, width, height, seconds, ink }) => {
    context.clearRect(0, 0, width, height);
    const base = Math.min(width, height);
    const centres = orbits.map((orbit) => ({
      x: width * (0.5 + orbit.ax * Math.sin(seconds * orbit.fx + orbit.phase)),
      y: height * (0.5 + orbit.ay * Math.cos(seconds * orbit.fy + orbit.phase * 0.6)),
      r2: (orbit.size * base) ** 2,
    }));
    const rows = Math.ceil(height / spacing) + 1;
    const columns = Math.ceil(width / spacing) + 2;
    const maxRadius = spacing * 0.55;
    context.fillStyle = ink;
    context.beginPath();
    for (let row = 0; row < rows; row++) {
      const y = row * spacing;
      const shift = row % 2 ? spacing / 2 : 0;
      for (let column = 0; column < columns; column++) {
        const x = column * spacing + shift;
        let field = 0.04;
        for (const centre of centres) {
          const dx = x - centre.x;
          const dy = y - centre.y;
          field += (centre.r2 / (dx * dx + dy * dy + 1)) * 0.4;
        }
        const radius = Math.sqrt(Math.min(1, field)) * maxRadius;
        if (radius < 0.4) continue;
        context.moveTo(x + radius, y);
        context.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
    context.fill();
  };
}

export function HalftoneBlobField({ spacing = 11, blobs = 5, className }: { spacing?: number; blobs?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painter = useMemo(() => () => halftonePainter(spacing, blobs), [spacing, blobs]);
  useCanvasField(canvasRef, painter, 30);
  return <canvas ref={canvasRef} aria-hidden className={cn('block h-full w-full', className)} />;
}

/* ── Dither wave (WebGL) ─────────────────────────────────────────────────
   Pixel Perfect's dither-wave shader, used with its author's permission:
   two slow sine fields thresholded per cell against an 8×8 Bayer screen on
   the GPU, and a pointer that bends the field around itself. Adapted for
   Cassette: the paper is transparent so the glow shows through, the ink
   is the canvas's CSS colour, an optional calm ellipse drains the field
   behind copy, and the pointer eases without GSAP. */
const WAVE_VERTEX = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const WAVE_FRAGMENT = `
precision mediump float;
uniform vec2 uSize;
uniform float uCell;
uniform float uTime;
uniform vec4 uInk;
uniform vec4 uCalm;
uniform vec3 uMouse;
uniform float uBias;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 cellCoord = floor(gl_FragCoord.xy / uCell);
  vec2 uv = (cellCoord * uCell) / uSize;
  float aspect = uSize.x / uSize.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  if (uMouse.z > 0.001) {
    vec2 dm = p - vec2(uMouse.x * aspect, uMouse.y);
    p += dm * exp(-dot(dm, dm) * 10.0) * 0.22 * uMouse.z;
  }
  float v = uBias
    + 0.20 * sin(dot(p, normalize(vec2(0.55, 1.0))) * 5.2 - uTime * 0.11)
    + 0.12 * sin(dot(p, normalize(vec2(1.0, 0.28))) * 8.4 + uTime * 0.07);
  // Calm ellipse: the field drains to paper inside it, so copy sits clear.
  if (uCalm.z > 0.0) {
    vec2 d = vec2((uv.x - uCalm.x) / uCalm.z, (uv.y - uCalm.y) / uCalm.w);
    v -= 2.0 * (1.0 - smoothstep(0.75, 1.0, length(d)));
  }
  float threshold = bayer8(cellCoord);
  gl_FragColor = v > threshold ? vec4(uInk.rgb * uInk.a, uInk.a) : vec4(0.0);
}
`;

export function DitherWaveField({ cell = 3, density = 0.3, calm, className }: {
  /** Cell size in CSS px. */
  cell?: number;
  /** Share of cells that are ink, 0–1. */
  density?: number;
  /** Clear ellipse as (x, y, rx, ry) in 0–1 canvas space, y up from the bottom. */
  calm?: [number, number, number, number];
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calmKey = calm?.join(',') ?? '';

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!canvas || !gl) return;
    const program = gl.createProgram();
    if (!program) return;
    const shaders: WebGLShader[] = [];
    const dispose = () => {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
    };
    for (const [type, source] of [[gl.VERTEX_SHADER, WAVE_VERTEX], [gl.FRAGMENT_SHADER, WAVE_FRAGMENT]] as const) {
      const shader = gl.createShader(type);
      if (!shader) {
        dispose();
        return;
      }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        dispose();
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      dispose();
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const sizeUniform = uniform('uSize');
    const cellUniform = uniform('uCell');
    const timeUniform = uniform('uTime');
    const mouseUniform = uniform('uMouse');
    const inkUniform = uniform('uInk');
    const [calmX, calmY, calmRx, calmRy] = calm ?? [0, 0, 0, 0];
    gl.uniform4f(uniform('uCalm'), calmX, calmY, calmRx, calmRy);
    gl.uniform1f(uniform('uBias'), density);
    gl.clearColor(0, 0, 0, 0);

    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { x: 0.5, y: 0.5, strength: 0 };
    const target = { x: 0.5, y: 0.5, strength: 0 };
    let ink = '';
    let elapsed = 0;
    let previous = 0;
    let visible = true;
    let frame = 0;

    // The theme owns the ink: read the canvas's computed colour when it changes.
    const readInk = () => {
      const color = getComputedStyle(canvas).color;
      if (color === ink) return;
      ink = color;
      const [red = 0, green = 0, blue = 0, alpha = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
      gl.uniform4f(inkUniform, red / 255, green / 255, blue / 255, alpha);
    };
    const draw = () => {
      pointer.x += (target.x - pointer.x) * 0.12;
      pointer.y += (target.y - pointer.y) * 0.12;
      pointer.strength += (target.strength - pointer.strength) * 0.08;
      readInk();
      gl.uniform1f(timeUniform, elapsed);
      gl.uniform3f(mouseUniform, pointer.x, pointer.y, pointer.strength);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(sizeUniform, canvas.width, canvas.height);
      gl.uniform1f(cellUniform, Math.max(1, Math.round(cell * ratio)));
      draw();
    };
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (!visible || document.hidden || still.matches) {
        previous = now;
        return;
      }
      elapsed += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      draw();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
      target.strength = target.x >= 0 && target.x <= 1 && target.y >= 0 && target.y <= 1 ? 1 : 0;
    };
    const leave = () => {
      target.strength = 0;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(canvas);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', leave);
    still.addEventListener('change', resize);
    previous = performance.now();
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', leave);
      still.removeEventListener('change', resize);
      gl.deleteBuffer(buffer);
      dispose();
    };
    // calmKey stands in for the calm tuple, so a fresh array literal does not restart the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell, density, calmKey]);

  return <canvas ref={canvasRef} aria-hidden className={cn('block h-full w-full', className)} />;
}

/* ── Dither weave ────────────────────────────────────────────────────────
   Short dashes on a grid, with every third diagonal left empty so the
   field reads as hatching. A flowing two-octave noise switches each dash
   on or off, so blobs drift through the weave while every mark stays put. */
function weavePainter(pitch: number, scale: number): Painter {
  return ({ context, width, height, seconds, ink }) => {
    context.clearRect(0, 0, width, height);
    const columns = Math.ceil(width / pitch);
    const rows = Math.ceil(height / pitch);
    const dashWidth = pitch * 0.7;
    const dashHeight = pitch * 0.38;
    const step = (pitch / height) * scale;
    context.fillStyle = ink;
    context.beginPath();
    for (let row = 0; row < rows; row++) {
      const ny = row * step * 2.4;
      for (let column = 0; column < columns; column++) {
        if ((((column - row) % 3) + 3) % 3 === 0) continue;
        const nx = column * step * 1.3 - seconds * 0.08;
        const warp = noiseAt(nx * 0.6 + 11, ny * 0.6 + seconds * 0.04);
        const value = 0.65 * noiseAt(nx + warp * 1.2, ny + seconds * 0.1)
          + 0.35 * noiseAt(nx * 2.3 + 7, ny * 2.3 - seconds * 0.16);
        if (value < 0.5) continue;
        context.rect(column * pitch + (pitch - dashWidth) / 2, row * pitch + (pitch - dashHeight) / 2, dashWidth, dashHeight);
      }
    }
    context.fill();
  };
}

export function DitherWeaveField({ pitch = 7, scale = 6, className }: { pitch?: number; scale?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painter = useMemo(() => () => weavePainter(pitch, scale), [pitch, scale]);
  useCanvasField(canvasRef, painter, 30);
  return <canvas ref={canvasRef} aria-hidden className={cn('block h-full w-full', className)} />;
}
