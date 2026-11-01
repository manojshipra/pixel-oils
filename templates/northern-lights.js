// Auroras over a frozen lake.
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
