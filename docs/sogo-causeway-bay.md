# 銅鑼灣崇光百貨／東角中心

本模型是香港銅鑼灣軒尼詩道 555 號，不是其他分店。商場的[官方照片及地址](https://www.sogo.com.hk/en/support/contact-us)顯示東角路轉角的藍色 SOGO 字樣和圓形標記、玻璃地舖、淺色折面外牆、大幅廣告及雨篷；[外觀照片](https://www.oneday.com.hk/en_US/buildings/east-point-centre/)可見上部的深色橫窗與淺色橫帶。模型按這些特徵重建，而非將外牆整面塗白。

平面保留 OSM [整體輪廓 way 294141091 v8](https://api.openstreetmap.org/api/0.6/way/294141091/full.json)、[上部 way 198586269 v6](https://api.openstreetmap.org/api/0.6/way/198586269/full.json)及[後翼 way 220977125 v3](https://api.openstreetmap.org/api/0.6/way/220977125/full.json)；© OpenStreetMap contributors，ODbL 1.0。OSM 上部最低層標籤有 `fixme`，並非實測高度。[中原資料](https://oir.centanet.com/en/property/office/hk-island-causeway-bay-%E6%9D%B1%E8%A7%92%E4%B8%AD%E5%BF%83/detail/f04cf128-1d03-41b5-b20f-e0886b7582ac/)列 22 個編號樓層及另稱 25 層，[LeasingHub](https://www.leasinghub.com/building/east-point-centre/1378)列最高 22/F；OSM 標 23 層。78 m 上部、54 m 後翼和立面分段高度是場景估算，並非量測或官方高度。大型廣告是原創示意圖，不是現有品牌廣告；門框接近 OSM 出入口，但不能進入，室內及 D1／D2 港鐵扶手電梯沒有建造。

以 `tests/sogo.test.cjs` 對 2,688 個鄰近道路網格點作車輛高度碰撞採樣，及對 364 個附近電車中心線點以 1.3 m 半寬測試，未命中模型碰撞盒。這些是離散抽樣，並非連續駕駛證明；雨篷和招牌外伸、街燈與站台仍需實景檢查。獨立場景的 forceWebGL 畫面已檢查，但沒有完成完整遊戲 WebGPU、實際駕駛或街景視角驗證。
