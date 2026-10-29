// Hong Kong: Victoria Harbour both shores. Detailed core = Central/Admiralty/Wan Chai/Causeway Bay/North Point on the
// island, Tsim Sha Tsui/Jordan/Yau Ma Tei/Mong Kok/Hung Hom/Kowloon City on the Kowloon side. Flat (NYC-style) world:
// the steep Mid-Levels and the Peak are intentionally outside the block generator.
export default {
  id: 'hongkong',
  name: '香港',
  nameEn: 'Hong Kong',
  short: 'HK',
  storageKey: 'hk-player-state',

  frame: {
    lat0: 22.2819,
    lon0: 114.1596,
    bearingDeg: 0,
    origin: { lat: 22.2819, lon: 114.1596 } // 中環 皇后像廣場
  },

  // Data download bounds (must contain the coastline that closes both shores).
  dataBounds: { south: 22.2685, west: 114.1385, north: 22.3300, east: 114.2050 },
  // Playable core: blocks whose centre falls outside this are dropped.
  coreBounds: { south: 22.2725, west: 114.1450, north: 22.3260, east: 114.1995 },

  // No hand-placed sea seeds: the OSM coastline closes both shores inside the download box, and the land extractor
  // seeds water from the seaward side of the coastline itself. Hand-picked seeds are easy to put on a pier or a
  // reclamation edge, which floods the land instead of the harbour.
  seaSeeds: [],

  landChecks: [
    { lat: 22.2819, lon: 114.1585, name: '中環' },
    { lat: 22.2960, lon: 114.1720, name: '尖沙咀' },
    { lat: 22.3193, lon: 114.1694, name: '旺角' },
    { lat: 22.2800, lon: 114.1840, name: '銅鑼灣' },
    { lat: 22.2895, lon: 114.1930, name: '北角' },
    { lat: 22.2870, lon: 114.1420, name: '西營盤' },
    { lat: 22.3030, lon: 114.1830, name: '紅磡' }
  ],

  // Block cutter
  res: 1,
  sidewalk: 2.6,
  strip: 10,
  minBlockArea: 150,
  maxBlockArea: 150000,
  minLotSide: 10,

  // Hand-placed points of interest (OSM way/relation centre points are too variable for these).
  points: [
    { id: 'starFerryTST', name: '天星碼頭（尖沙咀）', lat: 22.2937, lon: 114.1685 },
    { id: 'starFerryCentral', name: '天星碼頭（中環）', lat: 22.2828, lon: 114.1600 },
    { id: 'centralPiers', name: '中環碼頭', lat: 22.2854, lon: 114.1585 },
    { id: 'ifc', name: '國際金融中心', lat: 22.2850, lon: 114.1590 },
    { id: 'icc', name: '環球貿易廣場', lat: 22.3034, lon: 114.1660 },
    { id: 'tsimShaTsui', name: '尖沙咀鐘樓', lat: 22.2947, lon: 114.1722 },
    { id: 'victoriaPark', name: '維多利亞公園', lat: 22.2820, lon: 114.1880 },
    { id: 'mongKok', name: '旺角', lat: 22.3193, lon: 114.1694 },
    { id: 'causewayBay', name: '銅鑼灣', lat: 22.2800, lon: 114.1840 },
    { id: 'kowloonCity', name: '九龍城', lat: 22.3280, lon: 114.1900 }
  ]
};
