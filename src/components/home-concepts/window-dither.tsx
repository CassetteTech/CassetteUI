'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { BAYER8 } from '@/components/pages/home-dither-field';

// Dither cell in CSS px, snapped to whole device pixels like HomeDitherField.
const CELL = 3;
// The footage's own colours: ffmpeg `palettegen` (24 colours) over both
// stills and two frames of each camera move, then the reds of the window
// frame and the bed, the tan of the room's wall, and three tape label
// colours it drops because they cover little area. Every cell prints in one
// of them, so the print keeps the scene's hues.
const PALETTE = [
  '#090805', '#161517', '#232E3B', '#241D1D', '#383841', '#422417', '#562D1B', '#646F70',
  '#673C33', '#6FAABE', '#7B7772', '#834D38', '#988478', '#A93D28', '#B29B8A', '#B5BBB1',
  '#C95734', '#E7BC94', '#EDC49C', '#EF6539', '#F6733D', '#FDE0C1', '#FEE9CE', '#FEECD2',
  '#ED2748', '#B42927', '#892121', '#F2473C', '#E13F38', '#BB9072', '#A87F66', '#47893F', '#7747A1', '#29979E',
];

const VERTEX = `#version 300 es
uniform vec2 extent;
out vec2 point;
void main() {
  vec2 clip = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  point = (clip * vec2(0.5, -0.5) + 0.5) * extent;
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision mediump float;
uniform sampler2D media;
uniform vec2 mediaOffset;
uniform vec2 mediaSize;
uniform float spread;
uniform float opacity;
in vec2 point;
out vec4 colour;
vec3 tap(vec2 offset) { return texture(media, (point + offset - mediaOffset) / mediaSize).rgb; }
void main() {
  vec3 rgb = (tap(vec2(-spread)) + tap(vec2(spread, -spread)) + tap(vec2(-spread, spread)) + tap(vec2(spread))) * 0.25;
  colour = vec4(rgb * opacity, opacity);
}`;

const DITHER = `#version 300 es
precision mediump float;
uniform sampler2D scene;
uniform float cellPixels;
uniform int rows;
uniform float bayer[64];
uniform vec3 palette[${PALETTE.length}];
uniform vec4 copy;
out vec4 colour;
const float SPREAD = 0.26;
// Print strength on busy detail (the recorder, lamp, tapes, rain); broad
// gradients (sky, wall, glow) print at full strength.
const float ON_DETAIL = 0.5;
const float UNDER_COPY = 0.2;
float luma(ivec2 cell) {
  ivec2 size = textureSize(scene, 0);
  vec4 texel = texelFetch(scene, clamp(cell, ivec2(0), size - 1), 0);
  return dot(texel.rgb, vec3(0.299, 0.587, 0.114));
}
void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy / cellPixels);
  vec4 texel = texelFetch(scene, cell, 0);
  if (texel.a <= 0.0) { colour = vec4(0.0); return; }
  vec3 rgb = texel.rgb / texel.a;
  vec2 fromTop = vec2(cell.x, rows - 1 - cell.y);
  vec3 target = rgb + (bayer[(int(fromTop.y) & 7) * 8 + (cell.x & 7)] - 0.5) * SPREAD;
  vec3 printed;
  float best = 1e9;
  for (int index = 0; index < ${PALETTE.length}; index++) {
    vec3 difference = (target - palette[index]) * vec3(0.55, 0.75, 0.45);
    float distance = dot(difference, difference);
    if (distance < best) { best = distance; printed = palette[index]; }
  }
  float detail = max(abs(luma(cell + ivec2(2, 0)) - luma(cell - ivec2(2, 0))), abs(luma(cell + ivec2(0, 2)) - luma(cell - ivec2(0, 2))));
  float amount = mix(ON_DETAIL, 1.0, 1.0 - smoothstep(0.02, 0.07, detail));
  // Ellipse around the copy column: 1 inside, easing to 0 past its edge.
  float underCopy = 1.0 - smoothstep(0.8, 1.35, length((fromTop - copy.xy) / copy.zw));
  float alpha = texel.a * amount * mix(1.0, UNDER_COPY, underCopy);
  colour = vec4(printed * alpha, alpha);
}`;

interface Source {
  element: HTMLImageElement | HTMLVideoElement;
  opacity: number;
}

export function WindowDither({ copyRef }: { copyRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const root = canvas.parentElement!;
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    canvas.addEventListener('webglcontextlost', () => { canvas.hidden = true; });

    const compile = (fragment: string) => {
      const program = gl.createProgram();
      for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]] as const) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      const uniform = (name: string) => gl.getUniformLocation(program, name);
      return { program, uniform };
    };
    const composite = compile(COMPOSITE);
    const dither = compile(DITHER);
    if (!composite || !dither) return;
    gl.useProgram(dither.program);
    gl.uniform1fv(dither.uniform('bayer'), BAYER8.flat());
    gl.uniform3fv(dither.uniform('palette'), PALETTE.flatMap((hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)));

    const texture = (filter: number) => {
      const created = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, created);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return created;
    };
    const cells = texture(gl.NEAREST);
    const buffer = gl.createFramebuffer();
    const media = new Map<Element, { texture: WebGLTexture; uploaded: string; id: number }>();

    let columns = 0;
    let rows = 0;
    let box = { width: 0, height: 0 };
    let dirty = true;
    let visible = true;
    let signature = '';
    let disposed = false;

    const measure = () => {
      const ratio = window.devicePixelRatio;
      const cellPixels = Math.max(1, Math.round(CELL * ratio));
      const cellCss = cellPixels / ratio;
      const { width, height } = root.getBoundingClientRect();
      columns = Math.ceil(width / cellCss);
      rows = Math.ceil(height / cellCss);
      canvas.width = columns * cellPixels;
      canvas.height = rows * cellPixels;
      canvas.style.width = `${columns * cellCss}px`;
      canvas.style.height = `${rows * cellCss}px`;
      gl.bindTexture(gl.TEXTURE_2D, cells);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, columns, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cells, 0);

      box = { width, height };
      gl.useProgram(composite.program);
      gl.uniform2f(composite.uniform('extent'), columns * cellCss, rows * cellCss);
      gl.uniform1f(composite.uniform('spread'), cellCss / 4);

      const bounds = root.getBoundingClientRect();
      const text = copyRef.current?.getBoundingClientRect();
      gl.useProgram(dither.program);
      gl.uniform1f(dither.uniform('cellPixels'), cellPixels);
      gl.uniform1i(dither.uniform('rows'), rows);
      gl.uniform4f(
        dither.uniform('copy'),
        text ? (text.left + text.width / 2 - bounds.left) / cellCss : -1e4,
        text ? (text.top + text.height / 2 - bounds.top) / cellCss : -1e4,
        text ? text.width / 2 / cellCss : 1,
        text ? text.height / 2 / cellCss : 1,
      );
      dirty = true;
    };

    const collect = () => {
      const opacityOf = (element: Element) => {
        const computed = getComputedStyle(element);
        return computed.display === 'none' ? 0 : Number(computed.opacity);
      };
      const byRaise = (a: HTMLElement, b: HTMLElement) => (Number(a.style.zIndex) || 0) - (Number(b.style.zIndex) || 0);
      const sources: Source[] = [...root.querySelectorAll<HTMLImageElement>('img[data-still]')].map((element) => ({ element, opacity: opacityOf(element) }));
      for (const layer of [...root.querySelectorAll<HTMLElement>('[data-layer]')].sort(byRaise)) {
        const layerOpacity = opacityOf(layer);
        const videos = layer instanceof HTMLVideoElement ? [layer] : [...layer.querySelectorAll('video')].sort(byRaise);
        // ponytail: the dark loop's copies are drawn one by one at the layer's opacity, not as a group; they differ only while that layer fades and blends at once.
        for (const element of videos) sources.push({ element, opacity: layerOpacity * (element === layer ? 1 : opacityOf(element)) });
      }
      const ready = sources.filter(({ element, opacity }) => opacity > 0.001 && (element instanceof HTMLVideoElement ? element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA : element.complete && element.naturalWidth > 0));
      const base = ready.findLastIndex(({ opacity }) => opacity >= 0.999);
      return ready.slice(Math.max(0, base));
    };

    const render = (sources: Source[]) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
      gl.viewport(0, 0, columns, rows);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(composite.program);
      for (const { element, opacity } of sources) {
        let entry = media.get(element);
        if (!entry) {
          entry = { texture: texture(gl.LINEAR), uploaded: '', id: media.size };
          media.set(element, entry);
        }
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        const key = element instanceof HTMLImageElement ? element.currentSrc : '';
        if (!key || key !== entry.uploaded) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
          entry.uploaded = key;
        }
        const [naturalWidth, naturalHeight] = element instanceof HTMLVideoElement ? [element.videoWidth, element.videoHeight] : [element.naturalWidth, element.naturalHeight];
        const scale = Math.max(box.width / naturalWidth, box.height / naturalHeight);
        const [focusX, focusY] = getComputedStyle(element).objectPosition.split(' ').map((value) => parseFloat(value) / 100);
        gl.uniform2f(composite.uniform('mediaOffset'), (box.width - naturalWidth * scale) * focusX, (box.height - naturalHeight * scale) * focusY);
        gl.uniform2f(composite.uniform('mediaSize'), naturalWidth * scale, naturalHeight * scale);
        gl.uniform1f(composite.uniform('opacity'), opacity);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(dither.program);
      gl.bindTexture(gl.TEXTURE_2D, cells);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const watch = (video: HTMLVideoElement) => {
      if (!disposed) video.requestVideoFrameCallback(() => { dirty = true; watch(video); });
    };
    for (const video of root.querySelectorAll('video')) watch(video);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!visible) return;
      const sources = collect();
      const next = sources.map(({ element, opacity }) => `${media.get(element)?.id ?? 'new'}:${opacity.toFixed(3)}`).join(' ');
      if (!dirty && next === signature) return;
      dirty = false;
      signature = next;
      render(sources);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    if (copyRef.current) resizeObserver.observe(copyRef.current);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      dirty = true;
    });
    intersectionObserver.observe(canvas);
    frame = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [copyRef]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute left-0 top-0" />;
}
