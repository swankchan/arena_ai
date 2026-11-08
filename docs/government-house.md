# 香港禮賓府（前總督府）

參考圖片、來源及研究筆記存於 [`references/hongkong/government-house/`](../references/hongkong/government-house/README.md)。

此模型是中環香港禮賓府，不是終審法院或山頂舊總督山頂別墅。據[古物古蹟辦事處](https://www.amo.gov.hk/en/historic-buildings/monuments/hong-kong-island/monuments_59/index.html)，建築 1855 年完成，1889 年加東翼，日佔時改建加中央塔，並有日式屋頂。行政長官辦公室[介紹](https://www.ceo.gov.hk/gh/eng/house.html)確認正面朝南。按[政府照片](https://www.gohk.gov.hk/en/spots/spot_detail.php?spot=Government+House)構造淺色灰泥、深色瓦坡屋頂、塔樓、前山牆、上下層窗、內凹露台、花崗石門廊及前方綠屋頂門房；沒有使用照片貼圖。

主樓平面採 [OpenStreetMap way 42258038 v14](https://api.openstreetmap.org/api/0.6/way/42258038/full.json)；雙門房在 [OSM barrier node 1294918105](https://www.openstreetmap.org/node/1294918105) 附近按照片示意，位置和尺寸不是 OSM 所標的門房 footprint，亦未證實該節點正是禮賓府禮儀正門。開啟的鐵閘示意不阻塞現有的道路。OSM 資料 © OpenStreetMap contributors，ODbL 1.0。屋頂分翼、窗、門廊和 25.5 m 塔高依照片估算，並非測量，亦不代表現存每個房間的平面或全部屋頂細節。

主樓以輪廓最高 DTM 採樣（約 64.13 m）為基準，牆腳及門廊柱腳延伸至局部 DTM。入口小範圍地面和其可行走高度一致並漸變至原地勢，selected road 優先；這是場景近似，不是實測地台高程。門前花盆和灌木是示意，未完整重現園林、圍牆及所有道路；主樓、門房無可進入室內。

`tests/government-house.test.cjs` 在含門房的附近範圍檢查 4,283 個道路點、4.8 m 車輛高度，未與主樓及門房碰撞盒相交；入口地台採樣覆蓋、邊界漸變和場外高度也有測試。這是離散採樣，並非連續駕駛驗證。已檢查帶 DTM 的隔離 forceWebGL 畫面；未驗證完整遊戲、WebGPU、樹木遮擋、所有裝飾構件與交通的動態淨空或駕駛。
