// The home-screen city list. Packs are dynamic imports so a city's world code and data only load
// once it is picked.
export const CITIES = [
  {
    id: 'newyork',
    taxiStyle: 'nyc-medallion',
    name: 'New York',
    short: 'NYC',
    badge: 'Full detail',
    tagline: 'Manhattan, 125th St to the Battery',
    description: 'The original city: every real block, landmark, subway entrance and avenue signal from NYC Open Data and OpenStreetMap.',
    load: () => import('./newyork/index.js')
  },
  {
    id: 'hongkong',
    taxiStyle: 'hk-urban',
    name: '香港 Hong Kong',
    short: 'HK',
    badge: 'Full Hong Kong',
    tagline: '全港統一簡潔道路，由港九至新界及離島',
    description: '以真實 OpenStreetMap 道路、海岸及地區構成的全港簡潔 3D 地圖；港九、新界與離島使用同一套平面街道，可逐步加入更多內容。',
    load: () => import('./hongkong/index.js')
  },
  {
    id: 'grid',
    taxiStyle: 'nyc-medallion',
    name: 'Grid City',
    short: 'GRID',
    badge: 'Demo',
    tagline: 'A procedural downtown, generated at load',
    description: 'A synthetic 7×7 downtown built from scratch in code: sidewalks, glass towers, a plaza and numbered streets. No external map data.',
    load: () => import('./grid/index.js')
  }
];

export function getCity(id) {
  return CITIES.find((city) => city.id === id) || null;
}

export function defaultCityId() {
  return CITIES[0].id;
}
