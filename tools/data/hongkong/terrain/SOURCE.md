# 香港地形資料來源與限制

## 原始資料

- **Survey and Mapping Office, Lands Department, Government of the HKSAR** — Hong Kong 5 m Digital Terrain Model (DTM)。
- 官方資料集：https://data.gov.hk/en-data/dataset/hk-landsd-openmap-5m-grid-dtm
- 官方下載：https://www.landsd.gov.hk/landsd_psi_data/SMO/data/Whole_HK_DTM_5m.zip
- 使用條款：DATA.GOV.HK Terms of Use；保留地政總署署名。
- 官方說明：5 m grid、約 **±5 m** 準確度；包括植被高度及部分非地面資訊，例如架空道路和橋樑。因此這不是每一條道路的工程測量高程。

## 本地輸入快照

`hk-dtm5m.json` 是官方 DTM 的 **70 m HK1980 Grid（EPSG:2326）重採樣快照**，取自：

- https://github.com/wiiiimm/hongkong-sandbox/blob/5777bc98fb354c369ee6234d08c64a38279e3a27/3d-viewer/data/hk-dtm5m.json
- 上游 commit：`5777bc98fb354c369ee6234d08c64a38279e3a27`
- 輸入 SHA-256：`68ed8af6e07ab9b6dbe9d9b242e96648f7812b743172cfce700ec7700b09ea93`
- `hk-georef.json` 保留同一快照的 HK1980 grid georeference。

這裡只使用地形數據及 georeference，沒有複製上游應用程式碼。原始數據權利及 DATA.GOV.HK 條款不因重採樣而改變。

## 重建

```sh
npm ci
npm run build:hk-terrain
```

`build-terrain.mjs` 使用 `proj4` 將 HK1980 grid 雙線性重投影至本應用的中環切平面座標，輸出 `js/hk-terrain-data.js`。重建時以 `pyproj` 交叉核對過 EPSG:4326 ↔ EPSG:2326 轉換，差異低於 0.001 m；runtime 不需要 `proj4` 或網絡。

輸出网格為 70 m、0.25 m 量化；這是為靜態瀏覽器應用而做的降採樣，**不是 5 m 工程級路面模型**。已知高程檢查包括大帽山、太平山、鳳凰山及中環，結果記錄在 `manifest.json`。

## 道路與隧道的語義

- 普通道路及保留的 OSM elevated ways：在 runtime 以與地形 mesh 相同的兩個三角形作高度插值。來源重投影時使用雙線性採樣；DTM 本身可能包含植被或架空結構，因此不能宣稱每個路面高程都是實測。
- 六條現有跨海橋隧：保留既有主橋面／深水剖面，只把端點接回地形道路。
- 其他 OSM tunnel ways：以連通分量尋找 portals，從 portal 的 DTM 地面高度沿隧道網絡距離混合，並保持最少 4 m DTM-relative cover。內部剖面是**為可駕駛展示而生成的程序推定**，沒有官方隧道深度或工程設計含義。
- 所有 OSM 中心線、闊度、方向、左軚規則及橋隧 flags 保持原樣。
