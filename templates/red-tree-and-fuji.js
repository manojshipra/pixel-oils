// A red tree on the rocks, a misty Fuji, and waves breaking on the shore.
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
