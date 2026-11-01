# 香港建築物 Inventory

這份文件是香港場景**實際建築物進度總表及 100 幢主要大廈施工清單**，記錄建築物是否已加入、是否精修，以及是否作為 Landmark 整合。`tools/data/hongkong/landmarks.json` 及下表的待製作項目只是來源／候選資料；資料出現在該 JSON 或本清單 **不代表已經加入場景**。

最後整理：**2026-11-01**。目前已實際加入 **11 幢**；其餘 **89 幢**仍是待製作項目，沒有基本體量或精修完成的意思。

## 標記定義

- **場景狀態**
  - **已加入**：目前分支的香港場景會實際生成這座建築物；不代表測量級完成，也不阻止後續修正。
  - **製作中**：已開始實作，但尚未完整整合及驗證。
  - **待製作**：已確定列入計劃，尚未開始實作。
- **精修**：有針對該建築製作可識別的比例、立面、入口、屋頂、標誌或其他細節，而非只按 footprint 拉出基本體量。「精修」與「已加入」是不同狀態。
- **Landmark**：本專案將它作為獨立命名地標整合，而不是一般建築群的一部分。這是專案分類，**不是**照抄 OSM `landmark` tag，也不是對現實知名度的評級。待製作項目在尚未整合前一律標「否」。
- **內部 ID**：只供本 inventory、衝突紀錄及測試互相對應，不是政府或 OSM 編號；ID 不重複、不重用。

## 數量總覽

| 項目 | 數量 |
| --- | ---: |
| 施工清單總數 | 100 |
| 已加入場景的建築物 | 11 |
| 已加入而且精修 | 11 |
| 已加入但只有基本體量 | 0 |
| 已加入並作為 Landmark 整合 | 11 |
| 製作中 | 0 |
| 待製作 | 89 |

目前普通建築群仍為 **0**；上表只計實際加入的建築物，不把橋樑、道路構築物或純 OSM 候選資料計算在內。

## 100 幢施工清單

清單次序是**施工次序**，不是官方高度、知名度或重要性排名。選取原則是有明確名稱、天際線或公共重要性，以及可追溯的建築／地盤資料；正式建模前仍須核實當幢 footprint、來源及道路衝突。高度是來源參考值，不代表已按該高度建模；`—` 表示目前採用的來源沒有可用高度值。

- 大部分 OSM 元件及高度來自本地 Geofabrik 快照；目前 API 補核的五個 `building` 元件會在對應列明示，未假裝已存在於本地快照。
- **† 中銀大廈 367.4 m** 是[外部建築資料](https://en.wikipedia.org/wiki/Bank_of_China_Tower_(Hong_Kong))的建築高度參考；OSM way **25604760** 提供 `building=office` footprint，但沒有 `height` tag，不能寫成由 OSM 高度標籤核實。該 way 不在舊本地 landmark snapshot，現已把原始經緯度、版本及 ODbL 來源保存於 `bank-of-china-architecture.js`，並以測試重算同一 georef。
- Two IFC 的 **415.8 m／90 levels** 來自本地 OSM；建築設計及幕牆資料的 **412 m／88 層** 是另一套來源表述，兩者在詳細紀錄分列，沒有混合成一個假精確規格。
- ICC 的 **484 m／118 levels** 來自本地 OSM；KPF 同樣描述 **118-story**，另有資料採 **108 occupied floors above ground** 的計法。模型的 108 道幕牆 courses 只是視覺分層，沒有把不同層數計法合成一個假精確規格。
- **‡ 中環廣場 373.9 m** 是外部建築高度參考；本地 OSM way **27087018** 的 **309 m** 是 roof，另有 **78 levels**。官方項目頁另採 **374 m including mast／75-storey Grade A office**，四套來源表述在詳細紀錄及程式分列，沒有把 roof 當 architectural height 或擅自取整。
- 中環中心的 **346 m／73 levels** 來自本地 OSM，CTBUH 亦採 73 層；香港旅遊發展局頁面另寫 **79 floors**。外部 292 m roof/275 m occupied 與 346 m architectural 在詳細紀錄分列，不把不同層數 convention 合併。
- 如心廣場高座 OSM way **112284860** 的 **318 m／80 levels** 與外部 **320.4 m architectural／319.8 m roof／301.1 m occupied／151.7 m observatory** 分開保存；低座 OSM way **112284790** 沒有 `height` tag，外部 **170.4／148.1 m** 及另一摘要 **163.7 m** 不互相覆寫。頂層編號 **89** 不是 89 個實體樓層。三個原始 rings 均保存於專屬來源模組。
- 長江集團中心 OSM way **64897826** 採 **283 m／63 levels**，CVU 採 **282.8 m architectural／to-tip、63 above-ground／5 below-ground**；另一常見樓層表述為 **62 層**，升降機最高標號 **70** 不是 70 個實體樓層。結構論文的 **47.4 × 47.4 m、1 m chamfer** 與 OSM 六頂點外框分列，沒有互相取整。
- K11 Atelier OSM way **668219664** 採 **274 m／66 levels**；CVU 另列 **272.5 m architectural／277.3 m to-tip／255.1 m occupied、66 above-ground／5 below-ground**。官方約 **273 m** 及 **62 層（排除兩層避火及兩層機電）**、設計報道 **280 m** 與 Wikipedia **284 m** 均在詳細紀錄及程式分列，沒有混合、平均或擅自取整。
- 天璽I OSM way **200726114** 採 **270 m／68 levels**，Wong & Ouyang 亦以約 **270 m** 描述雙塔；CTBUH 單幢 North Tower 資料為 **269.9 m architectural＝269.9 m to-tip、68 above-ground／1 below-ground、2008 completed**。OSM `start_date=2007` 與 CTBUH 完成年份分開保存；`location=podium` 也不被當成已知 podium 工程標高。

| 內部 ID | 建築物 | 地區 | 場景狀態 | 精修 | Landmark | 高度 | 位置／footprint 依據 | 主要實作 |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- |
| `HK-B0001` | 滙豐總行大廈 HSBC Main Building | 中環 | 已加入 | **是** | **是** | 178.8 m | `js/hk-geodata.js` 內現有 OSM footprint | `js/cities/hongkong/hsbc-headquarters-world.js` |
| `HK-B0002` | 渣打銀行大廈 Standard Chartered Bank Building | 中環 | 已加入 | **是** | **是** | 191 m | OSM way **85320719** | `js/cities/hongkong/standard-chartered-world.js` |
| `HK-B0003` | 國際金融中心二期 Two International Finance Centre | 中環 | 已加入 | **是** | **是** | 415.8 m | OSM way **25589595** | `js/cities/hongkong/two-ifc-world.js` |
| `HK-B0004` | 環球貿易廣場 International Commerce Centre | 西九龍 | 已加入 | **是** | **是** | 484 m | OSM way **25590249** | `js/cities/hongkong/icc-world.js` |
| `HK-B0005` | 中銀大廈 Bank of China Tower | 中環 | 已加入 | **是** | **是** | 367.4 m† | OSM way **25604760**（目前 API building；原始幾何另存於專屬來源模組） | `js/cities/hongkong/bank-of-china-world.js` |
| `HK-B0006` | 中環廣場 Central Plaza | 灣仔 | 已加入 | **是** | **是** | 373.9 m‡ | OSM way **27087018** | `js/cities/hongkong/central-plaza-world.js` |
| `HK-B0007` | 中環中心 The Center | 中環 | 已加入 | **是** | **是** | 346 m | OSM way **148228888** | `js/cities/hongkong/the-center-world.js` |
| `HK-B0008` | 如心廣場 Nina Tower | 荃灣 | 已加入 | **是** | **是** | OSM 318 m；外部高／低座 320.4／170.4 m | OSM ways **112284860／112284790／492365420**（目前 API buildings；原始幾何另存於專屬來源模組） | `js/cities/hongkong/nina-tower-world.js` |
| `HK-B0009` | 長江集團中心 Cheung Kong Center | 中環 | 已加入 | **是** | **是** | OSM 283 m；外部 282.8 m | OSM way **64897826**（目前 API building；原始幾何另存於專屬來源模組） | `js/cities/hongkong/cheung-kong-world.js` |
| `HK-B0010` | K11 Atelier（Victoria Dockside） | 尖沙咀 | 已加入 | **是** | **是** | OSM 274 m；外部 272.5 m | OSM way **668219664**（目前 API building；原始幾何另存於專屬來源模組） | `js/cities/hongkong/k11-atelier-world.js` |
| `HK-B0011` | 天璽I The Cullinan I | 西九龍 | 已加入 | **是** | **是** | OSM 270 m；CTBUH 269.9 m | OSM way **200726114**（version 14；原始幾何及 tags 另存於專屬來源模組） | `js/cities/hongkong/cullinan-i-world.js` |
| `HK-B0012` | 天璽II The Cullinan II | 西九龍 | 待製作 | 否 | 否 | 270 m | OSM way **25608721** | — |
| `HK-B0013` | 名鑄 The Masterpiece | 尖沙咀 | 待製作 | 否 | 否 | 261 m | OSM way **124697429** | — |
| `HK-B0014` | 朗豪坊辦公大樓 Langham Place Office Tower | 旺角 | 待製作 | 否 | 否 | 255 m | OSM way **65259283** | — |
| `HK-B0015` | 御峰 The Summit | 半山區 | 待製作 | 否 | 否 | 220 m | OSM way **65257281** | — |
| `HK-B0016` | 合和中心 Hopewell Centre | 灣仔 | 待製作 | 否 | 否 | 216 m | OSM way **88391069** | — |
| `HK-B0017` | 新鴻基中心 Sun Hung Kai Centre | 灣仔 | 待製作 | 否 | 否 | 215 m | OSM way **107497703** | — |
| `HK-B0018` | 太古廣場二座 Two Pacific Place | 金鐘 | 待製作 | 否 | 否 | 213 m | OSM way **41498695** | — |
| `HK-B0019` | AIRSIDE | 啟德 | 待製作 | 否 | 否 | 213 m | OSM way **1212412229** | — |
| `HK-B0020` | 利園一期 Lee Garden One | 銅鑼灣 | 待製作 | 否 | 否 | 211 m | OSM way **1424342883** | — |
| `HK-B0021` | 國際金融中心一期 One International Finance Centre | 中環 | 待製作 | 否 | 否 | 210 m | OSM way **148554945** | — |
| `HK-B0022` | 冠君大廈 Champion Tower | 中環 | 待製作 | 否 | 否 | 205 m | OSM way **85320726** | — |
| `HK-B0023` | 長江集團中心二期 Cheung Kong Center II | 金鐘 | 待製作 | 否 | 否 | 205 m | OSM way **1272960455** | — |
| `HK-B0024` | 金鐘道政府合署高座 Queensway Government Offices High Block | 金鐘 | 待製作 | 否 | 否 | 199 m | OSM way **41499029** | — |
| `HK-B0025` | 香港港麗酒店 Conrad Hong Kong | 金鐘 | 待製作 | 否 | 否 | 198 m | OSM way **41498759** | — |
| `HK-B0026` | 希慎廣場 Hysan Place | 銅鑼灣 | 待製作 | 否 | 否 | 197 m | OSM way **755914808** | — |
| `HK-B0027` | 太古坊二座 Two Taikoo Place | 鰂魚涌 | 待製作 | 否 | 否 | 195 m | OSM way **710522581** | — |
| `HK-B0028` | The Henderson | 中環 | 待製作 | 否 | 否 | 190 m | OSM way **26434768** | — |
| `HK-B0029` | 交易廣場第一座 One Exchange Square | 中環 | 待製作 | 否 | 否 | 188 m | OSM way **32530560** | — |
| `HK-B0030` | 交易廣場第二座 Two Exchange Square | 中環 | 待製作 | 否 | 否 | 188 m | OSM way **148554953** | — |
| `HK-B0031` | 力寶中心第二座 Lippo Centre Tower 2 | 金鐘 | 待製作 | 否 | 否 | 186 m | OSM way **107336263** | — |
| `HK-B0032` | 友邦金融中心 AIA Central | 中環 | 待製作 | 否 | 否 | 185 m | OSM way **107324767** | — |
| `HK-B0033` | 太古廣場三座 Three Pacific Place | 金鐘 | 待製作 | 否 | 否 | 182 m | OSM way **88391081** | — |
| `HK-B0034` | 會展廣場辦公大樓 Convention Plaza Office Tower | 灣仔 | 待製作 | 否 | 否 | 181 m | OSM way **107497689** | — |
| `HK-B0035` | 入境事務大樓 Immigration Tower | 灣仔 | 待製作 | 否 | 否 | 180 m | OSM way **510722228** | — |
| `HK-B0036` | 稅務大樓 Revenue Tower | 灣仔 | 待製作 | 否 | 否 | 180 m | OSM way **27087037** | — |
| `HK-B0037` | 怡和大廈 Jardine House | 中環 | 待製作 | 否 | 否 | 178.54 m | OSM way **42293714** | — |
| `HK-B0038` | 華潤大廈 China Resources Building | 灣仔 | 待製作 | 否 | 否 | 178 m | OSM way **107497701** | — |
| `HK-B0039` | 遠東金融中心 Far East Finance Centre | 金鐘 | 待製作 | 否 | 否 | 176 m | OSM way **107336261** | — |
| `HK-B0040` | 力寶中心第一座 Lippo Centre Tower 1 | 金鐘 | 待製作 | 否 | 否 | 172 m | OSM way **107336260** | — |
| `HK-B0041` | 中國工商銀行大廈 ICBC Tower | 金鐘 | 待製作 | 否 | 否 | 167 m | OSM way **107497693** | — |
| `HK-B0042` | 香港JW萬豪酒店 JW Marriott Hotel Hong Kong | 金鐘 | 待製作 | 否 | 否 | 164 m | OSM way **41499014** | — |
| `HK-B0043` | 會景閣 Convention Plaza | 灣仔 | 待製作 | 否 | 否 | 164 m | OSM way **107497692** | — |
| `HK-B0044` | 香港康得思酒店 Cordis Hong Kong | 旺角 | 待製作 | 否 | 否 | 162 m | OSM way **185564131** | — |
| `HK-B0045` | 太古廣場一座 One Pacific Place | 金鐘 | 待製作 | 否 | 否 | 161 m | OSM way **41498860** | — |
| `HK-B0046` | 告羅士打大廈 Gloucester Tower | 中環 | 待製作 | 否 | 否 | 159 m | OSM way **107302745** | — |
| `HK-B0047` | 世貿中心 wwwtc | 銅鑼灣 | 待製作 | 否 | 否 | 152 m | OSM relation **19456337** | — |
| `HK-B0048` | 新世界大廈 New World Tower | 中環 | 待製作 | 否 | 否 | 151 m | OSM way **1323550598** | — |
| `HK-B0049` | 多盛大廈 Dorset House | 鰂魚涌 | 待製作 | 否 | 否 | 151 m | OSM way **100652800** | — |
| `HK-B0050` | 萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel | 灣仔 | 待製作 | 否 | 否 | 150 m | OSM way **107497707** | — |
| `HK-B0051` | 大新金融中心 Dah Sing Financial Centre | 灣仔 | 待製作 | 否 | 否 | 150 m | OSM way **200283000** | — |
| `HK-B0052` | 美國銀行中心 Bank of America Tower | 金鐘 | 待製作 | 否 | 否 | 146 m | OSM relation **17045256** | — |
| `HK-B0053` | 海港中心 Harbour Centre | 灣仔 | 待製作 | 否 | 否 | 146 m | OSM relation **18183384** | — |
| `HK-B0054` | 鷹君中心 Great Eagle Centre | 灣仔 | 待製作 | 否 | 否 | 146 m | OSM relation **18183385** | — |
| `HK-B0055` | 交易廣場第三座 Three Exchange Square | 中環 | 待製作 | 否 | 否 | 144 m | OSM way **148554950** | — |
| `HK-B0056` | 皇室大廈安達人壽大樓 Chubb Tower, Windsor House | 銅鑼灣 | 待製作 | 否 | 否 | 140 m | OSM way **149401356** | — |
| `HK-B0057` | 統一中心 United Centre | 金鐘 | 待製作 | 否 | 否 | 140 m | OSM way **107336258** | — |
| `HK-B0058` | 灣仔政府大樓 Wanchai Tower | 灣仔 | 待製作 | 否 | 否 | 137 m | OSM way **27087041** | — |
| `HK-B0059` | 恒生銀行總行大廈 Hang Seng Bank Headquarters | 中環 | 待製作 | 否 | 否 | 137 m | OSM way **28825127** | — |
| `HK-B0060` | 中國建設銀行大廈 CCB Tower | 中環 | 待製作 | 否 | 否 | 135 m | OSM way **242113651** | — |
| `HK-B0061` | iSQUARE | 尖沙咀 | 待製作 | 否 | 否 | 130 m | OSM relation **15829461** | — |
| `HK-B0062` | 香港君悅酒店 Grand Hyatt Hong Kong | 灣仔 | 待製作 | 否 | 否 | 129 m | OSM way **107497699** | — |
| `HK-B0063` | 海富中心一座 Admiralty Centre Tower 1 | 金鐘 | 待製作 | 否 | 否 | 126 m | OSM way **107336262** | — |
| `HK-B0064` | 中信大廈 CITIC Tower | 金鐘 | 待製作 | 否 | 否 | 126 m | OSM way **107353963** | — |
| `HK-B0065` | 協成行中心 Hip Shing Hong Centre | 中環 | 待製作 | 否 | 否 | 125 m | OSM way **148554937** | — |
| `HK-B0066` | 瑞安中心 Shui On Centre | 灣仔 | 待製作 | 否 | 否 | 118 m | OSM way **241998997** | — |
| `HK-B0067` | 港運大廈 Island Place Tower | 北角 | 待製作 | 否 | 否 | 116.2 m | OSM way **100652797** | — |
| `HK-B0068` | 中國人民解放軍駐香港部隊大廈 Chinese People's Liberation Army Forces Hong Kong Building | 中環 | 待製作 | 否 | 否 | 113 m | OSM way **101959095** | — |
| `HK-B0069` | 海濱廣場一座 One Harbourfront | 紅磡 | 待製作 | 否 | 否 | 110 m | OSM way **151401235** | — |
| `HK-B0070` | 海濱廣場二座 Two Harbourfront | 紅磡 | 待製作 | 否 | 否 | 110 m | OSM way **151401236** | — |
| `HK-B0071` | 修頓中心 Southorn Centre | 灣仔 | 待製作 | 否 | 否 | 107 m | OSM way **148858987** | — |
| `HK-B0072` | 海富中心二座 Admiralty Centre Tower 2 | 金鐘 | 待製作 | 否 | 否 | 104 m | OSM way **107336259** | — |
| `HK-B0073` | 海港政府大樓 Harbour Building | 中環 | 待製作 | 否 | 否 | 96 m | OSM way **26599387** | — |
| `HK-B0074` | K11 ARTUS 寓館 K11 ARTUS | 尖沙咀 | 待製作 | 否 | 否 | 96 m | OSM way **693489169** | — |
| `HK-B0075` | 庫務大樓 Treasury Building | 長沙灣 | 待製作 | 否 | 否 | 95.3 m | OSM way **1089354187** | — |
| `HK-B0076` | 工業貿易大樓 Trade and Industry Tower | 啟德 | 待製作 | 否 | 否 | 93.5 m | OSM way **385568445** | — |
| `HK-B0077` | 朗豪坊購物商場 Langham Place The Mall | 旺角 | 待製作 | 否 | 否 | 90 m | OSM way **102411832** | — |
| `HK-B0078` | 西九龍法院大樓 West Kowloon Law Courts Building | 西九龍 | 待製作 | 否 | 否 | 88 m | OSM way **858895719** | — |
| `HK-B0079` | 啟匯 Harbourside HQ | 啟德 | 待製作 | 否 | 否 | 85 m | OSM way **198558927** | — |
| `HK-B0080` | 雙子匯一期 The Twins Tower 1 | 啟德 | 待製作 | 否 | 否 | 80 m | OSM relation **20599094** | — |
| `HK-B0081` | 雙子匯二期 The Twins Tower 2 | 啟德 | 待製作 | 否 | 否 | 120 m | OSM relation **20599095** | — |
| `HK-B0082` | 香港大會堂高座 Hong Kong City Hall High Block | 中環 | 待製作 | 否 | 否 | 57.7 m | OSM way **25608273** | — |
| `HK-B0083` | 中電總部 CLP Headquarters | 九龍塘 | 待製作 | 否 | 否 | 57 m | OSM way **1138054767** | — |
| `HK-B0084` | 星光行 Star House | 尖沙咀 | 待製作 | 否 | 否 | 55 m | OSM way **1169655254** | — |
| `HK-B0085` | 馬哥孛羅香港酒店 Marco Polo Hongkong Hotel | 尖沙咀 | 待製作 | 否 | 否 | 55 m | OSM way **1443753382** | — |
| `HK-B0086` | 海洋中心 Ocean Centre | 尖沙咀 | 待製作 | 否 | 否 | 55 m | OSM way **1443753403** | — |
| `HK-B0087` | 香港朗廷酒店 The Langham Hong Kong | 尖沙咀 | 待製作 | 否 | 否 | 55 m | OSM way **159324344** | — |
| `HK-B0088` | 香港會議展覽中心新翼 HKCEC New Wing | 灣仔 | 待製作 | 否 | 否 | — | OSM way **26490011** | — |
| `HK-B0089` | 香港會議展覽中心舊翼 HKCEC Old Wing | 灣仔 | 待製作 | 否 | 否 | — | OSM way **26490161** | — |
| `HK-B0090` | 時代廣場 Times Square | 銅鑼灣 | 待製作 | 否 | 否 | — | OSM way **26469269** | — |
| `HK-B0091` | 美利尼依格羅酒店 The Murray, Hong Kong, A Niccolo Hotel | 中環 | 待製作 | 否 | 否 | — | OSM way **85320844** | — |
| `HK-B0092` | 終審法院 The Court of Final Appeal | 中環 | 待製作 | 否 | 否 | — | OSM way **42293414** | — |
| `HK-B0093` | 茶具文物館 Flagstaff House Museum of Tea Ware | 中環 | 待製作 | 否 | 否 | — | OSM way **42255475** | — |
| `HK-B0094` | 法國外方傳道會大樓 French Mission Building | 中環 | 待製作 | 否 | 否 | — | OSM way **85320697** | — |
| `HK-B0095` | 利園二期 Lee Garden Two | 銅鑼灣 | 待製作 | 否 | 否 | — | OSM way **199305182** | — |
| `HK-B0096` | 東角中心 East Point Centre | 銅鑼灣 | 待製作 | 否 | 否 | — | OSM way **294141091** | — |
| `HK-B0097` | 圓方 Elements | 西九龍 | 待製作 | 否 | 否 | 30 m | OSM way **1415166820** | — |
| `HK-B0098` | 戲曲中心 Xiqu Centre | 西九龍 | 待製作 | 否 | 否 | — | OSM way **545997140** | — |
| `HK-B0099` | K11人文購物藝術館 K11 MUSEA | 尖沙咀 | 待製作 | 否 | 否 | 37 m | OSM way **1044263638** | — |
| `HK-B0100` | 香港大會堂低座 Hong Kong City Hall Low Block | 中環 | 待製作 | 否 | 否 | 21.9 m | OSM way **101959153** | — |

首十一座建築的造型、參考資料、碰撞及地面處理細節，統一參看 [香港手建 Landmarks](hongkong-landmarks.md)。程序化外觀尺寸不應當成實測圖則。

## 道路衝突紀錄

新增建築物時採用 **「建築物優先、道路配合」**：先根據可靠資料確定建築位置及 footprint；如與道路重疊，局部調整道路、路口及交通設施，並保留合理出入口及連通性。除非有明確證據顯示建築資料錯誤，否則不為遷就現有道路而搬歪建築物。

| 日期 | 建築 ID | 道路／位置 | 衝突內容 | 處理結果 | 驗證紀錄 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-01 | `HK-B0003` | Two IFC OSM way **25589595** footprint 周邊 | 以道路中心線、車道半寬對 footprint 邊界作幾何檢查，並檢查街燈 clearance 後的最終位置；沒有發現道路或燈柱落入 footprint | 無需搬路、搬燈或搬歪建築；維持現有全港道路及街燈 | `tests/hongkong-two-ifc-clearance.test.cjs`；日景、冠頂及夜景瀏覽器檢查 |
| 2026-11-01 | `HK-B0004` | ICC 北側 OSM ways **51143／51157** | 兩條有 elevated flag 的無名入口坡道與 OSM tower footprint 在平面相交；不能當成普通地面道路直接刪除，亦不能讓塔身碰撞盒封死車道 | 保留道路中心線、車道、白色標線及街燈；塔樓 occupied collider 由地台上 14 m 開始，龍尾及入口在坡道車輛包絡之上，八支柱與門牆另作水平 clearance。場景最保守 canopy 底至最高渲染路面約 **8.216 m**，大於 4.5 m 車輛包絡；這是場景數值，不是實地工程標高 | `tests/hongkong-icc-clearance.test.cjs`；全塔、北立面、入口、冠頂及夜景瀏覽器檢查 |
| 2026-11-01 | `HK-B0005` | 中銀大廈 OSM way **25604760** footprint、北面入口 canopy 及兩支華表 | 以全港道路中心線及車道半寬掃描建築邊界，另檢查 canopy 角點、華表和 clearance 後街燈；沒有發現道路或燈柱衝突 | 無需搬路、搬燈、改白色標線或搬歪建築；保留紅棉路及花園道現有幾何 | `tests/hongkong-bank-of-china-clearance.test.cjs`；全塔、北南面、入口、雙桅杆及夜景瀏覽器檢查 |
| 2026-11-01 | `HK-B0006` | 中環廣場 OSM way **27087018** footprint 及南面入口 canopy | 以全港道路中心線及車道半寬掃描建築邊界，並檢查入口 canopy 及 clearance 後街燈；沒有發現道路或燈柱衝突 | 無需搬路、搬燈、改白色標線或搬歪建築；保留港灣道及周邊道路現有幾何 | `tests/hongkong-central-plaza-clearance.test.cjs`；全塔、南北立面、入口、冠頂及 Lightime 日夜瀏覽器檢查 |
| 2026-11-01 | `HK-B0007` | 中環中心 OSM way **148228888** 星形 footprint、架空大堂及公共空間 | 以全港道路中心線及車道半寬掃描 16 邊建築邊界，並檢查 clearance 後街燈；沒有發現道路或燈柱衝突 | 無需搬路、搬燈、改白色標線或搬歪建築；保留皇后大道中、租庇利街及周邊道路現有幾何 | `tests/hongkong-the-center-clearance.test.cjs`；全塔、星形立面、架空入口、冠頂及彩虹霓虹日夜瀏覽器檢查 |
| 2026-11-01 | `HK-B0008` | 如心廣場雙塔及 Nina Mall 1 的三個 OSM rings、架空商場及地面服務道路 | 高座無道路衝突；低座有 9 個地面道路 segment，商場 ring 有 52 個 segment，其中 12 個地面、40 個 tunnel；全部是無名、非 elevated 道路。三個 rings 均沒有 clearance 後街燈 | 不搬路、不刪隧道、不改白色標線或搬歪建築。16 條與地面道路相交的商場外牆邊保留車輛開口；商場上蓋由 8 m 開始，低座立面由 24 m 開始；最低 portal lintel 對實際渲染道路剖面仍保留超過 4.5 m 淨空，ground query 不把道路覆蓋成 plaza | `tests/hongkong-nina-tower-clearance.test.cjs`；雙塔、商場、入口、弧形天橋、冠架及日夜瀏覽器檢查 |
| 2026-11-01 | `HK-B0009` | 長江集團中心 OSM way **64897826**、chamfered tower、圓角大堂及入口 barrel canopy | 以全港道路中心線／車道半寬掃描原始塔身、1 m chamfer 塔身、圓角大堂及實際入口雨篷，並檢查 clearance 後街燈；全部沒有道路或燈柱衝突 | 無需搬路、搬燈、改白色標線或搬歪建築；保留皇后大道中、花園道及周邊道路現有幾何 | `tests/hongkong-cheung-kong-clearance.test.cjs`；全塔、立面、大堂入口、平屋頂及光纖夜景瀏覽器檢查 |
| 2026-11-01 | `HK-B0010` | K11 Atelier OSM way **668219664**、地面服務道路 ways **44075／50914**、隧道 ways **44081／50542** 及 Salisbury Road 入口雨篷 | 精確塔身 ring 與 4 個道路 segment 相交：2 個地面、2 個隧道；地面道路涉及 7 條外牆邊。原始 ring 及入口雨篷均沒有 clearance 後街燈，雨篷亦沒有地面道路衝突 | 不搬路、不刪隧道、不改白色標線或搬歪建築。7 條地面相交邊保留車輛開口，地面大堂維持 **9 m soffit**；最低 portal lintel 對實際渲染道路剖面仍超過 **4.5 m** 車輛淨空，ground query 不把道路覆蓋成 plaza | `tests/hongkong-k11-atelier-clearance.test.cjs`；全塔、退台、入口、塔冠及日夜瀏覽器檢查 |
| 2026-11-01 | `HK-B0011` | 天璽I OSM way **200726114**、隧道 ways **48321／51074**、西側 40 m 入口玻璃盒及兩幢之間的有蓋落客區 | 精確塔身 ring 與 **2 個 tunnel road segments** 相交，沒有地面車路穿過塔身；入口及落客 forecourts 亦沒有地面道路或 clearance 後街燈衝突 | 不搬路、不刪隧道、不改白色標線或搬歪建築。地下道路保持原有道路選擇，非道路 forecourt 才採施工地台；入口玻璃盒外伸 **3.2 m**，沒有佔用雅翔道車道 | `tests/hongkong-cullinan-i-clearance.test.cjs`；全塔、入口、冠頂及日夜瀏覽器、玩家／車輛碰撞與隧道分層檢查 |
| — | — | — | 現有 HSBC／SCB 暫未補回逐項歷史衝突台帳 | 由下一次相關改動開始逐項記錄 | — |

## 新增及更新規則

1. 每座新建築先取得一個不重用的內部 ID，再更新總表及數量總覽。
2. **精修**與 **Landmark** 必須分開填寫；基本體量也可以是 Landmark，精修建築也不自動成為場景 Landmark。
3. 記錄可追溯的位置／footprint 來源；如使用照片、使用者指定比例或視覺修正，應在建築詳細紀錄中明示，不能冒充測量資料。
4. 建築與道路、燈柱、路牌或其他設施有衝突時，將處理及驗證結果寫入道路衝突紀錄。
5. 不因後續精修而刪除原有行；更新狀態、日期及詳細紀錄，保留可追蹤的進度。
