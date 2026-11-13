// 香港十九區行政區劃與地標歸屬字典 (Hong Kong 19 Districts & Landmark Mapping)
//
// 1985–1994 年間香港劃分為十九個行政區（葵青自荃灣分拆，油尖與旺角獨立分區）。
// 本模組提供十九區定義、地標歸屬映射字典、分區快捷分組與條件過濾輔助函式。

export const DISTRICTS = Object.freeze([
  // --- 香港島 Hong Kong Island (4 區) ---
  {
    id: 'central-western',
    name: '中西區',
    englishName: 'Central and Western',
    region: 'hong-kong-island',
    regionName: '香港島',
    description: '香港政治及商業中心，包含中環、金鐘、上環及太平山頂',
    landmarkCount: 38,
  },
  {
    id: 'wan-chai',
    name: '灣仔區',
    englishName: 'Wan Chai',
    region: 'hong-kong-island',
    regionName: '香港島',
    description: '會展中心、摩天商廈群、跑馬地馬場與銅鑼灣核心購物區',
    landmarkCount: 16,
  },
  {
    id: 'eastern',
    name: '東區',
    englishName: 'Eastern',
    region: 'hong-kong-island',
    regionName: '香港島',
    description: '港島東商業樞紐（太古坊、鰂魚涌、北角）與東區走廊水岸',
    landmarkCount: 1,
  },
  {
    id: 'southern',
    name: '南區',
    englishName: 'Southern',
    region: 'hong-kong-island',
    regionName: '香港島',
    description: '香港海洋公園、淺水灣、赤柱及南區優美海岸線',
    landmarkCount: 1,
  },

  // --- 九龍 Kowloon (6 區) ---
  {
    id: 'yau-tsim',
    name: '油尖區',
    englishName: 'Yau Tsim',
    region: 'kowloon',
    regionName: '九龍',
    description: '尖沙咀文化海濱、海港城、西九龍高鐵站及九龍站摩天大樓群（ICC、天璽）',
    landmarkCount: 36,
  },
  {
    id: 'mong-kok',
    name: '旺角區',
    englishName: 'Mong Kok',
    region: 'kowloon',
    regionName: '九龍',
    description: '旺角標誌性繁華街區、朗豪坊辦公大樓與旺角大球場',
    landmarkCount: 2,
  },
  {
    id: 'sham-shui-po',
    name: '深水埗區',
    englishName: 'Sham Shui Po',
    region: 'kowloon',
    regionName: '九龍',
    description: '傳統市區街廓、長沙灣商貿區與深水埗數碼商圈',
    landmarkCount: 0,
  },
  {
    id: 'kowloon-city',
    name: '九龍城區',
    englishName: 'Kowloon City',
    region: 'kowloon',
    regionName: '九龍',
    description: '啟德體育園核心場館群（主場館、體藝館、青年運動場）與 AIRSIDE',
    landmarkCount: 3,
  },
  {
    id: 'wong-tai-sin',
    name: '黃大仙區',
    englishName: 'Wong Tai Sin',
    region: 'kowloon',
    regionName: '九龍',
    description: '獅子山麓、黃大仙祠及傳統社區網絡',
    landmarkCount: 0,
  },
  {
    id: 'kwun-tong',
    name: '觀塘區',
    englishName: 'Kwun Tong',
    region: 'kowloon',
    regionName: '九龍',
    description: '九龍東第二核心商業區（CBD2）、創紀之城與觀塘海濱',
    landmarkCount: 0,
  },

  // --- 新界及離島 New Territories & Islands (9 區) ---
  {
    id: 'tsuen-wan',
    name: '荃灣區',
    englishName: 'Tsuen Wan',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '荃灣新市鎮與新界最高摩天大樓如心廣場（Nina Tower）',
    landmarkCount: 1,
  },
  {
    id: 'kwai-tsing',
    name: '葵青區',
    englishName: 'Kwai Tsing',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '葵涌貨櫃碼頭與昂船洲大橋、青衣島海運樞紐',
    landmarkCount: 0,
  },
  {
    id: 'tuen-mun',
    name: '屯門區',
    englishName: 'Tuen Mun',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '屯門新市鎮、青山灣與港珠澳大橋屯門赤鱲角隧道北口',
    landmarkCount: 0,
  },
  {
    id: 'yuen-long',
    name: '元朗區',
    englishName: 'Yuen Long',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '元朗平原、天水圍新市鎮與北部都會區重鎮',
    landmarkCount: 0,
  },
  {
    id: 'north',
    name: '北區',
    englishName: 'North',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '上水、粉嶺新市鎮與深港河套創新科技區',
    landmarkCount: 0,
  },
  {
    id: 'tai-po',
    name: '大埔區',
    englishName: 'Tai Po',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '吐露港水岸、香港科學園與大埔林村自然風光',
    landmarkCount: 0,
  },
  {
    id: 'sha-tin',
    name: '沙田區',
    englishName: 'Sha Tin',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '城門河畔沙田新市鎮、沙田馬場（Sha Tin Racecourse）及香港中文大學',
    landmarkCount: 1,
  },
  {
    id: 'sai-kung',
    name: '西貢區',
    englishName: 'Sai Kung',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '香港後花園、西貢地質公園與將軍澳新市鎮',
    landmarkCount: 0,
  },
  {
    id: 'islands',
    name: '離島區',
    englishName: 'Islands',
    region: 'new-territories',
    regionName: '新界及離島',
    description: '香港國際機場（HKIA）、赤鱲角人工島、大嶼山及東涌新市鎮',
    landmarkCount: 1,
  },
]);

export const DISTRICT_MAP = Object.freeze(Object.fromEntries(DISTRICTS.map((d) => [d.id, d])));

// 地標/建築模組與十九區之歸屬映射字典
export const LANDMARK_DISTRICT_MAP = Object.freeze({
  // 離島區 Islands
  'airport': 'islands',
  'hong-kong-international-airport': 'islands',

  // 中西區 Central and Western
  'hsbc': 'central-western',
  'hsbc-main-building': 'central-western',
  'shunTak': 'central-western',
  'shun-tak-centre': 'central-western',
  'chaterGarden': 'central-western',
  'chater-garden': 'central-western',
  'statueSquare': 'central-western',
  'statue-square': 'central-western',
  'oldBankOfChina': 'central-western',
  'old-bank-of-china-building': 'central-western',
  'worldWideHouse': 'central-western',
  'world-wide-house': 'central-western',
  'entertainmentBuilding': 'central-western',
  'entertainment-building': 'central-western',
  'mandarinOriental': 'central-western',
  'mandarin-oriental': 'central-western',
  'princesBuilding': 'central-western',
  'princes-building': 'central-western',
  'hongKongClub': 'central-western',
  'hong-kong-club': 'central-western',
  'hangSeng': 'central-western',
  'hang-seng-bank-headquarters': 'central-western',
  'centralMarket': 'central-western',
  'central-market': 'central-western',
  'lippoCentre': 'central-western',
  'lippo-centre': 'central-western',
  'farEastFinance': 'central-western',
  'far-east-finance-centre': 'central-western',
  'aiaCentral': 'central-western',
  'aia-central': 'central-western',
  'icbcTower': 'central-western',
  'icbc-tower': 'central-western',
  'bankOfAmerica': 'central-western',
  'bank-of-america-tower': 'central-western',
  'citicTower': 'central-western',
  'citic-tower': 'central-western',
  'ccbTower': 'central-western',
  'ccb-tower': 'central-western',
  'threeExchange': 'central-western',
  'three-exchange-square': 'central-western',
  'admiraltyCentre': 'central-western',
  'admiralty-centre': 'central-western',
  'unitedCentre': 'central-western',
  'united-centre': 'central-western',
  'standardChartered': 'central-western',
  'standard-chartered-bank': 'central-western',
  'twoIfc': 'central-western',
  'two-ifc': 'central-western',
  'ifcMall': 'central-western',
  'ifc-mall': 'central-western',
  'governmentHouse': 'central-western',
  'government-house': 'central-western',
  'peakTower': 'central-western',
  'peak-tower': 'central-western',
  'bankOfChina': 'central-western',
  'bank-of-china-tower': 'central-western',
  'theCenter': 'central-western',
  'the-center': 'central-western',
  'cheungKong': 'central-western',
  'cheung-kong-center': 'central-western',
  'twoPacificPlace': 'central-western',
  'two-pacific-place': 'central-western',
  'threePacificPlace': 'central-western',
  'three-pacific-place': 'central-western',
  'oneIfc': 'central-western',
  'one-ifc': 'central-western',
  'championTower': 'central-western',
  'champion-tower': 'central-western',
  'ckc2': 'central-western',
  'cheung-kong-center-ii': 'central-western',
  'qgo': 'central-western',
  'queensway-government-offices': 'central-western',
  'centralGovernment': 'central-western',
  'tamar': 'central-western',
  'conrad': 'central-western',
  'conrad-hong-kong': 'central-western',
  'theHenderson': 'central-western',
  'the-henderson': 'central-western',
  'oneExchange': 'central-western',
  'one-exchange-square': 'central-western',
  'twoExchange': 'central-western',
  'two-exchange-square': 'central-western',
  'courtOfFinalAppeal': 'central-western',
  'court-of-final-appeal': 'central-western',
  'cityHall': 'central-western',
  'hong-kong-city-hall': 'central-western',
  'centralCarnival': 'central-western',
  'central-carnival': 'central-western',
  'hongKongPark': 'central-western',
  'hong-kong-park': 'central-western',
  'generalPostOffice': 'central-western',
  'general-post-office': 'central-western',
  'stJohns': 'central-western',
  'st-johns-building': 'central-western',
  'stJohnsCathedral': 'central-western',
  'st-johns-cathedral': 'central-western',
  'cheungKongPark': 'central-western',
  'cheung-kong-park': 'central-western',
  'murray': 'central-western',
  'the-murray': 'central-western',
  'jardineHouse': 'central-western',
  'jardine-house': 'central-western',
  'peakTram': 'central-western',

  // 灣仔區 Wan Chai
  'chinaResources': 'wan-chai',
  'china-resources-building': 'wan-chai',
  'conventionPlazaOffice': 'wan-chai',
  'convention-plaza-office-tower': 'wan-chai',
  'conventionPlazaApartments': 'wan-chai',
  'convention-plaza-apartments': 'wan-chai',
  'sogo': 'wan-chai',
  'causeway-bay-sogo': 'wan-chai',
  'hkapa': 'wan-chai',
  'hong-kong-academy-for-performing-arts': 'wan-chai',
  'centralPlaza': 'wan-chai',
  'central-plaza': 'wan-chai',
  'summit': 'wan-chai',
  'the-summit': 'wan-chai',
  'hopewell': 'wan-chai',
  'hopewell-centre': 'wan-chai',
  'sunHungKai': 'wan-chai',
  'sun-hung-kai-centre': 'wan-chai',
  'leeGardenOne': 'wan-chai',
  'lee-garden-one': 'wan-chai',
  'hysan': 'wan-chai',
  'hysan-place': 'wan-chai',
  'hkcec': 'wan-chai',
  'hong-kong-convention-and-exhibition-centre': 'wan-chai',
  'hongKongStadium': 'wan-chai',
  'hong-kong-stadium': 'wan-chai',
  'happyValleyRacecourse': 'wan-chai',
  'happy-valley-racecourse': 'wan-chai',
  'happyValley': 'wan-chai',
  'timesSquare': 'wan-chai',
  'times-square': 'wan-chai',
  'centralLibrary': 'wan-chai',
  'hong-kong-central-library': 'wan-chai',
  'victoriaPark': 'wan-chai',
  'victoria-park': 'wan-chai',
  'revenueTower': 'wan-chai',
  'revenue-tower': 'wan-chai',
  'wanchaiTower': 'wan-chai',
  'wanchai-tower': 'wan-chai',
  'immigrationTower': 'wan-chai',
  'immigration-tower': 'wan-chai',
  'obrienFootbridge': 'wan-chai',
  'windsorHouse': 'wan-chai',
  'windsor-house': 'wan-chai',
  'blueHouse': 'wan-chai',
  'blue-house': 'wan-chai',
  'queenElizabethStadium': 'wan-chai',
  'queen-elizabeth-stadium': 'wan-chai',

  // 深水埗區 Sham Shui Po
  'laiYuen': 'sham-shui-po',
  'lai-yuen': 'sham-shui-po',

  // 東區 Eastern
  'twoTaikoo': 'eastern',
  'two-taikoo-place': 'eastern',

  // 南區 Southern
  'oceanPark': 'southern',
  'ocean-park': 'southern',

  // 油尖區 Yau Tsim (尖沙咀、佐敦、油麻地、西九龍)
  'icc': 'yau-tsim',
  'international-commerce-centre': 'yau-tsim',
  'k11Atelier': 'yau-tsim',
  'k11-atelier': 'yau-tsim',
  'cullinanI': 'yau-tsim',
  'the-cullinan-i': 'yau-tsim',
  'cullinanII': 'yau-tsim',
  'the-cullinan-ii': 'yau-tsim',
  'masterpiece': 'yau-tsim',
  'the-masterpiece': 'yau-tsim',
  'heritage1881': 'yau-tsim',
  '1881-heritage': 'yau-tsim',
  'theArch': 'yau-tsim',
  'the-arch': 'yau-tsim',
  'theHarbourside': 'yau-tsim',
  'the-harbourside': 'yau-tsim',
  'theWaterfront': 'yau-tsim',
  'the-waterfront': 'yau-tsim',
  'sorrento': 'yau-tsim',
  'hongKongColiseum': 'yau-tsim',
  'hong-kong-coliseum': 'yau-tsim',
  'oceanTerminal': 'yau-tsim',
  'ocean-terminal': 'yau-tsim',
  'starHouse': 'yau-tsim',
  'star-house': 'yau-tsim',
  'marcoPolo': 'yau-tsim',
  'marco-polo-hongkong-hotel': 'yau-tsim',
  'oceanCentre': 'yau-tsim',
  'ocean-centre': 'yau-tsim',
  'princeHotel': 'yau-tsim',
  'prince-hotel': 'yau-tsim',
  'gateway1': 'yau-tsim',
  'gateway-tower-one': 'yau-tsim',
  'gateway2': 'yau-tsim',
  'gateway-tower-two': 'yau-tsim',
  'gateway3': 'yau-tsim',
  'prudential-tower': 'yau-tsim',
  'gateway5': 'yau-tsim',
  'gateway-tower-five': 'yau-tsim',
  'gateway6': 'yau-tsim',
  'gateway-tower-six': 'yau-tsim',
  'pacificClub': 'yau-tsim',
  'pacific-club': 'yau-tsim',
  'spaceMuseum': 'yau-tsim',
  'space-museum': 'yau-tsim',
  'museumOfArt': 'yau-tsim',
  'hong-kong-museum-of-art': 'yau-tsim',
  'scienceMuseum': 'yau-tsim',
  'hong-kong-science-museum': 'yau-tsim',
  'historyMuseum': 'yau-tsim',
  'hong-kong-museum-of-history': 'yau-tsim',
  'culturalCentre': 'yau-tsim',
  'hong-kong-cultural-centre': 'yau-tsim',
  'clockTower': 'yau-tsim',
  'clock-tower': 'yau-tsim',
  'peninsulaHotel': 'yau-tsim',
  'the-peninsula': 'yau-tsim',
  'sheratonHotel': 'yau-tsim',
  'sheraton-hong-kong': 'yau-tsim',
  'salisburyYMCA': 'yau-tsim',
  'the-salisbury-ymca': 'yau-tsim',
  'kowloonShangriLa': 'yau-tsim',
  'kowloon-shangri-la': 'yau-tsim',
  'tstWaterfrontRailing': 'yau-tsim',
  'tstWaterfrontPromenade': 'yau-tsim',
  'tsim-sha-tsui-waterfront-promenade': 'yau-tsim',
  'kowloonPark': 'yau-tsim',
  'kowloon-park': 'yau-tsim',

  // 旺角區 Mong Kok
  'langhamPlace': 'mong-kok',
  'langham-place-office-tower': 'mong-kok',
  'mongKokStadium': 'mong-kok',
  'mong-kok-stadium': 'mong-kok',

  // 九龍城區 Kowloon City
  'airside': 'kowloon-city',
  'kaiTakStadium': 'kowloon-city',
  'kai-tak-stadium': 'kowloon-city',
  'kaiTakArena': 'kowloon-city',
  'kai-tak-arena': 'kowloon-city',
  'kaiTakYouthSportsGround': 'kowloon-city',
  'kai-tak-youth-sports-ground': 'kowloon-city',

  // 荃灣區 Tsuen Wan
  'ninaTower': 'tsuen-wan',
  'nina-tower': 'tsuen-wan',

  // 沙田區 Sha Tin
  'shaTinRacecourse': 'sha-tin',
  'shaTin': 'sha-tin',
  'sha-tin-racecourse': 'sha-tin',

  // 跨區 / 跨海隧道及橋樑
  'harbourBridgesAndTunnels': ['central-western', 'wan-chai', 'eastern', 'yau-tsim', 'tsuen-wan', 'kwai-tsing', 'islands'],
});

// 快捷選擇預設組 (Quick Select Groups)
export const DISTRICT_REGIONS = Object.freeze({
  all: DISTRICTS.map(d => d.id),
  'hong-kong-island': ['central-western', 'wan-chai', 'eastern', 'southern'],
  kowloon: ['yau-tsim', 'mong-kok', 'sham-shui-po', 'kowloon-city', 'wong-tai-sin', 'kwun-tong'],
  'new-territories': ['tsuen-wan', 'kwai-tsing', 'tuen-mun', 'yuen-long', 'north', 'tai-po', 'sha-tin', 'sai-kung', 'islands'],
  core: ['central-western', 'wan-chai', 'yau-tsim', 'mong-kok'],
  'yau-tsim-mong': ['yau-tsim', 'mong-kok'],
});

// 檢查某分區是否包含於選中列表中
export function isDistrictSelected(districtId, selectedDistricts) {
  if (!selectedDistricts || selectedDistricts.length === 0) return true;
  if (selectedDistricts.includes('all')) return true;
  if (Array.isArray(districtId)) {
    return districtId.some(id => isDistrictSelected(id, selectedDistricts));
  }
  if (selectedDistricts.includes(districtId)) return true;
  if (selectedDistricts.includes('yau-tsim-mong') && (districtId === 'yau-tsim' || districtId === 'mong-kok')) {
    return true;
  }
  return false;
}

// 根據地標 key 判斷是否需要建造
export function shouldBuildLandmark(landmarkKey, selectedDistricts) {
  if (!selectedDistricts || selectedDistricts.length === 0 || selectedDistricts.includes('all')) return true;
  const target = LANDMARK_DISTRICT_MAP[landmarkKey];
  if (!target) return true; // 若未在字典中特別指定，預設保持加載
  return isDistrictSelected(target, selectedDistricts);
}

// 各區空間範圍邊界 (Spatial Bounding Boxes in Metres, Origin at Statue Square, Central)
export const DISTRICT_BOUNDS = Object.freeze({
  'central-western': { minX: -4200, maxX: 1200, minZ: -1600, maxZ: 3000 },
  'wan-chai': { minX: 600, maxX: 4500, minZ: -1600, maxZ: 3200 },
  'eastern': { minX: 2800, maxX: 10500, minZ: -2400, maxZ: 4200 },
  'southern': { minX: -4200, maxX: 9500, minZ: 1400, maxZ: 10500 },
  'yau-tsim': { minX: -1200, maxX: 3500, minZ: -4000, maxZ: -800 },
  'mong-kok': { minX: -800, maxX: 2400, minZ: -5200, maxZ: -3100 },
  'sham-shui-po': { minX: -4800, maxX: 1600, minZ: -7200, maxZ: -3800 },
  'kowloon-city': { minX: 800, maxX: 6800, minZ: -5200, maxZ: -1200 },
  'wong-tai-sin': { minX: 1600, maxX: 7000, minZ: -7000, maxZ: -3800 },
  'kwun-tong': { minX: 4000, maxX: 11000, minZ: -6000, maxZ: -1000 },
  'tsuen-wan': { minX: -13500, maxX: -2500, minZ: -13500, maxZ: -6000 },
  'kwai-tsing': { minX: -9500, maxX: -1800, minZ: -10500, maxZ: -4800 },
  'tuen-mun': { minX: -27500, maxX: -10500, minZ: -17500, maxZ: -7000 },
  'yuen-long': { minX: -23500, maxX: -6000, minZ: -25500, maxZ: -12000 },
  'north': { minX: -9000, maxX: 10000, minZ: -33500, maxZ: -20000 },
  'tai-po': { minX: -800, maxX: 14000, minZ: -24500, maxZ: -13000 },
  'sha-tin': { minX: -2200, maxX: 11000, minZ: -18000, maxZ: -8000 },
  'sai-kung': { minX: 7500, maxX: 27500, minZ: -19500, maxZ: 2000 },
  'islands': { minX: -37000, maxX: -5000, minZ: -6000, maxZ: 16000 },
});

// 計算所選分區之合併空間包圍盒
export function getDistrictsCombinedBounds(selectedDistricts, buffer = 600) {
  if (!selectedDistricts || selectedDistricts.length === 0 || selectedDistricts.includes('all') || selectedDistricts.length >= DISTRICTS.length) {
    return null; // 全港境，不作空間邊界限制
  }
  let minX = -400, maxX = 400, minZ = -400, maxZ = 400; // 保留中環開場出生點核心範圍
  let matched = 0;
  for (const id of selectedDistricts) {
    const b = DISTRICT_BOUNDS[id];
    if (b) {
      minX = Math.min(minX, b.minX);
      maxX = Math.max(maxX, b.maxX);
      minZ = Math.min(minZ, b.minZ);
      maxZ = Math.max(maxZ, b.maxZ);
      matched++;
    }
  }
  if (matched === 0) return null;
  return {
    minX: minX - buffer,
    maxX: maxX + buffer,
    minZ: minZ - buffer,
    maxZ: maxZ + buffer
  };
}

// 本地儲存鍵值
export const DISTRICT_STORAGE_KEY = 'slop-hongkong-selected-districts';

// 取得儲存的分區配置（預設全選 19 區）
export function getStoredSelectedDistricts() {
  try {
    const raw = localStorage.getItem(DISTRICT_STORAGE_KEY);
    if (!raw) return DISTRICTS.map(d => d.id);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    // ignore
  }
  return DISTRICTS.map(d => d.id);
}

// 儲存分區配置
export function saveSelectedDistricts(districts) {
  try {
    localStorage.setItem(DISTRICT_STORAGE_KEY, JSON.stringify(districts));
  } catch (e) {
    // ignore
  }
}
