// Region-specific taxi appearance shared by the player car, AI traffic and city cards.
// Keep this module free of Three.js imports so registry and UI code can use it anywhere.
export const DEFAULT_TAXI_STYLE = 'nyc-medallion';

export const TAXI_STYLES = {
  'nyc-medallion': {
    id: 'nyc-medallion',
    city: 'newyork',
    label: 'Yellow medallion · Ford Crown Victoria',
    body: 'taxi',
    paint: 0xffbe14,
    livery: 'nyc',
    plate: 'nyc',
    doorDecal: 'nyc'
  },
  'hk-urban': {
    id: 'hk-urban',
    city: 'hongkong',
    label: '紅色的士 · Toyota Crown Comfort',
    body: 'hkTaxi',
    paint: 0xc6202b,
    livery: 'hk',
    plate: 'hk',
    doorDecal: null
  }
};

export function getTaxiStyle(id) {
  return TAXI_STYLES[id] ?? null;
}
