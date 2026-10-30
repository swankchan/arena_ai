// Hong Kong: Victoria Harbour both shores. The detailed core covers the island from Kennedy Town through Central,
// Wan Chai and North Point to Quarry Bay/Happy Valley, and Kowloon from Tsim Sha Tsui through Mong Kok and Ho Man Tin
// to Cheung Sha Wan/Shek Kip Mei/Kowloon Tong. This is a flat street-level world; terrain elevation is not imported.
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

  // Second expansion: roughly another 40% bounding-box area, reaching Kennedy Town, Quarry Bay and Kowloon Tong.
  // The download and playable extents stay identical so every playable edge has real data behind it.
  dataBounds: { south: 22.2655, west: 114.1315, north: 22.3370, east: 114.2120 },
  coreBounds: { south: 22.2655, west: 114.1315, north: 22.3370, east: 114.2120 },

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
    { lat: 22.3030, lon: 114.1830, name: '紅磡' },
    { lat: 22.2825, lon: 114.1319, name: '堅尼地城' },
    { lat: 22.2860, lon: 114.2090, name: '鰂魚涌' },
    { lat: 22.3350, lon: 114.1560, name: '長沙灣' },
    { lat: 22.3320, lon: 114.1680, name: '石硤尾' },
    { lat: 22.3350, lon: 114.1760, name: '九龍塘' }
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
