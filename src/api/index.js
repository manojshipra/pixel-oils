// Builds the functions your code can call. Your code runs once and records strokes into a queue;
// the player then paints the queue a little each frame so you can watch it happen.
import { W, H, P, state, mulberry32, noise1, lerp, clamp, mix, ramp, spec, brushPath } from '../engine.js';
import core from './core.js';
import sky from './sky.js';
import land from './land.js';
import water from './water.js';
import trees from './trees.js';
import buildings from './buildings.js';
import space from './space.js';

export const clipState = { depth: 0 };

export function makeAPI(queue, canvas) {
  let R = mulberry32(1), nz = noise1(mulberry32(100));
  const Q = fn => queue.push(fn);

  const kit = {
    Q, canvas,
    R: () => R(),
    scene: { horizon: '#f2eee0', light: -1 },
    rand(a, b) {
      if (a === undefined) return R();
      if (b === undefined) { b = a; a = 0; }
      return lerp(a, b, R());
    },
    pick: list => list[Math.floor(R() * list.length)],
    noise: x => nz(x),
    seed(n) { R = mulberry32(n); nz = noise1(mulberry32(n + 99)); state.dr = mulberry32(n * 7 + 3); },
    patternOf(paint) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      paint(c.getContext('2d'));
      return state.ctx.createPattern(c, 'no-repeat');
    },
    clipTo: path => Q(() => { state.ctx.save(); clipState.depth++; state.ctx.clip(path); }),
    unclip: () => Q(() => { if (clipState.depth > 0) { state.ctx.restore(); clipState.depth--; } }),
    // engine-level stroke for helpers that need exact bristle settings
    raw(points, o) { const pts = points.map(p => [p[0], p[1]]); Q(() => brushPath(pts, o)); },
    rawNow: (points, o) => brushPath(points, o),
    stroke(points, opts) {
      if (!Array.isArray(points) || points.length < 2) throw new Error('stroke() needs an array of at least two [x, y] points');
      const pts = points.map(p => [p[0], p[1]]), o = spec(opts);
      Q(() => brushPath(pts, o));
    },
  };

  const api = { W, H, P, mix, ramp, lerp, clamp, rand: kit.rand, pick: kit.pick, noise: kit.noise, seed: kit.seed, stroke: kit.stroke };
  for (const mod of [core, sky, land, water, trees, buildings, space]) {
    const helpers = mod(kit);
    Object.assign(kit, helpers);
    Object.assign(api, helpers);
  }
  return api;
}
