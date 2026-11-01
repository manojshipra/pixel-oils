// A maple, a bare tree and a fence on rolling autumn hills.
seed(5);
gradient(0, 640, ['#1d4e79', '#7ea8c8', '#fae8c1']);
cloud(1100, 200, 300);
hills(560, { layers: 3, height: 110, color: '#7a5a1e', highlight: '#e3a857', spacing: 70 });
maple(480, 940, 460);
bareTree(1150, 900, 380, { bark: '#2b241e' });
fence(700, 960, 1450, 930, { posts: 8 });
flowers(80, 700, 930, 995, { colors: [P.brightRed, P.cadmiumYellow, '#d0652a'] });
grass(0, 1500, 990, { colors: ['#4a3a18', '#7a5a1e', '#b5822a'] });
