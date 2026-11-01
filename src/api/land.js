// The ground: mountains, rolling hills, mist, banks of land, grass, flowers, rocks.
import { W, H, P, lerp, clamp, mix, noise1, fbm } from '../engine.js';

export default function land(k) {
  const { R, stroke, rand, pick } = k;

  function ridge(base, n, hMax, x0, x1, rough) {
    const peaks = [];
    for (let i = 0; i < n; i++) peaks.push({ c: lerp(x0, x1, (i + R()) / n), h: lerp(hMax * 0.5, hMax, R()), w: lerp(hMax * 0.8, hMax * 1.6, R()), asym: 0.65 + R() * 0.7 });
    const nn = noise1(R), y = new Float32Array(W + 1);
    for (let x = 0; x <= W; x++) {
      let h = 0;
      for (const p of peaks) { const d = (x - p.c) / (x < p.c ? p.w * p.asym : p.w); h = Math.max(h, p.h * Math.pow(Math.max(0, 1 - Math.abs(d)), 1.15)); }
      const f = fbm(nn, x / 150, 6), g = 1 - Math.abs(fbm(nn, x / 60 + 97, 4)) * 2;
      h += (f * 2.2 + g) * rough * (0.3 + 0.7 * h / hMax);
      y[x] = base - Math.max(h, 14 + (f + 1) * 14);
    }
    return y;
  }

  // snow-capped range painted with a palette knife; snow only lands on slopes facing the light
  const mountains = (base, o = {}) => {
    const hz = k.scene.horizon, haze = o.haze ?? 0;
    const color = mix(o.color ?? '#262c42', hz, haze);
    const snow = mix(o.snow ?? '#ffffff', hz, haze * 0.5), shadow = mix(o.shadow ?? '#7c8cab', hz, haze);
    const L = o.light ?? k.scene.light, hMax = o.height ?? 300;
    const Rg = ridge(base + 6, o.peaks ?? 3, hMax, o.x0 ?? 0, o.x1 ?? W, o.rough ?? hMax * 0.16);
    let top = H; for (let x = 0; x <= W; x++) top = Math.min(top, Rg[x]);
    const pat = k.patternOf(g => { const lg = g.createLinearGradient(0, top, 0, base); lg.addColorStop(0, color); lg.addColorStop(1, mix(color, hz, 0.5)); g.fillStyle = lg; g.fillRect(0, 0, W, H); });
    const path = new Path2D(); path.moveTo(-5, Rg[0]);
    for (let x = 0; x <= W; x += 2) path.lineTo(x, Rg[x]);
    path.lineTo(W + 5, Rg[W]); path.lineTo(W + 5, base + 6); path.lineTo(-5, base + 6); path.closePath();
    k.clipTo(path);
    const body = { width: 46, bristles: 32, lw: 1.8, decay: 0.995, dry: 0.1, alpha: 0.95, color: pat, tints: [mix(color, '#000000', 0.3), mix(color, shadow, 0.4)] };
    for (let x = -20; x < W + 40; x += 24) {
      const t0 = Rg[clamp(Math.round(x), 0, W)];
      for (let y = t0 - 18; y < base + 14; y += 32) { const s = R() < 0.5 ? 1 : -1; k.raw([[x - 28 * s, y - 16], [x + 28 * s, y + 16]], body); }
    }
    for (let x = 4; x <= W - 4; x += 4) {
      const s = (Rg[x + 4] - Rg[x - 4]) / 8, y0 = Rg[x];
      if (s * L > 0.08) {
        for (let i = 0, n = R() < 0.55 ? 2 : 1; i < n; i++) {
          const sy = y0 + 2 + R() * (i ? 70 : 5); if (sy > base - 20) continue;
          const dx = L, dy = Math.abs(s) + 0.3 + R() * 0.35, l = Math.hypot(dx, dy), len = 18 + R() * 70;
          stroke([[x, sy], [x + dx / l * len, sy + dy / l * len]], { brush: 'knife', size: 8 + R() * 8, bristles: 12, color: snow, alpha: 0.95 * Math.max(0.15, 1 - (sy - y0) / 170), decay: 0.9 });
        }
      } else if (s * L < -0.08 && R() < 0.7) {
        const dx = -L, dy = Math.abs(s) + 0.3 + R() * 0.3, l = Math.hypot(dx, dy), len = 20 + R() * 50, sy = y0 + 3 + R() * 10;
        stroke([[x, sy], [x + dx / l * len, sy + dy / l * len]], { brush: 'knife', size: 10, bristles: 10, color: shadow, alpha: 0.45, decay: 0.92, dry: 0.85 });
      }
    }
    k.unclip();
  };

  const mist = (base, height = 120, color) => {
    const c = color ?? k.scene.horizon;
    for (let i = 0; i < 28; i++) {
      const y = base - Math.pow(R(), 2) * height;
      stroke(k.wave(-60, y, W + 60, y + R() * 10 - 5, 12), { brush: 'soft', size: 20 + R() * 30, bristles: 30, color: c, alpha: 0.1 * (0.5 + R() * 0.5), tints: false });
    }
  };

  // layers of rolling hills, far ones paler; the top edge of each catches the light
  const hills = (y, o = {}) => {
    const layers = o.layers ?? 3, height = o.height ?? 120, color = o.color ?? '#3f6a2c', hz = k.scene.horizon;
    const spacing = o.spacing ?? 60, nn = noise1(R);
    for (let i = 0; i < layers; i++) {
      const t = layers === 1 ? 1 : i / (layers - 1);
      const c = mix(color, hz, (o.haze ?? 0.6) * (1 - t)), base = y + i * spacing, off = R() * 100;
      const top = [];
      for (let x = -40; x <= W + 40; x += 20) top.push([x, base - height * (0.5 + 0.5 * fbm(nn, x / (420 - i * 60) + off, 3))]);
      k.shape([...top, [W + 40, H + 20], [-40, H + 20]], { color: [c, mix(c, '#000000', 0.15), mix(c, '#ffffff', 0.06)], size: 26, angle: 0.05 });
      const hi = mix(c, o.highlight ?? '#c9c46a', 0.45);
      for (const [x, yy] of top) for (let j = 0; j < 2; j++) {
        const px = x + rand(-10, 10), py = yy + rand(2, 14);
        stroke([[px, py], [px + rand(-6, 6), py - rand(4, 9)]], { brush: 'fan', size: 14 + t * 10, color: hi, alpha: 0.6, taper: false });
      }
    }
  };

  // a dark bank of land with grass highlights and a thin line of light where it meets the water
  const landBank = (poly, o = {}) => {
    const dark = o.color ?? '#2a2117', grass = o.grass ?? ['#5f8a2c', '#97a83a', '#c7b44c'];
    const cols = [dark, mix(dark, '#000000', 0.4), mix(dark, '#14231b', 0.5)];
    const path = new Path2D(); poly.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath();
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    k.clipTo(path);
    for (let y = y0 - 6; y < y1 + 14; y += 9) for (let x = x0 - 20; x < x1 + 20; x += 26) {
      const a = (R() - 0.5) * 0.4;
      stroke([[x, y], [x + 34, y + a * 34]], { brush: 'flat', size: 24, bristles: 17, color: pick(cols), alpha: 0.95, decay: 0.995, dry: 0.1, tints: false });
    }
    const nn = noise1(R);
    for (let i = 0; i < (x1 - x0) * (y1 - y0) / 220; i++) {
      const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()), near = 1 - (y - y0) / Math.max(1, y1 - y0);
      if (R() > (0.25 + 0.75 * near) * (0.5 + 0.5 * fbm(nn, x / 90 + y / 40, 3)) * 1.5) continue;
      const t = clamp((y - 560) / 440, 0, 1), sz = 4 + 15 * t;
      stroke([[x, y], [x + (R() - 0.5) * sz * 0.5, y - sz * (0.3 + R() * 0.4)]], { brush: 'fan', size: sz * 1.4, bristles: 9, color: mix(pick(grass), dark, 0.2 * R()), alpha: 0.8, decay: 0.85, dry: 0.8, taper: false });
    }
    k.unclip();
    const lc = mix(k.scene.horizon, '#ffffff', 0.3);
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      if ((ax <= 0 && bx <= 0) || (ax >= W && bx >= W) || (ay >= H && by >= H)) continue;
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6), dir = (ax + bx) / 2 < W / 2 ? 1 : -1;
      for (let j = 0; j < n; j++) {
        const x = lerp(ax, bx, j / n), y = lerp(ay, by, j / n), t = clamp((y - 560) / 440, 0, 1);
        stroke([[x - dir * 2, y], [x + dir * (6 + R() * 30 * t), y + R() - 0.5]], { brush: 'liner', size: 2 + 2 * t, color: lc, alpha: 0.7, decay: 0.95, dry: 0.6 });
      }
    }
  };

  // tufts of grass along a line, blades flicked upward
  const grass = (x0, x1, y, o = {}) => {
    const height = o.height ?? 34, colors = o.colors ?? ['#2f4a1e', '#4f7a28', '#7d9a34', '#b5b24a'];
    const density = o.density ?? 1;
    for (let x = x0; x < x1; x += 3 / density) {
      const h = height * rand(0.4, 1.1), lean = rand(-0.5, 0.5), by = y + rand(-4, 4);
      const c = R() < 0.6 ? colors[Math.floor(R() * Math.min(2, colors.length))] : pick(colors);
      stroke(k.curve([[x, by], [x + lean * h * 0.3, by - h * 0.55], [x + lean * h * 0.8, by - h]]), { brush: 'liner', size: rand(1.5, 3), color: c, alpha: 0.9, taper: true });
    }
  };

  const flowers = (x0, x1, y0, y1, o = {}) => {
    const colors = o.colors ?? [P.brightRed, P.cadmiumYellow, '#f4f1e8', '#b45fc2'], count = o.count ?? 80;
    for (let i = 0; i < count; i++) {
      const x = rand(x0, x1), y = rand(y0, y1), t = clamp((y - y0) / Math.max(1, y1 - y0), 0, 1), s = (o.size ?? 8) * (0.5 + t);
      k.line(x, y + s * 1.6, x + rand(-2, 2), y, { brush: 'liner', size: 1.6, color: '#3d5a22', alpha: 0.8 });
      k.dab(x, y, { size: s, color: pick(colors), alpha: 0.9 });
      k.dab(x - s * 0.15, y - s * 0.2, { size: s * 0.4, color: '#fff6d8', alpha: 0.6 });
    }
  };

  const rocks = (x, y, size = 60, o = {}) => {
    const color = o.color ?? '#4a4540', L = k.scene.light, nn = noise1(R), pts = [];
    for (let a = Math.PI; a <= Math.PI * 2 + 1e-6; a += Math.PI / 14) {
      const r = size * (0.75 + 0.35 * nn(a * 2));
      pts.push([x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.8]);
    }
    k.shape(pts, { color: [color, mix(color, '#000000', 0.3)], size: Math.max(8, size * 0.25), brush: 'knife', angle: 1.1 });
    for (let i = 0; i < size / 3; i++) {
      const a = Math.PI * (L < 0 ? rand(1.05, 1.5) : rand(1.5, 1.95)), r = size * rand(0.3, 0.95);
      const px = x + Math.cos(a) * r * 1.1, py = y + Math.sin(a) * r * 0.75;
      stroke([[px, py], [px + L * size * 0.18, py + size * 0.2]], { brush: 'knife', size: size * 0.12, color: mix(color, '#e8e0d0', 0.5), alpha: 0.7, decay: 0.85 });
    }
  };

  // a hard ink rock: solid black, dry-brush strokes that break up at the edges, grey knife marks for the planes
  const crag = (points, o = {}) => {
    const colors = o.colors ?? ['#0f0e0d', '#1b1a18', '#2a2825'], marks = o.marks ?? ['#4a4743', '#625e58'];
    k.shape(points, { color: colors });
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of points) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const area = (x1 - x0) * (y1 - y0), w = x1 - x0;
    for (let i = 0; i < area / 6000 * (o.texture ?? 1); i++) {
      const x = rand(x0 + w * 0.04, x1 - w * 0.04), y = rand(y0 + (y1 - y0) * 0.2, y1);
      k.line(x, y, x + rand(-80, 80), y + rand(-10, 25), { brush: 'flat', size: rand(14, 34), color: pick(colors), alpha: 0.7, dry: 0.9, decay: 0.95 });
    }
    for (let i = 0; i < area / 3500; i++) {
      const x = rand(x0 + w * 0.05, x1 - w * 0.1), y = rand(y0 + (y1 - y0) * 0.15, y1 - (y1 - y0) * 0.1);
      k.line(x, y, x + rand(20, 70), y + rand(-6, 35), { brush: 'knife', size: rand(4, 10), color: pick(marks), alpha: 0.5 });
    }
  };

  // a lone volcano like Fuji: a lit face, a shadow face, streaks down from the summit and mist at its foot
  const fuji = (x, base, height = 330, o = {}) => {
    const w = o.width ?? height * 1.7, top = base - height, L = k.scene.light;
    const lit = o.color ?? '#f8f7f3', shade = o.shade ?? '#d3cfc7';
    k.shape([[x - w / 2, base], [x - w * 0.09, top + 15], [x, top], [x + w * 0.09, top + 15], [x + w / 2, base]], { color: [lit, mix(lit, shade, 0.25)] });
    const s = L < 0 ? 1 : -1;
    k.shape([[x, top], [x + s * w * 0.09, top + 15], [x + s * w / 2, base], [x + s * w * 0.09, base], [x + s * w * 0.03, top + height * 0.36]], { color: [shade, mix(shade, '#000000', 0.04)] });
    for (let i = 0; i < 22; i++) {
      const t = R(), x0 = x + rand(-w * 0.045, w * 0.045), x1 = x - w / 2 + t * w, f = rand(0.2, 0.45);
      k.line(x0, top + 10, lerp(x0, x1, f), lerp(top + 10, base, f), { brush: 'round', size: rand(5, 10), color: (t - 0.5) * s > 0 ? mix(shade, '#000000', 0.03) : '#fbfaf7', alpha: 0.35, taper: true });
    }
    if (o.mist !== false) for (let i = 0; i < 140; i++) {
      const px = rand(x - w * 0.6, x + w * 0.6), py = rand(base - height * 0.2, base), len = rand(30, 70);
      k.line(px - len, py, px + len, py + rand(-6, 6), { brush: 'flat', size: rand(30, 60), color: o.mistColor ?? k.scene.horizon, alpha: 0.09, tints: false });
    }
  };

  // a sand beach from y down to the bottom edge, with faint ripple lines
  const beach = (y, o = {}) => {
    const color = o.color ?? '#efe6cf';
    k.shape([[-20, y], [W + 20, y], [W + 20, H + 20], [-20, H + 20]], { color: [color, mix(color, '#c9b98f', 0.12)], angle: 0 });
    for (let i = 0; i < 40; i++) { const yy = rand(y + 10, H - 10); k.line(rand(0, W * 0.8), yy, rand(W * 0.4, W), yy + rand(-4, 4), { brush: 'liner', size: 2, color: mix(color, '#8a7a55', 0.2), alpha: 0.5 }); }
  };

  return { mountains, mist, hills, land: landBank, grass, flowers, rocks, crag, fuji, beach };
}
