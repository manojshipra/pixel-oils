// A black hole, ray traced. The disk's far side is bent up over the shadow,
// the near side crosses in front, and the side coming toward you is brighter.
// Try inclination: 60 or 88, spin: -1, or beaming: 0 (the way the film Interstellar drew it).
seed(7);
fill('#020309');
nebula(380, 260, 300, { colors: [P.alizarinCrimson, '#4b2a7a', P.prussianBlue], density: 40 });
stars(700);
blackHole(750, 500, 400, { inclination: 80, spin: 1 });
sign('event horizon', { color: '#7d8494', size: 34 });
