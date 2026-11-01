// Things in the sky: clouds, sun, moon, stars, nebulae, auroras, birds.
import { W, H, P, state, lerp, clamp, mix, ramp } from '../engine.js';

export default function sky(k) {
  const { Q, R, stroke, rand, noise } = k;

  const cloud = (x, base, w, o = {}) => {
    const col = o.color ?? '#ffffff', shade = mix(col, o.shade ?? '#6189b6', 0.5);
    const np = 3 + Math.floor(R() * 4), puffs = [];
    for (let i = 0; i < np; i++) {
      const rel = i / (np - 1) - 0.5, rad = w * (0.13 + R() * 0.12) * (1 - Math.abs(rel) * 0.9);
      puffs.push({ x: x + rel * w + (R() - 0.5) * 30, y: base - rad * 0.45, r: rad });
    }
    const top = Math.min(...puffs.map(p => p.y - p.r));
    for (let i = 0; i < w * 1.3; i++) {
      const p = puffs[Math.floor(R() * np)], a = R() * 6.28, rr = Math.sqrt(R()) * p.r;
      const px = p.x + Math.cos(a) * rr, py = p.y + Math.sin(a) * rr * 0.8;
      if (py > base) continue;
      const up = clamp((base - py) / (base - top), 0, 1), rad = 5 + R() * 9, ph = R() * 6.28, loop = [];
      for (let j = 0; j <= 11; j++) loop.push([px + Math.cos(ph + j / 8 * 6.28) * rad, py + Math.sin(ph + j / 8 * 6.28) * rad * 0.7]);
      stroke(loop, { brush: 'flat', size: rad * 1.3, color: mix(shade, col, Math.pow(up, 0.7)), alpha: 0.18 + 0.3 * up, decay: 0.97, dry: 0.5, tints: false });
    }
    for (let i = 0; i < 5; i++) { const y = base + 6 + R() * 26, xx = x + (R() - 0.5) * w; stroke(k.wave(xx - 80, y, xx + 140, y + R() * 6, 4), { brush: 'liner', size: 4, color: col, alpha: 0.25 }); }
  };

  const sun = (x, y, r = 70, o = {}) => {
    const color = o.color ?? '#ffd36b';
    if (o.glow !== false) { k.glow(x, y, r * 6, mix(color, '#ffffff', 0.3), 0.35); k.glow(x, y, r * 2.2, '#fff6dc', 0.4); }
    k.disc(x, y, r, color);
    k.disc(x - r * 0.15, y - r * 0.15, r * 0.6, mix(color, '#ffffff', 0.55), 0.5);
  };

  // phase: 1 is full, 0.5 is half (lit on the right), 0 is new
  const moon = (x, y, r = 60, o = {}) => {
    const color = o.color ?? '#ece6d4', phase = clamp(o.phase ?? 1, 0, 1), dark = o.dark ?? '#0d1626';
    if (o.glow !== false) k.glow(x, y, r * 4, '#dfe8f0', 0.22);
    k.disc(x, y, r, color);
    const crater = mix(color, '#7d7f88', 0.45);
    for (let i = 0; i < 18; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * r * 0.72;
      k.dab(x + Math.cos(a) * d, y + Math.sin(a) * d, { size: r * rand(0.06, 0.2), color: crater, alpha: 0.3 });
    }
    if (phase < 0.995) {
      const shadow = [];
      for (let t = -Math.PI / 2; t <= Math.PI / 2 + 1e-6; t += Math.PI / 40) shadow.push([x - r * Math.cos(t), y + r * Math.sin(t)]);
      for (let t = Math.PI / 2; t >= -Math.PI / 2 - 1e-6; t -= Math.PI / 40) shadow.push([x - r * (2 * phase - 1) * Math.cos(t), y + r * Math.sin(t)]);
      Q(() => {
        const c = state.ctx, path = new Path2D();
        shadow.forEach(([px, py], i) => i ? path.lineTo(px, py) : path.moveTo(px, py));
        path.closePath(); c.save(); c.globalAlpha = 0.9; c.fillStyle = dark; c.fill(path); c.restore();
      });
    }
  };

  const stars = (count = 300, o = {}) => {
    const y0 = o.y0 ?? 0, y1 = o.y1 ?? H, x0 = o.x0 ?? 0, x1 = o.x1 ?? W, color = o.color ?? P.titaniumWhite;
    for (let i = 0; i < count; i++) {
      const x = rand(x0, x1), y = rand(y0, y1), m = Math.pow(R(), 3);
      const c = mix(color, R() < 0.5 ? '#ffd9a0' : '#a8c4ff', R() * 0.5);
      k.dab(x, y, { brush: 'liner', size: 1 + m * 3, color: c, alpha: 0.35 + 0.65 * m });
      if (R() < (o.twinkle ?? 0.03)) {
        const s = 6 + R() * 12;
        k.line(x - s, y, x + s, y, { brush: 'liner', size: 1.2, color: c, alpha: 0.7 });
        k.line(x, y - s, x, y + s, { brush: 'liner', size: 1.2, color: c, alpha: 0.7 });
        k.glow(x, y, s * 1.6, c, 0.35);
      }
    }
  };

  // clouds of glowing gas: soft strokes that follow a swirling flow, plus dark dust lanes
  const nebula = (x, y, r = 300, o = {}) => {
    const colors = o.colors ?? [P.alizarinCrimson, '#7b3fa0', P.phthaloBlue, '#e3a857'];
    const swirl = o.swirl ?? 1.2, off = R() * 100;
    for (let i = 0; i < (o.density ?? 70); i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * r;
      let px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7;
      const pts = [[px, py]];
      for (let s = 0; s < 14; s++) {
        const ang = noise(px / 260 + off) * Math.PI * swirl + noise(py / 260 + off * 2) * Math.PI * swirl;
        px += Math.cos(ang) * r * 0.06; py += Math.sin(ang) * r * 0.06;
        pts.push([px, py]);
      }
      const c = colors[i % colors.length];
      stroke(pts, { brush: 'soft', size: r * rand(0.2, 0.5), color: c, alpha: 0.025, blend: 'lighter', tints: false });
      // puffs of glowing gas along the flow
      for (let s = 0; s < pts.length; s += 3) k.glow(pts[s][0], pts[s][1], r * rand(0.06, 0.18), c, 0.1);
    }
    for (let i = 0; i < 6; i++) k.glow(x + rand(-r, r) * 0.6, y + rand(-r, r) * 0.4, r * rand(0.1, 0.3), mix(colors[i % colors.length], '#ffffff', 0.4), 0.35);
    for (let i = 0; i < (o.dust ?? 8); i++) {
      const yy = y + rand(-r, r) * 0.5;
      stroke(k.wave(x - r * 0.8, yy, x + r * 0.8, yy + rand(-r, r) * 0.3, r * 0.2), { brush: 'soft', size: r * 0.12, color: '#05060a', alpha: 0.12, tints: false });
    }
  };

  // curtains of light: vertical streaks hanging from a wavy lower edge, green at the bottom fading to violet
  const aurora = (y = 320, o = {}) => {
    const colors = o.colors ?? ['#4dffa6', '#2fd08f', '#6b5cf0'], height = o.height ?? 260;
    const x0 = o.x0 ?? 0, x1 = o.x1 ?? W, off = R() * 50;
    for (let x = x0; x < x1; x += 3) {
      const base = y + noise(x / 280 + off) * 70 + noise(x / 70 + off) * 15;
      const h = height * (0.45 + 0.55 * (0.5 + 0.5 * noise(x / 160 + off * 3)));
      const a = 0.05 + 0.08 * (0.5 + 0.5 * noise(x / 90 + off * 5));
      for (let s = 0; s < 3; s++) {
        const ya = base - h * s / 3, yb = base - h * (s + 1) / 3;
        stroke([[x, ya], [x + (R() - 0.5) * 3, yb]], { brush: 'round', size: 5, color: ramp(colors, s / 2), alpha: a * (1 - s * 0.28), blend: 'lighter', tints: false });
      }
    }
    for (let x = x0; x < x1; x += 40) {
      const pts = [];
      for (let xx = x; xx <= Math.min(x1, x + 60); xx += 6) pts.push([xx, y + noise(xx / 280 + off) * 70 + noise(xx / 70 + off) * 15]);
      if (pts.length > 1) stroke(pts, { brush: 'soft', size: 10, color: colors[0], alpha: 0.1, blend: 'lighter', tints: false });
    }
  };

  const birds = (n = 5, o = {}) => {
    const x0 = o.x0 ?? W * 0.3, x1 = o.x1 ?? W * 0.7, y0 = o.y0 ?? H * 0.15, y1 = o.y1 ?? H * 0.35;
    const color = o.color ?? '#2a2a2e', size = o.size ?? 16;
    for (let i = 0; i < n; i++) {
      const x = rand(x0, x1), y = rand(y0, y1), s = size * rand(0.6, 1.3), lift = rand(0.2, 0.6);
      stroke(k.curve([[x - s, y - s * lift], [x - s * 0.45, y - s * 0.35], [x, y]]), { brush: 'liner', size: 2.5, color, taper: true });
      stroke(k.curve([[x + s, y - s * lift], [x + s * 0.45, y - s * 0.35], [x, y]]), { brush: 'liner', size: 2.5, color, taper: true });
    }
  };

  // a flat painted disc with a mottled, rubbed-in texture: a gold-leaf moon, a red rising sun
  const orb = (x, y, r, o = {}) => {
    const color = o.color ?? '#d2a03a', tones = o.tones ?? [mix(color, '#fff3b0', 0.35), mix(color, '#ffffff', 0.4), mix(color, '#5a3a00', 0.25), mix(color, '#000000', 0.06)];
    k.disc(x, y, r, color);
    for (let i = 0; i < r * r / 46; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * (r - 12), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d, s = 6 + R() * 10;
      k.line(px - s, py, px + s, py + rand(-3, 3), { brush: 'flat', size: 8 + R() * 10, color: k.pick(tones), alpha: o.texture ?? 0.22, tints: false });
    }
    for (let i = 0; i < 3; i++) { const a = R() * 6.28, d = R() * r * 0.5, s = r * (0.15 + R() * 0.15); k.drift(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s * 0.7, { color: tones[1], alpha: 0.1 }); }
  };

  return { cloud, sun, moon, stars, nebula, aurora, birds, orb };
}
