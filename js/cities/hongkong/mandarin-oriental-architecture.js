import { authoredOsmSource, makeAuthoredSite, makePhotoDirectedSite } from './authored-landmark-site.js';
// OSM marks a hotel landuse parcel, not a surveyed building footprint.
export const MANDARIN_ORIENTAL_SOURCE=authoredOsmSource({
  id:42293822,version:13,sourceTimestamp:'2025-01-25T15:09:14Z',
  tags:{landuse:'commercial',tourism:'hotel',name:'香港文華東方酒店 Mandarin Oriental, Hong Kong','addr:housenumber':'5','addr:street':'Connaught Road Central'},
  geometry:[
    {lat:22.2817820,lon:114.1590926},{lat:22.2817448,lon:114.1592331},{lat:22.2816534,lon:114.1595745},
    {lat:22.2816482,lon:114.1595938},{lat:22.2819896,lon:114.1597005},{lat:22.2820626,lon:114.1597232},
    {lat:22.2820805,lon:114.1597287},{lat:22.2820982,lon:114.1597341},{lat:22.2821037,lon:114.1597144},
    {lat:22.2822320,lon:114.1592329},{lat:22.2822145,lon:114.1592274},{lat:22.2821950,lon:114.1592213},
    {lat:22.2817820,lon:114.1590926},
  ],
  evidence:'OSM hotel landuse parcel, not a surveyed building footprint. Entrance and facade geometry are photo-directed approximations.'
});
export const MANDARIN_ORIENTAL_PARCEL=makeAuthoredSite('mandarinOrientalParcel','香港文華東方酒店','Mandarin Oriental, Hong Kong',MANDARIN_ORIENTAL_SOURCE,{height:92});
// The mapped polygon is landuse including access roads, not a tower outline.
// The inset volume is an approximation, not an assertion that OSM surveyed it.
// It keeps the mapped service roads along the parcel edge unobstructed.
const parcel = MANDARIN_ORIENTAL_PARCEL;
const inset = parcel.ring.map((v,i) => (i % 2 ? parcel.z : parcel.x) + (v-(i % 2 ? parcel.z : parcel.x))*.8);
export const MANDARIN_ORIENTAL_SITE=makePhotoDirectedSite('mandarinOriental','香港文華東方酒店',inset,
  'Approximate inset mass inside OSM landuse parcel 42293822, leaving mapped access lanes open; not a surveyed footprint.',{height:92});
export const MANDARIN_ORIENTAL_ESTIMATED_HEIGHT=92; // CTBUH estimation, not survey data.
export const MANDARIN_ORIENTAL_ENTRANCE_EDGE=8; // photo-directed Connaught Road frontage
