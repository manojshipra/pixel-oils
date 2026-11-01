// Space: a ray-traced black hole, planets with rings, spiral galaxies.
import { P, state, clamp, mix, ramp } from '../engine.js';

// ---- black hole physics (units of the black hole mass M, so the horizon is at r = 2) ----
//
// A photon's path around a non-spinning (Schwarzschild) black hole stays in one plane and obeys
//   u'' + u = 3u^2,  with u = 1/r and ' = d/dphi.
// We trace backwards from the camera: a ray leaving the image at polar angle alpha and distance b
// from the centre starts with u = 0, u' = 1/b. The thin disk lies in the equatorial plane; the ray
// first meets it at phi0 (the direct image) and again at phi0 + pi (the image lensed around the hole).
// Painting along curves of equal disk radius ("isoradials") is how Luminet drew the first image in 1979.

const SHADOW = 3 * Math.sqrt(3); // apparent radius of the shadow (critical impact parameter)

function traceRay(b, p0, p1) {
  let u = 0, w = 1 / b, phi = 0, target = p0, which = 0, r0 = NaN, r1 = NaN;
  const f = q => 3 * q * q - q, h = 0.015;
  for (let it = 0; it < 5000; it++) {
    let s = h, hit = false;
    if (phi + s >= target) { s = target - phi; hit = true; }
    const k1u = w, k1w = f(u);
    const k2u = w + 0.5 * s * k1w, k2w = f(u + 0.5 * s * k1u);
    const k3u = w + 0.5 * s * k2w, k3w = f(u + 0.5 * s * k2u);
    const k4u = w + s * k3w, k4w = f(u + s * k3u);
    u += s / 6 * (k1u + 2 * k2u + 2 * k3u + k4u);
    w += s / 6 * (k1w + 2 * k2w + 2 * k3w + k4w);
    phi += s;
    if (u >= 0.5 || u <= 0) break; // fell through the horizon, or flew back out to infinity
    if (hit) {
      if (which === 0) { r0 = 1 / u; which = 1; target = p1; }
      else { r1 = 1 / u; break; }
    }
  }
  return [r0, r1];
}

const tables = new Map();
// For each image angle alpha and each impact parameter b: the disk radius hit by the direct and lensed ray.
function traceTables(inc, bMax) {
  const key = inc.toFixed(3) + ':' + bMax.toFixed(1);
  if (tables.has(key)) return tables.get(key);
  const NA = 180, NB = 220, NF = 140;
  const alphas = Float64Array.from({ length: NA }, (_, i) => i / NA * Math.PI * 2);
  const bMain = Float64Array.from({ length: NB }, (_, i) => 0.4 + (bMax - 0.4) * i / (NB - 1));
  // lensed images hug the shadow edge, so sample just outside it very finely
  const bFine = Float64Array.from({ length: NF }, (_, i) => SHADOW + 0.002 * Math.pow(3000, i / (NF - 1)));
  const direct = new Float64Array(NA * NB), lensed = new Float64Array(NA * NF);
  const ci = Math.cos(inc), si = Math.sin(inc);
  for (let a = 0; a < NA; a++) {
    // where this ray's plane cuts the disk plane
    let p0 = Math.atan2(-ci, Math.sin(alphas[a]) * si);
    if (p0 <= 0) p0 += Math.PI;
    for (let j = 0; j < NB; j++) direct[a * NB + j] = traceRay(bMain[j], p0, p0 + Math.PI)[0];
    for (let j = 0; j < NF; j++) lensed[a * NF + j] = traceRay(bFine[j], p0, p0 + Math.PI)[1];
  }
  const t = { alphas, bMain, bFine, direct, lensed, NA, NB, NF };
  tables.set(key, t);
  return t;
}

// impact parameter at which the ray along alpha row `a` hits disk radius R (outermost crossing), or NaN
function crossing(rs, bs, row, n, R) {
  for (let j = n - 1; j > 0; j--) {
    const r1 = rs[row * n + j], r0 = rs[row * n + j - 1];
    if (!isFinite(r1) || !isFinite(r0)) continue;
    if ((r1 - R) * (r0 - R) <= 0 && r1 !== r0) return bs[j - 1] + (bs[j] - bs[j - 1]) * (R - r0) / (r1 - r0);
  }
  return NaN;
}

const HOT = ['#1c0400', '#5e1203', '#a82d07', '#e0611a', '#f9a03c', '#ffd58a', '#fff3dc', '#ffffff', '#dfe8ff'];

export default function space(k) {
  const { Q, R, stroke, rand, pick } = k;

  const blackHole = (cx, cy, size = 380, o = {}) => {
    const inc = (o.inclination ?? 80) * Math.PI / 180;
    const rin = o.inner ?? 6, rout = o.outer ?? 20, spin = o.spin ?? 1, roll = (o.roll ?? 0) * Math.PI / 180;
    const beaming = o.beaming ?? 1, colors = o.colors ?? HOT, heat = o.heat ?? 1, turb = o.turbulence ?? 0.3;
    const scale = size / rout, si = Math.sin(inc);
    const T = traceTables(inc, rout * 1.35 + 6);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const toCanvas = (b, a) => { const x = b * Math.cos(a), y = b * Math.sin(a); return [cx + (x * cr - y * sr) * scale, cy - (x * sr + y * cr) * scale]; };

    // emitted flux of a thin disk (zero at the innermost stable orbit r = 6), and its temperature
    const flux = r => Math.max(0, 1 - Math.sqrt(rin / r)) / (r * r * r);
    let fmax = 0; for (let r = rin; r < rout; r += 0.1) fmax = Math.max(fmax, flux(r));
    // gravitational redshift and Doppler shift combined; x is the horizontal image coordinate
    const shift = (r, x) => Math.sqrt(1 - 3 / r) / (1 + Math.sqrt(1 / (r * r * r)) * x * si * spin);
    const look = (r, b, a) => {
      const g = shift(r, b * Math.cos(a)), f = flux(r) / fmax;
      const bright = Math.pow(g, 4 * beaming) * f;
      // observed temperature: hotter near the hole and on the side moving toward us
      const temp = Math.pow(g, beaming) * Math.pow(f, 0.25) * heat;
      return { color: ramp(colors, Math.pow(temp, 1.6) * 0.75), alpha: clamp(0.04 + 0.95 * Math.pow(bright, 0.6), 0, 1) };
    };

    const radii = [];
    const nR = o.rings ?? 46;
    for (let i = 0; i < nR; i++) radii.push(rin * Math.pow(rout / rin, i / (nR - 1)));

    const paintImage = (rs, bs, n, brush, sizeOf, alphaMul) => {
      for (let ri = nR - 1; ri >= 0; ri--) {
        const r = radii[ri], dR = (radii[Math.min(nR - 1, ri + 1)] - radii[Math.max(0, ri - 1)]) / 2;
        const pts = [];
        for (let a = 0; a <= T.NA; a++) {
          const row = a % T.NA, b = crossing(rs, bs, row, n, r);
          pts.push(isFinite(b) ? { b, a: T.alphas[row] + (a === T.NA ? Math.PI * 2 : 0) } : null);
        }
        for (let s = 0; s < T.NA; s += 4) {
          const seg = pts.slice(s, s + 5).filter(Boolean);
          if (seg.length < 2) continue;
          const mid = seg[Math.floor(seg.length / 2)], L = look(r, mid.b, mid.a);
          // soft outer rim, and clumps of brighter and darker gas
          const a = L.alpha * alphaMul * clamp((rout - r) / (rout * 0.3), 0, 1) * (1 + (R() - 0.5) * 2 * turb);
          if (a < 0.03) continue;
          stroke(seg.map(p => toCanvas(p.b, p.a)), { brush, size: sizeOf(dR), color: L.color, alpha: clamp(a, 0, 1), decay: 1, dry: 0, tints: false });
        }
      }
    };

    if (o.halo !== false) k.glow(cx, cy, size * 1.25, mix(colors[4], '#000000', 0.2), 0.22);
    k.disc(cx, cy, SHADOW * scale, '#000000');
    paintImage(T.lensed, T.bFine, T.NF, 'round', dR => Math.max(1.5, dR * scale * 0.35), 0.7);
    stroke(Array.from({ length: 121 }, (_, i) => toCanvas(SHADOW * 1.002, i / 120 * Math.PI * 2)), { brush: 'liner', size: Math.max(1.5, scale * 0.12), color: '#fff4e0', alpha: 0.85, decay: 1 });
    paintImage(T.direct, T.bMain, T.NB, 'flat', dR => Math.max(3, dR * scale * 1.3), 1);
    if (o.halo !== false) k.glow(cx - spin * size * 0.35, cy, size * 0.45, '#fff0d0', 0.18);
  };

  const planet = (x, y, r = 160, o = {}) => {
    const colors = o.colors ?? ['#d9b38c', '#b07a4f', '#e8d2b0', '#9c6a44', '#cfa27a'];
    const L = o.light ?? k.scene.light, tilt = (o.tilt ?? 18) * Math.PI / 180;
    const ringPts = (rr, from, to) => {
      const out = [];
      for (let i = 0; i <= 60; i++) {
        const a = from + (to - from) * i / 60, ex = Math.cos(a) * rr, ey = Math.sin(a) * rr * 0.26;
        out.push([x + ex * Math.cos(tilt) - ey * Math.sin(tilt), y + ex * Math.sin(tilt) + ey * Math.cos(tilt)]);
      }
      return out;
    };
    const rings = o.rings ? (o.ringColors ?? ['#d8c7a4', '#b9a27c', '#efe2c4', '#8f7a5a']) : null;
    const paintRings = (from, to) => { for (let rr = r * 1.35; rr < r * 2.25; rr += 6) stroke(ringPts(rr, from, to), { brush: 'flat', size: 7, color: pick(rings), alpha: rand(0.35, 0.85), decay: 1, tints: false }); };
    if (rings) paintRings(Math.PI, Math.PI * 2);
    const circle = new Path2D(); circle.arc(x, y, r, 0, Math.PI * 2);
    k.clipTo(circle);
    for (let yy = y - r - 8; yy < y + r + 8; yy += 7) {
      const c = colors[Math.floor((k.noise((yy - y) / r * 3) * 0.5 + 0.5) * colors.length) % colors.length];
      stroke(k.wave(x - r - 20, yy, x + r + 20, yy + rand(-3, 3), 5), { brush: 'flat', size: 12, color: c, alpha: 0.9 });
    }
    if (o.storm) k.disc(x + r * 0.3, y + r * 0.25, r * 0.12, '#b5523a', 0.8);
    Q(() => {
      const c = state.ctx, gx = x + L * r * 0.45, g = c.createRadialGradient(gx, y - r * 0.2, r * 0.2, gx - L * r * 0.2, y, r * 1.35);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.92)');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    });
    k.unclip();
    if (o.atmosphere) stroke(k.arc(x, y, r + 2, r + 2, 0, Math.PI * 2.02), { brush: 'soft', size: 10, color: o.atmosphere, alpha: 0.5, decay: 1, tints: false });
    if (rings) paintRings(0, Math.PI);
  };

  const galaxy = (x, y, r = 300, o = {}) => {
    const arms = o.arms ?? 2, flat = o.flatten ?? 0.45, rot = (o.angle ?? -20) * Math.PI / 180;
    const armColor = o.color ?? '#9fb8ff', core = o.core ?? '#ffe2a8';
    const place = (rr, th) => { const ex = Math.cos(th) * rr, ey = Math.sin(th) * rr * flat; return [x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot)]; };
    k.glow(x, y, r * 1.1, mix(armColor, '#000000', 0.5), 0.25);
    for (let a = 0; a < arms; a++) {
      const off = a / arms * Math.PI * 2, spine = [];
      for (let th = 0; th < Math.PI * 3.2; th += 0.08) { const rr = r * 0.07 * Math.exp(0.28 * th); if (rr > r) break; spine.push(place(rr, th + off)); }
      stroke(spine, { brush: 'soft', size: r * 0.22, color: armColor, alpha: 0.16, blend: 'lighter', decay: 1, tints: false });
      stroke(spine, { brush: 'soft', size: r * 0.08, color: mix(armColor, '#ffffff', 0.5), alpha: 0.18, blend: 'lighter', decay: 1, tints: false });
      const dust = spine.map(([px, py]) => [px + (y - py) * 0.04, py + (px - x) * 0.04]);
      stroke(dust, { brush: 'round', size: r * 0.025, color: '#120a08', alpha: 0.35, decay: 1, tints: false });
      for (let i = 0; i < 160; i++) {
        const th = R() * Math.PI * 3.2, rr = r * 0.07 * Math.exp(0.28 * th);
        if (rr > r) continue;
        const [px, py] = place(rr * (1 + (R() - 0.5) * 0.25), th + off + (R() - 0.5) * 0.25);
        k.dab(px, py, { brush: 'liner', size: rand(1, 3), color: R() < 0.2 ? '#ffb4c8' : '#e8eeff', alpha: rand(0.4, 1) });
      }
    }
    k.glow(x, y, r * 0.35, core, 0.7);
    k.glow(x, y, r * 0.12, '#ffffff', 0.8);
  };

  return { blackHole, planet, galaxy };
}
