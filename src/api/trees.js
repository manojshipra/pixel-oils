// Trees and plants: evergreens, forests, bushes, a general branching tree, and sakura, maple, bare and palm trees built on it.
import { W, P, clamp, mix, noise1, fbm } from '../engine.js';

export default function trees(k) {
  const { R, stroke, rand, pick } = k;

  const evergreen = (x, by, h, o = {}) => {
    const col = o.color ?? '#14231b', hi = o.highlight === undefined ? '#6e8e3a' : o.highlight, L = o.light ?? k.scene.light;
    const top = by - h, trunkW = Math.max(1.2, h * 0.014);
    k.raw([[x, by + 3], [x + (R() - 0.5) * h * 0.02, top + h * 0.05]], { width: trunkW, bristles: Math.max(2, Math.round(trunkW)), lw: Math.max(0.8, trunkW * 0.5), decay: 1, dry: 0, alpha: 0.9, color: '#3a2a1e' });
    const step = Math.max(1.6, h / 75), maxW = h * (0.17 + R() * 0.07), bw = Math.max(2.5, h * 0.026), dark = mix(col, '#000000', 0.35);
    for (let y = top; y < by - h * 0.06; y += step * (0.7 + R() * 0.6)) {
      const d = (y - top) / h, hw = maxW * Math.pow(d, 0.85) * (0.7 + R() * 0.5) + 1.5;
      for (const s of [-1, 1]) {
        const len = hw * (0.75 + R() * 0.4), droop = len * (0.22 + R() * 0.25);
        k.raw([[x, y], [x + s * len * 0.55, y + droop * 0.35], [x + s * len, y + droop]],
          { width: bw * (0.7 + d * 0.6), bristles: clamp(bw * 0.9, 4, 14), lw: Math.max(0.7, h * 0.0035), decay: 0.975, dry: 0.55, alpha: 0.9, color: col, tints: [dark], taper: true });
      }
    }
    if (!hi) return;
    const warm = mix(hi, P.cadmiumYellow, 0.35);
    for (let y = top + h * 0.06; y < by - h * 0.1; y += step * (1.3 + R() * 0.8)) {
      const d = (y - top) / h, hw = maxW * Math.pow(d, 0.85) * (0.55 + R() * 0.35), sx = x + L * hw * 0.12, len = hw * (0.6 + R() * 0.4);
      k.raw([[sx, y], [sx + L * len, y + len * 0.3]], { width: bw * 0.8, bristles: clamp(bw * 0.7, 3, 10), lw: Math.max(0.7, h * 0.003), decay: 0.93, dry: 0.85, alpha: 0.85, color: hi, tints: [warm], taper: true });
    }
  };

  // evergreens scattered between x0 and x1, smaller toward the back (toward y - depth)
  const forest = (x0, x1, y, o = {}) => {
    const count = o.count ?? 12, height = o.height ?? 220, depth = o.depth ?? 60;
    const list = [];
    for (let i = 0; i < count; i++) { const t = R(); list.push({ x: rand(x0, x1), y: y - depth * (1 - t), h: height * (0.45 + 0.55 * t) * rand(0.8, 1.15) }); }
    list.sort((a, b) => a.y - b.y).forEach(t => evergreen(t.x, t.y, t.h, o));
  };

  const treeLine = (y, o = {}) => {
    const hz = k.scene.horizon, col = mix(o.color ?? '#14231b', hz, 0.3), hi = mix('#6e8e3a', hz, 0.35);
    for (let x = -40; x < W + 40; x += 110) stroke([[x, y - 3], [x + 140, y - 2]], { brush: 'flat', size: 12, color: col, alpha: 0.95, decay: 1, dry: 0 });
    const nn = noise1(R);
    for (let x = -5; x < W + 5; x += 5 + R() * 9) {
      const n = fbm(nn, x / 110, 3); if (n < -0.32) continue;
      const h = (o.height ?? 30) * (0.4 + (0.5 + 0.5 * n)) * (0.6 + R() * 0.6);
      evergreen(x, y - 2, h, { color: col, highlight: h > 28 ? hi : null });
    }
  };

  const bush = (x, y, size = 50, o = {}) => {
    const dark = o.color ?? '#1d2a1a', hi = o.highlight ?? '#6e8e3a', L = o.light ?? k.scene.light;
    const rx = size, ry = size * 0.6, sz = 4 + size * 0.14, n = Math.round(rx * ry / 28) + 6;
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, rr = Math.sqrt(R()), px = x + Math.cos(a) * rr * rx, py = y - Math.abs(Math.sin(a)) * rr * ry * 1.3 + ry * 0.15;
      stroke([[px, py], [px + (R() - 0.5) * 4, py - sz * 0.6]], { brush: 'fan', size: sz, bristles: 7, color: dark, alpha: 0.85, decay: 0.9, dry: 0.4, taper: false });
    }
    for (let i = 0; i < n * 0.6; i++) {
      const a = R() * 6.28, rr = Math.sqrt(R()), dx = Math.cos(a) * rr, dy = -Math.abs(Math.sin(a)) * rr;
      if (dx * L - dy * 0.8 < 0.15) continue;
      const px = x + dx * rx, py = y + dy * ry * 1.3;
      const c = o.flowers && R() < 0.15 ? pick(o.flowers) : mix(hi, P.cadmiumYellow, R() * 0.4);
      stroke([[px, py], [px + (R() - 0.5) * 3, py - sz * 0.4]], { brush: 'fan', size: sz * 0.7, bristles: 5, color: c, alpha: 0.8, decay: 0.85, dry: 0.8, taper: false });
    }
  };

  // A branching tree. Each branch splits into 2 or 3 shorter ones until depth runs out;
  // leaves are tapped onto the tips. Returns the tip positions so you can add your own.
  const tree = (x, y, o = {}) => {
    const height = o.height ?? 320, depth = o.depth ?? 8, spread = o.spread ?? 0.55, bendAmt = o.bend ?? 0.18;
    const reach = o.reach ?? 0.08, droop = o.droop ?? 0, shrink = o.shrink ?? 0.75;
    const bark = o.bark ?? mix(P.vanDykeBrown, P.midnightBlack, 0.5), barkHi = mix(bark, '#d8c8a8', 0.35);
    const width = o.width ?? height * 0.12, L = k.scene.light, tips = [];
    function branch(x, y, ang, len, w, d) {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len, bend = rand(-bendAmt, bendAmt) * len;
      const mx = (x + x2) / 2 - Math.sin(ang) * bend, my = (y + y2) / 2 + Math.cos(ang) * bend;
      stroke([[x, y], [mx, my], [x2, y2]], { brush: 'round', size: w, color: bark });
      if (w > 6) stroke([[x + L * w * 0.25, y], [mx + L * w * 0.25, my], [x2 + L * w * 0.2, y2]], { brush: 'round', size: w * 0.3, color: barkHi, alpha: 0.5, dry: 0.8, decay: 0.97 });
      if (d === 0 || len < 5) { tips.push([x2, y2, ang]); return; }
      const kids = d > depth - 2 ? 2 : (R() < (o.forks ?? 0.33) ? 3 : 2);
      for (let i = 0; i < kids; i++) {
        let a = ang + (i - (kids - 1) / 2) * rand(spread * 0.7, spread * 1.3) + rand(-0.15, 0.15);
        a += Math.cos(a) > 0 ? reach : -reach;
        a += droop * (depth - d) / depth * (Math.cos(a) > 0 ? 1 : -1);
        branch(x2, y2, a, len * rand(shrink - 0.07, shrink + 0.07), Math.max(1.2, w * 0.68), d - 1);
      }
    }
    branch(x, y, -Math.PI / 2 + (o.lean ?? 0), height / 3.2, width, depth);
    if (o.leaves !== false) {
      const colors = o.leafColors ?? ['#3d6b2a', '#5c8a32', '#8aa83a'], size = o.leafSize ?? height * 0.035, cl = o.cluster ?? 8, spreadL = size * 2.4;
      const shade = colors.map(c => mix(c, o.leafShade ?? '#000000', 0.4));
      for (const [tx, ty] of tips) for (let i = 0; i < cl * 0.5; i++) k.dab(tx + rand(-spreadL, spreadL), ty + rand(-spreadL * 0.5, spreadL), { size: size * rand(0.8, 1.4), color: pick(shade), alpha: 0.8 });
      for (const [tx, ty] of tips) for (let i = 0; i < cl; i++) k.dab(tx + rand(-spreadL, spreadL), ty + rand(-spreadL, spreadL * 0.7), { size: size * rand(0.6, 1.2), color: pick(colors), alpha: 0.85 });
      const hi = o.leafHighlight ?? mix(colors[colors.length - 1], '#fff6d0', 0.45);
      for (const [tx, ty] of tips) for (let i = 0; i < cl * 0.3; i++) k.dab(tx + L * rand(0, spreadL), ty - rand(0, spreadL), { size: size * rand(0.4, 0.8), color: hi, alpha: 0.8 });
    }
    return tips;
  };

  const sakura = (x, y, height = 420, o = {}) => {
    const tips = tree(x, y, { height, depth: 8, spread: 0.6, reach: 0.1, leafSize: height * 0.028, cluster: 9,
      leafColors: ['#f3c6cf', '#eaa3b3', '#f7dce2', '#d97f95'], leafShade: '#9a3a55', leafHighlight: '#fff4f6', ...o });
    for (let i = 0; i < (o.petals ?? 120); i++) k.dab(x + rand(-height, height), y - rand(-40, height * 0.9), { size: rand(3, 7), color: pick(['#f3c6cf', '#eaa3b3', '#fff0f3']), alpha: 0.8 });
    return tips;
  };

  const maple = (x, y, height = 380, o = {}) => tree(x, y, { height, depth: 7, spread: 0.65, reach: 0.06, leafSize: height * 0.045, cluster: 12,
    leafColors: ['#a3261a', '#d0521e', '#e88a2a', '#c43b2a'], leafShade: '#4a1208', leafHighlight: '#f6c25a', ...o });

  const bareTree = (x, y, height = 380, o = {}) => {
    const tips = tree(x, y, { height, depth: 8, spread: 0.45, forks: 0.15, width: height * 0.08, leaves: false, ...o });
    for (const [tx, ty, a] of tips) for (let i = 0; i < 2; i++) {
      const b = a + rand(-0.6, 0.6), len = rand(8, 22);
      k.line(tx, ty, tx + Math.cos(b) * len, ty + Math.sin(b) * len, { brush: 'liner', size: 1.4, color: o.bark ?? '#2b241e', taper: true });
    }
    return tips;
  };

  // a palm: curved ringed trunk and drooping fronds made of many short leaflets
  const palm = (x, y, height = 420, o = {}) => {
    const lean = o.lean ?? 0.25, trunk = o.bark ?? '#5b4630', green = o.color ?? '#2f5a26', hi = mix(green, '#c9d36a', 0.5);
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([x + Math.sin(t * 1.4) * lean * height * 0.5, y - t * height]); }
    stroke(pts, { brush: 'round', size: height * 0.07, color: trunk, taper: false, decay: 1 });
    for (let i = 1; i < 12; i++) {
      const [px, py] = pts[i], w = height * 0.035 * (1 - i / 20);
      k.line(px - w, py, px + w, py + 3, { brush: 'liner', size: 2, color: mix(trunk, '#000000', 0.4), alpha: 0.7 });
    }
    const [cx, cy] = pts[12], n = o.fronds ?? 11, dark = mix(green, '#000000', 0.35);
    for (let f = 0; f < n; f++) {
      const ang = -Math.PI / 2 + (f / (n - 1) - 0.5) * Math.PI * 1.8 + rand(-0.12, 0.12), len = height * rand(0.38, 0.52);
      const side0 = Math.cos(ang) >= 0 ? 1 : -1, spine = [];
      for (let s = 0; s <= 18; s++) {
        const t = s / 18, a = ang + t * t * 1.1 * side0;
        spine.push([cx + Math.cos(a) * len * t, cy + Math.sin(a) * len * t + t * t * len * 0.4]);
      }
      // leaflets hang from the midrib, longest in the middle of the frond, dark underneath and lit on top
      for (const [pass, col, a] of [[0, dark, 0.95], [1, green, 0.9], [2, hi, 0.8]]) {
        for (let s = 1; s < spine.length; s++) for (const side of pass === 2 ? [-1] : [-1, 1]) {
          const [sx, sy] = spine[s], [qx, qy] = spine[s - 1], dx = sx - qx, dy = sy - qy, l = Math.hypot(dx, dy) || 1;
          const ll = len * 0.24 * Math.pow(Math.sin(Math.PI * s / spine.length), 0.7) * (pass === 2 ? 0.6 : 1);
          const lx = -dy / l * side, ly = Math.abs(dx / l) * 0.4 + 0.6;
          stroke([[sx, sy], [sx + lx * ll * 0.6 + dx * 0.8, sy + ly * ll * 0.5], [sx + lx * ll * 0.8 + dx * 1.2, sy + ly * ll]],
            { brush: 'fan', size: 9, bristles: 6, color: col, alpha: a, taper: true });
        }
      }
      stroke(spine, { brush: 'liner', size: 3, color: mix(green, '#e3d9a0', 0.3), alpha: 0.8 });
    }
  };

  // A limb or trunk along a few control points: strands of bark that twist around the centre line,
  // grey ridges that follow the grain, and a lit edge. Thick at the first point, thin at the last. Returns the path.
  const INK = ['#121010', '#1c1919', '#282424', '#3a3534'];
  const limb = (points, width = 30, o = {}) => {
    const path = k.curve(points), colors = o.colors ?? INK, taper = o.taper ?? 0.72, L = k.scene.light;
    const wAt = t => width * (1 - t * taper);
    for (let s = 0; s < (o.strands ?? 10); s++) {
      const ph = rand(0, 6.28), turns = rand(4, 10), off = rand(-0.4, 0.4);
      stroke(k.along(path, t => wAt(t) * (Math.sin(ph + t * turns) * 0.32 + off)), { brush: 'round', size: width * rand(0.25, 0.5), color: pick(colors), alpha: rand(0.75, 0.95), dry: 0.45, decay: 0.993, taper: true });
    }
    if (o.grain !== false && path.length > 10) for (let i = 0; i < path.length * width / 50; i++) {
      const j = Math.floor(rand(0, path.length - 8)), n = Math.floor(rand(3, 8)), w = wAt(j / path.length), side = rand(-0.45, 0.2);
      stroke(k.along(path.slice(j, j + n), w * side), { brush: 'round', size: Math.max(1.5, w * rand(0.03, 0.08)), color: pick(['#6f6a66', '#8f8a85', '#4c4744']), alpha: 0.55, taper: true, dry: 0.6 });
    }
    stroke(k.along(path, t => L * wAt(t) * 0.33), { brush: 'round', size: width * 0.12, color: o.highlight ?? '#a29c96', alpha: 0.45, dry: 0.9, decay: 0.97, taper: true });
    return path;
  };

  // Thin twigs off a limb's path. Each splits in two \`depth\` times. Directions are the limb's own
  // direction ± a bit, or pick a fixed range with angle: [min, max] (radians; 0 = right, π/2 = down).
  // wind: [dx, dy] bends every twig, e.g. [-0.12, 0.12] for a wind blowing left. Returns the tips.
  const twigs = (path, count = 10, o = {}) => {
    const len = o.length ?? 60, w0 = o.width ?? 4, spread = o.spread ?? 0.6, [wx, wy] = o.wind ?? [0, 0], color = o.color ?? '#1a1717', tips = [];
    const grow = (x, y, ang, l, w, d) => {
      const x2 = x + Math.cos(ang) * l + wx * l, y2 = y + Math.sin(ang) * l + wy * l;
      stroke([[x, y], [(x + x2) / 2 + rand(-0.12, 0.12) * l, (y + y2) / 2 + rand(-0.12, 0.12) * l], [x2, y2]], { brush: 'round', size: w, color, taper: true, decay: 1 });
      tips.push([x2, y2]);
      if (d > 0) for (let i = 0; i < 2; i++) grow(x2, y2, ang + rand(-spread, spread), l * rand(0.55, 0.75), Math.max(1.2, w * 0.6), d - 1);
    };
    for (let i = 0; i < count; i++) {
      const j = Math.max(1, Math.floor(rand(path.length * (o.from ?? 0.2), path.length - 1))), [x, y] = path[j], [px, py] = path[j - 1];
      const ang = o.angle ? rand(o.angle[0], o.angle[1]) : Math.atan2(y - py, x - px) + rand(-1.3, 1.3);
      grow(x, y, ang, len * rand(0.6, 1.2), w0, o.depth ?? 2);
    }
    return tips;
  };

  // a cluster of blossom: shadow colour underneath, middle colours, a few near-white petals on top
  const PINKS = ['#a8405f', '#d9708e', '#ee9fb5', '#fcdce5', '#fff2f5'];
  const blossom = (x, y, r = 25, o = {}) => {
    const c = o.colors ?? PINKS, at = sy => { const a = rand(0, 6.28), d = Math.sqrt(R()) * r; return [x + Math.cos(a) * d, y + Math.sin(a) * d * sy]; };
    for (let i = 0; i < r * 0.5; i++) { const [px, py] = at(0.7); k.dab(px, py + r * 0.15, { size: rand(7, 12), color: c[0], alpha: 0.85 }); }
    for (let i = 0; i < r * 0.8; i++) { const [px, py] = at(0.65); k.dab(px, py, { size: rand(6, 11), color: pick([c[1], c[2]]), alpha: 0.9 }); }
    for (let i = 0; i < r * 0.45; i++) { const [px, py] = at(0.5); k.dab(px, py - r * 0.2, { size: rand(4, 9), color: pick(c.slice(3)), alpha: 0.9 }); }
  };

  // A mass of foliage over a list of [x, y, rx, ry] ellipses. Colours run dark → light.
  // layer: 'shadow' paints just the dark underlayer, 'leaves' everything else, 'all' both.
  // Paint 'shadow', then the limbs, then 'leaves', and the branches sit inside the foliage.
  const canopy = (blobs, o = {}) => {
    const c = o.colors ?? ['#1f3a1a', '#2f5a26', '#4f7f33', '#79a442', '#b4cf6a'], layer = o.layer ?? 'all', dens = o.density ?? 1;
    const area = blobs.reduce((s, b) => s + Math.PI * b[2] * b[3], 0) / 1000 * dens;
    const inside = () => { const [x, y, rx, ry] = pick(blobs), a = rand(0, 6.28), d = Math.sqrt(R()); return [x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry]; };
    if (layer !== 'leaves') for (let i = 0; i < area * 4.5; i++) { const [x, y] = inside(); k.dab(x, y + 15, { size: rand(10, 20), color: pick(c.slice(0, 2)), alpha: 0.85 }); }
    if (layer === 'shadow') return;
    for (let i = 0; i < area * 5.8; i++) { const [x, y] = inside(); k.dab(x, y, { size: rand(7, 15), color: pick(c.slice(1, 4)), alpha: 0.88 }); }
    const L = k.scene.light;
    for (let i = 0; i < area * 2.1; i++) { const [x, y] = inside(); k.dab(x + L * 10, y - 15, { size: rand(5, 11), color: pick(c.slice(3)), alpha: 0.9 }); }
    for (let i = 0; i < area * 0.8 * (o.spatter ?? 1); i++) {
      const [x, y] = inside(), a = rand(0, 6.28), d = rand(40, 180);
      k.dab(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, { size: rand(2.5, 6), color: pick(c.slice(1, 4)), alpha: 0.85 });
    }
  };

  // a flat pad of pine needles: a dark underside, then short needles flicked upward
  const pinePad = (x, y, rx, ry, o = {}) => {
    const colors = o.colors ?? ['#0c0c0b', '#171615', '#24221f'], under = o.under ?? ['#1d1b18', '#2b2824'];
    for (let i = 0; i < rx * ry / 18; i++) { const a = rand(0, 6.28), d = Math.sqrt(R()); k.dab(x + Math.cos(a) * d * rx * 0.9, y + Math.sin(a) * d * ry * 0.6 + ry * 0.2, { size: rand(10, 20), color: pick(under), alpha: 0.75 }); }
    for (let i = 0; i < rx * ry / 6; i++) {
      const a = rand(0, 6.28), d = Math.sqrt(R()), px = x + Math.cos(a) * d * rx, py = y + Math.sin(a) * d * ry, na = -Math.PI / 2 + rand(-1.2, 1.2), len = rand(6, 15);
      k.line(px, py, px + Math.cos(na) * len, py + Math.sin(na) * len, { brush: 'liner', size: rand(1.2, 2.4), color: pick(colors), alpha: 0.8, taper: true });
    }
  };

  // loose petals or leaves tumbling through a box, each a small curled teardrop
  const petals = (count = 200, o = {}) => {
    const x0 = o.x0 ?? 0, x1 = o.x1 ?? W, y0 = o.y0 ?? 0, y1 = o.y1 ?? H, [s0, s1] = o.size ?? [8, 18], colors = o.colors ?? PINKS.slice(0, 4);
    for (let i = 0; i < count; i++) {
      const x = rand(x0, x1), y = rand(y0, y1), s = rand(s0, s1), a = rand(0, 6.28), c = Math.cos(a), sn = Math.sin(a), bend = rand(-0.5, 0.5) * s;
      stroke([[x, y], [x + c * s * 0.5 - sn * bend, y + sn * s * 0.5 + c * bend], [x + c * s, y + sn * s]], { brush: 'round', size: s * 0.75, color: pick(colors), alpha: 0.9, taper: true });
    }
  };

  return { evergreen, forest, treeLine, bush, tree, sakura, maple, bareTree, palm, limb, twigs, blossom, canopy, pinePad, petals };
}
