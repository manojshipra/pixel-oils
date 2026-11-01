// A cherry tree on a spring morning, with a red sun and misty hills.
seed(12);
gradient(0, 1000, ['#e9e2d4', '#f2dcd2', '#e4d1cc']);
disc(1090, 290, 115, P.brightRed, 0.85);
hills(720, { layers: 2, height: 90, color: '#6b7472', haze: 0.7, spacing: 90 });
for (let y = 910; y < 1020; y += 12) stroke(wave(-40, y, W + 40, y, 4), { brush: 'flat', size: 30, color: '#3d3a35', alpha: 0.8 });
sakura(620, 960, 520);
grass(80, 1450, 975, { height: 26, colors: ['#3d3a35', '#55603a', '#7b8550'] });
seal('桜', W - 80, H - 80, 62);
