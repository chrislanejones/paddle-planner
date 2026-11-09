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
  // The three routes below follow OpenStreetMap waterway centerlines and start at an OSM boat ramp where one
  // exists. Every point was checked against the NOAA chart: all but the ramp itself read as water.
  {id:'sansebastian', name:'San Sebastian River, boat ramp to the Matanzas River',
   pts:[[29.88020,-81.32190],[29.88100,-81.32230],[29.87984,-81.31655],[29.87957,-81.31577],[29.87890,-81.31497],[29.87807,-81.31507],[29.87500,-81.31624],[29.87243,-81.31630],[29.87141,-81.31548],[29.87117,-81.31502],[29.87102,-81.31228],[29.86915,-81.30770],[29.86888,-81.30564]]},
  {id:'moultrie', name:'Moultrie Creek launch → Matanzas River (north toward St. Augustine)',
   pts:[[29.82880,-81.31380],[29.82847,-81.31380],[29.82882,-81.31302],[29.83019,-81.31220],[29.83015,-81.31108],[29.82978,-81.31052],[29.83020,-81.30740],[29.83050,-81.30645],[29.83160,-81.30517],[29.83204,-81.30402],[29.83225,-81.30260],[29.83696,-81.30164],[29.84265,-81.29939],[29.84459,-81.29937],[29.84595,-81.29986]]},
  {id:'pellicer', name:'Pellicer Creek, Faver-Dykes → Matanzas River (south of the inlets)',
   pts:[[29.66263,-81.25098],[29.66241,-81.25014],[29.66198,-81.24950],[29.66076,-81.24854],[29.65956,-81.24795],[29.65922,-81.24725],[29.65996,-81.24423],[29.66180,-81.24085],[29.66256,-81.23863],[29.66283,-81.23699],[29.66281,-81.23452],[29.66312,-81.23277],[29.66352,-81.23179],[29.66450,-81.23077],[29.66631,-81.22989],[29.66821,-81.22831]]},
];

