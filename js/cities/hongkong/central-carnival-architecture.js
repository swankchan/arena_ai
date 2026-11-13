// 中環海濱活動空間、幸福摩天輪與嘉年華遊樂場架構定義
// Central Harbourfront Event Space, Hong Kong Observation Wheel & AIA Carnival Architecture

export const CENTRAL_CARNIVAL_SOURCE = Object.freeze({
  id: 'HK-CENTRAL-HARBOURFRONT-CARNIVAL',
  name: '中環海濱活動空間與香港摩天輪 Central Harbourfront Event Space & Hong Kong Observation Wheel',
  wheelCommonName: '幸福摩天輪 / 香港摩天輪 (Hong Kong Observation Wheel)',
  carnivalName: '中環海濱遊樂場與友邦嘉年華 (Central Harbourfront Fairground & AIA Carnival)',
  address: '33 Man Kwong Street, Central, Hong Kong (香港中環民光街33號中環海濱長廊)',
  observationWheelYear: 2014,
  observationWheelHeightMetres: 60.0,
  observationWheelDiameterMetres: 54.0,
  observationWheelGondolasCount: 42,
  observationWheelCapacityPerGondola: 8,
  eventSpaceAreaSquareMetres: 5600,
  userInstruction: '雖然是節慶偶有, 但我想長擺 (Permanently installed fairground and Hong Kong Observation Wheel)',
  researchSources: Object.freeze([
    {
      url: 'https://hkow.hk/',
      title: 'Hong Kong Observation Wheel & AIA Vitality Park Official Portal',
      evidence: '60-metre tall observation wheel opened in December 2014 at Central Pier 9/10; features 42 high-tech climate-controlled enclosed glass capsules, classic European carousel, and harbourfront events.'
    },
    {
      url: 'https://www.aiacarnival.com/',
      title: 'AIA Carnival — Central Harbourfront Event Space',
      evidence: 'Annual large-scale European carnival featuring wave swinger flying chairs, bumper cars, circus big top marquee, skill game booths, giant plush prizes, and festival food village.'
    },
    {
      url: 'https://www.cvd.gov.hk/',
      title: 'Central Harbourfront Event Space — Lands Department / Harbourfront Commission',
      evidence: 'Major civic waterfront event venue on reclaimed Central waterfront between Man Yiu Street, Man Kwong Street, and Lung Wo Road overlooking Victoria Harbour.'
    }
  ])
});

export const CENTRAL_CARNIVAL_CONFIG = Object.freeze({
  // Bounding box of the fairground site in world coordinates
  bounds: Object.freeze({
    minX: 192.0,
    maxX: 272.0,
    minZ: -424.0,
    maxZ: -354.0
  }),

  // Hong Kong Observation Wheel (幸福摩天輪)
  wheel: Object.freeze({
    x: 218.0,
    z: -382.0,
    diameter: 54.0,
    radius: 27.0,
    hubHeight: 32.0,
    topHeight: 60.0,
    gondolas: 42,
    spokePairs: 21,
    legSpanX: 13.5,
    legSpanZ: 14.5,
    rimThickness: 0.75,
    rimInnerRadius: 24.2,
    station: Object.freeze({
      width: 16.0,
      length: 8.5,
      height: 2.2,
      canopyHeight: 4.8
    }),
    ticketBooth: Object.freeze({
      width: 4.2,
      length: 3.2,
      height: 3.0
    })
  }),

  // AIA Vitality Park Classic Carousel (歐陸復古雙層旋轉木馬)
  carousel: Object.freeze({
    x: 202.0,
    z: -360.0,
    diameter: 11.5,
    radius: 5.75,
    height: 6.8,
    horses: 16,
    deckHeight: 0.55
  }),

  // Wave Swinger / Flying Chairs (波浪飛天椅)
  waveSwinger: Object.freeze({
    x: 248.0,
    z: -398.0,
    towerRadius: 2.2,
    canopyRadius: 6.5,
    height: 12.5,
    chairs: 16
  }),

  // Bumper Cars Pavilion (碰碰車樂園)
  bumperCars: Object.freeze({
    x: 258.0,
    z: -368.0,
    width: 15.0,
    depth: 11.0,
    height: 4.2,
    cars: 8
  }),

  // Circus Big Top / Grand Event Marquee (歐陸雜技團馬戲大帳篷)
  circusBigTop: Object.freeze({
    x: 236.0,
    z: -356.0,
    length: 24.0,
    width: 16.0,
    peakHeight: 11.5,
    wallHeight: 4.2
  }),

  // Carnival Game Booths (經典嘉年華攤位遊戲區)
  gameBooths: Object.freeze([
    { id: 'ring-toss', name: 'Ring Toss 幸運拋鐵圈', x: 234.0, z: -414.0, width: 4.8, depth: 3.5, awningColor: 0xd62828 },
    { id: 'milk-bottles', name: 'Milk Bottle Toss 保齡擲瓶', x: 240.0, z: -414.0, width: 4.8, depth: 3.5, awningColor: 0x2a9d8f },
    { id: 'balloon-dart', name: 'Balloon Dart Pop 飛鏢射氣球', x: 246.0, z: -414.0, width: 4.8, depth: 3.5, awningColor: 0xf4a261 },
    { id: 'cuddly-prizes', name: 'Cuddly Toy Prize Wall 巨型毛絨公仔牆', x: 252.0, z: -414.0, width: 4.8, depth: 3.5, awningColor: 0x9b5de5 }
  ]),

  // Food & Beverage Village (嘉年華美食小食街)
  foodStalls: Object.freeze([
    { id: 'popcorn-candy', name: 'Popcorn & Cotton Candy 爆谷與棉花糖', x: 204.0, z: -412.0, width: 4.5, depth: 3.2, color: 0xe63946 },
    { id: 'waffles-churros', name: 'Waffles & Churros 窩夫與西班牙油條', x: 210.0, z: -412.0, width: 4.5, depth: 3.2, color: 0xffb703 },
    { id: 'beverages-icecream', name: 'Beverages & Soft Serve 特飲與雪糕', x: 216.0, z: -412.0, width: 4.5, depth: 3.2, color: 0x219ebc }
  ]),

  // Grand Entrance Archways
  entranceArches: Object.freeze([
    { id: 'main-gate', name: 'Main City Entrance 迎賓正門拱門', x: 194.0, z: -396.0, width: 8.5, height: 5.5, depth: 1.2, facing: Math.PI * 0.5 },
    { id: 'promenade-gate', name: 'Harbour Promenade Entrance 海旁觀景拱門', x: 226.0, z: -422.0, width: 7.5, height: 5.0, depth: 1.0, facing: 0 }
  ]),

  // Outdoor dining picnic tables with umbrellas
  picnicTables: Object.freeze([
    { x: 206.0, z: -420.0 },
    { x: 211.0, z: -420.0 },
    { x: 216.0, z: -420.0 },
    { x: 221.0, z: -420.0 }
  ])
});
