export const INLETS = [
  {name:'St. Augustine Inlet', lat:29.9105, lng:-81.2860},
  {name:'Matanzas Inlet',      lat:29.7065, lng:-81.2290},
];
export const TIDE_STATIONS = [
  {id:'8720576', name:'St. Augustine, city dock', lat:29.8917, lng:-81.3100},
  {id:'8720587', name:'St. Augustine Beach',      lat:29.8567, lng:-81.2650},
  {id:'8720686', name:'Fort Matanzas',            lat:29.7150, lng:-81.2390},
];
// Approximate lines — use "Draw my own route" for precise paths.
export const PRESETS = [
  {id:'bayfront', name:'Vilano → Castillo → Bridge of Lions (Matanzas River)',
   pts:[[29.9120,-81.3020],[29.9060,-81.3035],[29.9005,-81.3060],[29.8960,-81.3078],[29.8925,-81.3075]]},
  {id:'saltrun', name:'Salt Run, Anastasia State Park (north toward inlet)',
   pts:[[29.8690,-81.2770],[29.8760,-81.2785],[29.8840,-81.2805],[29.8905,-81.2835]]},
  {id:'tolomato', name:'Vilano → north up the Tolomato toward Guana',
   pts:[[29.9120,-81.3020],[29.9250,-81.3045],[29.9400,-81.3075],[29.9550,-81.3100],[29.9700,-81.3140]]},
  {id:'matanzas', name:'Fort Matanzas → Matanzas Inlet bridge',
   pts:[[29.7180,-81.2400],[29.7140,-81.2395],[29.7100,-81.2370],[29.7070,-81.2330]]},
];

