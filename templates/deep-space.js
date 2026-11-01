// A galaxy, a ringed planet and its moon.
seed(9);
fill('#03040a');
nebula(1100, 300, 380, { colors: ['#2a3b9c', '#7b3fa0', '#0f6a7a'] });
stars(900);
galaxy(380, 260, 260, { angle: -25 });
planet(900, 620, 220, { rings: true, tilt: -14, light: -1 });
moon(1330, 300, 50, { phase: 0.6, color: '#c9c3b5', dark: '#03040a' });
