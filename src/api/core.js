// Basic marks: lines, dabs, curves, fills, gradients, circles, shapes, light, signatures.
import { W, H, P, LIQUID_WHITE, state, lerp, clamp, mix, BRUSHES } from '../engine.js';

export default function core(k) {
  const { Q, R, stroke } = k;

  const line = (x0, y0, x1, y1, opts) => stroke([[x0, y0], [x1, y1]], opts);

  const dab = (x, y, opts = {}) => {
    const s = opts.size ?? (BRUSHES[opts.brush] || BRUSHES.round).size;
    stroke([[x, y], [x + (R() - 0.5) * s * 0.4, y - s * (0.25 + R() * 0.3)]], { brush: 'round', ...opts });
  };

  const arc = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2) => {
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) / 6)), out = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return out;
  };

  const wave = (x0, y0, x1, y1, amp = 10) => {
    const out = [], ph = R() * 6.28, f = 1 + R();
    for (let i = 0; i <= 16; i++) { const t = i / 16; out.push([lerp(x0, x1, t), lerp(y0, y1, t) + Math.sin(ph + t * 6.28 * f) * amp * 0.5]); }
    return out;
  };

  // a smooth curve through the given points (Catmull-Rom), handy for branches, rivers, roads
  const curve = (points, steps = 10) => {
    if (points.length < 3) return points.map(p => [p[0], p[1]]);
    const out = [], p = [points[0], ...points, points[points.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const f = j => 0.5 * ((2 * p[i][j]) + (-p[i - 1][j] + p[i + 1][j]) * t + (2 * p[i - 1][j] - 5 * p[i][j] + 4 * p[i + 1][j] - p[i + 2][j]) * t2 + (-p[i - 1][j] + 3 * p[i][j] - 3 * p[i + 1][j] + p[i + 2][j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(points[points.length - 1].slice());
    return out;
  };

  const fill = color => {
    Q(() => { state.ctx.fillStyle = color; state.ctx.globalAlpha = 1; state.ctx.fillRect(0, 0, W, H); });
    for (let y = 0; y < H; y += 40) stroke(wave(-40, y, W + 40, y, 6), { brush: 'flat', size: 46, color: mix(color, '#ffffff', 0.06), alpha: 0.25, tints: false });
  };
  const clear = () => fill(LIQUID_WHITE);

  // criss-cross strokes that sample a vertical gradient, the way a 2-inch brush lays in a sky
  const gradient = (y0, y1, colors) => {
    k.scene.horizon = colors[colors.length - 1];
    const pat = k.patternOf(g => {
      const lg = g.createLinearGradient(0, y0, 0, y1);
      colors.forEach((c, i) => lg.addColorStop(i / Math.max(1, colors.length - 1), c));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    });
    const o = { width: 64, bristles: 45, lw: 1.7, decay: 0.992, dry: 0.25, alpha: 0.85, color: pat, tints: colors.map(c => mix(c, '#ffffff', 0.15)) };
    for (let y = y0 - 10; y < y1 + 10; y += 30) for (let x = -30; x < W + 60; x += 64) {
      const cx = x + R() * 20, cy = y + R() * 10, s = 36 + R() * 14;
      const a = [[cx - s, cy - s * 0.8], [cx + s, cy + s * 0.8]], b = [[cx + s, cy - s * 0.8], [cx - s, cy + s * 0.8]];
      k.raw(a, o); k.raw(b, o);
    }
    const blend = { width: 36, bristles: 25, lw: 1.8, decay: 1, dry: 0, alpha: 0.45, color: pat };
    for (let y = y0; y < y1 + 10; y += 14) k.raw(wave(-60, y, W + 60, y + R() * 6 - 3, 6), blend);
  };

  const disc = (cx, cy, r, color, alpha = 1) => {
    Q(() => { const c = state.ctx; c.globalAlpha = alpha * 0.85; c.fillStyle = color; c.beginPath(); c.arc(cx, cy, Math.max(0, r - 4), 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; });
    for (let rr = r - 6; rr > 2; rr -= 7) stroke(arc(cx, cy, rr, rr, R() * 6.28, R() * 6.28 + Math.PI * 2.1), { brush: 'flat', size: 18, color, alpha: 0.95 * alpha });
    stroke(arc(cx, cy, r - 2, r - 2, 0, Math.PI * 2.05), { brush: 'round', size: 6, color, alpha });
  };

  // soft light that adds to what is underneath: halos, lamps, sun glare
  const glow = (cx, cy, r, color = '#fff2c4', strength = 0.5) => {
    Q(() => {
      const c = state.ctx, g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, color); g.addColorStop(1, color + '00');
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = strength; c.fillStyle = g;
      c.fillRect(cx - r, cy - r, r * 2, r * 2); c.restore();
    });
  };

  // paint the inside of any outline with strokes that follow `angle` (radians)
  const shape = (points, opts = {}) => {
    const path = new Path2D();
    points.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y));
    path.closePath();
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const size = opts.size ?? 24, ang = opts.angle ?? 0, colors = [].concat(opts.color ?? P.vanDykeBrown);
    const len = size * 3.2;
    k.clipTo(path);
    // long, overlapping, slightly wandering strokes, staggered row to row so no brick pattern shows
    for (let y = y0 - size, row = 0; y < y1 + size; y += size * 0.35, row++) for (let x = x0 - len + (row % 3) * len * 0.33; x < x1 + size; x += len * 0.55) {
      const a = ang + (R() - 0.5) * 0.3, jx = x + (R() - 0.5) * len * 0.3, jy = y + (R() - 0.5) * size * 0.4;
      const ca = Math.cos(a), sa = Math.sin(a), bow = (R() - 0.5) * size * 0.5;
      stroke([[jx, jy], [jx + ca * len * 0.5 - sa * bow, jy + sa * len * 0.5 + ca * bow], [jx + ca * len, jy + sa * len]],
        { brush: opts.brush ?? 'flat', size, color: colors[Math.floor(R() * colors.length)], alpha: opts.alpha ?? 0.9 });
    }
    k.unclip();
  };

  // which side the light comes from: -1 left, 1 right. Mountains, trees and bushes use it.
  const light = dir => { k.scene.light = dir < 0 ? -1 : 1; };

  const sign = (text, o = {}) => {
    const x = o.x ?? W - 40, y = o.y ?? H - 34, size = o.size ?? 44, color = o.color ?? P.brightRed;
    Q(() => {
      const c = state.ctx; c.save();
      c.font = `600 ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
      c.textAlign = o.align ?? 'right'; c.fillStyle = color; c.globalAlpha = 0.92; c.fillText(text, x, y); c.restore();
    });
  };

  const seal = (text, x, y, size = 60) => {
    for (let i = 0; i < 6; i++) { const yy = y - size / 2 + (i + 0.5) * size / 6; stroke([[x - size / 2, yy], [x + size / 2, yy]], { brush: 'flat', size: size / 5, color: P.brightRed, alpha: 0.95, decay: 0.995, dry: 0.2 }); }
    Q(() => {
      const c = state.ctx; c.save();
      c.font = `600 ${size * 0.62}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f1e6da'; c.fillText(text, x, y + size * 0.03); c.restore();
    });
  };

  // walk along a path, pushing each point sideways by f(t), with t running 0 → 1 from start to end
  const along = (path, f) => path.map(([x, y], i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, d = typeof f === 'function' ? f(i / (path.length - 1)) : f;
    return [x - dy / l * d, y + dx / l * d];
  });

  // a soft patch of tone built from many faint criss-cross strokes: mist, stains, shadows, haze
  const drift = (cx, cy, rx, ry, o = {}) => {
    const color = o.color ?? '#ffffff', n = o.count ?? Math.round(rx * ry / 300), alpha = o.alpha ?? 0.06;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()), x = cx + Math.cos(a) * d * rx, y = cy + Math.sin(a) * d * ry, s = 30 + R() * 40;
      line(x - s, y - s * 0.4, x + s, y + s * 0.4, { brush: 'flat', size: 40 + R() * 40, color, alpha: alpha * (1 - d * 0.6), tints: false });
    }
  };

  // aged paper: a warm ground, darker toward the corners, with a few faint stains
  const paper = (o = {}) => {
    const colors = o.colors ?? ['#c8bb9c', '#ddd1b5', '#cdbf9f'], edge = o.edge ?? mix(colors[0], '#5a4a30', 0.25);
    gradient(0, H, colors);
    for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) drift(x, y, 560, 460, { color: edge, count: 260, alpha: o.edges ?? 0.035 });
    for (let i = 0; i < (o.stains ?? 3); i++) drift(R() * W, R() * H, 160 + R() * 120, 100 + R() * 80, { color: R() < 0.5 ? mix(colors[1], '#ffffff', 0.4) : edge, alpha: 0.05 });
  };

  return { line, dab, arc, wave, curve, fill, clear, gradient, disc, glow, shape, light, sign, seal, along, drift, paper };
}
