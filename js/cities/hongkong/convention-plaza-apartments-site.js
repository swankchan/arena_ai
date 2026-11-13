// 會景閣 Convention Plaza Apartments, 1 Harbour Road, Wan Chai (灣仔港灣道1號, 1989).
//
// 164-metre 47-storey luxury serviced residential skyscraper designed by Ng Chun Man & Associates
// atop the HKCEC Phase 1 podium complex.
//
// OSM Way: 107497692 (height: 164m, building:levels: 47, building:min_level: 10).
import { minimumAreaObb, flatRingBounds } from './landmark-site.js';

export const CONVENTION_PLAZA_APARTMENTS_HERITAGE = {
  id: 'HK-B0044',
  name: '會景閣 Convention Plaza Apartments',
  englishName: 'Convention Plaza Apartments',
  chineseName: '會景閣',
  address: '1 Harbour Road, Wan Chai, Hong Kong (灣仔港灣道1號)',
  completionYear: 1989,
  height: 164.0,
  storeys: 47,
  architect: 'Ng Chun Man & Associates (伍振民建築師事務所)',
  developer: 'New World Development / Sun Hung Kai Properties',
  structuralType: 'Reinforced concrete shear wall and perimeter frame on podium deck',
  osmWay: 107497692,
  description:
    '164-metre 47-storey luxury serviced apartment skyscraper perched above the HKCEC Phase 1 podium in Wan Chai North. ' +
    'Designed by Ng Chun Man & Associates with warm bronze-reflective curtain walling, faceted sea-facing bay windows, ' +
    'a 4th-floor podium leisure deck featuring outdoor swimming pools, and integrated covered skybridge connections to Harbour Road.',
};

// Projected polygon ring from OSM Way 107497692
export const CONVENTION_PLAZA_APARTMENTS_RING = [
  1349.4878028969397, 127.000935010267,
  1348.7354881296603, 117.71034433337063,
  1301.7828020596526, 121.46423019667091,
  1288.8800885043067, 110.54584830449231,
  1287.6434066940772, 95.36420370612798,
  1287.3445419233938, 91.58817102331524,
  1268.6397295411116, 93.08308132309634,
  1268.9488999929367, 96.85911400590908,
  1270.8039227082807, 119.73677829476283,
  1274.0296010974832, 122.4719104726856,
  1275.235365862823, 123.50173756781935,
  1295.537558917262, 140.676595899094,
  1340.8928643151132, 137.04451754153862,
  1349.4878028969397, 127.000935010267,
];

export const CONVENTION_PLAZA_APARTMENTS_BOUNDS = flatRingBounds(CONVENTION_PLAZA_APARTMENTS_RING);

export const CONVENTION_PLAZA_APARTMENTS_RAW_OBB = minimumAreaObb(CONVENTION_PLAZA_APARTMENTS_RING);

// Polygon 2D plan area (~1798 m²)
let _area = 0;
for (let i = 0; i + 3 < CONVENTION_PLAZA_APARTMENTS_RING.length; i += 2) {
  _area +=
    CONVENTION_PLAZA_APARTMENTS_RING[i] * CONVENTION_PLAZA_APARTMENTS_RING[i + 3] -
    CONVENTION_PLAZA_APARTMENTS_RING[i + 2] * CONVENTION_PLAZA_APARTMENTS_RING[i + 1];
}
export const CONVENTION_PLAZA_APARTMENTS_RING_AREA = Math.abs(_area * 0.5);

// Site configuration aligned to Harbour Road and Convention Plaza podium grid
export const CONVENTION_PLAZA_APARTMENTS_SITE = Object.freeze({
  x: 1308.47,
  z: 117.61,
  w: 83.3,
  d: 48.28,
  ry: 0.07991, // Aligned to Harbour Road frontage (~4.58 degrees)
  height: 164.0,
  podiumHeight: 28.0,
  crownHeight: 12.0,
  storeys: 47,
  groundOffset: 5.0,
  osmWay: 107497692,
  heritageId: 'HK-B0044',
});

export function conventionPlazaApartmentsLocalToWorld(lx, lz) {
  const cos = Math.cos(CONVENTION_PLAZA_APARTMENTS_SITE.ry);
  const sin = Math.sin(CONVENTION_PLAZA_APARTMENTS_SITE.ry);
  return {
    x: CONVENTION_PLAZA_APARTMENTS_SITE.x + lx * cos - lz * sin,
    z: CONVENTION_PLAZA_APARTMENTS_SITE.z + lx * sin + lz * cos,
  };
}

export function conventionPlazaApartmentsWorldToLocal(wx, wz) {
  const dx = wx - CONVENTION_PLAZA_APARTMENTS_SITE.x;
  const dz = wz - CONVENTION_PLAZA_APARTMENTS_SITE.z;
  const cos = Math.cos(CONVENTION_PLAZA_APARTMENTS_SITE.ry);
  const sin = Math.sin(CONVENTION_PLAZA_APARTMENTS_SITE.ry);
  return {
    x: dx * cos + dz * sin,
    z: -dx * sin + dz * cos,
  };
}
