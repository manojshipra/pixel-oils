// The paint engine: random numbers, colour mixing, and the bristle brush everything is drawn with.

export const W = 1500, H = 1000;
export const LIQUID_WHITE = '#f3efe4';

export const PAINTS = [
  ['titaniumWhite', 'Titanium White', '#f4f1e8'], ['midnightBlack', 'Midnight Black', '#151515'],
  ['phthaloBlue', 'Phthalo Blue', '#0b2a8a'], ['prussianBlue', 'Prussian Blue', '#0f2f4d'],
  ['phthaloGreen', 'Phthalo Green', '#0f3b2e'], ['sapGreen', 'Sap Green', '#4f7a28'],
  ['cadmiumYellow', 'Cadmium Yellow', '#f2c12e'], ['yellowOchre', 'Yellow Ochre', '#c48b2c'],
  ['indianYellow', 'Indian Yellow', '#e3a857'], ['brightRed', 'Bright Red', '#c8261d'],
  ['alizarinCrimson', 'Alizarin Crimson', '#8e1b2c'], ['darkSienna', 'Dark Sienna', '#5a2d1a'],
  ['vanDykeBrown', 'Van Dyke Brown', '#3f2a1c'], ['ultramarine', 'Ultramarine', '#2a3b9c'],
];
export const P = Object.fromEntries(PAINTS.map(([k, , c]) => [k, c]));

// Shared drawing state. ctx is swapped for small preview canvases; dr is the bristle jitter source.
export const state = { ctx: null, dr: Math.random, work: 0, strokes: 0 };

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pickWith = (arr, r) => arr[Math.floor(r() * arr.length)];

export function noise1(r) {
  const T = new Float32Array(512);
  for (let i = 0; i < 512; i++) T[i] = r() * 2 - 1;
  return x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return T[i & 511] * (1 - u) + T[(i + 1) & 511] * u; };
}
export function fbm(n, x, oct = 5) {
  let s = 0, a = 1, f = 1, norm = 0;
  for (let o = 0; o < oct; o++) { s += n(x * f + o * 31.7) * a; norm += a; a *= 0.5; f *= 2.03; }
  return s / norm;
}

export function rgb(c) {
  c = String(c).replace('#', '');
  if (c.length === 3) c = c.split('').map(h => h + h).join('');
  return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16));
}
export const hex = a => '#' + a.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); }
// sample a list of colours as a smooth ramp, t in 0..1
export function ramp(colors, t) {
  t = clamp(t, 0, 1) * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(t));
  return mix(colors[i], colors[i + 1], t - i);
}

export const BRUSHES = {
  flat:  { label: '2-inch flat',   size: 64, bristles: s => clamp(s, 6, 70),      lw: s => clamp(s * 0.08, 1.6, 5),   decay: 0.992, dry: 0.3,  alpha: 0.88 },
  fan:   { label: 'Fan',           size: 36, bristles: s => clamp(s * 0.4, 5, 30), lw: s => clamp(s * 0.04, 0.8, 2), decay: 0.965, dry: 0.7,  alpha: 0.85, taper: true },
  round: { label: 'Round',         size: 16, bristles: s => clamp(s, 4, 40),      lw: s => clamp(s * 0.14, 1, 5),     decay: 0.988, dry: 0.25, alpha: 0.92 },
  liner: { label: 'Liner',         size: 4,  bristles: () => 2,                   lw: s => Math.max(0.8, s * 0.55),   decay: 0.999, dry: 0,    alpha: 0.95 },
  knife: { label: 'Palette knife', size: 24, bristles: s => clamp(s * 1.2, 8, 50), lw: s => clamp(s * 0.04, 0.9, 2.5), decay: 0.92, dry: 0.95, alpha: 0.95 },
  soft:  { label: 'Soft blender',  size: 90, bristles: s => clamp(s * 0.6, 10, 50), lw: s => clamp(s * 0.05, 1.6, 5), decay: 1,     dry: 0,    alpha: 0.14 },
};

export const autoTints = c => typeof c === 'string' ? [mix(c, '#000000', 0.18), mix(c, '#ffffff', 0.18)] : null;

// API options ({ brush, size, color, ... }) -> bristle settings
export function spec(opts = {}) {
  const b = BRUSHES[opts.brush] || BRUSHES.flat;
  const size = opts.size ?? b.size;
  const color = opts.color ?? P.midnightBlack;
  return {
    width: size, bristles: opts.bristles ?? b.bristles(size), lw: opts.lw ?? b.lw(size),
    decay: opts.decay ?? b.decay, dry: opts.dry ?? b.dry, alpha: opts.alpha ?? b.alpha,
    color, taper: opts.taper ?? !!b.taper, tints: opts.tints === false ? null : (opts.tints ?? autoTints(color)), step: opts.step,
    blend: opts.blend,
  };
}

export function resample(pts, step) {
  const out = [pts[0].slice()];
  let [px, py] = pts[0], acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    let dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
    while (acc + d >= step && d > 0) {
      const t = (step - acc) / d;
      px += dx * t; py += dy * t; out.push([px, py]);
      dx = x - px; dy = y - py; d = Math.hypot(dx, dy); acc = 0;
    }
    acc += d; px = x; py = y;
  }
  if (acc > step * 0.3) out.push(pts[pts.length - 1].slice());
  return out;
}

// One stroke along a path. Each bristle keeps its sideways offset and runs out of paint on its own.
export function brushPath(points, o) {
  const ctx = state.ctx, dr = state.dr;
  if (!points || points.length < 2) return;
  const pts = resample(points, o.step || Math.max(1.5, o.width * 0.12));
  const m = pts.length; if (m < 2) return;
  const nb = Math.max(1, Math.round(o.bristles));
  const nx = new Float32Array(m), ny = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / l; ny[i] = dx / l;
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.blend) ctx.globalCompositeOperation = o.blend;
  for (let k = 0; k < nb; k++) {
    const off = nb === 1 ? 0 : (dr() - 0.5) * o.width;
    const tint = o.tints && dr() < 0.2 ? pickWith(o.tints, dr) : null;
    const thresh = dr() * o.dry;
    const aMul = (0.6 + 0.4 * dr()) * (tint ? 0.6 : 1);
    ctx.strokeStyle = tint || o.color;
    ctx.lineWidth = o.lw * (0.5 + dr());
    let load = 1, drawing = false, segs = 0;
    for (let i = 0; i < m; i++) {
      if (load < thresh) break;
      const p = o.taper ? 1 - 0.75 * (i / (m - 1)) : 1;
      const x = pts[i][0] + nx[i] * off * p, y = pts[i][1] + ny[i] * off * p;
      if (!drawing) {
        ctx.globalAlpha = o.alpha * aMul * (0.35 + 0.65 * load);
        ctx.beginPath(); ctx.moveTo(x, y); drawing = true; segs = 0;
      } else {
        ctx.lineTo(x, y);
        if (++segs >= 6) {
          ctx.stroke();
          ctx.globalAlpha = o.alpha * aMul * (0.35 + 0.65 * load);
          ctx.beginPath(); ctx.moveTo(x, y); segs = 0;
        }
      }
      load *= o.decay;
    }
    if (drawing && segs) ctx.stroke();
    state.work += m;
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  state.strokes++;
}

// Wet paint is sampled from a quarter-size copy taken when a hand stroke starts.
// Reading pixels off the main canvas would push it off the GPU and slow every later stroke.
const wetCopy = document.createElement('canvas');
wetCopy.width = W / 4; wetCopy.height = H / 4;
const wetCtx = wetCopy.getContext('2d', { willReadFrequently: true });
let wetPixels = null;
export function snapshotWet(canvas) {
  wetCtx.drawImage(canvas, 0, 0, wetCopy.width, wetCopy.height);
  wetPixels = wetCtx.getImageData(0, 0, wetCopy.width, wetCopy.height).data;
}
function wetAt(x, y) {
  const i = (clamp(Math.round(y / 4), 0, wetCopy.height - 1) * wetCopy.width + clamp(Math.round(x / 4), 0, wetCopy.width - 1)) * 4;
  return hex([wetPixels[i], wetPixels[i + 1], wetPixels[i + 2]]);
}

// A brush held in your hand: bristles are laid down as the pointer moves and pick up wet paint from under them.
export class LiveStroke {
  constructor([x, y], h) {
    const b = BRUSHES[h.brush];
    this.b = b; this.size = h.size; this.color = h.color; this.wet = h.wet;
    const tints = autoTints(h.color);
    this.br = Array.from({ length: Math.round(b.bristles(h.size)) }, () => ({
      off: (Math.random() - 0.5) * h.size, lw: b.lw(h.size) * (0.5 + Math.random()),
      tint: Math.random() < 0.2 ? pickWith(tints, Math.random) : null,
      th: Math.random() * b.dry, a: 0.6 + 0.4 * Math.random(), x: null, y: null,
    }));
    if (this.br.length <= 2) this.br.forEach(br => { br.off *= 0.3; });
    this.load = 1; this.last = [x, y]; this.spacing = Math.max(1.2, h.size * 0.08); this.n = 0; this.under = null;
  }
  to([x, y], pr) {
    const [lx, ly] = this.last, dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy);
    if (d < this.spacing) return;
    const ux = dx / d, uy = dy / d, k = Math.floor(d / this.spacing);
    for (let i = 1; i <= k; i++) this.dab(lx + ux * this.spacing * i, ly + uy * this.spacing * i, ux, uy, pr);
    this.last = [lx + ux * this.spacing * k, ly + uy * this.spacing * k];
  }
  dab(px, py, ux, uy, pr) {
    const ctx = state.ctx, nx = -uy, ny = ux;
    if (this.wet > 0 && wetPixels && this.n++ % 2 === 0) this.under = wetAt(px + ux * this.size * 0.6, py + uy * this.size * 0.6);
    const smear = this.under ? this.wet * (0.15 + 0.7 * (1 - this.load)) : 0;
    const cache = new Map();
    const colFor = c => { if (!smear) return c; let v = cache.get(c); if (!v) { v = mix(c, this.under, smear); cache.set(c, v); } return v; };
    ctx.lineCap = 'round';
    for (const b of this.br) {
      const x = px + nx * b.off * pr, y = py + ny * b.off * pr;
      if (b.x !== null && this.load > b.th) {
        ctx.globalAlpha = this.b.alpha * b.a * (0.35 + 0.65 * this.load);
        ctx.strokeStyle = colFor(b.tint || this.color);
        ctx.lineWidth = b.lw * Math.max(0.6, pr);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(x, y); ctx.stroke();
      }
      b.x = x; b.y = y;
    }
    ctx.globalAlpha = 1;
    this.load *= this.b.decay;
  }
}
