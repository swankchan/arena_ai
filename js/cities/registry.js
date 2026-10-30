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
    badge: 'Full detail',
    tagline: '維多利亞港兩岸，港島北岸至九龍腹地',
    description: '由真實街道與街區建成的香港：石塘咀、中環、灣仔、銅鑼灣、跑馬地、尖沙咀、旺角、何文田、深水埗與九龍城，全部街道以中文命名。',
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
