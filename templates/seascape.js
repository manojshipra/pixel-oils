// Sunset over the sea, a palm on the rocks.
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
