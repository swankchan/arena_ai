# 中環海濱活動空間、幸福摩天輪與嘉年華遊樂場研發記錄
# Central Harbourfront Event Space, Hong Kong Observation Wheel & AIA Carnival Architecture

## 1. 使用者需求與設計定位
使用者要求：
> 「建立中環遊樂場, 包幸福摩天輪, 雖然是節慶偶有, 但我想長擺.」

在香港真實世界中，中環海濱活動空間（Central Harbourfront Event Space）於冬夏兩季常設有大型國際嘉年華活動（如著名的友邦嘉年華 AIA Carnival、香港冬日嘉年華、中環夏誌與歐陸雜技團馬戲表演），而「香港摩天輪」（Hong Kong Observation Wheel，香港市民及華語流行文化中暱稱為「幸福摩天輪」）與歐陸復古旋轉木馬（AIA Vitality Park Carousel）則是長駐於中環民光街 33 號、9 號與 10 號公眾碼頭前方的常態標誌性地標。

依據使用者明確指令「雖然是節慶偶有, 但我想長擺」，本工程將該處常設為充滿活力的永久性海濱嘉年華遊樂場，包含宏偉的 60 米高白色鋼結構幸福摩天輪、42 顆全景觀景吊艙、客運登輪月台與售票處，並完整配備復古雙層旋轉木馬、波浪飛天椅、碰碰車樂園、雙頂馬戲大帳篷、四組經典攤位遊戲、美食小食街、宏偉迎賓拱門以及 WebGPU TSL 夜間全彩動態燈光，作為維多利亞港南岸最引人入勝的休閒與遊樂地標。

---

## 2. 歷史背景與工程規格

1. **地理座標與地塊範圍**：
   - 位於中環填海區民光街、民耀街與耀星街之間，緊鄰中環 9 號及 10 號公眾碼頭與中環天星碼頭（7 號碼頭）東南側。
   - 地塊邊界（世界座標）：`X: 192.0 ～ 272.0`（寬 80 米），`Z: -424.0 ～ -354.0`（深 70 米），地盤面積達 **5,600 m²**。
   - 經 `isTerritoryLand` 與 `fullRoadSurfaceAt` 全網格審計，全區 100% 位於陸地，對周邊民光街車道及中環灣仔繞道隧道淨空嚴格零侵入。
2. **香港摩天輪（幸福摩天輪 / Hong Kong Observation Wheel）**：
   - 啟用年份：2014 年 12 月 5 日。
   - 總高：**60.0 米**（直徑 **54.0 米**，輪心軸高度 **32.0 米**）。
   - 主體結構：四根巨大的純白高強度管狀鋼格構 A 字形支撐塔架，立於四座大型鋼筋混凝土基座上；中心配備重型鋼製軸承轉向輪轂。
   - 雙層同心圓環：外環直徑 54 米，內環直徑 48.4 米，以鑽石型交叉桁架支撐，21 對（共 42 根）高張力鋼索輻條輻射連接中心輪軸。
   - 42 組封閉式高科技氣候調節觀景吊艙（Gondolas）：
     - 41 顆流線型紅白相間觀景車廂（每廂可容納 8 人，配四面超白防紫外線全景玻璃與安全門），外加 1 顆尊貴 VIP 金色豪華吊艙。
     - 配重防擺垂直吊臂，確保吊艙於輪轉過程中始終維持水平。
   - 旅客登輪月台（Boarding Station）：16m × 8.5m 高架防腐木月台（標高 +2.2m），設無障礙斜坡、安全排隊通道、不銹鋼護欄與藍色遮陽棚。
   - 獨立售票處與操作控制室（Ticket Booth & Control Room）。
   - 夜間照明：外環圓周配置 WebGPU TSL 動態節點光帶（`wheelLedMat`），入夜後發出璀璨的綠松石色／翡翠夜光，與對岸尖沙咀天際線遙相輝映。
3. **AIA Vitality Park 歐陸復古旋轉木馬（Classic European Carousel）**：
   - 直徑 **11.5 米**，雙層紅色與象牙白相間波浪形扇形篷頂，飾以鍍金雕花飾邊與頂部金球尖頂。
   - 兩級階梯式環形柚木基座，中央八角形巴洛克金色鏡面立柱。
   - 16 匹雕花旋轉木馬（配黃銅立柱與馬鞍）與 2 組貴族四輪馬車座席。
   - 簷口環繞 24 盞復古暖光彩球燈（WebGPU TSL `warmBulbMat`）。
4. **波浪飛天椅（Wave Swinger / Flying Chairs）**：
   - 八角形古典彩繪機芯控制主塔（高 12.5 米），頂部設外挑懸臂波浪折疊傘狀棚頂。
   - 懸掛 16 組雙吊鏈懸垂式雙人鞦韆座椅，外設安全金屬防護圍欄。
5. **碰碰車樂園（Bumper Cars Pavilion）**：
   - 15m × 11m 開敞式鋼結構遮雨棚（淨空高 4.2 米），頂部懸掛粉紅色霓虹燈招牌「BUMPER CARS · 碰碰車」。
   - 高導電防滑金屬地面，周圍環繞 0.45 米厚高彈力吸震黑橡膠防撞護牆。
   - 天花裝設全覆蓋金屬通電導電網格。
   - 8 輛紅白藍綠繽紛碰碰車，配備彈簧方向盤、橡膠保險槓與頂部導電滑觸天線桿。
6. **歐陸雜技團馬戲大帳篷（Circus Big Top / Grand Event Marquee）**：
   - 24m × 16m 雙尖頂紅紅白條紋帆布節慶大帳篷（牆高 4.2 米，脊高 11.5 米）。
   - 雙鋼主桅杆頂部飄揚黃色嘉年華三角旗幟，拱形正門設有接待門廊與暖光燈飾。
7. **經典嘉年華攤位遊戲區（Carnival Game Booths）**：
   - 4 排木質條紋攤位遊戲棚：
     1. Ring Toss（幸運拋鐵圈）
     2. Milk Bottle Toss（保齡球擲瓶）
     3. Balloon Dart Pop（飛鏢射氣球）
     4. Cuddly Toy Prize Wall（巨型毛絨公仔牆 / 獎品陳列架，擺滿泰迪熊與布偶）
8. **嘉年華美食小食街（Food & Beverage Village）**：
   - 3 組經典嘉年華特色小食木屋：
     1. Popcorn & Cotton Candy（爆谷與棉花糖亭）
     2. Waffles & Churros（比利時窩夫與西班牙油條亭）
     3. Beverages & Soft Serve（鮮榨果汁與軟雪糕亭）
   - 露天野餐休憩區，配置 4 組實木野餐桌椅組合及條紋防曬太陽傘。
9. **迎賓大門與節慶燈帶（Festival Archways & Festoon Lighting）**：
   - 西側正門迎賓拱門（寬 8.5 米，高 5.5 米，面朝民耀街與中環碼頭客流通道），拱門頂部設發光橫匾「中環海濱活動空間 · 幸福摩天輪嘉年華 AIA CARNIVAL · CENTRAL FAIRGROUND」。
   - 北側海濱長廊觀景副門（寬 7.5 米，高 5.0 米，面朝維多利亞港）。
   - 場內架設 8 座節慶燈柱，縱橫拉牽節日燈串（Festoon light cables），暖白燈球點綴整個遊樂場夜空。
10. **實體碰撞系統（61 Colliders）**：
    - 摩天輪四座混凝土基樁與鋼塔立柱。
    - 登輪月台與票務中心。
    - 旋轉木馬與飛天椅安全圍欄。
    - 碰碰車場外圍橡膠牆與四角立柱。
    - 馬戲帳篷牆身。
    - 攤位遊戲櫃檯與美食小食亭。
    - 迎賓拱門立柱與燈柱基座。

---

## 3. 代碼架構與模組關聯

- `js/cities/hongkong/central-carnival-architecture.js`：
  - 宣告 `CENTRAL_CARNIVAL_SOURCE`：收錄中環海濱活動空間與幸福摩天輪權威來源、歷史年表與使用者常設指令。
  - 宣告 `CENTRAL_CARNIVAL_CONFIG`：各遊樂設施幾何尺寸、位置座標與地盤邊界。
- `js/cities/hongkong/central-carnival-world.js`：
  - 實例化 `buildCentralCarnival(scene, { groundHeightAt })`。
  - 產出 45 組精確合併網格（Merged Meshes），總頂點數約 40,943，無外部圖片依賴。
  - 註冊 61 個物理碰撞盒與 2 處主要地標（`hong-kong-observation-wheel` 與 `central-harbourfront-event-space`）。
- `js/cities/hongkong/simple-world.js` & `js/cities/hongkong/index.js`：
  - 接入全港統一世界建構流程，匯總碰撞盒與統計，向 `world.centralCarnival` 暴露對象。
- `tests/central-carnival.test.cjs`：
  - 4 項嚴格單元測試：架構規格、3D 幾何與夜光、道路零侵入、全鏈路集成。

---

## 4. 測試驗證矩陣

| 測試套件 | 測試項目 | 結果 |
| :--- | :--- | :--- |
| `tests/central-carnival.test.cjs` | 4 項架構、網格有限性、TSL 夜光、陸地與道路淨空、世界集成測試 | **4/4 PASS** |
| `tests/tst-waterfront-promenade.test.cjs` | 3 項尖沙咀海濱長廊與 3D 海堤測試 | **3/3 PASS** |
| `tests/statue-square.test.cjs` | 皇后像廣場全項地標測試 | **2/2 PASS** |
| `tests/chater-garden.test.cjs` | 遮打花園全項地標測試 | **3/3 PASS** |
| `npm run build:runtime` | 405 個模組全量獨立 runtime 打包（35,085,631 字節） | **SUCCESS** |
