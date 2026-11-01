# 香港手建 Landmarks

香港仍採用 `unified-simple` 展示：全港道路及基本地面保留，**不生成普通建築群**。手建地標會逐個加入；目前有滙豐總行大廈、渣打銀行大廈、國際金融中心二期及環球貿易廣場。

建築物進度、**精修**與 **Landmark** 獨立標記，以及道路衝突台帳，見 [香港建築物 Inventory](hongkong-building-inventory.md)。

## 滙豐總行大廈 HSBC Main Building

- 地點：皇后大道中一號，使用 `js/hk-geodata.js` 內現有 OSM `滙豐總行大廈` footprint。
- 高度：**178.8 m**。
- 造型：由 harbour-facing 主立面起 **44／36／29 層**向後遞減；外露四組鋼柱、五級倒 V 懸吊桁架、雙層桁架深度及接點板、深色 reception bands、帶面板接縫的鋁板服務核心及維修吊臂。中央藍玻璃有直立 fins、粗中央豎框及每層連續橫向遮陽百頁。兩側約 4.6 m 闊梯架按用戶正面近照加入大拱形開口、藍色中央窗、雙窗棂、弧形窗眉、突出窗台，以及桁架層 X 支撑和頂層扇形支撑。冠頂採深色薄弧形槽、弧形玻璃直棂及兩端豎向 fins；置中 HSBC device 由四個外三角組成，中央留空。屋頂標誌依正面參考採 **2:1 橫向比例**，實際 device 約 **3.6 × 1.8 m**；texture 與 plane 同步使用 2:1，不靠單邊拉伸掩飾。入口「HSBC 滙豐」字牌的小型 device 仍保持原本的方形比例。
- 地面：架空公共廣場、玻璃入口及金色「HSBC 滙豐」字、方格天花、圓鋼柱接縫。雙扶手電梯由正面右方、右獅底座後方略為內縮的位置起步，斜向左後上方攀升。開口左獅／閉口右獅分置較開的左右兩側，在橫向底座上對望；開口獅的上下顎以鉸位相連，黑色口腔及牙齒縮細，另有鬃毛、腳爪及捲尾。Elevated floors 的 colliders 由 raised banking hall 開始，不會用一座由地面起算的盒子封死廣場；入口保留 5.2 m 寬、3.4 m 高門洞，柱、地面核心筒、玻璃牆及獅子底座另有碰撞。
- 日夜：HSBC 專用灰綠玻璃分格不包含住宅式室內模型；日間不亮隨機房燈，夜間只顯示少量辦公室燈光，入口大堂使用柔和暖光。鋼架只有非常低的夜間補光，沒有彩色日間結構燈。

### 參考照片及資料

正面比例以用戶提供的 `HK_HSBC_Main_Building_2008.jpg` 為主要依據；其後提供的正面及低角度近照用於核對梯架開口、遮陽百頁、桁架接點及弧形冠頂。入口及銅獅細節依據 `HSBC_door.jpg`、`HSBC_Leftlion.jpg` 及 `HSBC_Right_Lion.jpg`。另參考 Foster + Partners 項目的照片、平面及剖面整理：

- ArchEyes：HSBC Main Building, Hong Kong by Foster + Partners
  https://archeyes.com/hsbc-headquarters-in-hong-kong-by-foster-partners/
- 其中包括 Queen's Road Central 外觀、Statue Square／高空外觀、三段梯級塔樓、架空公共廣場、扶手電梯、桁架及維修吊臂照片。
- 資料描述三個 **29、36、44 層**部分、外露懸吊結構、十層中庭及公共廣場；高度為 **178.8 m**。

參考照片只作建模依據，**沒有打包進應用程式，也不是官方 HSBC 3D 資產**。模型是程序化重建；OSM 提供實際地盤位置及外框，但個別樓層高度、柱距、桁架尺寸、銅獅及小型裝置屬視覺比例，並非測量圖則。最高主立面前置後，較低塔樓不會再遮住由地面延伸至冠頂的正面鋼架及玻璃。

## 渣打銀行大廈 Standard Chartered Bank Building

- 地點：德輔道中 4–4A 號、滙豐西側，採用 **OSM way 85320719** 的完整不規則外框及同一中環座標系。OSM 外框只作地盤資料，不再當成大廈立面朝向；建築 frame 由舊 site frame **向滙豐轉 35°**；其後按用戶要求將**整座大廈連樓梯向遠離車路的法線方向移後 3 m**，再由左手門與梯頂的對位關係定位建築 origin。這個 35° 是用戶指定的外觀修正，不冒充 OSM 量度。原 geodata 查詢只收集已有高度／層數標籤的建築，所以地盤外框仍直接保存在純座標模組，沒有用附近 road block 取代。
- 高度：**191 m**，資料所述 **42 層**。模型由**前後七塊夾芯 slab** 組成，視覺樓層依次為 **25／29／33／37／33／29／25**，由前后兩端向正中第 4 塊遞增，形成對稱「凸」字輪廓。每個外露梯級面延續石材／玫瑰玻璃／石材的夾芯語言；這些是依用戶指定造型及照片整理的視覺樓層，不是測量圖則。
- 北立面：三條粉灰花崗岩直柱及兩道玫瑰金反光玻璃長窗，玻璃每層有橫框及中央豎框。三個八邊形窗有深色玻璃、金屬外框、橫百頁及直棂；下方三組高金色玻璃入口有横豎窗框及中央渣打字牌。整個立面跟隨上述向滙豐轉 35° 的建築 frame，不再與德輔道中平行。
- 正門：依用戶提供的 Dec 2025 Street View 及最新梯形修正，採 **24 級、級線平行德輔道中**的長樓梯。梯身是**直角梯形**：左邊在道路座標內沒有橫向漂移，與底級成 **90°**；右邊則與 35° 立面精確共線並直接接合，頂級只接左手門的投影寬度。為同時保持左邊直角及右邊貼立面，底級約 **21.937 m** 闊，不再沿用先前的半闊版本。左邊依 `image-33.png` 加入 **0.92 m 高、0.34 m 厚的連續石砌護牆**；金屬扶手固定在牆身內面，以短橫向支架接牆並低於牆頂，不是由梯級托起的獨立欄杆。每級高 **0.15 m**、深約 **0.521 m**，總水平長度 12.5 m，平台標高 3.6 m，屬依照片比例整理的模型尺寸而非測量圖則。梯頂只有一個左手門小平台，其接樓邊同樣貼合立面；其餘入口及立面外沒有全寬高台。地面高度函數逐點使用同一組道路座標及收束邊界。
- 側面／背面：花崗岩面板接縫及橫向長條窗，日間不亮隨機房燈；夜間只有少量辦公室窗、入口及頂部標誌有柔和燈光。石材本身不發光。
- 標誌：北側及西側 crown signs 都只在**正中第 4 塊最高 slab** 的標誌柱上，與入口字牌共用同一個四段向量 device：兩條藍綠主絲帶互相穿過並保留 S／C 負形，加上兩個分離的小段；不再以兩條手畫 S 曲線近似。保留原有藍綠色系及建築石材／玻璃配色。
- 碰撞及地圖：七塊塔身 slab 和正中標誌柱使用跟隨 35° 建築 frame 的 OBB colliders；長梯左側石護牆每五級加入同厚度的碰撞段，接樓側由立面／塔身 colliders 封閉。梯形級面及左手門小平台由同一 ground-height field 處理，不會用碰撞盒封死上落路線，也不會在斜邊外產生隱形高台。全圖及 HUD 地名索引使用旋轉後的 `SCB_MAP_SITE`，原始 `SCB_SITE` 仍保留 OSM 地盤資料；普通 `buildings` 仍為 0。
- 參考：用戶提供的 `image-29.png`（北面低角度立面）、`image-30.png`（相對滙豐位置）、`image-31.png`（Dec 2025 正門 Street View）及 `image-33.png`（左側石護牆及牆身扶手近照）為主要依據；其他外觀照片只用於核對側面梯級及頂部標誌。照片沒有打包進應用程式。
  - OSM：https://www.openstreetmap.org/way/85320719
  - P&T 建築師項目頁（主門廳由 Statue Square 的一段樓梯到達）：https://web.p-t-group.com/en/project-detail.php?projects_id=3
  - 正門樓梯實景：https://commons.wikimedia.org/wiki/File:HK_Central_Des_Voeux_Road_Standard_Chartered_Bank_Building_frontdoor_stairs.JPG
  - 標誌形狀核對：https://commons.wikimedia.org/wiki/File:Standard_Chartered_Logo_(2021,_Logo_only).svg
  - 建築資料：https://en.wikipedia.org/wiki/Standard_Chartered_Bank_Building

## 國際金融中心二期 Two International Finance Centre

- 地點及來源：金融街 8 號，採用本地 OSM **way 25589595** 的 24 點 closed-way footprint，再以 minimum-area OBB 建立建築座標系。OSM 標籤是 `building=yes`、`building:use=office`、`building:material=glass`、**415.8 m／90 levels**；模型總高度沿用這個 OSM 高度。
- 另一套建築資料：Pelli Clarke 的項目文字及 Permasteelisa 的幕牆項目頁採 **412 m／88 層**。這是建築設計／幕牆來源的表述，與 OSM 的 415.8 m／90 levels 分列；沒有把兩者平均或寫成同一組已核實測量數據。
- 造型：不是單一收分長方盒。塔身由 **6 段 tapered loft、5 次收分**組成，各段沿用 OSM-derived plan，並在四向加入向前凸出的弧形中央幕牆。垂直翼片狀 mullions 由塔身延伸至冠頂，另有深色機電／避火層橫帶；橫帶同時覆蓋凸弧部分，不會在中央玻璃斷開。
- 幕牆及冠頂：程序化材質分開處理 lightly reflective vision glass、fritted spandrel glass 及 pearly silver aluminium；日間沒有住宅式室內或隨機亮燈，夜間只有部分辦公室窗及柔和冠頂燈。**390–415.8 m** 是開放式雕塑冠頂，以高低不同的弧形肋骨及橫向 rails 構成，中央只有退後的 lantern core，沒有用實心圓錐或封閉盒子填滿。
- 入口及地面：harbour-facing podium 有玻璃門、金屬框及薄 canopy。地盤平地台由既有可追溯 DTM 在建築中心取樣，ground offset 約 **4.326 m**，plaza 面再抬高 **0.12 m**；這是場景地面處理，**不是已核實的道路工程標高**。
- 碰撞及整合：6 段塔身及開放冠頂共有 7 個 oriented colliders；`simple-world.js` 回傳第三個 Landmark、stats 及地面查詢，普通 `buildings` 仍為 **0**。既有 HSBC／SCB 模型沒有因 Two IFC 改形。
- 道路及街燈：以道路中心線、車道半寬對 footprint 邊界作幾何檢查，並檢查街燈 clearance 後的最終位置，未發現道路或燈柱落入 footprint，因此今次無需搬路或搬燈。回歸測試為 `tests/hongkong-two-ifc-clearance.test.cjs`；這不代表之後 97 幢可以略過逐幢檢查。
- 瀏覽器驗證：已重建 runtime，並實際拍攝全塔日景、冠頂日景及全塔夜景。畫面同時保留 HSBC／SCB、道路及 **32 m** 街燈光池；未見 pageerror 或 shader error，只有既有外部字體連線失敗。參考照片沒有打包進應用程式。

### 參考資料

- OSM：https://www.openstreetmap.org/way/25589595
- Pelli Clarke 項目文字：多段收分、凸弧及向前步進的中央立面、由底座延伸至冠頂的翼片狀垂直 mullions、銀珍珠色鋁件及開放式雕塑 crown：
  https://divisare.com/projects/291118-pelli-clarke-pelli-architects-international-finance-centre
- Permasteelisa 幕牆資料：**412 m／88 層**、unitized curtain wall、vision／fritted spandrel glass、pearly silver aluminium、fins、crown 及外部燈光：
  https://permasteelisa.permasteelisagroup.com/project-detail?project=2294

## 環球貿易廣場 International Commerce Centre

- 地點及來源：柯士甸道西 1 號，採用本地 OSM **way 25590249** 的 20 點 closed-way footprint，以 minimum-area OBB 建立約 47.6° 的建築座標系。OSM 高度 **484 m／118 levels**；KPF 項目頁亦稱 **118-story**，其他建築摘要則有 **108 occupied floors above ground** 的計法，三者在程式中分列，沒有互相覆寫。
- 塔身比例：保留方形平面的四個 re-entrant corners，不用長方盒取代。底部 70 m 逐漸外張，320 m 以上主立面向內傾斜 **1°**，角位縫隙另逐漸擴闊；2.2 m 的額外縫隙及分段尺寸是依照片整理的視覺控制，不是測量圖則。八支近凹角的結構柱以 **3°／70 m** 外張，地面柱鞋、收分塔身及冠頂均有獨立幾何。
- 鱗片幕牆：由 **8,185 個 vision panels、24,555 個玻璃／spandrel quads、16,370 個 mullion／transom quads** 組成，不是 footprint 拉體量後貼一張窗格紋理。目標模組約 **3 m** 寬、vision panel **1.5 m** 高；主段、上段及基段分別採 **5°／6°／8°** 的視覺傾角。銀色低輻射玻璃、較亮的 spandrel 及金屬框架分開處理，日間只有細微反射色差，夜間降低亮窗比例及亮度。四道深色機電橫帶有實際百頁；其高度只作外觀編排，沒有冒充結構 outrigger 的實測樓層。
- 屋頂：主 roof deck 在 **478 m**，四面 parapet 高 **6 m**，連續頂部 flashing 止於 **484 m**。凹角、屋頂設備、通風百頁及小型障礙燈均低於或不超過 parapet；沒有加入來源已否定的金字塔頂或任意天線。
- 北側 Dragon Tail：以 **12 m** 外伸為固定來源尺寸，製作向下外捲的曲面玻璃 atrium、尖頭金屬 soffit、兩側玻璃收口、**520 個面板 quads** 及 **554 段 curved ribs／returns**。主幕牆在此區域讓位，不再以平面玻璃板蓋住黑縫。樓名及酒店字牌縮到入口玻璃，不放在屋頂或變成巨型 canopy 招牌。其餘三面採斜面玻璃 office／hotel canopies、金屬 ribs、細柱及入口門。
- 地面及碰撞：地台由既有可追溯 DTM 在 OSM 建築中心取樣，ground offset 為 **6.832664212076409 m**，plaza 面抬高 **0.12 m**；這不是已核實道路工程標高。塔身按收分分四段碰撞，入口、門牆、龍尾及八支柱另有碰撞，共 **23 個 colliders**。圓方商場仍是獨立待製項目 `HK-B0097`，沒有藉 ICC 模型提前當成完成。
- 道路及街燈：北側 **way 51143／51157** 是有 elevated flag 的入口坡道，平面與 footprint 相交。模型保留其原中心線、車道、白色標線及高度 profile，以懸挑塔身和 canopy 的垂直淨空整合，而不是搬歪建築或刪路。最高渲染路面約 **9.766497934898448 m**；保守 canopy 底比其高約 **8.216 m**，超過 4.5 m 車輛包絡。柱位及門牆另作水平距離測試，現有街燈無落入 footprint，無需搬燈。
- 瀏覽器驗證：重建單一 runtime 後，實際檢查全塔日景、北立面、Dragon Tail 入口、冠頂、全塔夜景及入口夜景。瀏覽器 audit 確認 **4 個 authored landmarks、普通 buildings = 0、8,185 個主幕牆 vision panels、23 個 ICC colliders**；沒有 pageerror、shader error 或 WebGL 錯誤，只有既有外部字體 `ERR_CONNECTION_CLOSED`。完整 `node --test tests/*.test.cjs` 為 **310／310 pass**。參考照片只作研究，沒有打包進應用程式。

### 參考資料

- OSM：https://www.openstreetmap.org/way/25590249
- KPF：118-story、凹角、底部曲線、三側 canopies 及北側 atrium／retail／rail 連接：
  https://www.kpf.com/project/international-commerce-centre
- ArchDaily／KPF 項目文字：**484 m**、方形 re-entrant plan、八支近地面外張 **3°** 的 mega-columns、鱗片狀幕牆、北側外伸約 **12 m** 的 Dragon Tail、約 **3 m** 模組、**1.5 m** vision panel 及約 **5°** 面板：
  https://www.archdaily.com/250681/international-commerce-centre-kpf
- Architectural Record：上段 **1°** 內傾、角位縫隙逐漸擴闊、四面 parapet、三側斜面玻璃 canopies、北側 scooped atrium，以及 Level 9 車道入口的建築背景：
  https://www.architecturalrecord.com/articles/7887-international-commerce-centre
- Wong & Ouyang：KPF 合作建築師及 118 層／484 m 項目資料：
  https://www.wongouyang.com/projects/international-commerce-centre/

## 程式入口

- `hsbc-headquarters-architecture.js`：滙豐純地理位置、OBB、樓層比例及 collider 座標換算，可在 Node 測試。
- `hsbc-headquarters-world.js`：滙豐 Three.js 幾何、材質、廣場、碰撞及 stats。
- `standard-chartered-architecture.js`：渣打 OSM 地盤、35° 建築 frame、道路樓梯座標、逐級收束邊界、入口地面高度及 colliders。
- `standard-chartered-world.js`：渣打 Three.js 七塊夾芯塔身、程序化石材／玻璃、八邊形窗、梯形級面長梯、左側石護牆及牆身扶手、左手門平台、標誌及 stats。
- `standard-chartered-logo.js`：四段渣打絲帶向量 geometry，供 crown 及入口 canvas signs 共用。
- `landmark-site.js`：authored landmarks 共用的純 ring、bounds 及 minimum-area OBB 工具。
- `two-ifc-architecture.js`：Two IFC OSM 地盤、分列來源規格、taper／setback 比例、地形及 collider 座標換算。
- `two-ifc-world.js`：Two IFC 多段塔身、四向凸弧幕牆、翼片 mullions、機電橫帶、開放冠頂、入口及 stats。
- `icc-architecture.js`：ICC OSM 地盤、來源層數計法、凹角收分、外張柱、龍尾尺寸、地形及 collider 座標換算。
- `icc-world.js`：ICC 鱗片幕牆、機電百頁、六米 parapet、八支外張柱、Dragon Tail、三側 canopies、入口、日夜材質、碰撞及 stats。
- `simple-world.js`：只整合這四個 authored landmarks；普通 `buildings` 仍為 0。
