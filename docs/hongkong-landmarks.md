# 香港手建 Landmarks

香港仍採用 `unified-simple` 展示：全港道路及基本地面保留，**不生成普通建築群**。手建地標會逐個加入；目前有滙豐總行大廈、渣打銀行大廈、國際金融中心二期、環球貿易廣場、中銀大廈、中環廣場、中環中心、如心廣場、長江集團中心、K11 Atelier、天璽I、天璽II、名鑄、朗豪坊辦公大樓、御峰、合和中心及新鴻基中心。

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

## K11 Atelier（Victoria Dockside）

- 地點及來源：梳士巴利道 18 號，採目前 **OSM way 668219664 version 14** 的 26 個獨立頂點；原始 WGS84 geometry、tags、版本及 ODbL attribution 保存在 `k11-atelier-architecture.js`。minimum-area OBB 中心為 **(1664.0993512000164, -1438.3614526756262)**，定向尺寸 **63.55503258862382 × 49.47862969496305 m**。這是塔身 outline，**不是**整個 Victoria Dockside 土地用途範圍；K11 ARTUS 仍是 `HK-B0074`、K11 MUSEA 仍是 `HK-B0099`，沒有藉本幢提前完成。
- 高度及層數分列：OSM 為 **274 m／66 levels**；CVU／CTBUH 為 **272.5 m architectural、277.3 m to-tip、255.1 m occupied、66 above-ground／5 below-ground**。官方項目資料另採約 **273 m** 及 **62 層（排除兩層避火、兩層機電）**；KPF／ArchDaily 設計報道採 **66-story／280 m**，Wikipedia 的 **284 m** 也另存為不同 convention。模型主體止於 272.5 m、冠頂 fins 止於 277.3 m，不把不同來源平均、取整或混寫成 OSM 標籤。
- 分段體量：以精確來源 ring 建立雙層高大堂及五段 occupied tiers，四次退台分別位於視覺樓層 **17／33／47／57** 之後。各段保留 26 邊平面及凹角，再以照片導向的非對稱縮放、平移形成逐段收分；這些 transforms 是明確標示的外觀控制，不是額外實測樓層 rings。regression 對每段邊界取樣，確認上段留在前一輪廓內。
- 幕牆及材料：依 KPF 文字和近景照片分開處理深色 panoramic glass insets、深色 spandrels、葡萄牙石灰石直翼牆及古銅色窗框。本幢有 **4,088 個主體 vision panels、4,088 個 spandrel panels、57 個大堂玻璃 panels、4,418 段石灰石 courses**；細橫框、較粗石灰石 fins 及每層玻璃都有實際幾何，不是 footprint 盒體貼窗格圖。四個避火／機電外觀帶及塔冠通風帶合共 **2,916 段百頁**；其層位屬照片導向視覺編排，不是實測 MEP schedule。
- 凹角斜框：近照中暗色凹角內的斜向金屬框架另以 **488 段真實斜梁**重建，分布在四條 source-derived recessed edges，而非把整幢做成完全相同的平面玻璃格。斜框位置及截面是外觀重建，沒有冒充結構工程圖則。
- 退台屋面及塔冠：四段退台各有屋面、薄 parapet 及收口。255.1 m 以上有 **200 個冠頂玻璃 panels、50 支石灰石 fins**、古銅橫框及通風百頁；270.8 m 是照片導向的屋面控制，272.5 m 另有薄 parapet，三個低矮 roof-plant enclosures 不超過 277.3 m to-tip。沒有任意加入尖頂、天線或巨型屋頂標誌。
- 入口及大堂：北側 source edge 5 作 Salisbury Road office lobby frontage，有玻璃門、古銅平底雨篷、石灰石柱、小型 K11 ATELIER 字牌及暖色天花燈。入口位置由地址及外觀照片推導；OSM way **沒有 door tag**，雨篷和門框尺寸也是視覺建模控制，不能稱為實測入口節點。字牌獨立放在門框前方，避免被中央門棂遮住。
- 大堂可識別細節：依 ArchDaily 的實際室內照片，在玻璃入口後加入淺色石地板、木飾面牆、三聯水墨藝術牆、接待台及五條保安閘機通道（六個深色機櫃及玻璃翼）。三聯畫由 Canvas 程序筆觸重建，**不是把參考照片貼上牆**；其在大堂中的確切位置屬視覺整合，不是室內測量圖。
- 日夜：日間保持反光灰綠玻璃、石灰石及古銅色差；夜間只有低量暖色辦公窗、入口及大堂暖光。現有資料不足以核實完整官方夜間燈光節目，因此沒有加入自創 LED 動畫或聲稱重播實際燈光時序。研究照片及三聯畫參考均沒有打包進應用程式。
- 地面、碰撞及道路：raw DTM 施工地台為 **5.444955721524252 m**，plaza 面抬高 **0.12 m**，不是道路工程標高。精確 ring 與 4 個道路 segment 相交：地面 ways **44075／50914** 及隧道 ways **44081／50542**；七條地面相交外牆邊保留車輛開口及 **9 m soffit**。最低 portal lintel 對 `roadRibbonProfileAtSegment` 的實際渲染剖面仍超過 **4.5 m** 車輛淨空；不搬路、不刪隧道、不改白色標線。source ring 及入口 canopy 均沒有 clearance 後街燈，canopy 也沒有地面道路衝突。ground query 不把地面車路覆蓋成 plaza，同時不讓未選中的地下隧道錯誤壓低大堂地面。
- 瀏覽器驗證：實際檢查全塔日景、北面、背面、退台、入口、大堂、凹角斜框、塔冠、全塔夜景及入口夜景共十個視角。最終場景為 **10 landmarks／0 generic buildings**；本幢 **57 meshes、451,070 vertices、216,754 triangles、194 colliders**，全部 194 個 colliders 均進入世界碰撞陣列。所有 position／normal／color／aLit 及 bounding spheres 通過 finite audit，`geometryIssues=[]`、`badColliders=[]`。大廈中心和入口的 player ground query 均為 **5.564955721524252 m**；地面道路取樣則為 **5.75 m**，沒有被 plaza 覆蓋。沒有 pageerror、shader 或 WebGL error；只有既有外部字體 `ERR_CONNECTION_CLOSED` 及 SwiftShader performance warnings。完整 `node --test tests/*.test.cjs` 為 **348／348 pass**。

### 參考資料

- OSM 塔身及目前 API 幾何：https://www.openstreetmap.org/way/668219664
  https://api.openstreetmap.org/api/0.6/way/668219664/full.json
- K11 Atelier 官方 premises info：約 273 m、Q2 2017、62 層的排除避火／機電計法、辦公室／酒店／長住住宅用途及典型樓層資料：
  https://www.k11atelier.com/hk/victoria-dockside/premises-info/
- ArchDaily／KPF：分段不規則體量、panoramic glass insets、Portuguese limestone piers、bronze trims、66-story／280 m 設計表述，以及本幢外觀和大堂三聯畫／木牆／保安閘機照片：
  https://www.archdaily.com/885155/k11-atelier-at-victoria-dockside-kpf
- CVU／CTBUH：272.5 m architectural、277.3 m to-tip、255.1 m occupied、66 above-ground／5 below-ground、2017 completed、all-concrete 及混合用途：
  https://www.skyscrapercenter.com/building/victoria-dockside/9349
- KPF 及 WSP 項目資料（分段體量及另一個約 280 m／66-storey 設計報道口徑）：
  https://www.kpf.com/project/victoria-dockside
  https://www.wsp.com/en-us/projects/victoria-dockside
- 284 m 只作另一來源 convention 保存，沒有覆寫上述高度：https://en.wikipedia.org/wiki/Victoria_Dockside

## 天璽I The Cullinan I（North Tower）

- 地點及來源：柯士甸道西 1 號，採目前 **OSM way 200726114 version 14** 的 14 個獨立頂點；原始 WGS84 geometry、完整 tags、版本及 ODbL attribution 保存在 `cullinan-i-architecture.js`。minimum-area OBB 中心為 **(143.7297083494973, -2625.408353509354)**，定向尺寸 **68.12211685417242 × 42.345256782545334 m**。模型保留長短邊、凹口及突出翼部，沒有用 Union Square 土地用途範圍或理想長方盒取代塔身。
- 高度、層數及年份分列：OSM 為 **270 m／68 levels**，Wong & Ouyang 亦以約 **270 m** 描述雙塔；CTBUH 的 North Tower 單幢資料為 **269.9 m architectural＝269.9 m to-tip、68 above-ground／1 below-ground、2008 completed、residential、all-concrete**。OSM `start_date=2007` 不是 CTBUH 完成年份；兩者沒有混寫。模型最高點採 **269.9 m**，沒有另加天線或把 OSM 270 m 當成另一個頂點。
- 幕牆及材料：依建築師所述 **double-glazed unitized curtain wall** 和官方日景照片，分開處理藍銀反光 vision glass、較深 spandrel、銀色鋁製直棂／橫框及石墨色百頁。68 道視覺 courses 有實際分格玻璃、連續豎 fins 和逐層橫框；三個深色百頁帶位於視覺樓層 **12／35／55**，只作照片導向外觀編排，沒有冒充實測避火或機電樓層。
- 折角塔冠：主幕牆上方以 14 個 source-derived 冠頂高度形成高低折線、斜玻璃面、金屬 coping 及兩支全高 signature blades。最高點保持 **269.9 m**；**253.6 m** 只是主牆視覺控制，不是另一個來源的 roof 高度。冠頂斜線及幼冷白燈帶依官方夜景照片重建，日間燈帶保持金屬色，沒有加入未核實的動畫或官方燈光時序。
- 北塔入口玻璃盒：Wong & Ouyang 明確描述西側高架道路 forecourts，以及北塔 Serviced Apartments 的 **40 m tall glass box**。模型將它放在面向雅翔道接口的 source edge 0；寬 **20 m**、深 **7.2 m**、外伸 **3.2 m** 是配合官方照片及道路 clearance 的視覺尺寸，不是實測圖則。玻璃盒有獨立透明 panes、金屬框架、內部柱、門及門柄、暖色 light shelves，以及程序向量 **金色 C** 中庭裝置；沒有把南塔 W Hotel 入口或酒店用途套到本幢。
- 兩幢之間的有蓋落客區：另一個 source edge 5 面對雙塔之間，設雙層高落客入口、四支淺色圓柱、上層弧形金屬 canopy、下層平面玻璃 canopy、吊桿、門框及程序波浪紋石鋪地。**9 m** 高度和構件尺寸是依官方落客照片整理的視覺控制，不是 podium 工程標高或結構圖。
- 日夜：日間保留低輻射藍銀玻璃、銀鋁框架及深色百頁的反射色差；夜間只有低量暖色住宅窗、入口暖光，以及照片中的冷白水平／折角冠頂輪廓。金色 C 只有很低補光，沒有把整座玻璃盒變成發光盒。
- 地面、碰撞及道路：raw DTM 施工地台為 **7.862226175755751 m**，plaza 面抬高 **0.12 m**；OSM `location=podium`／`building:min_level=1` 明確保留，但這個 DTM 數值**不是已核實的 podium 頂面或入口工程標高**。塔身分段逐邊碰撞，入口玻璃盒、柱及兩層 canopy 另有碰撞；逐邊 collider 同時提供 controller 所需的 bounds／OBB，不是只有不能被空間索引的 shape-only box。精確 ring 只與 tunnel ways **48321／51074** 的 2 個 segments 相交；兩個 authored forecourts 均無地面道路或 clearance 後街燈衝突，因此沒有搬路、刪隧道、搬燈或改白色標線。ground query 只在未選取道路時抬高 forecourt，不覆蓋可行車道路。
- 實際瀏覽器驗收：WebGPU 日／夜共 9 個固定視角已逐張查看，H 淨畫面、完整塔身、金色 C、落客區及冠頂均已檢查；沒有 page error、應用程式 console error、NaN geometry 或無效 collider。本幢為 **29 meshes／191,454 vertices／80,426 triangles／59 colliders**，全場景 **11 landmarks／0 generic buildings**；最高渲染點扣施工地台後約 **269.899994 m**。在東立面實際逐步驅動行人及的士撞牆，碰撞後中心法線距離分別為 **0.905／2.605 m**；同一隧道抽樣點在地面參考高度與地下參考高度分別回傳 **7.982226175755751／3.75 m**，確認道路分層仍存在。上述碰撞及高度全部是場景驗證值，不是實地工程數據。
- 研究照片只作造型依據，沒有打包進應用程式；搜索中錯配的其他大廈、室內窗景及未實際查看的候選圖均沒有當成立面證據。

### 參考資料

- OSM 塔身及目前 API 幾何：https://www.openstreetmap.org/way/200726114
  https://api.openstreetmap.org/api/0.6/way/200726114/full.json
- CTBUH／CVU North Tower：269.9 m architectural／to-tip、68 above-ground／1 below-ground、2008、residential、all-concrete，以及設計／結構／幕牆團隊：
  https://www.skyscrapercenter.com/building/the-cullinan-i/675
- Wong & Ouyang：雙塔約 270 m、double-glazed unitized curtain wall、西側高架道路 forecourts、北塔 Serviced Apartments 的 40 m 玻璃盒、兩塔之間的雙層高有蓋落客區；同頁官方整體日／夜景、玻璃盒及落客照片用於材料與細部核對：
  https://www.wongouyang.com/projects/international-commerce-centre/#!/cullinan

## 天璽II The Cullinan II（South Tower）

- 地點及來源：柯士甸道西 1 號，採目前 **OSM way 25608721 version 21** 的 15 個獨立頂點；原始 WGS84 geometry、完整 tags、版本及 ODbL attribution 保存在 `cullinan-ii-architecture.js`。minimum-area OBB 中心為 **(107.96646025342716, -2539.040799037352)**，定向尺寸 **68.26897054668052 × 42.35054879406937 m**。模型保留南塔自己的長短邊、凹口及翼部，沒有把北塔 ring 平移或把 Union Square 土地用途範圍當成塔身。
- 高度、用途及年份分列：OSM 為 **270 m／68 levels／hotel=separate**，Wong & Ouyang 以約 **270 m** 描述雙塔；CTBUH South Tower 為 **269.9 m architectural＝269.9 m to-tip、68 above-ground／1 below-ground、2008 completed、residential／hotel、all-concrete**。OSM `start_date=2007` 和其他二手資料的 2009 表述沒有取代本項採用的 CTBUH 單幢 2008 convention。冠頂設計最高點採 **269.9 m**，沒有另加天線；金屬框架截面的厘米級渲染 bounds 外延不被當成另一個建築高度。
- 幕牆及塔冠：依建築師的 **double-glazed unitized curtain wall** 和實際查看的雙塔日景，建立南塔自己的藍銀玻璃、spandrel、鋁製直棂／橫框、三條石墨百頁帶及兩支全高豎向 blades。視覺百頁 courses **11／35／55**、冷白 accent courses **19／37／53** 是照片導向控制，不是實測機電樓層。15 個 source-derived 冠頂高度形成折角玻璃、金屬 coping 和高低輪廓；**253.6 m** 只作主牆視覺控制，不冒充來源 roof 高度。
- W Hotel 玻璃中庭：Wong & Ouyang 明確把南塔 **40 m** 玻璃盒歸於 W Hotel，並說明兩個玻璃盒都面向西側高架道路 forecourts。模型因此放在 source **edge 0**，而不是套用北塔的金色 C 或把 OSM 另一側門節點當成 W 中庭中心。寬 **22 m**、深 **8 m**、外伸 **2 m** 是配合官方照片和道路 clearance 的視覺尺寸，不是實測圖則。
- 水晶 W 及落客細節：實際查看的 W&O 官方夜景顯示大型發光 **W**、密集吊掛水晶帘、暖色水平燈線、平面玻璃雨篷、幼柱、W 圖騰及修剪綠籬。模型以程序向量 W、**93 條全高中庭吊線／3,513 粒背景水晶**，以及 **348 條 W 吊線／1,881 粒 W 水晶**重建這些特徵；水晶帘延伸至大堂，不讓地面層成為黑色空洞。另有暖色石質大堂後牆／地板、玻璃門、門柄、雨篷格框／downlights、石鋪地、花槽及綠籬。雨篷寬 **26 m**、高度 **4.8 m**、front **3.4 m** 均為視覺控制；入口正中沒有支柱，沒有把北塔落客 canopy 或南塔未核實尺寸的泳池複製進來。
- OSM 門節點：way 內另有 **node 10703681997 v2**，tags 為 `door=yes／entrance=yes／exit=yes／indoor=yes／level=1`。其原始經緯度及版本獨立保存，在 edge 12 放置雙扇玻璃門和門柄；它是 level-1 indoor door，沒有被冒稱為官方 W 外觀照片中的中庭中心。
- 地面、碰撞及道路：raw DTM 施工地台為 **7.36966376037843 m**，plaza 面抬高 **0.12 m**，不是已核實的 podium 或入口工程標高。塔身逐邊 OBB、玻璃中庭、雨篷、幼柱、花槽及圖騰均有碰撞。精確塔身 ring **沒有道路相交**；W forecourt 也沒有地面或 elevated 車路及 clearance 後街燈衝突，因此沒有搬路、搬燈、刪隧道或改白色標線。ground query 只在未選取道路時抬高 forecourt。
- 實際瀏覽器驗收：以日景全塔兩側、冠頂、W 中庭、落客雨篷、OSM 門，以及夜景全塔、冠頂、W 中庭及落客雨篷共 **10 個固定視角**逐張檢查。最終場景為 **12 landmarks／0 generic buildings**；本幢 **36 meshes／672,379 vertices／301,505 triangles／63 colliders**，全部 colliders 均進入世界碰撞陣列，`geometryIssues=[]`、`badColliders=0`。大廈中心、W 入口及落客處的 player ground query 均為 **7.48966376037843 m**；在南塔立面實際逐步驅動行人及車輛撞牆，碰撞後中心法線距離分別為 **0.905／2.605 m**。沒有 page error、應用程式或 shader error；只有既有外部字體 `ERR_CONNECTION_CLOSED` 及 **4 則 SwiftShader performance warnings**。完整 `node --test tests/*.test.cjs` 為 **358／358 pass**。這些都是場景驗證值，不是實地工程數據。
- 研究照片只作造型依據，沒有打包進應用程式；實際查看的是 W&O 的 W Hotel 入口夜景及雙塔日景，CTBUH 只作上述文字資料來源。搜索錯配的無關酒店、商場及室內照片均沒有作為立面證據。

### 參考資料

- OSM 南塔及目前 API 幾何：https://www.openstreetmap.org/way/25608721
  https://api.openstreetmap.org/api/0.6/way/25608721/full.json
- CTBUH／CVU South Tower：269.9 m architectural／to-tip、68 above-ground／1 below-ground、2008、residential／hotel、all-concrete：
  https://www.skyscrapercenter.com/building/the-cullinan-ii/676
- Wong & Ouyang：雙塔約 270 m、double-glazed unitized curtain wall、西側高架道路 forecourts、南塔 W Hotel 40 m 玻璃中庭及獨立 landscaped guest drop-off；同頁官方 W 水晶中庭夜景與雙塔日景用於材料及細部核對：
  https://www.wongouyang.com/projects/international-commerce-centre/#!/cullinan

## 名鑄 The Masterpiece

- 地點及來源：河內道 18 號，採目前 **OSM way 124697429 version 6** 的 **44 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `masterpiece-architecture.js`。minimum-area OBB 中心為 **(1467.4534154961186, -1735.245184758726)**，定向尺寸 **80.18536265601915 × 26.90738567586004 m**，`ry=-0.7300713453042845`。這是 OSM 的上蓋塔身 ring，不是整個 K11 發展界線、商場基座或土地用途範圍；模型保留長向圓角及中央突出部位，沒有改成矩形盒。
- 高度、用途及年份分列：OSM 為 **261 m／64 levels／building:min_level=8／layer=2／location=podium／hotel=separate**。CTBUH 單幢資料為 **257 m architectural＝257 m to-tip、241.7 m occupied、64 above-ground／4 below-ground、345 apartments、384 hotel rooms、177 parking、28 elevators、residential／hotel、all-concrete、2000 construction start／2009 completed**；design architect 為 **Dennis Lau & Ng Chun Man (DLN)**，structural engineer 為 **Arup**。Wikipedia 另採 **261 m antenna spire／241.7 m roof、381-room Hyatt、2002 start／2007 completed**，以及低層六層 K11、酒店 Level 3–24、住宅標號 27–67 的另一套描述。所有數值分欄保存，沒有平均或把 OSM／Wikipedia 的 261 m 冒充 CTBUH architectural；模型最高點採 **257 m**。
- 低層與住宅立面：依實際查看的全塔、弧形住宅立面及街道照片，建立低層古銅色酒店／商場玻璃、較深 spandrel、上部連續弧形白色住宅阳台帶、玻璃欄杆、中央深藍玻璃豎槽、幼鋁直棂及兩道較厚的雙層高空中花園帶。視覺 podium 頂 **30 m**、hotel 頂 **96 m** 及住宅 courses 是配合來源高度和照片比例的模型控制，不是實測樓層工程標高。次要 layout 的 **26F refuge／47F sky garden + refuge** 獨立保存，沒有直接硬稱為兩道照片厚帶的精準樓層。
- 空中花園及材料：兩道厚帶把玻璃後退、保留外側白色樓板及玻璃欄杆，並有低矮綠化；它們不是整座塔通用的黑色機電腰線。日間玻璃按酒店、住宅及中央豎槽分色，夜間只保留低量暖色室內窗、兩道厚帶的細暖色線光及冷色玻璃反射，沒有把整座塔變成均勻發光格網。
- 百頁冠頂及門架：主牆在 **241.7 m occupied** 收束，上方為深色百頁、屋面、機房及維修吊臂；四道白色開敞矩形門架位於兩側長邊，框架最高點為 **257 m**。門架中間保持真正開空，沒有用一塊實心冠頂牆封死。**250.5 m** 只是百頁頂的視覺控制，不是另一個來源 roof 高度。
- 河內道住宅入口：次要 layout 支持 G/F 河內道住宅入口，因此選 source **edge 25**；其 world midpoint 為 **(1460.000781180954, -1754.8253703821033)**，outward normal 為 **(0.6690464071908454, -0.7432206301126345)**。這是 layout／道路方向導向的設計定位，**不是已測量 OSM 門節點**。依入口照片建立暖色玻璃盒、玻璃門及門柄、薄平面玻璃雨篷、古銅格框、四支偏側幼柱、暖色石質大堂、側牆燈條、古銅幾何飾屏、花槽及程序向量 `THE MASTERPIECE` 標誌；雨篷寬 **12 m**、高 **4.8 m**、front **3.2 m** 均為視覺控制，不是實測圖則，正中門口保持無柱。
- 地面、碰撞及道路：raw DTM 施工地台為 **5.75 m**，plaza 面抬高 **0.12 m**；OSM `location=podium` 不被用來假稱這個 DTM 數值是已知 podium 頂面或入口工程標高。塔身以 **44 條逐邊 OBB** 分段碰撞，百頁冠頂、門架、雨篷、幼柱及花槽另有碰撞。精確塔身 ring 與道路及 clearance 後街燈均沒有衝突；河內道 way **39492** 的最近中心線距離為 **9.29499389795847 m**（寬 5.2 m），麼地道 way **5544** 為 **16.558616656894703 m**（寬 8.4 m）。edge 25 入口前庭測試 ring 同樣無道路／街燈衝突，因此沒有搬路、搬燈或改白色標線；ground query 只在未選取道路時抬高前庭。
- 實際瀏覽器驗收：以日景河內道／麼地道兩側全塔、冠頂、空中花園、入口及入口近景，以及夜景全塔、冠頂、住宅厚帶及入口共 **10 個固定視角**逐張檢查。最終場景為 **13 landmarks／0 generic buildings**；本幢 **29 meshes／439,742 vertices／211,252 triangles／113 colliders**，全部 colliders 均進入世界碰撞陣列，`geometryIssues=[]`、`badColliders=0`。最高渲染點為世界 **262.75 m**，扣 **5.75 m** 施工地台後為 **257 m**。大廈中心、入口及前庭的 player ground query 均為 **5.87 m**，河內道抽樣車路為 **5.80409958759363 m**，沒有被前庭覆蓋。在長立面實際逐步驅動行人及車輛撞牆，碰撞後中心法線距離分別為 **0.905／2.605 m**。沒有 page error、應用程式或 shader error；只有既有外部字體 `ERR_CONNECTION_CLOSED` 及 **4 則 SwiftShader performance warnings**。完整 `node --test tests/*.test.cjs` 為 **363／363 pass**。這些都是場景驗證值，不是實地工程數據。
- 日夜及資產：日夜材質分別處理低反射住宅玻璃、中央藍玻璃、白色阳台、古銅低層、深色冠頂和暖色入口；研究照片只作造型依據，沒有打包進應用程式，模型不使用照片貼圖或下載 GLTF。Richitt 頁面本身曾回 508，只有經圖片搜索實際取得的候選圖被用作次要視覺參考；搜索中錯配的其他建築及室內圖均沒有當成立面證據。

### 參考資料

- OSM 上蓋塔身及目前 API 幾何：https://www.openstreetmap.org/way/124697429
  https://api.openstreetmap.org/api/0.6/way/124697429/full.json
- CTBUH／CVU：257 m architectural／to-tip、241.7 m occupied、64 above-ground／4 below-ground、345 apartments、384 hotel rooms、2000／2009、DLN、Arup、Meinhardt、Hip Hing 及 all-concrete：
  https://www.skyscrapercenter.com/building/the-masterpiece/747
- Wikipedia 次要 convention：261 m antenna spire／241.7 m roof、381-room hotel、2002／2007，以及 K11／Hyatt／住宅樓層描述；沒有取代 CTBUH 模型高度：
  https://en.wikipedia.org/wiki/The_Masterpiece_(Hong_Kong)
- 市建局 Hanoi Road Project：8,299 m² site、102,625 m² total GFA、31,209 m² commercial GFA、1,219 m² open space、345 flats；頁面的 2018-19 是 URA 項目狀態，沒有取代塔樓完成年份：
  https://www.ura.org.hk/en/project/redevelopment/hanoi-road-project-the-masterpiece
- Wikimedia Commons 外觀分類；實際查看 `18_Hanoi_Road_viewed_from_Tsim_Sha_Tsui_Promenade.jpg` 及 `HK_TST_East_Mody_Road_Masterpriece_K11_Hotel_Paronama_facades_Empress_Plaza_Nov-2012.JPG`，用於全塔比例、圓角、兩道厚帶及街道 context：
  https://commons.wikimedia.org/wiki/Category:Exterior_of_The_Masterpiece,_Hong_Kong
- Richitt／OneDay 的次要外觀及入口照片、住宅 layout：只用於弧形阳台、冠頂、暖色玻璃入口和河內道入口方向，不作精準尺寸或結構依據：
  https://www.richitt.com/名鑄-themasterpiece/
  https://www.oneday.com.hk/zh_HK/buildings/the-masterpiece/

## 朗豪坊辦公大樓 Langham Place Office Tower

- 地點及來源：亞皆老街 8 號，採目前 **OSM way 65259283 version 10** 的 **49 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `langham-place-architecture.js`。minimum-area OBB 中心為 **(916.7048484092081, -4089.400066604031)**，定向尺寸 **44.270143917100995 × 44.11146237165258 m**，`ry=0.19350471089742882`。模型保留圓角多瓣平面、凹口及突出翼部，沒有把整個朗豪坊發展、商場、酒店或土地用途範圍當成辦公塔身。
- 高度、層數及用途分列：OSM 為 **255 m／59 levels／layer=1**。CTBUH 為 **255.1 m architectural＝255.1 m to-tip、59 above-ground／5 below-ground、65,868 m² Tower GFA、2004 completed、office、all-concrete**；design architect 為 **Wong & Ouyang**，structural engineer 為 **Arup**，façade consultant 為 **Far East Aluminum Works**。Wong & Ouyang 項目頁另以 **57 storeys office above 2 retail floors／3 basement carpark levels、約 66,000 m² office GFA、10-storey grand atrium** 描述發展組合；Wikipedia 採 **255.1 m roof、59＋5、1999 construction start／2004 completed**。各來源分開保存，模型最高點採 CTBUH **255.1 m**，沒有把 OSM 255 m 擅自取整成另一個頂點。
- 弧形藍玻璃及灰色帶：依 Wong & Ouyang 官方全塔、街道及高空照片，建立多瓣弧形藍色反光玻璃、細鋁直棂／橫框、較深凹口及兩道灰色玻璃厚帶。視覺灰色 courses **18–19／38–39** 是照片導向控制，不是實測避火或機電樓層；厚帶有外挑 cornice、局部交叉撐及細暖色夜間線光，沒有把整座塔做成均勻盒體格網。
- 分段冠頂及圓頂：主牆頂採四個照片導向屋面區 **239／230／226／233 m**，有逐邊百頁、弧形 coping、水平屋面及高差封邊；這些只是模型造型控制，不是四個來源 roof 高度。北側主瓣上方為橢圓玻璃圓頂，base **239 m**、高 **16.1 m**、兩軸半徑 **8.2／7.2 m**，最高點為 **255.1 m**；有實際環向及縱向金屬肋、底環和屋面，不是一個無細節半球。夜間只作低量冷色肋線及玻璃補光，沒有假稱已重現官方周末／假期變色燈光時序。
- 基座及真實入口：低層採深色多層玻璃及七支向內傾斜的銀色圓柱，呼應官方街景中的厚帶和高柱。OSM **node 10199055644 v1** 標有 `entrance=yes`，位於 source edges **30／31** 的共同頂點，world 座標 **(925.1101339689501, -4106.252831228634)**；入口 frame 採兩邊平均外法線 **(0.5515105172878662, -0.8341679383198987)**。模型在此設高玻璃辦公大堂、門及門柄、薄玻璃雨篷、銀框、暖色內牆及 `LANGHAM PLACE / OFFICE TOWER` 標誌；雨篷寬 **12 m**、高 **5.4 m**、front **2.4 m** 是視覺控制，不是實測圖則。沒有把商場 grand atrium、酒店 drop-off 或搜索錯配的其他大廈入口套進來。
- 地面、碰撞及道路：raw DTM 施工地台為 **5.436054588567316 m**，plaza 面抬高 **0.12 m**，不是已核實的入口工程標高。**49 條塔身邊**各自按所屬屋面高度設 OBB collider，圓頂、基座柱、雨篷及入口框架另有碰撞，避免在較低屋面之上留下全高隱形牆。精確塔身 ring 沒有道路或 clearance 後街燈衝突；砵蘭街 way **39362** 最近中心線距離 **7.0461498511359855 m**（寬 5.2 m），上海街 ways **24913／24915** 分別為 **9.443641685155102／9.463253287955508 m**（寬 11.6 m），亞皆老街 way **9596** 為 **13.364284747120166 m**（寬 18 m）。真實入口前庭同樣無道路／街燈衝突，因此沒有搬路、搬燈或改白色標線。
- 研究照片及資產：實際查看 Wong & Ouyang 官方辦公塔外觀、Value Properties 街景、高空照片及 Wikimedia／PBase 日夜候選圖；只用可確認為辦公塔的內容研究弧形立面、兩道灰帶、圓頂、基座柱及夜間水平線光。研究照片沒有打包進應用程式，模型不使用照片貼圖或下載 GLTF；AIA、其他旺角大廈、商場內部及酒店入口的錯配圖均不作本幢立面證據。
- 實際驗證：最終 Chromium／WebGL build 在 **960×640** 實看上海街及砵蘭街方向全塔、冠頂、灰色帶、基座、精確入口的日景，以及全塔、冠頂、灰色帶、入口夜景，共 **10 views**。scene 為 **14 landmarks／0 generic buildings**；本幢 **26 meshes、345,023 vertices、166,439 triangles、62 colliders、5,227 塊藍玻璃、396 塊灰色玻璃、40 段圓頂及 7 支基座柱**，全部 collider 已接入 world。raw 前庭及入口的 person ground 均為 **5.556054588567316 m**，所選亞皆老街車路取樣為 **5.757903275043126 m**，道路沒有被 plaza 覆蓋。`controllerManager` 實際行人及車輛撞向 source edge 36，最終離立面 clearance 分別 **0.905／2.605 m**；`geometryIssues=0`、`badColliders=0`、page exception／Three.js shader error 均為 **0**。只有已知的 Google Fonts 外部 request 失敗及 4 個 GL performance warnings；日夜材質、完整 14-landmark 場景、地形及碰撞均通過。專用 Node 測試 **15／15**，全套 **368／368 pass**。

### 參考資料

- OSM 辦公塔、目前 API 幾何及入口 node：https://www.openstreetmap.org/way/65259283
  https://api.openstreetmap.org/api/0.6/way/65259283/full.json
- CTBUH／CVU：255.1 m architectural／to-tip、59 above-ground／5 below-ground、65,868 m²、2004、office、all-concrete、Wong & Ouyang、Arup 及 façade／elevator 團隊：
  https://www.skyscrapercenter.com/building/langham-place-office-tower/809
- Wong & Ouyang 官方項目及辦公塔照片；57-storey office 的另一種發展描述、約 66,000 m²、10-storey grand atrium，以及本幢採用的外觀依據：
  https://www.wongouyang.com/projects/langham-place-hong-kong/
- Wikipedia 次要 convention：255.1 m roof、59＋5、1999／2004、Jerde＋Wong & Ouyang，以及藍玻璃、兩道灰色間隔和圓頂夜燈描述：
  https://en.wikipedia.org/wiki/Langham_Place_(Hong_Kong)
- Wikimedia Commons 外觀分類及實際查看的上海街／夜間候選圖，只作外觀研究，沒有打包：
  https://commons.wikimedia.org/wiki/Category:Exterior_of_Langham_Place,_Hong_Kong

## 御峰 The Summit

- 地點及來源：司徒拔道 41C 號，採目前 **OSM way 65257281 version 9** 的 **64 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `summit-architecture.js`。minimum-area OBB 中心為 **(2480.1916635285093, 1802.6617586407342)**，定向尺寸 **34.26816106655042 × 18.55579374716308 m**，`ry=-0.019566131082668026`。模型保留蝶形雙翼、中央凹口及南向服務尾翼，沒有把半山土地用途範圍或附近 Highcliff 當成御峰塔身。
- 高度、層數、面積及年份分列：OSM 為 **220 m／69 levels／residential**。CTBUH／CVU 為 **219.8 m architectural＝219.8 m to-tip、69 above-ground／2 below-ground、15,225 m² Tower GFA、3 部升降機、1996 construction start／2002 completed、residential、all-concrete**；design architect 為 **DLN**，developer 為 Hang Lung Group，結構工程為 Maunsell AECOM／Skilling Ward Magnusson Barkshire，幕牆顧問為 Far East Aluminum Works。Wikipedia 次要 convention 為 **65 storeys、1999 start／2001 completed、219.8 m roof**。各組資料獨立保存，沒有平均、取整或把 65 層改寫成另一個來源的 69 層；模型最高點採 CTBUH **219.8 m**。
- 蝶形綠色立面：依 Building Journal 的蝶形平面、緩弧立面、**screw-on metal panels＋curtain wall** 及綠色調說明，配合實看的雙塔日間照片，建立雙弧形綠玻璃、細鋁直棂／逐層橫帶、深色中央凹口，以及南翼綠灰金屬板。主牆由 **18–211 m**，採 **65 道視覺 shaft courses**；連同四層基座是與 69 層來源相互對應的視覺分層，不是已測量室內樓層。項目報道的典型 **3.3 m floor-to-floor**、客廳雙層高 **20 ft** 及每層兩個 duplex 只作設計背景，沒有假稱外牆每道分格已重建室內複式剖面。
- 雙翼冠頂及水缸：主屋面 **211 m**；四個照片導向區為西翼 **216.8 m**、中央 saddle **211 m**、東翼 **219.8 m**、南向服務尾翼 **212.6 m**。這四個分區高度是模型造型控制，**不是四個獨立測量值**。弧形金屬冠頂有水平百頁、coping、屋面及高差封邊；中央 saddle 另依項目報道的屋頂分隔水缸資料加入四個視覺分格及框架，數量與尺寸不是工程圖則。最高東翼不大於來源 **219.8 m**（只存在 Float32 渲染誤差）。未取得可核實專項夜間燈飾照片，因此沒有自行加入霓虹、冠頂燈帶或官方燈光時序。
- 弧形 podium 及 Happy Valley 入口：基座採原 ring 的 **1.08 倍**照片導向外挑、**18 m** 高四層弧形玻璃及銀色橫帶，頂部有 lawn、玻璃欄杆及向塔身延伸的細柱；這些比例不是實測尺寸。項目報道支持 podium 頂 lawn，以及由俯瞰 Happy Valley 的 terrace 進入主大堂，因此選 podium-scaled source **vertex 17／node 797836721** 作模型入口，world 座標 **(2480.241178339267, 1792.6406806278126)**、約正北向。該 OSM node **沒有 `entrance` tag**，所以這是有資料支持的模型定位，不是已核實門節點。入口有玻璃大堂、門及門柄、薄玻璃雨篷、偏側幼柱、暖色燈及 `THE SUMMIT / 41C STUBBS ROAD` 字牌；12 m 前庭、10 m 雨篷、4.85 m 高度及 2.3 m 外伸均為視覺控制。
- 地面、道路及碰撞：raw DTM 施工地台為 **142.56601499466683 m**，plaza 面為 **142.68601499466683 m**，不是已核實道路或入口工程標高。塔身及 podium 各有 **64 條逐邊 OBB colliders**，屋面水缸、入口雨篷、柱及門牆另有碰撞。私人 driveway **OSM way 93073565** 對應生成道路 array **record index 37050**；index 不是 OSM way ID。原 5.5 m 車路邊緣侵入 tower／podium，因此按建築物優先，保留起點及接入方向，只把終點由 **(2467.7,1803.7)** 縮至 **(2466.1,1805.4)**，約 1.6 m。生成器以完整 record signature 保留同一修正，目前生成資料亦同步；調整後塔身、podium、入口前庭均無車路或 clearance 後街燈衝突，白色路面線及全港交通 graph 繼續由同一道路資料生成。
- 日夜及資產：日間玻璃保持綠色反射、金屬板不發光；夜間只有少量住宅窗、 podium 窗及入口暖光，沒有把整幢塔做成均勻發光盒。實際查看 CTBUH／DLN 外觀及 Wikimedia 雙塔照片辨認左右主體，剔除 Opus、Peak Hotel、室內及 Happy Valley 景觀錯配圖。研究照片沒有打包進應用程式，模型不使用照片貼圖或下載 GLTF。`hk-summit.com` 是第三方售樓頁，不是官方網站；其另一種 70 層口径及可能經電腦修飾的圖片沒有取代上述來源。
- 實際驗證：最終 Chromium／WebGL build 在 **960×640** 實看北／南全塔、冠頂、立面、podium、入口日景，以及全塔、冠頂、podium、入口夜景，共 **10 views**。scene 為 **15 landmarks／0 generic buildings**；本幢 **26 meshes、163,318 vertices、75,288 triangles、136 colliders、3,965 塊主牆玻璃、1,885 塊金屬面板、300 塊 podium 玻璃及四個水缸視覺分格**，全部 collider 已接入 world。中心及入口 person ground 均為 **142.68601499466683 m**；driveway 起點／修正終點的車輛 ground query 分別為 **156.68142857142772／149.46871576567585 m**，沒有被 plaza 高度覆蓋。`controllerManager` 實際逐步驅動行人及車輛撞向南面 podium 長邊，最終法線距離分別 **0.905／2.605 m**。`geometryIssues=[]`、`badColliders=[]`；最高渲染點為世界 **362.36601804642464 m**，扣地台約 **219.80000305175781 m**，差值是 Float32 頂點精度。page exception／Three.js shader error 均為 **0**，只有既有 Google Fonts 外部 request 失敗及 4 個 GL performance warnings。專用 Node 測試 **5／5**，相關地形、道路、交通及街燈整合測試 **67／67 pass**；道路 source-signature 對照及高架台帳重建測試 **7／7**，完整 `node --test tests/*.test.cjs` 為 **373／373 pass**。

### 參考資料

- OSM 塔身及目前 API 幾何：https://www.openstreetmap.org/way/65257281
  https://api.openstreetmap.org/api/0.6/way/65257281/full.json
- CTBUH／CVU：41C Stubbs Road、219.8 m architectural／to-tip、69＋2、15,225 m²、3 升降機、1996／2002、all-concrete、DLN、Hang Lung、結構／幕牆團隊及建築外觀照片：
  https://www.skyscrapercenter.com/building/the-summit/1267
- Building Journal March 2003 項目報道：蝶形平面、緩弧立面、screw-on metal panels＋curtain wall、綠色調、54 個複式、3.3 m／20 ft 樓層背景、podium lawn、Happy Valley lobby terrace 及屋頂分隔水缸：
  https://building.com.hk/feature/05_03summit.pdf
- Wikimedia Commons 實看日間雙塔圖；御峰是左側較寬、雙弧形綠玻璃塔，右側細長白／藍塔是 Highcliff：
  https://commons.wikimedia.org/wiki/File:HK_Stubbs_Road_Highcliff_n_The_Summit.JPG
- Wikipedia 次要 convention：65 storeys、1999／2001、219.8 m roof；沒有與 CTBUH 的 69 層、1996／2002 合併：
  https://en.wikipedia.org/wiki/The_Summit_(Hong_Kong)
- 第三方售樓頁，只作 54 複式、20 ft 客廳樓底及入口／外觀的輔助核對；不是官方網站，其 disclaimer 亦說明圖片可能為想像或經電腦修飾：
  https://www.hk-summit.com/

## 合和中心 Hopewell Centre

- 地點及來源：皇后大道東 183 號，採目前 **OSM way 88391069 version 11** 的 **41 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `hopewell-architecture.js`。minimum-area OBB 中心為 **(1235.5292258979, 800.5136217406646)**，定向尺寸 **45.54252657121617 × 45.70628985749818 m**，`ry=1.2546400529770054`；近圓形使 minimum-area 方向本身不是立面朝向依據。模型使用原圓柱塔身，不把灣仔土地用途範圍或附近大廈當成合和中心 footprint。
- 高度、層數、面積及年份分列：OSM 為 **216 m／63 levels／building:min_level=13／layer=2**；Zolima CityMag 亦記 **216 m**。CTBUH／CVU 為 **222 m／64 floors／111,000 m² Tower GFA、1977 construction start／1981 completed**，並列 WMKY Limited、Arup Associates 及 Schindler。官方項目頁採 **66-storey／約 840,000 sq ft**，用途包括 office、shopping arcade 及 carpark。各組數值沒有平均、取整或合併；主圓頂採 **216 m**，照片中外置升降機及字牌的最高點採 **222 m**，兩者的模型分配是視覺詮釋，不是另行測量的屋面工程標高。
- 圓柱辦公立面：依官方圓形設計、column-free office floor 說明及實看日間／高空照片，建立深色橫向玻璃窗帶、古銅色 spandrels、**41 支主白色直 fins＋41 支較細中間 fins**，而非均勻發光玻璃盒。主牆由 **34–184 m**，使用 **50 道、每道 3 m 的視覺辦公 courses**；34 m podium、3 m course 和窗格尺寸是照片導向造型控制，不是把 OSM `min_level=13` 換算成假精確米數，也不是室內樓層測量。
- 旋轉餐廳及屋頂泳池：塔頂用五段深色弧形玻璃、較粗白色水平帶及短直 fins 形成官方／Zolima 所述 revolving restaurant 和層疊冠頂。主屋頂甲板為 **215.58 m**、外圈 coping 到 **216 m**；依高空照片加入中央 **4.35 m 半徑**圓形泳池、深色池邊及 **8.6 m 外半徑**古銅色環形甲板。這些半徑及分段高度是照片比例控制，不是工程測量；沒有把錯配的 Kennedy Town Swimming Pool 圖片當本幢證據。
- 外置觀光升降機：依日間照片及 Zolima 的 express lift 描述，在 source **vertex 0** 的南向位置建立獨立深色玻璃井道、白色雙導軌、橫框、弧形白色觀光艙及紅色 `HOPEWELL／合和中心` 字牌，最高 **222 m**。該位置是照片導向選點，原始資料沒有獨立測量井道座標；升降機不取代圓柱塔身，也沒有複製到其他大廈。
- 米色 podium 及百頁：低層保留原圓柱外框，以米色石牆、直向棕色百頁、off-white piers 及多道水平帶形成 blocky commercial podium 的可識別材質；QRE 正面另有外挑米色百頁牆及斜撑深色雨篷。基座碰撞由地台下 **20 m** 開始以埋入北側較低的自然斜坡，這只是防止粗 DTM 穿牆及由牆底走入的模型底座，不是已核實地下室深度。
- 兩個真實入口節點：QRE 使用 OSM **node 1026827584／source vertex 29**，tags 為 `entrance=yes`、`exit=yes`、`access=yes`、`level=2`、`level:ref=3`，world **(1212.566515120296, 799.7770102975186)**；建立 183 門牌、中英名、玻璃門、雙扶手電梯、實體斜床／上下平台、斜撑雨篷及暖光。堅尼地道使用 **node 12419988600／source vertex 34**，`level:ref=17`、門牌 17，world **(1215.256298057911, 811.2712094899398)**；另建石門套、玻璃門、雨篷及地址字牌。兩個入口沒有被套成同一地面標高或一式一樣模板。
- 山坡地形及地面查詢：QRE source node 的 raw DTM **37.73671751692041 m** 只作全幢相對施工 datum；QRE 上平台 **37.856717516920405 m**、下平台 **35.456717516920406 m**，中間以連續扶手電梯 ground field 連接。堅尼地道 raw DTM＋0.12 m 為 **42.35839206414999 m**。塔身中心仍保留 raw DTM **32.32825022725507 m**，沒有把整個圓柱壓成單一平地；所有數值都是可追溯 DTM／模型地面，不是已核實道路或入口工程標高。
- 道路、街燈及碰撞：塔身及 podium 各有 **41 條逐邊 OBB colliders**，外置升降機、兩個入口門牆、雨篷、柱及 QRE 上層百頁牆另有碰撞。以全港道路中心線及車道半寬掃描精確圓柱、QRE 上／下前庭、堅尼地道前庭及升降機外框，五者均無車路或 clearance 後街燈衝突，因此沒有搬路、搬燈、改白色標線或搬歪建築；所選道路繼續優先於入口地台高度。
- 日夜及資產：日間保持深灰／棕色玻璃、白色混凝土 fins、米色 podium 及古銅百頁；夜間只有部分辦公窗、餐廳窗及入口暖光，沒有未經照片核實的整座霓虹或泳池燈飾。研究時實看日間外觀、QRE 入口及高空屋頂照片，剔除室內 lobby 作外牆證據及 Kennedy Town Swimming Pool 錯配圖。研究照片沒有打包，模型不使用照片貼圖或下載 GLTF；中英字牌所需八個中文字以程式筆畫繪製，避免無 CJK 字體的瀏覽器顯示方塊。
- 實際驗證：最終 Chromium／WebGL build 在 **960×640** 實看 QRE／升降機方向及東北方向全塔、冠頂與泳池、辦公立面、QRE 扶手電梯入口、堅尼地道入口日景，以及全塔、餐廳冠頂、QRE、堅尼地道夜景，共 **10 views**。scene 為 **16 landmarks／0 generic buildings**；本幢 **36 meshes、140,027 vertices、66,173 triangles、92 colliders、4,100 塊辦公玻璃、82 支直 fins、1,580 支 podium 百頁**，全部 collider 已接入 world。raw 塔身中心 **32.32825022725507 m** 經既有 land surface offset 後的 person ground 為 **32.24825022725507 m**；QRE 上平台、扶手電梯中點及堅尼地道 ground 分別 **37.856717516920405／36.65671751692035／42.35839206414999 m**，鄰近所選車路取樣 **44.002372892331856 m**，沒有被入口平台覆蓋。`controllerManager` 實際逐步驅動行人及車輛撞向北面 source edge 20，最終法線距離 **0.94／2.64 m**，分別對應 0.48 m 人體半徑／2.18 m 車身半長加 0.46 m 牆厚半值，不能穿牆。`geometryIssues=[]`、`badColliders=[]`；主屋頂最高渲染點 **253.7367175169204 m**，扣 datum 為 **216 m**；外置升降機／字牌最高渲染點 **259.7367175169204 m**，扣 datum 為 **222 m**。page exception／Three.js shader error 均為 **0**，只有既有外部 resource `ERR_CONNECTION_CLOSED`。專用架構／材質測試 **4／4**、道路及街燈測試 **2／2**，完整 `node --test tests/*.test.cjs` 為 **379／379 pass**。

### 參考資料

- OSM 圓柱、目前 API 幾何及兩個入口 nodes：https://www.openstreetmap.org/way/88391069
  https://api.openstreetmap.org/api/0.6/way/88391069/full.json
- 合和實業官方項目頁：183 Queen’s Road East、QRE／Kennedy Road 兩個主要入口、66-storey、約 840,000 sq ft、office／shopping arcade／carpark、圓形及 column-free office floor，以及項目照片：
  https://www.hopewellholdings.com/eng/hhl_hopewell_centre.htm
- CTBUH／CVU：222 m、64 floors、111,000 m² Tower GFA、1977／1981、WMKY Limited、Arup Associates、Schindler：
  https://www.skyscrapercenter.com/building/hopewell-centre/1325
- Zolima CityMag：216 m、blocky commercial podium、完美圓柱、revolving restaurant、外置 express lift、直向 façade fins、Kennedy Road 17 樓入口及圓形屋頂泳池：
  https://zolimacitymag.com/hong-kongs-modern-heritage-part-viii-the-hopewell-centre/
- 日間外觀及 QRE 入口候選照片頁，只作外觀研究，沒有打包：
  https://www.tripadvisor.com/Attraction_Review-g294217-d593187-Reviews-Hopewell_Centre-Hong_Kong.html

## 新鴻基中心 Sun Hung Kai Centre

- 地點及來源：港灣道 30 號、灣仔北，採目前 **OSM way 107497703 version 7** 的 **16 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `sun-hung-kai-architecture.js`。minimum-area OBB 中心為 **(1786.7784910621674, 173.91897159900114)**，定向尺寸 **48.15195521150213 × 32.5409409095401 m**，`ry=0.09258241307825177`。四條主立面之間的短切角全部保留，沒有用土地用途範圍、附近 China Resources Building 或理想長方盒取代塔身。
- 高度、層數、面積及年份分列：OSM 為 **215 m／57 levels／layer=3**；`layer=3` 不是高度或樓層。CTBUH 現況頁採 **214.5 m／56 floors／83,984 m² Tower GFA／all-concrete**，並把 **1991** 列在現況紀錄；業主官方頁採 **53-storey／逾 800,000 sq ft**，並說明這是 SHKP headquarters。BEAM 項目摘要另記 **215 m／53 floors／first completed 1981**；舊 CTBUH 搜尋摘要及 Emporis 分別提供 **193 m／51 floors**、1981 落成及 1991 加五層的舊塔／翻新背景。模型最高點採 **214.5 m**，不把 1991 說成最初落成，也不把上述高度、層數或面積平均、取整或合併。
- 深棕玻璃及石材角牆：依實看日景、近景及夜景，在四條 source-derived 主立面建立深棕／古銅反光玻璃、密集細豎框和橫框，在十二條短邊及角位建立通高淺色石材 piers；日間不是純黑盒，夜間角牆有低亮度冷白補光。全幢 **5,916 塊辦公玻璃、1,024 塊石材面板、120 支主豎框**均有實際幾何，夜間只有稀疏暖色辦公窗，沒有套用中銀斜架、中環廣場金字塔或合和圓柱。
- 加建及樓層視覺控制：以 **18 m podium、193 m 舊塔高度控制、46 道下段＋5 道上段＝51 道視覺幕牆 courses** 表現照片所見立面分段；這些 courses 不是 OSM 57、CTBUH 56、官方 53 或舊塔 51 的任何一種實體樓層計法。主玻璃頂 **211.5 m**、parapet／coping **212.4 m**，均屬照片導向模型控制，不是測量圖則。
- 平屋頂及標誌：屋頂沒有任意尖頂或天線；依照高空照片加入三個有百頁的低矮機房、兩個衛星碟及基座，最高機房止於 **214.5 m**。南／東兩條主立面近頂部各有方形 **SHK** monogram，S、H、K 均用 Canvas 向量字重建，沒有變成只有 S 的通用標誌。機房、碟及字牌尺寸是視覺比例，不是設備工程圖。
- 港灣道入口及厚重 podium：目前 OSM way 沒有 entrance-tagged node，因此入口明確標為**照片導向**：取 source **edge 9** 中點，向外投影 **4.8 m**，world **(1788.7474929603632, 194.89327626029163)**。入口有 **26 m 寬、18–44 m** 的斜玻璃 atrium、14×6 玻璃分格、金屬 grid 及石材 cheeks；4.7 m 水平後退、雙層商業玻璃、粗石柱、種植槽、門框和雨篷都是依照片整理的視覺尺寸，不是實測入口。厚重 fascia 上有 SHK 標誌、`SUN HUNG KAI CENTRE`、門牌 30 及自繪五個中文字「新鴻基中心」，避免極簡瀏覽器缺 CJK 字體時出現方塊。
- 有蓋服務車路：西側道路完整保留 **OSM way 1184418781**，其 tags 包括 `covered=yes`、`highway=service`、`lanes=2`、`oneway=yes`；生成道路 **record 48641** 的 8.4 m 雙線 record、generator 及白色標線均未修改。為符合這項來源而不是把車路藏在玻璃盒內，podium 地面層採開敞 porte-cochere；上層外牆碰撞由 **7.2 m** 開始，塔身由 **18 m** 開始，西側三支地面柱向內退 **4.8 m**，以最保守旋轉外接半寬計算仍連柱身完全退出 8.4 m 車路；東側柱及港灣道入口自有門牆／柱碰撞。7.2 m 是場景通車淨空控制，不是實地工程測量。
- 地形及地面查詢：以港灣道入口 raw DTM **5 m** 作施工地台，plaza 面為 **5.12 m**；這不是已核實道路工程標高。ground query 只抬高未被選取道路的塔身、podium 及入口前庭，有蓋車路取樣仍為 **5.025 m**，附近南側車路為 **4.92 m**，沒有被 plaza 覆蓋。
- 日夜及資產：日間保留深棕玻璃、古銅框、淺色切角石牆及藍灰斜玻璃；夜間有低量辦公窗、亮石角、頂部標誌、暖色商業 podium 和柔和 atrium 內光，沒有未經核實的整座 LED 動畫。研究時實看官方／Commons 日景、屋頂、港灣道入口及夜景；已排除 OneDay 的 Overseas Trust Bank Building／China Resources Building、Harbour Road Sports Centre、室內景觀及中區通用鳥瞰等錯配圖。研究照片沒有打包，模型不使用照片貼圖或下載 GLTF。
- 實際驗證：最終 Chromium／WebGL build 在 **960×640** 實看港灣道及維港方向全塔、屋頂機房／加建、玻璃與石角、斜玻璃入口、有蓋西側車路日景，以及全塔、頂部標誌、入口及車路夜景，共 **10 views**。scene 為 **17 landmarks／0 generic buildings**；本幢 **28 meshes、55,542 vertices、20,922 triangles、57 colliders**，全部 collider 已接入 world，`geometryIssues=[]`、`badColliders=[]`。大廈中心及入口 person ground 均為 **5.12 m**；最高渲染點為世界 **219.5 m**，扣地台為 **214.5 m**。`controllerManager` 實際驅動行人及車輛撞向入口玻璃門牆，最終法線距離 **0.65／2.3539892165 m**；兩輛測試車分別沿西／東車道中心由有蓋段內起步，各直駛 **96.4016503385 m** 並穿出南側，沒有被 podium 牆或柱封住。page exception／Three.js shader error 均為 **0**，只有既有外部 resource `ERR_CONNECTION_CLOSED`。專用架構／材質測試 **4／4**、道路及街燈測試 **2／2**，完整 `node --test tests/*.test.cjs` 為 **385／385 pass**。

### 參考資料

- OSM 塔身、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/107497703
  https://api.openstreetmap.org/api/0.6/way/107497703/full.json
- 保留的有蓋服務車路：https://www.openstreetmap.org/way/1184418781
- 新鴻基地產官方項目頁：30 Harbour Road、SHKP headquarters、53-storey、逾 800,000 sq ft Grade A office 及灣仔北位置：
  https://www.shkp.com/en-US/our-business/hong-kong-properties/offices/sun-hung-kai-centre
- CTBUH／CVU 現況：214.5 m、56 floors、83,984 m² Tower GFA、all-concrete、1991 現況紀錄及 Otis：
  https://www.skyscrapercenter.com/building/sun-hung-kai-centre/1363
- 舊 CTBUH 搜尋摘要的 193 m／51 floors，以及 Emporis 的 1981／1991 加五層、dark brown curtain wall 背景；兩者只作分列的舊塔／翻新資料：
  https://www.skyscrapercenter.com/building/sun-hung-kai-centre/18352
  https://www.emporis.com/buildings/121056/sun-hung-kai-centre-hong-kong-china
- BEAM 項目摘要：215 m、53 floors、first completed 1981；沒有把項目團隊名單未經核實地全部標成原設計團隊：
  https://greenbuilding.hkgbc.org.hk/projects/view/187
- 香港旅遊發展局：30 Harbour Road、官方商場連結及外觀／podium 照片：
  https://www.discoverhongkong.com/eng/place-to-go/travel.guide-sun-hung-kai-centre.html
- Wikimedia Commons 外觀及夜景分類，用於核對深棕格網、淺色角牆、平頂設備、斜玻璃、厚重 podium、SHK 中英字牌及夜間亮角：
  https://commons.wikimedia.org/wiki/Category:Sun_Hung_Kai_Centre

## 太古廣場二座／港島香格里拉 Two Pacific Place／Island Shangri-La

- 地點及來源：金鐘道 88 號，採目前 **OSM way 41498695 version 14** 的 **24 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `two-pacific-place-architecture.js`。minimum-area OBB 中心為 **(497.04534573313845, 521.911565590797)**，定向尺寸 **88.5816189191869 × 42.764852508730144 m**、面積 **3788.179868063567 m²**，`ry=-1.197150254305616`。同一精確 ring 用來表現下部 Two Pacific Place 辦公及上部 Island Shangri-La 酒店，沒有把 Pacific Place 土地用途範圍、商場或 Conrad 當成塔身。
- 高度、層數及用途分列：OSM 為 **213 m／57 levels**；CTBUH 為 **213.1 m architectural／to-tip、197.8 m occupied、57 floors、1986 動工／1991 落成**。Swire 只把下部辦公用途列為 **27 office floors／逾 695,000 sq ft**；Wong & Ouyang 另述酒店塔在 podium 上 **50 storeys**；酒店官方現頁採 **56 floors／544 rooms and suites**。各組數值沒有平均、取整或互相取代；模型最高點採 **213.1 m**。
- 橢圓曲面及白帶：依建築師所述 elliptical tower 及實看正確塔身照片，保留 24 邊近似曲面的長弧與短弧，不用長方盒替代。長弧採連續浅色水平帶、藍灰反光玻璃及細豎框，四條端部短弧採較深藍玻璃與較細橫帶，並以白色轉角 piers 分區。全幢有 **7,850 塊獨立玻璃、1,224 道橫帶、181 支主豎框**；主立面的 **0.82 m** 橫帶和 **1.35 m** 目標窗寬是照片導向視覺控制，不是幕牆工程尺寸。
- 樓層視覺控制：以 **24 m podium、50 道視覺 courses（27 office＋23 hotel）** 組織立面，主玻璃到 CTBUH occupied **197.8 m**；這只是相片導向分格，不把 Swire 27 層當成整塔層數，也不假稱 50 courses 是實體樓層測量。地面商業玻璃另有 **233 個橫豎框**，日間可見框架，夜間只有低量暖光。
- 冠頂、字牌及屋頂：occupied 標高以上先作深色機電百頁，再由照片導向 **203.1 m** 起作白色弧形 fascia 到 **213.1 m**；沒有把 197.8、203.1 說成來源核實的屋面分段。長弧冠頂有正確方向的金色 `Shangri-La` 曲面向量字牌，日夜均可讀。 parapet 內有屋面甲板、三個低矮機房及六個風扇；設備尺寸是視覺詮釋而非工程圖。
- 酒店入口：依 Wong & Ouyang 的獨立 porte-cochere 說明、酒店第六層車道背景及入口相片，在 source **edge 4** 中點外投 **4 m** 建立酒店 arrival frame；這不是偽造的 OSM entrance node。雨篷有金色 `ISLAND SHANGRI-LA` 字牌、四道玻璃門、石柱、暖色 soffit、花槽及種植。入口 raw DTM＋0.12 m 為 **36.18290299409062 m**，與辦公入口不共用假平地。
- 辦公入口：依 88 Queensway 地址及 podium 相片，在 source **edge 16** 中點外投 **4 m**，建立另一個玻璃門牆、雨篷、門框及暖光大堂，並有 `TWO PACIFIC PLACE`、自繪「太古廣場二座」及 `88 QUEENSWAY`。入口 raw DTM＋0.12 m 為 **27.157740721831654 m**；前庭用 **2.2 m** 實心基座接入山坡，避免薄片地台漂浮。兩個入口的位置和尺寸均屬相片／site-plan 導向，不是實測門樓圖則。
- 道路及淨空：精確塔身、酒店前庭及辦公前庭都沒有道路衝突；只有 **1.06 倍照片導向 podium ring** 與生成道路 **record 49182** 的兩段相交，對應 **OSM way 1206722419**。原 way 只有 `highway=service`、`service=driveway`、`layer=1`，沒有當成已核實高架橋。原道路完整保留，地面玻璃及 **24 支柱**收在無車路衝突的塔身 ring，外挑 podium 由地台上 **12 m** 開始；對兩段實際渲染道路最高點保留 **5.374504722694418 m** 場景淨空，超過 **4.5 m** 車輛控制值。這是模型淨空，不是實地工程測量。
- 地形、街燈及碰撞：塔身 raw DTM datum 為 **29.794768780862512 m**，外挑 podium 不做平地貼片；塔身、酒店及辦公各自使用可追溯 DTM 地台，所選車路仍優先於入口高度。四個建築掃描範圍都沒有 clearance 後街燈。全幢 **111 個 colliders** 包括塔身、外挑 band、地面玻璃、柱、屋頂設備及兩個入口，全部接入 world。
- 日夜及資產：日間保留藍灰玻璃、白色預製帶、銀框及金色字牌；夜間白色橫帶有低亮度冷光，辦公窗比酒店窗更稀疏，兩個入口只發暖光，沒有把整座做成均勻發光盒。研究時實看正確塔身、crown、入口及車道候選圖，排除 Conrad、Upper House、Three Pacific Place、商場中庭及客房室內等錯配圖。研究相片沒有打包，模型不使用照片貼圖或下載 GLTF。
- 實際驗證：最終 Chromium／WebGL build 在 **1100×760** 實看東北／西南全塔、曲面冠頂、屋頂設備、立面近景、酒店及辦公入口、service driveway 日景，以及全塔、冠頂、兩個入口及車路夜景，共 **13 views**；酒店兩個视角補拍後再次實看，字牌、四道門及柱均無遮擋。scene 為 **18 landmarks／0 generic buildings**；本幢 **36 meshes、103,806 vertices、44,466 triangles**，`geometryIssues=[]`、`badColliders=[]`，全部 **111 colliders** 已接入 world。最高渲染點為世界 **242.89477488437814 m**，扣 datum 為 **213.10000610351562 m**，差值是 Float32 精度。中心／酒店／辦公／driveway ground 分別 **29.914768780862513／36.18290299409062／27.157740721831654／35.28633548673981 m**。`controllerManager` 實際驅動行人及車輛撞向兩個入口門牆，兩者的法線距離均為 **0.65／2.353989216526 m**；測試車沿保留 driveway 雙向實駛 **21.412597930082715／22.12677046131424 m**，沒有被牆或柱封死。page exception／Three.js shader error 均為 **0**，只有既有外部 resource `ERR_CONNECTION_CLOSED`。專用架構、地形、道路、街燈及 collider 測試 **7／7 pass**，完整 `node --test tests/*.test.cjs` 為 **392／392 pass**。

### 參考資料

- OSM 塔身、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/41498695
  https://api.openstreetmap.org/api/0.6/way/41498695/full.json
- 保留的 service driveway；`layer=1` 沒有被解讀成已核實橋樑：https://www.openstreetmap.org/way/1206722419
  https://api.openstreetmap.org/api/0.6/way/1206722419/full.json
- Swire Properties 官方 Two Pacific Place：88 Queensway、27 office floors、逾 695,000 sq ft／64,500 m² 下部辦公 GFA：
  https://www.swireproperties.com/en/portfolio/current-developments/pacific-place/two-pacific-place/
- Wong & Ouyang 官方 Pacific Place 項目頁：elliptical twin towers、酒店塔在 podium 上 50 storeys、酒店位於下部辦公樓上及獨立 porte-cochere：
  https://www.wongouyang.com/projects/pacific-place/
- CTBUH／CVU 正確單幢 Shangri-La Hotel：213.1 m、197.8 m occupied、57 floors、1986／1991 及 Wong & Ouyang；沒有再用錯樓 `/1365`：
  https://www.skyscrapercenter.com/building/shangri-la-hotel/1379
- CTBUH Pacific Place complex，只用來區分 Conrad、Three Pacific Place、JW Marriott／Upper House 及 One Pacific Place：
  https://www.skyscrapercenter.com/complex/393
- 港島香格里拉官方現頁：56 floors、544 rooms and suites、8 restaurants and bars，以及酒店入口／車道背景：
  https://www.shangri-la.com/hongkong/islandshangrila/

## AIRSIDE

- 地點及來源：協調道 2 號，採目前 **OSM way 1212412229 version 9** 的 **63 個獨立頂點**；原始 WGS84 geometry、完整 tags、版本、changeset 及 ODbL attribution 保存在 `airside-architecture.js`。整個 commercial complex 外環不是單塔 footprint。主塔局部框架由 source vertices **36→42→43** 推導，寬深 **49.14934426296074 × 44.5461924655298 m**，另用精確正交軸保存所有來源座標；內部五區分界是相片導向裁剪，不是工程分層圖。
- 高度、層數及落成日期分列：OSM／Snøhetta 為 **213 m／47 層**，OSM 另有地下 **4 層**；CTBUH 為 **207.1 m architectural／to-tip、189.5 m occupied、43 floors、地下 4 層、2022 completed**。項目對外開放日期另為 **2023-09-28**；建築報道所述第二體量 **18 levels**、零售 **9 層**也獨立保留。各組數值沒有平均、取整或互相取代，模型主塔最高點採 **213 m**。
- 五個 interconnected volumes：以精確外環裁剪主塔、第二塔、中央 atrium、中間體量及向啟德河降低的南端體量；中間區有兩個有效 polygon，因此是 **5 zones／6 upper rings／8 curtain-wall sections**，不是把整個地盤拉成一根塔。主塔四角採照片導向 **2.4 m chamfer**；OSM `roof:direction=201.93`、`roof:height=13` 用於實際削角頂點的斜屋面，最高／最低為 **213／200 m**。第二塔及其他低層體量的高度只作照片導向體量控制，不冒充實測工程標高。
- 立面及材料：依 Snøhetta／建成照片製作藍灰及銀色 curved fluted glass、下段平玻璃、斜向厚 reveal、成組金屬百頁、四種 fin depths、弧形橫框及斜冠頂。全幢有 **23,126 塊玻璃（16,857 fluted／6,269 flat）、475 個百頁面板、26,115 道框架、859 支 fins**；主塔 **38 courses**、第二塔 **9 courses**是立面視覺分格，不是把不同來源樓層合成新層數。夜間 fins 以低亮度冷色線光表現 media canvas，玻璃只有稀疏暖光，不用均勻發光盒。
- 辦公入口：保留 OSM source vertices **40／41**、nodes **13788270483／11228949741** 的 `entrance=main`／`entrance:use=office` 位置，兩組門各自有门框、門柄及玻璃；共享雨篷、深色字牌背板、圓柱及線性 soffit 燈是照片導向設計，沒有假稱為 OSM 門樓。`AIRSIDE / OFFICE · 2 CONCORDE ROAD` 日夜均清晰，不被白色 canopy 遮住。
- 商場入口：使用 source **vertex 6／node 11232828740** 的 `entrance=yes`、`abutters=retail`、`level=0`，world 座標 **(4003.695527153193, -5400.0921588462115)**；這是零售入口，不是「第二座塔入口」。模型有高玻璃 atrium、四道門、門柄、雨篷、暖光及帶深色背板的 `AIRSIDE` 字牌；外伸 **4.5 m** 花崗岩前庭只作入口地面，沒有當成土地用途邊界。
- 屋頂及景觀：主塔、第二塔及低層屋頂有 **540 塊模型 PV panels**、支架及 cell bus bars；這是對官方逾 **1,350 m² PV** 的視覺詮釋，不是聲稱官方面板數量或全部位於主塔冠頂。另有 **17 棵樹、47 組灌木、4 個水景、花槽、座椅及外緣玻璃欄杆**。官方 **600 m² educational gardens、30% soft landscape、177,670 m² 總 GFA、110,000 m² office、60,000 m² retail**均保留為來源資料，不由模型件數反推工程面積。
- 道路及地面開口：完整保留 **18 條 surface access records／8 條 B1 tunnel records**；其中 **8 條 source ways** 穿越地面外牆，玻璃按車路分出 **38 個開口 bays**，兩個入口另有 **15 個開口 bays**，14 支柱逐點避開車路。上層只用逐邊牆 colliders，沒有由地面封頂的整環 solid。對實際最高 surface road profile 保留 **7.871004440580341 m** 場景淨空，超過 4.7 m 車輛控制值；這不是實地工程測量。外環內沒有 clearance 後街燈。
- 地形、碰撞及分層：主塔中心 raw DTM **6.209510786436553 m** 用作施工平台，plaza 為 **6.329510786436553 m**；這是可追溯 DTM／模型地面，不是已核實道路工程標高。terrain 與 road-elevation 共用同一 pad boundaries，所選 surface 車路保持道路優先；B1 使用原隧道剖面，測試位置為 **2.25 m**，不會被升至 surface pad。全幢 **657 個 colliders** 包括上層逐邊牆、地面玻璃／過樑、柱及兩個入口，全部接入 world。
- 實際驗證：最終 Chromium／WebGL build 在 **1100×760** 實看東北全塔、西南五體量、主塔冠頂、PV／花園、辦公入口、商場入口及有蓋車路日景，以及全塔、五體量、LED fins、兩入口及車路夜景，共 **13 views**。scene 為 **19 landmarks／0 generic buildings**；本幢 **99 meshes、509,165 vertices、196,612 triangles**，`geometryIssues=[]`、`badColliders=[]`，最高渲染點扣 datum 為 **213 m**。兩個入口行人／車輛實撞的法線距離均為 **0.65／2.3539892165 m**，門前 ground 均保持 **6.329510786436553 m**；surface driveway 雙向實駛 **36.62701263481304／37.82147055445696 m**，B1 實駛 **45.9555802714631 m** 並保持 **2.25 m**。page exception／Three.js shader error 均為 **0**，只有既有外部 resource `ERR_CONNECTION_CLOSED`。專用架構、地形、道路、街燈及 collider 測試 **9／9 pass**，完整 `node --test tests/*.test.cjs` 為 **401／401 pass**。
- 研究及資產：實看 Snøhetta／ArchDaily 建成主塔、五體量、弧形玻璃、斜切、入口、屋頂花園及 PV 圖，排除舊機場、周邊住宅、設計 render 及室內圖作錯誤依據。研究相片沒有打包，模型不使用照片貼圖或下載 GLTF。

### 參考資料

- OSM complex、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/1212412229
  https://api.openstreetmap.org/api/0.6/way/1212412229/full.json
- Snøhetta 官方項目頁：213 m、五個 interconnected volumes、177,670 m²、110,000 m² office、60,000 m² retail、逾 1,350 m² PV、600 m² educational gardens 及 30% soft landscape：
  https://www.snohetta.com/projects/airside
- CTBUH／CVU：207.1 m architectural／to-tip、189.5 m occupied、43 floors、地下 4 層及 2022 completed：
  https://www.skyscrapercenter.com/building/airside/39854
- Designboom／Dezeen 建成報道：向啟德河梯級下降、weaves／folds／tears／cuts、屋頂花園及 PV：
  https://www.designboom.com/architecture/snohetta-mixed-use-airside-complex-opens-hong-kong-tribute-textile-heritage-10-30-2023/
  https://www.dezeen.com/2023/10/30/snohetta-skyscraper-airside-kai-tak-hong-kong-airport/
- ArchDaily 建成攝影及項目團隊，用於核對主塔弧形 fluting、平玻璃及斜 reveal：
  https://www.archdaily.com/1009276/airside-snohetta
- Design & Architecture：47-storey 主塔、18-level 第二體量、九層零售、四種 radii、金屬百頁及 fins 線性 LED：
  https://designandarchitecture.com/article/snoslashhetta-references-developer-nan-fung-grouprsquos-textiles-heritage-and-the-kai-tak-sitersquos-aviation-past-for-airside-hong-kong.html
- Arup 建成 PV 圖及可持續技術資料：
  https://arup.com/en-us/news/airside-honoured-at-ashrae-technology-awards

## 利園一期 Lee Garden One

- 地點及來源：希慎道 33 號，採目前 **OSM way 1424342883 version 1** 的 **10 個獨立頂點**作 commercial／mall 建築基座，原始 WGS84 geometry、tags、版本及 ODbL attribution 保存在 `lee-garden-one-architecture.js`。minimum-area OBB 中心為 **(2595.3604218068294, 371.99836545584674)**，定向尺寸 **114.61782709856607 × 45.73061598829872 m**，`ry=0.37960124862618994`；building ring 面積 **4496.7959470638725 m²**。另一個 **way 292229804 version 8** 是 **5364.6784018451435 m²** 的 complex／address 邊界，沒有 `building` tag，只作 site 參考，沒有當成塔身或裙樓實體。
- 辦公塔平面：OSM 基座不能整座拉成 240.4 m 塔。模型依已實看的六邊截角三角形標準層平面、中央三角核心及雙排 lift lobby，建立 **6 個獨立頂點**的 photo／floor-plan-directed tower ring；均匀縮放及向北 **4 m** 的配置是建築設計推導，**不是 OSM surveyed tower polygon 或工程測量**。塔身面積 **1554.8318406250005 m²**，按 Hysan 約 **88%** whole-floor efficiency 折算約 **14,727.74 sq ft lettable**，位於官方典型 **14,661–16,793 sq ft** 範圍內；全部塔身頂點均在 OSM building base 內。
- 高度、層數及面積 conventions 分列：OSM 為 **211 m／52 levels**；CTBUH／CVU 為 **240.4 m architectural／to-tip、198 m occupied、50 above／4 below、1996 start／1998 completed、84,665 m² Tower GFA**；Hysan 官方另採 **53 floors、約 903,000 sq ft GFA**，典型樓面、約 **2.50 m** clear headroom 及約 **10–18 m** curtain-wall-to-core depth 獨立保存。其他 published **240.35 m／1997** 不互相平均或取整。Make 項目頁 **83,900 m²** 是另一項目面積口徑，沒有改名成 retail area 或與 CTBUH tower GFA 混合。
- 塔身立面及材料：依 DLN 資料及建成外觀製作藍綠玻璃、密集銀色水平遮陽帶、深色豎框、兩組照片導向機電帶及平冠頂。**39 道視覺 courses** 對應 39 層辦公資料，但不把 OSM／CTBUH／Hysan 的不同總層數合成一個假規格。全塔有 **4,095 塊主幕牆玻璃、240 道水平帶、111 支主豎框及57塊冠頂面板**；三個中段圓形懸挑 corner lobes 另有 **1,134 塊曲面玻璃及81道弧形橫帶**，不是把弧線畫在平面上。平冠頂採 OSM **211 m** 視覺 datum，southwest offset spire 三段及支撐到 CTBUH **240.4 m**，另有屋頂機房、百頁及紅色 tip beacon。
- 裙樓及 2026 屋頂擴建：building base 用作四層商業／裙樓依據，有暖色地面玻璃、石灰石面板、Lan Fong Road 銅色 mesh lattice veils、雙斜 transition braces、屋頂花槽及玻璃欄杆。依 Make 的立面翻新及兩層屋頂擴建文字資料，在南側非塔身裙樓屋頂條帶設 **42 × 6.4 m** 的兩層玻璃盒、銅框、綠牆及整合照明；位置及尺寸屬 site-directed 視覺設計，沒有冒充已實看官方施工圖或精確測量。
- 行人入口：保留 source **vertex 8／node 2957737898** 的 `entrance=yes／exit=yes`，world 座標 **(2621.7345210514645, 346.68630859673357)**。入口有高玻璃大堂、四道門及門柄、銅框、玻璃雨篷、暖色內部、`LEE GARDEN ONE / 33 HYSAN AVENUE` 字牌，以及帶淺 diamond relief 的 Gascogne Beige limestone 柱。門前 **3 m** 深 level forecourt 由門前 **15.2 m** 收窄至外緣 **4 m**，避開斜向恩平道車路；行人及車輛停止位置均保持 **9.003145681894631 m**，不再由門外 raw DTM 形成 unintended step。
- 停車入口：保留 source **vertex 5／node 2093159628** 的 `amenity=parking_entrance、parking=underground、entrance=main、exit=main`，world 座標 **(2546.1011226623477, 367.37143777942526)**，沒有當成第二個行人大堂。門架有石質側柱及過樑、overhead shutter、暗色地下 recess、導引燈及 `PARKING` 字牌；道路白色標線保留。
- 道路及地面：六邊辦公塔沒有道路衝突；building base 只與生成 **record 46221／OSM way 909982840** 的 **8.4 m** service road 相交。complex 另涉及 records **35549／46219／46220**，但那些 source ways 不被誤當塔身穿路。地面玻璃按實際車路留下 **5 個道路開口 bays**，連兩個來源入口共 **10 個開口 bays**；周邊 **123 個鋪裝 bays**同樣避開車路，沒有用整塊 plaza slab 覆蓋瀝青路面。上層只用逐邊牆 colliders，不封地面。**18 m** 裙樓 soffit 對最高渲染道路剖面扣除 **4.7 m** 車輛包絡後仍有 **13.275 m**；停車門架下實際淨空約 **5.075 m**，超過 4.5 m。building、complex 及入口前庭均無 clearance 後街燈。
- 地形及碰撞：building 中心 raw DTM **8.883145681894632 m** 是施工平台依據，plaza 為 **9.003145681894631 m**；terrain、ground query 及 road-elevation 共用同一 building pad，所選道路仍保持道路優先。這是可追溯 DTM／模型地面，不是已核實道路工程標高。全幢 **137 個 colliders** 包括六邊塔身、三個 lobes、地面玻璃、裙樓上層、屋頂擴建／機房、尖頂及兩個入口，全部接入 world。
- 實際驗證：最終 Chromium／WebGL build 在 **900×620** 實看東北／西南全塔、裙樓屋頂擴建、來源行人入口、停車入口及車路日景，以及全塔、冠頂／尖頂、兩個入口夜景；入口前庭修正後再補拍日夜兩 view，共 **11 views**。scene 為 **20 landmarks／0 generic buildings**；本幢 **46 meshes、99,477 vertices、64,822 triangles**，`geometryIssues=[]`，全部 **137 colliders** 已接入 world。最高渲染點為世界 **249.2831456890472 m**，扣 datum 為 **240.40000000715256 m**，差值是 Float32 精度。行人／車輛實撞入口門牆的法線距離分別 **0.6599999999998938／2.3621848080647663 m**，兩者門前 ground 均為 **9.003145681894631 m**；測試車沿保留 service road 駛過停車門架，實行 **11.324763126972622 m**、穿過 portal 後法線位置 **−2.42737044258378 m**，再於地下 recess 前停止。兩次最終 browser run 的 page exception／Three.js shader warning 均為 **0**，只有既有 Google Fonts 外部 resource `ERR_CONNECTION_CLOSED`。專用架構、地形、道路、街燈及 collider 測試 **9／9 pass**，完整 `node --test tests/*.test.cjs` 為 **410／410 pass**。
- 研究及資產：實看正確塔身、rounded cantilever、尖頂、大堂及六邊標準層平面，排除 Chanel、Cartier、Centaline 等錯配候選圖；Make 官方圖下載失敗，因此只把其文字資料用作翻新特徵依據，沒有假稱已實看該批官方相片。研究相片沒有打包，模型不使用照片貼圖或下載 GLTF。

### 參考資料

- OSM building base、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/1424342883
  https://api.openstreetmap.org/api/0.6/way/1424342883/full.json
- 獨立 complex／address 邊界；沒有 `building` tag：https://www.openstreetmap.org/way/292229804
  https://api.openstreetmap.org/api/0.6/way/292229804/full.json
- CTBUH／CVU：240.4 m architectural／to-tip、198 m occupied、50 above／4 below、chamfered triangle、39 層辦公、四層裙樓、三個圓形 corner lobes、平冠頂及 southwest offset spire：
  https://www.skyscrapercenter.com/building/lee-garden-one/978
- Hysan 官方：約 903k sq ft GFA、53 floors、14,661–16,793 sq ft typical lettable floorplate、約 88% efficiency、2.50 m clear headroom 及約 10–18 m core depth：
  https://www.hysan.com.hk/portfolio/lee-garden-one/
- 標準層平面來源；六邊截角三角外圍、中央三角核心及雙 lift lobby：
  https://www.cbdofficehk.com/lee-garden-one
- Make Architects：2026 facade refurbishment、石材／銅色細節、Lan Fong Road mesh lattice veils、diamond-motif Gascogne Beige limestone 入口柱、兩層屋頂玻璃盒／綠牆／整合照明：
  https://www.makearchitects.com/media/news-events/make-completes-facade-refurbishment-at-the-iconic-lee-garden-one-in-hong-kong/
  https://www.makearchitects.com/projects/lee-garden-one/
- DLN 項目資料及外觀參考：
  https://archello.com/project/the-lee-gardens
  http://www.luxstate.com/hk-commercial/hong-kong/causeway-bay/lee-garden-one

## 國際金融中心一期 One International Finance Centre

- 地點及來源：採目前 **OSM way 148554945 version 14** 的 **32 個獨立頂點**，原始 WGS84 geometry、node IDs、tags、版本及 ODbL attribution 保存在 `one-ifc-architecture.js`。這個 `building=yes／building:use=office／layer=3` 元件與已實看的典型平面圖同為階級方形塔身，不是土地用途範圍。實際 ring 面積 **2239.237667082749 m²**；minimum-area OBB 只作定向包絡，中心 **(-272.8223130606762, -355.57825652657647)**、尺寸 **50.82473795154908 × 50.610363315919244 m**、`ry=0.6530525292750311`，OBB 面積 **2572.2584531642883 m²** 沒有冒充標準層面積。
- 地址及數值 conventions：原始 OSM `addr` tags 寫 **8 Finance Street**，但 SHKP 及 CTBUH 官方地址是 **1 Harbour View Street**；來源 tags 原樣保存，場景門牌採官方地址並在文件明示差異。OSM 與 CTBUH 同為 **210 m architectural／to-tip、38 above-ground levels**，CTBUH 另有 **4 below、72,880 m² Tower GFA、1999 completion、All-Steel**。其他 published **1998／39層／4個交易樓層／18部客梯**、InterAsia **41層／647,868 sq ft GFA／約21,000 sq ft typical lettable／2部貨梯**均獨立保存，沒有平均、取整或互相覆寫。
- 平面及體量：依 César Pelli／Rocco 的塔身照片和典型樓面中央核心、雙排 lift lobby 及階級方形外圍，直接使用精確 OSM ring，沒有改用矩形盒體。五個 curtain-wall tiers 由 **14 m** 到 **202 m**，形成 **4 次退台**；各層獨立縮放，冠頂以下不是單一斜拉盒。**38 道視覺 courses** 是立面建模分配，不把 OSM、CTBUH、published 或 InterAsia 的不同層數合并成一個假規格。
- 立面材料及細節：按幕牆承包商所述 pilaster unitized panel system，分開製作雙層 vision glass、fritted spandrel、深色 backing、外置鋁合金／不銹鋼豎向 fins、橫向 transoms 及玻璃百頁。**1.61 m** 面板寬模數及 **4.17 m／4.85 m** office／trading panel 高度保留為來源模組資料，沒有假稱每個實際樓層的測量高度。全塔有 **4,712 塊 vision panels、4,712 塊 spandrels、780 支豎向 pilaster fins、2,592 道橫向構件**；三組照片導向機電／避火帶位於 **82／142／176 m** 視覺 datum，各有獨立暗色玻璃及百頁。
- 冠頂：**192–202 m** 是收分的 glazed crown，**202–210 m** 為開敞 sculptural crown。製作 **92 支 ribs／rails** 及 **60 塊寬幅三角鋁合金 finial plates**，另有中央機房、百頁及屋頂蓋板；最高點保持 **210 m**，沒有另加天線或把 Two IFC 的更高尖頂套過來。夜間冠頂以冷白光照亮，辦公玻璃則保留不規則暖色室內燈。
- 地面及入口：地面層有 **62 塊大堂玻璃、8 支圓形結構柱** 及 **12 m** 高的開敞 soffit，上部連續至 **14 m** 裙樓帶。主入口位於長邊 **source edge 24** 的中點，world 座標 **(-252.69016375486507, -370.9702959083021)**；這是照片及官方地址導向的 Harbour View Street 入口，**不是假稱 OSM 有入口節點**。入口有四道玻璃門及門柄、石柱、懸吊玻璃雨篷、暖色大堂、`ONE ifc`、`1 HARBOUR VIEW STREET` 及三條紫／紅／黃向量 ribbons。門前 **12.8 m 寬、3 m 深** level forecourt 採 **3.452616040109656 m**，不讓較高 raw DTM 在門前重新形成梯級。
- 道路及鋪裝：精確塔身只與生成 **records 44957／45026** 的兩段 **5.5 m** service road 相交，均在 **source edge 0**；record index 只作生成資料定位，不當 OSM ID。地面整條 edge 0 保持開敞，上層 soffit／colliders 由 **12 m** 開始；**0.92 倍內縮鋪裝**及入口前庭重新掃描均無車路衝突，瀝青、白色標線及箭咀保持可見。道路中心線本身在塔身外面，沒有把走廊寬度相交誇大成「道路穿過整座塔」。對最高渲染道路剖面扣除 **4.7 m** 車輛包絡後仍有 **6.601588196482504 m** 淨空；塔身及入口前庭均無 clearance 後街燈。
- 地形及碰撞：中心 raw DTM／施工平台 **3.332616040109656 m**，plaza **3.452616040109656 m**；terrain、ground query 與 road-elevation 共用同一 pad，所選道路仍保持道路 ground。這是可追溯 DTM／模型地面，不是已核實道路工程標高。全幢 **298 個 colliders** 覆蓋地面玻璃及圓柱、五個退台塔身、連續上層裙樓、機房和入口，全部接入 world。
- 實際驗證：最終 Chromium／WebGL build 在 **900×620** 實看東北／西南全塔、日間冠頂、入口及 service road，以及全塔、冠頂、入口和道路夜景，共 **9 views**。scene 為 **21 landmarks／0 generic buildings**；本幢 **28 meshes、157,378 vertices、68,508 triangles**，`geometryIssues=[]`、`badColliders=0`，全部 **298 colliders** 已接入 world。最高渲染點為世界 **213.33261604010966 m**，扣 datum 恰好 **210 m**。行人／車輛實撞入口門牆的法線距離分別 **0.5799999999999947／2.280000000000018 m**，兩者停止位置 ground 均為 **3.452616040109656 m**；測試車沿保留 service road 實行 **19.349155857884057 m**，沒有被地面牆或鋪裝碰撞擋住。最終 browser run 的 page exception／Three.js shader warning 均為 **0**，只有既有 Google Fonts 外部 resource `ERR_CONNECTION_CLOSED`。專用架構、地形、道路、街燈及 collider 測試 **9／9 pass**，完整 `node --test tests/*.test.cjs` 為 **419／419 pass**。
- 研究及資產：實看 CTBUH 的正確 One IFC 遠景、SHKP 一期／二期對照、階級方形標準層平面及底座／立面相片，排除把 Two IFC、其他弧形大廈或 AI 城市圖當成 One IFC 的候選圖。研究相片沒有打包，模型不使用照片貼圖或下載 GLTF。

### 參考資料

- OSM 精確塔身、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/148554945
  https://api.openstreetmap.org/api/0.6/way/148554945/full.json
- CTBUH／CVU：210 m architectural／to-tip、38 above／4 below、72,880 m²、1999、All-Steel 及正確 One IFC 相片：
  https://www.skyscrapercenter.com/building/one-international-finance-centre/1470
- SHKP 官方：一期地址 **1 Harbour View Street**、一期／二期外觀對照及綜合項目資料：
  https://www.shkp.com/zh-HK/our-business/hong-kong-properties/offices/one-ifc-and-two-ifc
- InterAsia：約 21,000 sq ft typical lettable、41層、647,868 sq ft、18部客梯／2部貨梯及階級方形典型平面圖：
  https://www.interasia.com.hk/en/Hong-Kong-Building/Central/1253/One-International-Finance-Centre
- 建築師及 One／Two IFC 相片對照：
  https://www.e-architect.com/hong-kong/2ifc-hong-kong
- 幕牆承包商 case-study 摘要：pilaster unitized panels、雙層 vision／spandrel glass、玻璃百頁、外置鋁／不銹鋼構件、屋頂鋁 fins 及 1.61 m／4.17 m／4.85 m 模組：
  http://www.polyucee.hk/cecspoon/lwbt/Case_Studies/IFC2/IFC.html
- 正確 One IFC 外觀相片（HK ifc Phase1）：
  https://commons.wikimedia.org/wiki/File:HK_ifc_Phase1.jpg

## 冠君大廈 Champion Tower

- 地點及範圍：採目前 **OSM way 85320726 version 9** 的 **15 個獨立頂點**，原始 WGS84 geometry、node IDs、tags、版本及 ODbL attribution 保存在 `champion-tower-architecture.js`。這是 Three Garden Road 內的 **Champion Tower 翼**，沒有把 ICBC Tower、整個零售裙樓或土地用途範圍當成塔身。實際 ring 面積 **1841.3171431796509 m²**；minimum-area OBB 只作定向包絡，中心 **(105.87173729276151, 385.591747567869)**、尺寸 **66.43255828662996 × 39.65579045281385 m**、`ry=-0.7416658288586051`，OBB 面積 **2634.4356106589394 m²** 不冒充標準層面積。
- 高度、層數及面積 conventions：OSM 與 published roof 均為 **205 m**；官方 Champion REIT／Three Garden Road 採 **47-storey Champion Tower／37-storey ICBC Tower**，OSM 目前寫 **51 levels**，Centadata 另寫 **50 floors**，全部獨立保存。PropWiser 的 Champion Tower **約770,000 sq ft GFA／17,300 sq ft typical lettable** 與整個項目 **1,559,000 sq ft／144,800 m² GFA、26層可連通、34,000 sq ft combined lettable** 分列。官方 **9個 lift zones／每區4部高速升降機／另4部 service lifts、558個車位**是整個 Three Garden Road 的資料，沒有冒充 Champion 單塔數量。
- 建築研究：以 **Rocco Yim／Rocco Design Architects、1992年落成**、現代玻璃及鋼材、兩道弧形反光立面和十層高無框玻璃大堂為依據。實看官方項目資料、舊 Citibank Tower 外觀、現行 Champion Tower 大堂、典型樓面平面及近景；排除 Cheung Kong Center 錯標相片，以及 CTBUH 搜尋中同名的以色列 Bnei Brak 大廈，沒有把錯誤資料套用過來。
- 幕牆：**42–192 m** 主塔以 **37 道照片導向視覺 courses** 建模，這不是把官方47、OSM51或Centadata50層合并成另一個樓層聲稱。全幢有 **4,218 塊藍綠反光 vision glass、4,218 塊銀灰 spandrel、129 支直向 mullions、1,125 道水平構件**；弧形面與較暗的 service spine 分開用料。**94／144 m** 兩組暗色細百頁帶是外觀視覺 datums，不是假稱已測量的避火層。
- 十層高大堂：地面至 **42 m** 以兩面無框弧形玻璃牆、石材服務核心、幼鋼索及蜘蛛扣件表達官方描述；有 **29 塊大堂玻璃、203 個 spider fittings、8 支全高圓柱**。入口內另做現行大堂相片所見的石材牆、接待台、 brushed-steel turnstiles 及暖色升降機大堂，而不是把舊 Citi 標誌重新套用。
- 冠頂：**192–205 m** 以弧形金屬包板、深色百頁、中央機房及 **74 支冠頂 ribs** 組成，頂部銀色連續 rim 精確止於 **205 m**；沒有附加天線或沿用舊 Citibank 字牌。夜間冠頂採冷白光，辦公玻璃保留不規則暖色室內燈。
- 入口及地台：主入口位於 **source edge 12**，world 座標 **(119.2264322062928, 411.0172818237491)**；這是官方地址及外觀導向的 Garden Road 入口，**不是假稱 OSM 有入口節點**。製作四道玻璃門、門柄、懸吊玻璃雨篷、石材招牌牆、`CHAMPION TOWER`、`冠君大廈` 及 `3 GARDEN ROAD`。門前 **10.8 m 寬、3.2 m 深** 前庭與大堂地面同為 **19.772700909351723 m**，不讓外面較高 DTM 在門前形成梯級。
- 道路及街燈：精確塔身和入口前庭均沒有車路衝突，無需搬路、搬燈或改白色標線。最近生成 **record 35963** 的道路中心線距塔身 **6.730280338640443 m**，大於其 **5.5 m** 車路半寬；record index 只作生成資料定位，不是 OSM ID。塔身及入口前庭的 clearance 後街燈均為 **0**，瀝青路面、白色標線及道路 ground 保留。
- 地形及碰撞：中心 raw DTM／施工平台 **19.652700909351722 m**，plaza **19.772700909351723 m**；terrain、ground query 與 road profile 共用同一來源，所選道路仍有優先權。這是 DTM-derived 場景地面，不是已核實工程標高。全幢 **96 個 colliders** 覆蓋大堂玻璃／石柱、主塔、冠頂及入口門牆，全部接入 world。
- 實際驗證：最終 Chromium／WebGL build 在 **640×448** 實看東南／西南全塔、冠頂、Garden Road 大堂及鄰近道路，以及全塔、冠頂、入口和道路夜景，共 **9 views**。scene 為 **22 landmarks／0 generic buildings**；本幢 **25 meshes、99,997 vertices、41,031 triangles**，`geometryIssues=[]`、`badColliders=0`，全部 **96 colliders** 已接入 world。最高渲染點為世界 **224.65270090935172 m**，扣 datum 恰好 **205 m**。行人／車輛實撞入口的法線距離分別 **0.5800000000000043／2.2800000000000074 m**，停止位置 ground 均為 **19.772700909351723 m**；測試車沿鄰近保留車路實行 **34.13484793330777 m**，沒有被塔身或鋪裝封死。page exception／Three.js shader warning 均為 **0**，只有既有 Google Fonts 外部 resource `ERR_CONNECTION_CLOSED`。專測 **9／9**、整合及 runtime **20／20**、完整 `node --test tests/*.test.cjs` **428／428 pass**。
- 資產：研究相片及平面圖只作目視及比例研究，沒有打包進 runtime；模型不使用照片貼圖或下載 GLTF。

### 參考資料

- OSM 精確 Champion Tower 翼、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/85320726
  https://api.openstreetmap.org/api/0.6/way/85320726/full.json
- Champion REIT 官方：現代玻璃／鋼材、Champion 47層／ICBC 37層、26層連通及34,000 sq ft 合併樓面：
  https://www.championreit.com/properties-and-portfolio/three-garden-road
- Three Garden Road 官方：九個 lift zones、每區四部高速升降機、四部 service lifts、558車位及項目規格：
  https://www.threegardenroad.com/en/building
- 建築師、1992、兩道弧形反光立面、兩幅十層高無框玻璃、項目 GFA 及舊名歷史：
  https://en.wikipedia.org/wiki/Three_Garden_Road,_Central
- Champion 單塔約770,000 sq ft、17,300 sq ft typical、47層及1992：
  https://office.propwiser.com.hk/en/Building/central/three-garden-road-champion-tower/213
- Centadata 的50層／22部客梯／2部貨梯是另一 agency convention，沒有覆寫官方47層：
  https://oir.centanet.com/en/property/office/hong-kong-central-champion-tower/detail/48f5c748-70d8-4802-957e-a458cef1bccb/
- 現行外觀、入口及典型平面相片：
  https://hkpodium.com/property-details/three-garden-road-champion-tower_office_central/id=66183
- 舊 Citibank Tower 外觀及大堂歷史相片（只作建築研究，沒有恢復舊品牌）：
  https://commons.wikimedia.org/wiki/Category:Three_Garden_Road,_Central

## 長江集團中心二期 Cheung Kong Center II

- 地點及範圍：採目前 **OSM way 1272960455 version 2** 的 **9 個獨立頂點**，原始 WGS84 geometry、node IDs、tags、版本及 ODbL attribution 保存在 `ckc2-architecture.js`。這是 **10 Harcourt Road** 的二期塔身，沒有把原長江集團中心、Hutchison House 舊址整個土地用途範圍或旁邊 The Henderson 當成本幢 footprint。實際 ring 面積 **1420.895655020291 m²**；minimum-area OBB 只作定向包絡，中心 **(307.5057091659538, 91.15211125833096)**、尺寸 **51.06506246799256 × 27.984325844756995 m**、`ry=-0.2734655835858326`，OBB 面積 **1429.0213473871747 m²** 不冒充標準層面積。
- 高度及面積 conventions：**OSM 205 m**、CTBUH **205.5 m architectural／to-tip、194 m occupied、41層、2024 completed** 與 DLN **Building Height 205.510 m** 獨立保存，模型最高 datum 採未擅自取整的 **205.510 m**。DLN 的 **3056.509 m² site、45,847 m² above-ground GFA、45,534 m² office、312 m² commercial、5層 podium、3層 basement、178車位**與 2022 設計揭露報道的 **51,096.7 m²／550,000 sq ft** 分列，沒有把不同面積口徑合併。
- 建築研究：以 **DLN Architects Limited** 的塔身幕牆及 jumbo-size podium glass wall 資料為基礎，實看 28Hse 近景、Getty 2024 全塔及冠頂相片，確認矩形深藍反光玻璃、銀色密集窗格、兩道深色橫向設備帶、多層大玻璃裙樓，以及酒紅／紫紅冠頂上的白色 `CKC II`。入口藍綠／紫色螺旋管狀裝置依 SCMP presented 相片作程序化詮釋；該頁是 presented 內容，只作外觀依據，不當獨立建築測繪。
- 幕牆及裙樓：**30–194 m** 主塔以 **36 道照片導向視覺 courses**、**3,636 塊藍色 vision glass、3,636 塊銀藍 spandrel、110 支直向 mullions、657 道水平構件**組成；這不是另一個官方樓層聲稱。**86／143 m** 兩道深色百頁帶、**18 m** jumbo glass 頂界、**30 m** 五層裙樓頂界及 **199 m** 字牌帶底均為外觀建模控制值，不是官方公布樓層標高。裙樓有 **41 塊 jumbo glass、210 個 spider fittings、8 支全高圓柱**，入口正面前後保留清晰大玻璃而非藍色實牆。
- 冠頂及入口藝術：冠頂深色設備百頁、酒紅字牌帶、**59 支直向 fins**、屋頂機房及 telescopic BMU 均低於或止於 **205.510 m**；前後 `CKC II` 字牌啟用正確深度遮擋，不再讓背面字牌穿透正面。Harcourt Road 大堂內以 **7 條螺旋管及12個層疊管環**表達相片的彩色懸吊裝置，配合暖色線性天花；這些數量是模型幾何，不是官方藝術品管件清單。
- 入口及地台：主入口位於北側長邊 **source edge 4**，world 座標 **(311.3243400924342, 77.69104194192079)**；這是地址及相片導向的 Harcourt Road 入口，**OSM 沒有 entrance-tagged node**，不冒稱實測入口。製作清晰玻璃門牆、門柄、懸吊玻璃雨篷、`CHEUNG KONG CENTER II`、`10 HARCOURT ROAD` 及 **14 m 寬、3.2 m 深** level forecourt。中心 raw DTM／施工平台 **6.3990500627303675 m**，plaza／入口地面 **6.519050062730368 m**，不讓 raw DTM 在門前形成梯級。
- 道路及街燈：精確塔身及入口前庭均沒有生成車路或 clearance 後街燈衝突，無需搬路、搬燈或改白色標線。最近 **record 13642 segment 1** 的中心線距塔身 **7.538663527938291 m**，大於其 **5.2 m** 車路半寬；record index 只作生成資料定位，不是 OSM ID。terrain、ground query 與 road profile 共用同一 DTM pad，所選道路仍有地面優先權；這不是已核實道路工程標高。
- 碰撞及實際驗證：全幢 **70 個 colliders** 覆蓋逐跨裙樓、主塔、冠頂及入口門牆，全部接入 world。Chromium／WebGL 完成 **9-view** 日間／夜間全塔、冠頂、入口及道路檢查，並對字牌深度、入口玻璃及螺旋裝置作額外 focused re-render 和實看修正。最終目前 build 的入口日夜驗證為 **46 meshes、88,584 vertices、46,301 triangles**，scene **23 landmarks／0 generic buildings**，`geometryIssues=[]`、`badColliders=0`；最高渲染點為世界 **211.9090445695663 m**，扣 datum 為 **205.50999450683594 m**（浮點誤差內的205.510 m）。行人／車輛實撞入口的法線距離分別 **0.58／2.28 m**，停止位置 ground 均為 **6.519050062730368 m**；測試車沿鄰近保留車路實行 **34.134847933305885 m**，沒有被塔身或前庭封死。page exception／Three.js shader warning 均為 **0**，只有既有 Google Fonts 外部 resource `ERR_CONNECTION_CLOSED`。專測 **9／9**、完整 `node --test tests/*.test.cjs` **437／437 pass**。
- 資產：研究相片只作目視及比例研究，沒有打包進 runtime；模型不使用照片貼圖或下載 GLTF。

### 參考資料

- OSM 精確二期塔身、目前 API 幾何及原始 tags：https://www.openstreetmap.org/way/1272960455
  https://api.openstreetmap.org/api/0.6/way/1272960455/full.json
- DLN 建築師：Hutchison House 重建、205.510 m、41層、5層 podium、site／GFA／車位及項目規格：
  https://www.dln.com.hk/en/project/commercial/Cheung_Kong_Center-II
- CTBUH／CVU：205.5 m、194 m occupied、41層、2024 completed、10 Harcourt Road 及 Concrete-Steel Composite：
  https://www.skyscrapercenter.com/building/id/44864
- Meinhardt：DLN、tower curtain wall、jumbo-size podium glass wall、façade／BMU consultancy：
  https://meinhardt-china.com/project/cheung-kong-centre-ii-central/
- 完工立面近景及2024全塔／冠頂相片（只作研究，沒有打包）：
  https://www.28hse.com/en/estate/detail/cheung-kong-center-ii-30861
  https://www.gettyimages.co.uk/photos/cheung-kong-centre
- 入口螺旋管狀藝術裝置的 presented 相片依據：
  https://www.scmp.com/presented/business/topics/iconic-installation-ckcii/article/3359569/reaching-stars-iconic-art-installation-showcased-cheung-kong-center-ii
- 2022 設計揭露報道的另一面積口徑 **51,096.7 m²／550,000 sq ft**；其當時預計完工日期不取代 CVU 後來的2024 completed：
  https://verticalurbanism.org/news-article/design-for-new-tower-in-hong-kong-revealed/

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
- `k11-atelier-architecture.js`：K11 Atelier 26 頂點 OSM 來源、OBB、高度／層數 conventions、五段非對稱退台、車輛開口、入口及 plaza／collider 座標換算。
- `k11-atelier-world.js`：K11 Atelier 玻璃／石灰石／古銅幕牆、凹角斜框、百頁、退台屋面、塔冠、入口、大堂三聯畫及保安閘機、日夜材質、碰撞及 stats。
- `cullinan-i-architecture.js`：天璽I 14 頂點 OSM 來源、OBB、高度／層數／年份 conventions、40 m 入口及有蓋落客 frames、折角冠頂、forecourt 及碰撞座標換算。
- `cullinan-i-world.js`：天璽I 藍銀 unitized 幕牆、百頁、折角塔冠、金色 C 玻璃盒、雙層落客 canopy、日夜材質、碰撞及 stats。
- `cullinan-ii-architecture.js`：天璽II 15 頂點 OSM 來源、OBB、高度／用途／年份 conventions、西側 W 中庭、level-1 door、折角冠頂、forecourt 及碰撞座標換算。
- `cullinan-ii-world.js`：天璽II 藍銀 unitized 幕牆、百頁、折角塔冠、水晶 W 中庭、平面落客雨篷、景觀、日夜材質、碰撞及 stats。
- `masterpiece-architecture.js`：名鑄 44 頂點 OSM 來源、OBB、高度／用途／年份 conventions、照片導向樓層控制、河內道入口、前庭及逐邊碰撞座標換算。
- `masterpiece-world.js`：名鑄圓角酒店／住宅立面、連續弧形白色阳台帶、中央藍玻璃、雙層高空中花園、百頁冠頂、四道開敞門架、維修吊臂、河內道暖色玻璃入口、日夜材質、碰撞及 stats。
- `langham-place-architecture.js`：朗豪坊辦公大樓 49 頂點 OSM 來源、OBB、高度／層數 conventions、四區屋面、橢圓圓頂、真實入口、前庭及逐邊碰撞座標換算。
- `langham-place-world.js`：朗豪坊辦公大樓多瓣藍玻璃、兩道灰色厚帶、交叉撐、四區階梯屋面、肋架圓頂、傾斜銀柱、辦公入口、日夜材質、碰撞及 stats。
- `summit-architecture.js`：御峰 64 頂點 OSM 來源、OBB、高度／層數／年份 conventions、蝶形雙翼、四區冠頂、照片導向 podium／Happy Valley 入口、前庭及逐邊碰撞座標換算。
- `summit-world.js`：御峰綠色弧形幕牆、金屬板、雙翼冠頂、分隔水缸、四層弧形 podium、lawn、玻璃入口及雨篷、日夜材質、碰撞及 stats。
- `hopewell-architecture.js`：合和中心 41 頂點 OSM 來源、OBB、高度／層數／面積 conventions、QRE 3/F 及堅尼地道 17/F 入口 nodes、照片導向南向升降機、局部前庭、扶手電梯地面高度及逐邊碰撞座標換算。
- `hopewell-world.js`：合和中心深色橫向窗帶、82 支白 fins、米色百頁 podium、旋轉餐廳冠頂、圓形屋頂泳池、外置觀光升降機、兩個入口、日夜材質、碰撞及 stats。
- `sun-hung-kai-architecture.js`：新鴻基中心 16 頂點 OSM 來源、OBB、高度／層數／面積／年份 conventions、照片導向港灣道入口、有蓋車路淨空、局部前庭及逐邊碰撞座標換算。
- `sun-hung-kai-world.js`：新鴻基中心深棕格網玻璃、淺色切角石牆、五層加建視覺帶、平屋頂機房／雙衛星碟、SHK 標誌、斜玻璃 atrium、開敞有蓋車路、雙語字牌、日夜材質、碰撞及 stats。
- `two-pacific-place-architecture.js`：太古廣場二座 24 頂點 OSM 來源、OBB、辦公／酒店高度及層數 conventions、雙入口 frames、三層 DTM 地台、service driveway 來源及逐邊碰撞座標換算。
- `two-pacific-place-world.js`：太古廣場二座橢圓藍玻璃、白色橫帶、地面橫豎框、機電百頁、弧形冠頂與金色 Shangri-La 字牌、屋頂設備、酒店 porte-cochere、辦公入口、日夜材質、碰撞及 stats。
- `airside-architecture.js`：AIRSIDE 63 頂點 OSM complex、正交坐標、五區裁剪 rings、高度／層數 conventions、斜屋面、來源入口、DTM 地台、surface／B1 道路及逐邊碰撞座標換算。
- `airside-world.js`：AIRSIDE 五個 interconnected volumes、四種曲率 fluted glass、斜 reveal、百頁及 LED fins、兩個來源入口、地面車路開口、PV、屋頂花園、日夜材質、碰撞及 stats。
- `champion-tower-architecture.js`：冠君大廈精確 OSM 翼、弧形大堂、來源高度、plaza 及 collider 座標換算。
- `champion-tower-world.js`：冠君大廈弧形反光幕牆、無框玻璃大堂、金屬冠頂、現行字牌、日夜材質、碰撞及 stats。
- `ckc2-architecture.js`：長江集團中心二期精確九頂點 OSM 來源、OBB、來源高度／面積、入口 frame、plaza 及 collider 座標換算。
- `ckc2-world.js`：二期藍玻窗格、五層 jumbo-glass 裙樓、兩道設備帶、紅色 `CKC II` 冠頂、BMU、入口螺旋裝置、日夜材質、碰撞及 stats。
- `simple-world.js`：只整合這二十三個 authored landmarks；普通 `buildings` 仍為 0。
