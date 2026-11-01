// A cherry tree leaning into the wind on a misty grey day.
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
