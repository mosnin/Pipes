"use client";

/**
 * Pipes' shader: "shift". A field of square blocks on a grid, in two tones
 * and a middle one, that slides slowly sideways while its rows shift in
 * whole-block steps, like work moving through pipes. Where two tones meet,
 * a few cells are drawn in an ordered dither instead of a flat fill.
 *
 * It is Pipes' own: written for this product, not taken from any library or
 * collection. Plain WebGL1, no dependencies. Device pixel ratio is capped at
 * 1.5, rendering pauses offscreen and in hidden tabs, reduced motion draws one
 * still frame, and without WebGL a CSS block pattern in the same palette takes
 * its place.
 */
import { type CSSProperties, useEffect, useRef, useState } from "react";

const cx = (...xs: (string | false | undefined)[]) => xs.filter(Boolean).join(" ");

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

/**
 * Duotones: a light ground and an ink. The middle tone is mixed from the two.
 * Grounds are light enough for dark text on every palette, in both themes.
 */
export const PALETTES = {
  sky: ["#e7ecf3", "#7f9fd0"],
  sunrise: ["#f7ecdc", "#e8955a"],
  bloom: ["#f4e3ec", "#c9659e"],
  lagoon: ["#dcefe9", "#2f8c84"],
  dusk: ["#e8e3f5", "#7464cf"],
  ember: ["#f6e4dd", "#d4553a"],
  mono: ["#eeeeee", "#b8b8b8"]
} as const satisfies Record<string, readonly [string, string]>;
export type Palette = keyof typeof PALETTES;

/** Agent colour fields: every agent owns one palette, picked from its name so it's the same everywhere. */
const FIELDS: Palette[] = ["sky", "bloom", "lagoon", "sunrise", "dusk", "ember"];
export function paletteFor(name: string): Palette {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FIELDS[h % FIELDS.length];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${to(ar + (br - ar) * t)}${to(ag + (bg - ag) * t)}${to(ab + (bb - ab) * t)}`;
}

/** The field for small surfaces (avatars, chips): four blocks, two tones and the middle one. */
export function fieldGradient(palette: Palette): string {
  const [a, b] = PALETTES[palette];
  const m = mixHex(a, b, 0.45);
  return `conic-gradient(from 0deg at 55% 45%, ${b} 0 25%, ${m} 0 50%, ${a} 0 75%, ${m} 0)`;
}

/** Without WebGL: a still block pattern in the same palette. */
export function cssFallback(palette: Palette): string {
  const [a, b] = PALETTES[palette];
  const m = mixHex(a, b, 0.45);
  // A coarse checker of ground and middle tone, with a few ink blocks: blocks, not stripes.
  return [
    `linear-gradient(${b}, ${b}) 52px 26px / 78px 52px no-repeat`,
    `linear-gradient(${b}, ${b}) 78% 60% / 104px 52px no-repeat`,
    `repeating-conic-gradient(${m} 0 25%, ${a} 0 50%) 0 0 / 104px 104px`
  ].join(", ");
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uCell;
uniform float uSeed;
uniform vec3 uA, uB;

float hash(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.55; for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.1 + 11.7; a *= 0.45; } return v; }

// 4x4 ordered dither threshold.
float bayer(vec2 q){
  vec2 m = mod(floor(q), 4.0);
  int i = int(m.x + m.y * 4.0);
  float b = 0.0;
  if (i == 0) b = 0.0; else if (i == 1) b = 8.0; else if (i == 2) b = 2.0; else if (i == 3) b = 10.0;
  else if (i == 4) b = 12.0; else if (i == 5) b = 4.0; else if (i == 6) b = 14.0; else if (i == 7) b = 6.0;
  else if (i == 8) b = 3.0; else if (i == 9) b = 11.0; else if (i == 10) b = 1.0; else if (i == 11) b = 9.0;
  else if (i == 12) b = 15.0; else if (i == 13) b = 7.0; else if (i == 14) b = 13.0; else b = 5.0;
  return (b + 0.5) / 16.0;
}

void main(){
  float t = uTime + uSeed * 7.0;
  // Slide: the whole field drifts sideways, smoothly, in pixels.
  vec2 fc = gl_FragCoord.xy + vec2(t * uCell * 0.35, 0.0);
  vec2 cell = floor(fc / uCell);

  // Shift: each row jumps sideways in whole blocks now and then, eased at the step.
  float phase = t * 0.16 + hash(vec2(cell.y, uSeed)) * 9.0;
  float k = floor(phase);
  float e = smoothstep(0.82, 1.0, fract(phase));
  float f0 = floor((hash(vec2(k, cell.y)) - 0.5) * 7.0);
  float f1 = floor((hash(vec2(k + 1.0, cell.y)) - 0.5) * 7.0);
  float offset = floor(mix(f0, f1, e) + 0.5);

  vec2 q = vec2(cell.x + offset, cell.y);
  float v = fbm(q * vec2(0.11, 0.16) + vec2(uSeed * 3.1, t * 0.045));

  vec3 mid = mix(uA, uB, 0.45);
  vec3 col = v < 0.47 ? uA : (v < 0.56 ? mid : uB);

  // Edges between tones: a few cells dither between their neighbours instead of a flat fill.
  float edge = 1.0 - smoothstep(0.0, 0.035, min(abs(v - 0.47), abs(v - 0.56)));
  if (edge > 0.0 && hash(q + 17.0) < 0.55) {
    float level = clamp((v - 0.43) / 0.17, 0.0, 1.0);
    vec3 lo = v < 0.515 ? uA : mid;
    vec3 hi = v < 0.515 ? mid : uB;
    col = level > bayer(fc / 2.0) ? hi : lo;
  }

  // A hairline grid inside the field, barely there, so the blocks read as a system.
  vec2 g = fract(fc / uCell);
  float line = step(g.x, 1.0 / uCell) + step(g.y, 1.0 / uCell);
  col = mix(col, col * 0.94, min(line, 1.0) * 0.5);

  // Soft vignette so edges settle into the card.
  vec2 uv = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(uv, uv) * 0.18;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Shader({
  palette = "sky",
  className,
  style,
  seed = 0,
  speed = 1,
  cell = 26
}: {
  palette?: Palette;
  className?: string;
  style?: CSSProperties;
  seed?: number;
  speed?: number;
  /** Block size in CSS pixels. */
  cell?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    // A fresh canvas per run: a context lost in a previous cleanup can never be picked up again.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) {
      canvas.remove();
      setFailed(true);
      return;
    }
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      canvas.remove();
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const [a, b] = PALETTES[palette].map(hex);
    gl.uniform3fv(u("uA"), a);
    gl.uniform3fv(u("uB"), b);
    gl.uniform1f(u("uSeed"), seed);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uCell = u("uCell");

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uCell, Math.round(cell * dpr));
    };
    const draw = (time: number) => {
      gl.uniform1f(uTime, (time / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const still = reducedMotion();
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const loop = () => {
      raf = 0;
      if (!visible || document.hidden) return;
      draw(performance.now() - start);
      raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (still) return draw(4000);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (still) draw(4000);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) kick();
    });
    io.observe(canvas);
    const onVis = () => !document.hidden && kick();
    document.addEventListener("visibilitychange", onVis);
    resize();
    kick();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [palette, seed, speed, cell]);

  if (failed) return <div aria-hidden className={cx("size-full", className)} style={{ background: cssFallback(palette), ...style }} />;
  return <div ref={ref} aria-hidden className={cx("block size-full overflow-hidden", className)} style={{ background: cssFallback(palette), ...style }} />;
}
