// An old black pine in front of a gold moon, ink on aged paper.
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
