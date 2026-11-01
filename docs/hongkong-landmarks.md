# 香港手建 Landmarks

香港仍採用 `unified-simple` 展示：全港道路及基本地面保留，**不生成普通建築群**。手建地標會逐個加入；目前有滙豐總行大廈、渣打銀行大廈、國際金融中心二期、環球貿易廣場、中銀大廈、中環廣場、中環中心、如心廣場及長江集團中心。

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

## 中銀大廈 Bank of China Tower

- 地點及來源：花園道 1 號，採用目前 OSM API **way 25604760** 的四點 closed-way footprint。此 way 不在舊本地 landmark snapshot，因此專屬來源模組保存原始經緯度、way version 12、取得日期及 ODbL attribution，再由測試用城市 georef 重算世界座標。OSM 只有 `building=office`，**沒有 height 或 building:levels tag**。
- 高度及層數：BOCHK 官方資料為地面層以上 **70 層**、塔身結構 **315 m**、兩支桅杆合共 **367.4 m**；另一常見參考採 **72 層**，在程式另存而沒有混寫成 OSM 資料。主桅杆由 315 m 起高 **52.4 m**，頂點保持 367.4 m；不以取整的 367 或 368 m 取代。
- 四個三角 prism：按貝聿銘設計的方形平面雙對角線分割，北面 quadrant 最先收細，南面 prism 留到最高。OSM 定向平面約 **53.416074802873425 × 53.16040967639964 m**，沒有被資料中約 52 m cube 的描述強行改寫。四段斜頂的視覺控制分別為北面 68–88 m、東面 136–178 m、西面 202–244 m、南面 288–315 m；這些分段是依 published massing 及照片整理的模型控制，不是實測樓層標高。
- 幕牆及結構：**8,876 個真正外露的玻璃 panels、17,620 個細 mullion／transom quads、113 段大型鋁製斜構件及角柱、60 段斜頂 rafters／flashings**。相鄰 prism 的內部對角玻璃只畫高於鄰座斜頂的外露部分，避免共面 z-fighting。銀藍反光玻璃、細格窗、大型 X／菱形框架及四支角柱各自有幾何；夜間減少隨機亮窗，並以低亮度銀藍 emissive 保留斜框架輪廓。
- 斜頂及桅杆：四個三角形斜玻璃屋面各有獨立 rafters 和周邊框架，不是平頂盒或四支圓錐。兩支漸細金屬桅杆有下部斜向 space frame 及障礙燈；已用側向瀏覽器視角確認兩支都可見，而非只在 stats 聲稱存在。
- 花崗岩基座及入口：兩層基座使用分塊、不同灰度的花崗岩板及大型深色玻璃嵌板。北面有雙拱通道、薄 canopy、兩支帶八角基座／雲翼／暖光燈的華表；南面入口兩側有紅色古代方孔錢造型中銀標誌。入口字樣按來源使用 **BANK OF CHINA**，沒有改寫成 BOCHK，亦沒有把標誌放到屋頂。
- 地面及碰撞：DTM 施工地台為 **11.541116111795219 m**，plaza 面抬高 **0.12 m**，不是道路工程標高。碰撞包括基座、四個 prism 的保守分段盒、兩支桅杆、兩支華表及入口 canopy，共 **10 個 colliders**。全港道路及街燈掃描沒有發現 footprint、canopy 或華表衝突，無需搬路或搬燈。
- 瀏覽器驗證：實際檢查全塔日景、北立面、北入口、冠頂、雙桅杆側角、南入口、全塔夜景及北入口夜景。最終 audit 為 **5 個 authored landmarks、普通 buildings = 0、8,876 個中銀玻璃 panels、10 個中銀 colliders**；沒有 pageerror、shader error 或 WebGL 錯誤，只有既有外部字體 `ERR_CONNECTION_CLOSED`。完整 `node --test tests/*.test.cjs` 為 **317／317 pass**。研究照片沒有打包進應用程式。

### 參考資料

- OSM way 及目前 API 幾何：https://www.openstreetmap.org/way/25604760
  https://api.openstreetmap.org/api/0.6/way/25604760/full.json
- BOCHK 官方大廈資料：70 層、315 m 塔身、兩支桅杆合共 367.4 m、四個 prism-shaped shafts：
  https://www.bochk.com/en/aboutus/corpprofile/boctower.html
- CNN／貝聿銘作品回顧：方形平面沿雙對角線分為四個 quadrants、逐段減少至單一三角 shaft、北面朝維港：
  https://www.cnn.com/style/article/100-years-of-i-m-pei-bank-of-china/index.html
- 香港旅遊發展局：367.4 m、70 層、貝聿銘及竹節式 prism 外觀：
  https://www.discoverhongkong.com/eng/see-do/culture-heritage/modern-architecture/bank-of-china-tower.jsp
- 另一層數及 52.4 m spire convention（只作分列參考，不當 OSM tag）：
  https://en.wikipedia.org/wiki/Bank_of_China_Tower_(Hong_Kong)

## 中環廣場 Central Plaza

- 地點及來源：港灣道 18 號，採用 `js/hk-geodata.js` 內 **OSM way 27087018** 的建築 footprint，不以附近土地用途或道路 block 取代。minimum-area OBB 中心為 **(1446.8635158400734, 209.7669770474478)**，定向尺寸 **63.489348879146064 × 54.52596210769764 m**。保留三條長立面及其間的削角短邊，沒有重新生成理想三角柱。
- 高度及層數分列：本地 OSM 是 **309 m roof／78 levels**；外部建築資料是 **373.9 m architectural**，官方項目頁另稱 **374 m including mast／75-storey Grade A office**。模型頂點採 **373.9 m**，不把 309 m roof 拉成桅杆頂，也不以 374 m 覆寫較精確的 373.9 m。常見 **102 m mast** 包含藏於塔頂內的部分，沒有錯誤地由 309 m 起再外露 102 m。
- 主體比例：依建築資料及照片整理為 **30.5 m 基座＋235.4 m 辦公主體（至 265.9 m）**，其上六層機電冠頂至 **309 m roof**。六層以上有內縮玻璃金字塔、外圍開放框架及分段桅杆；pyramid、cage 的細部標高是依照片建立的視覺控制，不是實測圖則。
- 三色幕牆：**8,184 個 vision panels、16,368 個玻璃／spandrel quads、16,368 個細 mullion／transom quads**。三條寬面的中央採香檳金色玻璃，側翼及削角採銀藍色玻璃；細格窗、較粗結構豎框及 21 段金色直立霓虹分別有幾何。日間保留反射色差，夜間只有部分辦公室窗及低亮度金色線條。
- 基座及入口：30.5 m 高入口基座有深綠花崗岩下段、玻璃大堂及直徑 **2 m** 的圓柱；柱距按約 **8.6 m** 建築模數布置。南長面另有玻璃門、薄 canopy、中英樓名及夜間暖光，沒有套用中銀雙拱、匯豐銅獅或渣打長梯。
- 冠頂及桅杆：六層機電冠頂有實際橫向百頁及金色 spandrel bands；削角金字塔由 **40 個玻璃三角面板**、rafters 及 transoms 組成。三腳 space-frame cage 內設四段 Lightime，頂部細桅杆止於 373.9 m；開放框架沒有被實心盒填滿。
- Lightime：官方規則是**四條 bands、每條代表 15 分鐘、每 quarter-hour 依次變色、固定六小時色彩循環，整點四帶同色**。程式以本機 timestamp 換算香港時間實作這個規則，**沒有假稱已接駁香港天文台網絡授時**。18:30 的已發表例子固定為下兩段紅、上兩段白；其餘四色及短閃效果只是明確標示的視覺近似，未冒充已核實的官方六色次序或閃爍秒數。
- 地面、碰撞及道路：DTM 施工地台為 **5 m**，plaza 面抬高 **0.12 m**，不是道路工程標高。基座、主體、冠頂、金字塔、cage、細桅杆及入口 canopy 共 **7 個 colliders**。`tests/hongkong-central-plaza-clearance.test.cjs` 對全港道路中心線／車道半寬、入口 canopy 及 clearance 後街燈作掃描，結果沒有道路或燈柱衝突，因此無需搬路、搬燈或改白色標線。
- 瀏覽器驗證：實際檢查全塔日景、南北立面、入口、兩個冠頂方向、全塔夜景、Lightime 近景及入口夜景。18:30 測試畫面實際顯示上兩段白、下兩段紅。最終 audit 為 **6 個 authored landmarks、普通 buildings = 0、8,184 個中環廣場 vision panels、7 個 colliders**；沒有 pageerror、shader error 或 WebGL 錯誤，只有既有外部字體 `ERR_CONNECTION_CLOSED`。完整 `node --test tests/*.test.cjs` 為 **325／325 pass**。研究照片及官方 gif 只作參考，沒有打包進應用程式。

### 參考資料

- OSM：https://www.openstreetmap.org/way/27087018
- Central Plaza 官方項目頁：374 m including mast、75-storey office、Lightime 四帶／15 分鐘／六小時循環及官方 Lightime gif：
  https://www.centralplaza.com.hk/
- 香港政府旅遊資料：374 m to spire、四帶各代表 15 分鐘、完整一小時四帶同色：
  https://www.gohk.gov.hk/en/spots/spot_detail.php?spot=Central+Plaza+Lightime%3Csup%3ETM%3C%2Fsup%3E
- 香港天文台：實體 Lightime 時鐘與天文台時間訊號同步的說明；本程式沒有因此假稱已接入其網絡服務：
  https://www.weather.gov.hk/en/gts/time/hktime_CentralPlaza.htm
- 373.9 m architectural、309 m roof、299 m top floor、78 層及建築師資料：
  https://en.wikipedia.org/wiki/Central_Plaza_(Hong_Kong)
- 18:30 兩條較低帶紅色、兩條較高帶白色的已發表例子（次要旅遊資料，只用於這個固定例子的交叉核對）：
  https://www.expedia.com.hk/en/Central-Plaza-Wan-Chai.d6073700.Place-To-Visit
- 造型另以實際檢視的日景全塔、幕牆近景、夜景及官方 gif 核對；搜尋中誤標的中銀及其他大廈相片已排除，沒有當成中環廣場證據。

## 中環中心 The Center

- 地點及來源：皇后大道中 99 號，採用本地 **OSM way 148228888** 的建築 footprint。minimum-area OBB 中心為 **(-502.1076923076922, -300.43846153846147)**，定向尺寸 **59.85464444417374 × 60.129207033367265 m**。16 邊外框保留兩個正方形錯開 45° 所形成的八個外凸角及八個內凹角，沒有用八角實心柱或長方盒取代。
- 高度及層數：OSM 與 CTBUH 採 **346 m architectural／73 層**，外部資料另列 **292 m roof／275 m occupied／3 層地庫**；香港旅遊發展局頁面另有 **79 floors** 表述。各 convention 在程式分列，沒有混合成假精確樓層。全鋼結構、無鋼筋混凝土核心、銀色反光玻璃及獨特桅杆按 CTBUH 資料處理。
- 星形幕牆：**9,310 個 vision panels、18,620 個玻璃／spandrel quads、18,620 個細 mullion／transom quads**。四組主要外凸折面採較亮銀藍玻璃，其餘面採深色反光玻璃；八支 prow fins 由 12 m 塔身起點延伸至 292 m roof。三道較寬機電橫帶的高度是依照片整理的視覺控制，不是實測樓層。
- 彩虹霓虹：全塔共 **720 段實際橫向 neon bars**，分六個高度區；低區每四層一道，向上逐步加密，頂部主段每層並增加中線，冠頂另有自己的橫帶。橫帶沿星形外凸角形成相片中的 V 形。夜間以緩慢色相循環表現資料所述 rainbow spectrum，**沒有把自選速度聲稱為官方燈光節目 timing**；日間燈管保持金屬色，不出現彩虹發光。
- 架空塔身及公共大堂：主塔由 **12 m** 起，八支鋼柱承托，下面保留公共空間。地面有深綠雲石大堂、帶面板接縫的圓柱不銹鋼核心、升高 gallery、成對扶手電梯及玻璃 balustrades。玻璃頂由拋光鋼 space frame 承托，另有細柱、暖色天花燈及小型樓名。六組升高花槽配細竹莖及交叉葉片，對應 CTBUH 所述公共綠化；沒有用落地盒子封死入口。
- 冠頂及桅杆：292 m 以上為五段獨立的幾何收分，包括三段斜金屬屋面、玻璃 drum 及頂部斜頂，共 **640 個冠頂面板**，另有 standing seams 及露台收口。四條斜撑接到白色漸細桁架桅杆，並有兩層圓形平台、四塊白色天線面板及 346 m 頂針，與中環廣場的金字塔／Lightime 完全分開。
- 地面、碰撞及道路：DTM 施工地台為 **7.21873626373619 m**，plaza 面抬高 **0.12 m**，不是道路工程標高。塔身以中央盒及八個定向 prow 盒貼近星形，大堂核心、升高 gallery、玻璃頂、電梯、支柱、花槽、冠頂及桅杆另作碰撞，共 **36 個 colliders**。`tests/hongkong-the-center-clearance.test.cjs` 對全港道路及 clearance 後街燈掃描，結果沒有衝突，無需搬路或搬燈。
- 瀏覽器驗證：實際檢查全塔日景、兩個星形立面、架空入口、兩個冠頂方向、全塔夜景、上段霓虹及入口夜景。最終 audit 為 **7 個 authored landmarks、普通 buildings = 0、9,310 個中環中心 vision panels、720 段 neon bars、36 個 colliders**；沒有 pageerror、shader error 或 WebGL 錯誤，只有既有外部字體 `ERR_CONNECTION_CLOSED`。完整 `node --test tests/*.test.cjs` 為 **332／332 pass**。研究照片沒有打包進應用程式；搜尋中誤標的長江集團中心、酒店、商舖及香港醫學博物館圖片已排除。

### 參考資料

- OSM：https://www.openstreetmap.org/way/148228888
- CTBUH／CVU：346 m、73 層、275 m occupied、全鋼結構、兩個正方形錯開 45° 的八點星形、銀色反光玻璃、越向上越密的低壓霓虹、獨特桅杆、架空塔身／商店廊及公共綠化：
  https://www.skyscrapercenter.com/building/the-center/343
- 香港旅遊發展局：346 m、日間三角折面及夜間彩虹霓虹；其 79 floors 表述只作分列參考：
  https://www.discoverhongkong.com/eng/place-to-go/travel.guide-the-center.html
- 292 m roof、275 m top floor、建築師及霓虹逐向頂部加密的背景：
  https://en.wikipedia.org/wiki/The_Center
- 入口造型另以 `The_Centre_Ground_Floor_Lobby.jpg` 及 `The_Center_from_below.JPG` 核對玻璃頂、鋼架、圓柱核心、雙電梯及架空關係；日景全塔、夜景及香港旅遊發展局近景用於核對立面、冠頂及霓虹。

## 如心廣場 Nina Tower

- 地點及來源：楊屋道 8 號，沒有使用土地用途範圍代替塔身。高座採目前 **OSM way 112284860 version 13** 的 25 個獨立頂點，低座採 **way 112284790 version 22** 的 24 個頂點，Nina Mall 1 採 **way 492365420 version 22** 的 60 個頂點；三個原始 WGS84 rings、tags、投影及版本均保存在 `nina-tower-architecture.js`。minimum-area OBB 分別為高座 **43.30156671352552 × 41.674366658062354 m**、低座 **71.83410282965269 × 28.84230737585267 m**、商場 **187.97244512293446 × 113.05828798821676 m**。
- 高度及層數：高座 OSM `height=318` 與外部 **320.4 m architectural／319.8 m roof／301.1 m occupied／151.7 m observatory／80 個實體 above-ground 層**分列；頂層編號 **89** 不是實體樓層數。低座 OSM 沒有高度 tag，外部 **170.4 m architectural／148.1 m occupied／42 層**與另一中文摘要 **163.7 m** 不互相覆寫。兩幢另有 2 層地庫的來源紀錄。
- 雙塔幕牆：使用各自精確 ring，而非旋轉長方盒。高座 80 道、低座 42 道 true-scale courses 配獨立 glass／spandrel panels、連續 silver aluminium fins、轉角粗柱及逐層窗燈。高座百頁層 **24、25、32、52、53、54、73、76**，低座 **9、18、19、35** 屬照片導向的視覺層位；沒有假稱是 surveyed MEP schedule。日夜共用 `uInteriorGlow`，日間玻璃不亮隨機住宅式房燈。
- 冠頂：高座 301.1 m 以上保留深色 roof fascia、外圈斜撐、七道拱形邊架、內部屋面及 320.4 m 最高收口；低座使用兩側上揚的六段開放船形／新月冠架。這些構件是依全塔及近景照片重建的可識別形式，沒有把照片中無法量度的鋼構尺寸當成工程圖則。
- 弧形天橋：在兩個精確 tower rings 之間求實際交點，於 **148.1 m** 連接雙塔；採玻璃底、全高玻璃側牆、弧形玻璃頂、17 道結構肋骨及兩道 **3 m 深**三角 space trusses。4.4 m 寬、2.2 m 水平弧彎、3 m 淨高、0.45 m 屋頂起拱及 16 段分段是明確標示的視覺控制，不是 OSM 或實測尺寸；另有纖細橋底燈帶及覆蓋整個封閉橋身的 colliders。
- 商場、入口及屋頂：60 邊零售 outer ring 有分格玻璃地面店面、石柱、雙層商場帶及 LED 廣告面；16 條與地面道路相交的外牆邊保留車輛開口。上蓋 **8 m soffit／24 m roof** 是為保留道路而明示的設計控制，不是 OSM 高度。屋頂有玻璃 barrel vault、三角形鋼肋及露天天井，雨篷放在另一個已核實的 OSM `entrance=yes` node **6298459729**（ring vertex 2），避開車路；node **4843898173** 也是入口，但位於 vertex 47 的車輛開口，因此不在該處加門廊。
- 地面、碰撞及道路：DTM 施工地台為 **5 m**，只是地形 pad，不是道路工程標高。`simple-world.js` 只抬高非道路的商場地面；道路及隧道維持原 ground／surface 選擇。主塔及低座逐邊碰撞、商場上蓋、地面非車路牆、入口 canopy、天橋及 atrium 分開處理。`tests/hongkong-nina-tower-clearance.test.cjs` 重算高座 0、低座 9、商場 52 個道路相交 segments，並核對 16 條地面開口、三個 rings 的 0 盞街燈衝突，以及最低 lintel 對 `roadRibbonProfileAtSegment` 實際渲染道路剖面仍超過 4.5 m 的淨空；沒有搬路或刪隧道。
- 瀏覽器驗證：實際檢查雙塔日景、正背面、真實入口、封閉弧形天橋、兩個冠架、全塔夜景、天橋夜景及入口夜景。最終 audit 為 **8 個 authored landmarks、普通 buildings = 0、高／低座 8,640／3,906 個 vision panels、16 段天橋、17 道天橋肋骨、174 個 colliders**；沒有 pageerror、shader error 或 WebGL 錯誤，只有既有外部字體 `ERR_CONNECTION_CLOSED`。完整 `node --test tests/*.test.cjs` 為 **338／338 pass**。研究照片沒有打包進應用程式。

### 參考資料

- OSM 高座：https://www.openstreetmap.org/way/112284860
- OSM 低座：https://www.openstreetmap.org/way/112284790
- OSM Nina Mall 1：https://www.openstreetmap.org/way/492365420
- 本次雨篷所在入口（`entrance=yes`）：https://www.openstreetmap.org/node/6298459729
- 位於車輛開口的另一入口（只核實位置，沒有額外放門廊）：https://www.openstreetmap.org/node/4843898173
- CTBUH 高座：320.4／301.1／151.7 m、80 above-ground／2 below-ground、2006 completed、酒店／辦公室及全混凝土資料：
  https://www.skyscrapercenter.com/building/nina-tower/421
- CTBUH 低座：170.4／148.1 m、42 above-ground／2 below-ground：
  https://www.skyscrapercenter.com/building/lhotel-nina-tower/9352
- 41/F sky lobby／skybridge、319.8 m roof、頂層編號與實體層數的分別：
  https://en.wikipedia.org/wiki/Nina_Tower
- 造型以實際檢視的全塔、基座、雙塔及天橋照片核對；誤標的 Tregunter、Upper House、Two IFC、中銀及成都雙塔圖片已排除。夜景候選圖太遠／太低解像，因此程式只使用低亮度暖窗及纖細燈帶，**沒有假稱已核實官方 LED 節目、精確鋼構或低座夜間燈光序列**。研究照片沒有打包進應用程式。

## 長江集團中心 Cheung Kong Center

- 地點及來源：皇后大道中 2 號，採目前 **OSM way 64897826 version 12** 的六個獨立頂點。minimum-area OBB 中心為 **(98.70266699412689, 263.1983367150925)**，定向尺寸 **47.75832551153819 × 47.339042385344925 m**。六頂點中有兩個共線中間／入口節點；模型保留四個真實角點，再在原始外框內做 **1 m chamfer**，沒有用理想方盒或土地範圍取代 OSM。結構論文的 **47.4 × 47.4 m、1 m chamfered corners** 是另一來源規格，沒有強行覆寫 OSM 尺寸。
- 高度及層數：OSM 為 **283 m／63 levels**；CVU 為 **282.8 m architectural／to-tip、63 above-ground／5 below-ground、1999 completed、office**。另一常見表述是 **62 層**，而升降機最高標號 **70** 不是 70 個實體樓層。程式及文件分開保存，沒有將不同 conventions 合成假精確數字。
- 幕牆及遮陽：按來源所述 **2.4 × 2.1 m** 玻璃面板建立規則藍綠玻璃、雙排 vision panels、深色 spandrels 及細橫框；每層另有分段斜面 aerofoil sunshades、外緣薄唇及相隔支撐。連續不銹鋼豎向 fins 由雙層大堂延伸至平屋頂。低部四層密百頁、9 m 雙層大堂及樓層高度是依照片整理的視覺控制，不是實測 MEP 圖則。
- 圓角大堂及入口：地面十二邊圓角玻璃環與上層 1 m chamfer 分開，表現基座弧形玻璃角及雙層通透大堂。唯一雨篷放在已核實的 OSM node **8039390420**（`entrance=yes`、`exit=yes`、`door=yes`），有分段金屬 barrel vault、弧形肋骨、圓鋼柱、玻璃門、暖色天花燈及小型樓名；沒有在屋頂加未核實的大型標誌。
- 平屋頂：沒有尖頂或桅杆。276.3 m 以上為照片導向的 recessed plant／百頁帶，281.4 m 平屋面、薄 parapet、coping 及三個不超過 282.8 m 的屋頂設備盒分開建模；這些視覺標高不是 CVU occupied-floor 數據。
- 光纖夜景：日間保持深色反光玻璃及金屬遮陽，夜間以低量辦公室燈光及分佈於幕牆的細小冷白／暖白光點表現資料所述 optical-fibre sparkle。光點是確定性靜態視覺場，**沒有假稱已核實或重播官方季節訊息、電腦燈光程序及 timing**。
- 地面、碰撞及道路：DTM 施工地台為 **13.13482158596429 m**，只是地形 pad，不是道路工程標高。圓角大堂、chamfered tower、入口雨篷及支柱分開碰撞。`tests/hongkong-cheung-kong-clearance.test.cjs` 對原始 OSM ring、兩個 authored rings、入口 canopy 的全港道路及 clearance 後街燈掃描均為零衝突，因此沒有搬路、搬燈或改白色標線。長江公園是獨立 OSM way **295407287**，其 `level=3` 不是米制高度；本幢沒有把公園範圍當塔身或假稱已核實公園平台標高。
- 瀏覽器驗證：以日景全塔、正面、另一側、入口、屋頂，以及午夜全塔、立面和入口共八個實際渲染視角檢查。最終場景為 **9 landmarks／0 generic buildings**；本幢 **29 meshes、9,280 雙半層玻璃 panels、4,960 遮陽翼、520 百頁、2,450 光纖點、24 colliders**。所有 position／normal／color／aLit 數值及 bounding spheres 均通過 finite audit；24 個 colliders 全部進入世界碰撞陣列，大廈中心和真實入口的 player ground query 均為 **13.254821585964288 m**。沒有 pageerror、shader 或 WebGL error；只有既有外部字體 `ERR_CONNECTION_CLOSED`，以及 SwiftShader 的 performance warnings。

### 參考資料

- OSM 塔身：https://www.openstreetmap.org/way/64897826
- 實際入口：https://www.openstreetmap.org/node/8039390420
- CVU／CTBUH：282.8 m、63 above-ground／5 below-ground、1999、office、all-steel、Cesar Pelli、Arup：
  https://www.skyscrapercenter.com/hong-kong/cheung-kong-centre/618/
- 2.4 × 2.1 m 玻璃、光纖夜燈、建築師及不同樓層表述：
  https://en.wikipedia.org/wiki/Cheung_Kong_Center
- 結構論文摘要：62-storey、283 m、47.4 × 47.4 m、1 m chamfer、混凝土核心／組合樓板及柱；其結構分類與 CVU all-steel 不混寫：
  https://www.sciencedirect.com/science/article/pii/B9780080430157500889
- 日景立面、圓角大堂、百頁、入口雨篷及公園照片以 Zolima CityMag 實際檢視圖片核對：
  https://zolimacitymag.com/hong-kong-skyline-icon-hilton-hotel-cheung-kong-center/
- 夜景只作整體光點效果參考；搜尋中誤標的 The Henderson、Two IFC 及 Cheung Kong Center II 圖片沒有用作本幢證據。研究照片沒有打包進應用程式。

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
- `bank-of-china-architecture.js`：中銀目前 OSM API 來源、georef 對應、高度／層數 conventions、四個三角 prism、斜頂、雙桅杆及碰撞座標換算。
- `bank-of-china-world.js`：中銀外露玻璃格、斜向 space frame、角柱、斜玻璃頂、雙桅杆、花崗岩基座、雙拱入口、華表、中銀標誌、日夜材質及 stats。
- `central-plaza-architecture.js`：中環廣場 OSM 地盤、roof／architectural／官方高度 conventions、削角三角收分、Lightime 香港時間規則及碰撞座標換算。
- `central-plaza-world.js`：中環廣場三色幕牆、金色霓虹、花崗岩入口基座、六層冠頂、開放框架、玻璃金字塔、三腳桅杆、四段 Lightime、日夜材質及 stats。
- `the-center-architecture.js`：中環中心 OSM 星形地盤、高度／層數 conventions、分段冠頂、霓虹密度及星形碰撞座標換算。
- `the-center-world.js`：中環中心 16 面銀玻璃、彩虹霓虹、架空鋼柱、玻璃大堂、雙電梯、綠化、分段冠頂、白色桁架桅杆、日夜材質及 stats。
- `nina-tower-architecture.js`：如心廣場三個目前 OSM API 來源 rings、georef、OBB、雙塔高度 conventions、真實入口、車輛開口、弧形天橋及碰撞座標換算。
- `nina-tower-world.js`：如心廣場雙塔精確幕牆、機電百頁、開放冠架、玻璃底天橋、商場車輛開口、atrium vault、入口雨篷、日夜材質及 stats。
- `cheung-kong-architecture.js`：長江集團中心六頂點來源、OBB、高度 conventions、chamfer、圓角大堂、真實入口、plaza 及碰撞座標換算。
- `cheung-kong-world.js`：長江集團中心雙排玻璃幕牆、aerofoil 遮陽翼、豎 fins、低層百頁、圓角大堂、入口雨篷、平屋頂及光纖夜景。
- `simple-world.js`：只整合這九個 authored landmarks；普通 `buildings` 仍為 0。
