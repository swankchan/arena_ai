# 香港全港路燈

## 資料及重現

- 原始檔：`tools/data/hongkong/lamppost_en.csv`（保留用戶提供檔案的欄位、編號、地址及經緯度）。
- Runtime：`js/hk-street-light-data.js`，依原始 CSV 行序保存世界座標、燈臂朝向及單／雙臂推斷結果；世界座標量化至 0.001 m，原始經緯度仍以 CSV 為準。
- 審計：`tools/data/hongkong/street-lights-manifest.json`。
- 生成器：`tools/cities/hongkong/build-street-lights.mjs`。

```bash
npm run build:hk-street-lights
```

原始 SHA-256：`c82d05cb082e7f9cda514983da90f01f1ad095be77127cfe04d472f7d6e65c0d`。提供檔案沒有附上游 metadata，因此這裡不虛構發佈日期、下載網址或授權條款。

## 覆蓋及燈型限制

共 **144,995 個獨立燈柱編號、144,995 個 runtime 記錄**，沒有因位置重複而刪除編號；19 個重複座標亦按原檔保留。

CSV 只有 `Lamp Post Number / District / Location / Latitude / Longitude`，**沒有燈臂款式或燈柱高度欄位**。因此：

- **125,863 支單臂**：預設保守款式，燈臂指向最近行車線。
- **19,132 支雙臂**：只在道路幾何支持時推斷，包括中央燈桿兩側有平行行車道，或寬雙向道路的中央位置。
- **12,467 支方向 fallback**：55 m 內沒有可駕駛道路中心線，仍保留原座標及單臂，不猜作雙臂。
- 單雙臂分類是幾何推斷，不是逐支實地款式紀錄；日後如有正式燈型欄位，應取代推斷結果。

## 外觀及高度

模型依所提供的照片採用幼身微錐金屬燈桿、淺彎燈臂及細長燈頭。單臂不是被強制改成 T 字；雙臂由兩個相反方向的彎臂組成。通用高度為 **9.6 m**，屬展示尺寸，並非每支燈柱的測量高度。

夜間由暖黃 emissive 燈頭、加法混合光暈及地面光池構成；日間不發光。地面光池直徑 **18 m**，以外圍低能量散射配合柔和核心，不畫硬邊集中光斑。此系統的實時 PointLight 數目為 **0**。原本已手建的橋樑及隧道照明保留；66 個位於現有跨海橋面的記錄會使用橋面高度，其餘維持現行平面道路展示。

## 效能

- 1 km 空間分區，共 **892 個燈組**。
- 燈桿／燈臂／燈頭在約 800 m 內繪製。
- 地面光池限制在約 260 m；夜間遠距光暈可延伸至約 1.8 km。
- 各分區使用 InstancedMesh，共享幾何、材質及 shader pipeline；離開範圍的整組不提交繪製。
- 全港共有 **164,127 個燈頭**，但不會同時全部出現在鏡頭或陰影 pass。

主要實作：`js/cities/hongkong/street-lighting.js`；由所選 `simple_replace` 全港世界在 `js/cities/hongkong/simple-world.js` 建立及更新。
