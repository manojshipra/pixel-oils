// Starting points for the code editor. Each one is ordinary code against the helper library.
export const PRESETS = {
  'Black hole': `// A black hole, ray traced. The disk's far side is bent up over the shadow,
// the near side crosses in front, and the side coming toward you is brighter.
// Try inclination: 60 or 88, spin: -1, or beaming: 0 (the way the film Interstellar drew it).
seed(7);
fill('#020309');
nebula(380, 260, 300, { colors: [P.alizarinCrimson, '#4b2a7a', P.prussianBlue], density: 40 });
stars(700);
blackHole(750, 500, 400, { inclination: 80, spin: 1 });
sign('event horizon', { color: '#7d8494', size: 34 });
`,

  'Sakura': `// A cherry tree on a spring morning, with a red sun and misty hills.
seed(12);
gradient(0, 1000, ['#e9e2d4', '#f2dcd2', '#e4d1cc']);
disc(1090, 290, 115, P.brightRed, 0.85);
hills(720, { layers: 2, height: 90, color: '#6b7472', haze: 0.7, spacing: 90 });
for (let y = 910; y < 1020; y += 12) stroke(wave(-40, y, W + 40, y, 4), { brush: 'flat', size: 30, color: '#3d3a35', alpha: 0.8 });
sakura(620, 960, 520);
grass(80, 1450, 975, { height: 26, colors: ['#3d3a35', '#55603a', '#7b8550'] });
seal('桜', W - 80, H - 80, 62);
`,

  'Windswept sakura': `// A cherry tree leaning into the wind on a misty grey day.
seed(31);

// misty grey sky, heavier behind the tree
gradient(0, 1000, ['#cac8c5', '#e8e7e4', '#d3d1ce']);
drift(1250, 420, 420, 300, { color: '#8e8b87' });
drift(1050, 760, 500, 200, { color: '#a3a09c' });
drift(300, 300, 420, 260, { color: '#fbfaf8' });
drift(600, 620, 500, 180, { color: '#f6f5f2' });

// the dark bank the tree grows from
shape([[860, 1010], [990, 935], [1150, 890], [1320, 872], [1520, 845], [1520, 1010]], { color: ['#181616', '#262323', '#34302f'] });
rocks(1010, 975, 55, { color: '#4a4645' });
grass(900, 1140, 935, { height: 34, colors: ['#121111', '#2a2727', '#4f4b49'] });
grass(1140, 1500, 885, { height: 44, colors: ['#121111', '#2a2727', '#4f4b49'] });

// trunk twisting up and over to the left, then the limbs
limb([[1340, 975], [1395, 780], [1300, 580], [1360, 420], [1270, 270], [1130, 195]], 120, { strands: 18 });
const main = limb([[1160, 205], [960, 150], [720, 175], [470, 230], [230, 290], [40, 330]], 46);
const low = limb([[1320, 470], [1130, 400], [900, 420], [700, 480], [540, 540]], 30);
const high = limb([[1260, 260], [1330, 140], [1440, 70], [1530, 40]], 30);
const mid = limb([[900, 160], [760, 90], [560, 60], [380, 70]], 18);
limb([[700, 180], [600, 260], [520, 360], [470, 440]], 14);

// twigs blown to the left, blossom on every tip and along the limbs
const wind = { wind: [-0.12, 0.12], spread: 0.7 };
const tips = [
  ...twigs(main, 34, { length: 90, width: 7, ...wind }),
  ...twigs(low, 18, { length: 80, width: 6, ...wind }),
  ...twigs(high, 12, { length: 80, width: 6, ...wind }),
  ...twigs(mid, 12, { length: 70, width: 5, ...wind }),
];
for (const [x, y] of tips) blossom(x, y, rand(20, 40));
for (const path of [main, low, high, mid]) for (let i = Math.floor(path.length * 0.3); i < path.length; i += 4) blossom(path[i][0], path[i][1] - 10, rand(14, 26));

// petals caught in the wind, and a few on the ground
petals(420, { x0: 0, x1: 1300, y0: 200, y1: 1000 });
petals(160, { x0: 900, x1: 1500, y0: 905, y1: 995, size: [5, 10] });
`,

  'Pine and gold moon': `// An old black pine in front of a gold moon, ink on aged paper.
seed(17);
paper();
orb(760, 370, 255, { color: '#d2a03a' });

// the rock, then the trunk: an S that leans left and swings back
crag([[520, 1010], [575, 925], [660, 880], [780, 868], [890, 900], [990, 980], [1010, 1010]]);
limb([[790, 900], [720, 810], [690, 710], [765, 610], [745, 515], [700, 440], [740, 355], [775, 285]], 70, { strands: 14 });
limb([[780, 880], [714, 890], [670, 930]], 26);
limb([[780, 880], [840, 895], [880, 925]], 26);

// limbs, with fine bare twigs hanging off the two lowest
const left = limb([[735, 520], [630, 500], [520, 535], [420, 560]], 22);
const right = limb([[748, 470], [860, 455], [975, 500], [1060, 560]], 22);
limb([[715, 420], [640, 375], [565, 360]], 15);
limb([[752, 380], [835, 335], [915, 330]], 15);
limb([[775, 300], [740, 250], [760, 195]], 13);
twigs(right, 10, { angle: [0.6, 1.6], length: 45, width: 3, from: 0.4 });
twigs(left, 6, { angle: [1.4, 2.6], length: 38, width: 3, from: 0.4 });

// the foliage: flat pads of needles at the end of each limb
pinePad(440, 545, 110, 32);
pinePad(570, 505, 80, 28);
pinePad(985, 492, 115, 34);
pinePad(1065, 548, 70, 24);
pinePad(590, 352, 95, 34);
pinePad(880, 322, 100, 36);
pinePad(760, 228, 115, 44);
pinePad(780, 168, 70, 28);
pinePad(675, 290, 70, 26);
pinePad(850, 412, 70, 24);
`,

  'Red tree and Fuji': `// A red tree on the rocks, a misty Fuji, and waves breaking on the shore.
seed(23);
const reds = ['#6e0816', '#a80d24', '#d4162f', '#ec2b3f', '#ff5263'];

gradient(0, 1000, ['#ddd9cc', '#ece6d5', '#f2ebd8']);
fuji(1160, 660, 330);
birds(7, { x0: 1080, x1: 1260, y0: 360, y1: 540, size: 6, color: '#3a3733' });

sea(668, 790);
beach(790);
breaker(1220, 1500, 690, 760);
breaker(880, 1150, 700, 755);
breaker(640, 820, 720, 760);

crag([[0, 610], [80, 590], [170, 600], [260, 650], [380, 700], [470, 760], [560, 800], [520, 830], [0, 840]]);
rocks(540, 810, 40, { color: '#2a2825' });

// the canopy's shadow first, then the trunk and limbs, then the leaves, so the branches sit inside
const leaves = [[330, 430, 120, 90], [440, 330, 170, 120], [600, 280, 170, 120], [740, 360, 170, 130], [840, 480, 130, 110], [900, 600, 80, 80], [470, 470, 150, 70]];
canopy(leaves, { colors: reds, layer: 'shadow' });
limb([[430, 720], [470, 650], [540, 620], [580, 560], [640, 520]], 60, { strands: 14 });
limb([[440, 700], [386, 712], [350, 740]], 24);
limb([[440, 700], [482, 712], [510, 750]], 24);
const limbs = [
  limb([[560, 590], [470, 500], [380, 420], [300, 380]], 22),
  limb([[600, 545], [570, 430], [560, 320], [520, 240]], 22),
  limb([[630, 525], [720, 440], [760, 330], [740, 250]], 20),
  limb([[620, 535], [740, 560], [850, 600], [930, 680]], 20),
  limb([[600, 545], [700, 500], [820, 470], [900, 470]], 14),
];
for (const path of limbs) twigs(path, 7, { angle: [-2.6, 0.4], length: 37, width: 4, from: 0.3 });
canopy(leaves, { colors: reds, layer: 'leaves' });

// leaves drifting down and lying on the sand
petals(70, { x0: 200, x1: 1500, y0: 450, y1: 780, size: [4, 9], colors: reds.slice(1, 4) });
petals(160, { x0: 150, x1: 1050, y0: 840, y1: 940, size: [4, 9], colors: reds.slice(1, 4) });

seal('紅葉', 300, 540, 46);
`,

  'Mountain lake': `// The classic: sky, two mountain ranges, mist, a lake that mirrors them, and happy little trees.
seed(4821);
const horizon = 590;
gradient(0, horizon + 20, [P.prussianBlue, '#5f88b5', '#f4efdf']);
cloud(1050, 170, 320);
cloud(330, 250, 220);
mountains(horizon, { peaks: 4, height: 220, color: '#4b5068', haze: 0.45 });
mist(horizon, 140);
mountains(horizon, { peaks: 2, height: 360, x0: 650, x1: 1150 });
mist(horizon, 80);
treeLine(horizon);
lake(horizon);
land([[0, 640], [160, 690], [380, 800], [560, 1000], [0, 1000]]);
land([[1500, 720], [1350, 790], [1180, 1000], [1500, 1000]]);
cabin(250, 760, 150);
bush(470, 930, 60);
bush(1250, 940, 45);
evergreen(110, 985, 560);
evergreen(1400, 975, 470);
sign('No. 4821');
`,

  'Northern lights': `// Auroras over a frozen lake.
seed(3);
gradient(0, 640, ['#020611', '#0b1a33', '#1d3550']);
stars(500, { y1: 600 });
aurora(330, { height: 300 });
aurora(260, { height: 200, colors: ['#7affc4', '#3ec6a0', '#c56cf0'], x0: 700 });
mountains(620, { peaks: 3, height: 230, color: '#0b1220', snow: '#9fb4c8', shadow: '#22324a' });
treeLine(620, { color: '#03070a' });
lake(620, { color: '#0d2034' });
forest(0, 380, 990, { count: 8, height: 380, color: '#02060a', highlight: '#1e3a3a' });
forest(1150, 1500, 990, { count: 6, height: 320, color: '#02060a', highlight: '#1e3a3a' });
`,

  'Seascape': `// Sunset over the sea, a palm on the rocks.
seed(21);
const horizon = 560;
gradient(0, horizon + 10, ['#2a1d4a', '#a1415b', '#f5b35d', '#ffe6a0']);
sun(980, 520, 70, { color: '#ffd36b' });
cloud(400, 220, 300, { color: '#ffd0ae', shade: '#7b3f5e' });
cloud(1150, 160, 220, { color: '#ffd0ae', shade: '#7b3f5e' });
waves(horizon, { color: '#3a2a4e', foam: '#ffe9d0' });
birds(5, { x0: 500, x1: 900, y0: 200, y1: 330 });
rocks(160, 1000, 170, { color: '#4a3632' });
rocks(340, 1010, 110, { color: '#4a3632' });
palm(220, 900, 520, { lean: 0.35, color: '#24361f' });
`,

  'Deep space': `// A galaxy, a ringed planet and its moon.
seed(9);
fill('#03040a');
nebula(1100, 300, 380, { colors: ['#2a3b9c', '#7b3fa0', '#0f6a7a'] });
stars(900);
galaxy(380, 260, 260, { angle: -25 });
planet(900, 620, 220, { rings: true, tilt: -14, light: -1 });
moon(1330, 300, 50, { phase: 0.6, color: '#c9c3b5', dark: '#03040a' });
`,

  'Autumn': `// A maple, a bare tree and a fence on rolling autumn hills.
seed(5);
gradient(0, 640, ['#1d4e79', '#7ea8c8', '#fae8c1']);
cloud(1100, 200, 300);
hills(560, { layers: 3, height: 110, color: '#7a5a1e', highlight: '#e3a857', spacing: 70 });
maple(480, 940, 460);
bareTree(1150, 900, 380, { bark: '#2b241e' });
fence(700, 960, 1450, 930, { posts: 8 });
flowers(80, 700, 930, 995, { colors: [P.brightRed, P.cadmiumYellow, '#d0652a'] });
grass(0, 1500, 990, { colors: ['#4a3a18', '#7a5a1e', '#b5822a'] });
`,

  'Blank': `// Your painting. This runs once, then gets painted stroke by stroke.
// Open the Library tab for everything you can call.
clear();
`,
};
