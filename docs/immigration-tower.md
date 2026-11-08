# 入境事務大樓 Immigration Tower（灣仔舊址）

用戶確認指告士打道 7 號入境事務大樓，曾容納庫務署，並非隔鄰稅務大樓或長沙灣現時的庫務大樓。參考照片、權利提示和來源索引存於 [`references/hongkong/immigration-tower/`](../references/hongkong/immigration-tower/README.md)。

主樓輪廓採 OSM way 510722228 v8（© OpenStreetMap contributors，ODbL）；其 Wikipedia／Commons 標籤錯誤指向終審法院，不予採用。模型採 180.8m／49 層的 CTBUH 資料，OSM 標籤則記 180m／50 層。深藍灰玻璃、細密銀灰格框、黑色粗框及深色底座按照片塑造；告士打道一側加上相片所見的淺灰傾斜飾板、分格及招牌。窗行、框數及大堂雨篷尺寸為照片導向估算，並非施工圖。夜間部分窗格使用隨日夜變化的暖色自發光，開燈位置屬示意，不代表實際租戶或亮燈時段；屋頂以照片參考加入面海的歷史藍色 PHILIPS LED 字樣和開放鋼架，夜間亮起；這是約 2007–2021 年的歷史版本，不代表現時廣告商。鋼架尺寸為照片估算，並非實測。官方記載該大樓參與幻彩詠香江的是屋頂 LED。

模型以中心的 DTM 高度約 5m 為基準，外牆腳及雨篷柱腳取局部地形；**並非實測樓面標高**。花園一側 OSM 入口節點附近設雙開口，依 POF 照片加中間玻璃、金屬門框、觸覺帶，入口後設估算大小、以圍牆收口的局部地下前廳及夜燈。HF95 已接至估算的 1/F 前廳；兩個前廳均不是完整大堂，未有室內樓梯或升降機接駁。周邊道路 5,893 個一米格採樣、4.8m 車高的 collider 檢查零命中；此為離散測試，不代表完整連續路面、天橋、行人或駕駛驗證。地形未被改平，入口地板依現有 DTM 基準鋪設；告士打道一側的六級樓梯、斜道及兩入口之間的完整通道未完成，仍需實景及道路高度校正。模型未在完整遊戲或 WebGPU 實測，不能當作已目視驗收。

局部地勢複核：在入口與主樓範圍以 1m 網格取樣（building-local x −32…25m、z −21…21m），現有 DTM 均約 5m；因此未再疊加虛假平地台。雨篷及南面斜板投影另用道路查詢測試，並檢查面海 LED 朝北。這只反映現有資料和離散取樣，並不能取代現場標高、天橋及路面接駁驗證。

### Night-light audit

The game already used a `MeshStandardNodeMaterial` and a per-window `aLit` attribute, but its night-emission multiplier was only 0.26. It is now 0.9 to make the existing warm scattered office lights more visible; this is a visual approximation, not a claim about real occupancy or façade floodlighting. The shared day/night uniform still switches emission off in daytime. Rooftop sign and vestibule lights remain separate. This change adds no geometry, changes no colliders and does not alter the terrain or road layout. The normal Editor JSON deliberately simplifies TSL and does **not** carry the night effect; experimental TSL JSON contains the node graph, but the stock Editor does not restore it. Actual night appearance in the game has not yet been visually verified.
