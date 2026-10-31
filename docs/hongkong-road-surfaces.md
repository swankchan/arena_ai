# 香港現有路面與正式交通設施

## 本次範圍

本次只改善**現有道路**，沒有新增車行或行人天橋，也沒有把 OSM `layer` 當成以米計的橋高。全港高架橋候選群組仍以 `hongkong-viaduct-inventory.md` 的覆核狀態為準。

## 香港專用瀝青 profile

- `createHongKongRoadSurfaceMaterial()` 與紐約預設 `createRoadSurfaceMaterial()` 分開。紐約保留原有顏色、人孔蓋間距、出生點水窪及時代廣場霓虹反光。
- 香港使用冷灰瀝青底色及較疏的街道 utility covers；不繼承曼哈頓出生點水窪或時代廣場霓虹。
- 現有跨海橋使用 `structure: 'bridge'`，隧道使用 `dry: true, structure: 'tunnel'`；兩者都不生成隨機街道人孔蓋。道路幾何、橋隧標高、上下層地面選擇及行車路線不變。

## 現行 unified-simple 的正式標線與過路設施

`simple-world.js` 現在接入既有 `createHongKongTrafficAids()`，城市 pack 亦轉發 `trafficAids`。這不是由 OSM 道路中心線推測的新標線，而是沿用已核對的 TIS_16 資料及原有幾何生成器：

- 121 個道路標記 features，全部渲染，沒有跳過。
- 10 組過路設施、72 條 crossing stripes；沒有憑空加入 zebra crossing。
- 4 個黃格 features。
- 82 個車輛信號頭，全部保留官方角度，組成 44 個 assemblies；另有 20 個行人信號頭及控制單元。
- 沒有官方 phase 資料，因此信號仍然不模擬燈號輪轉。

全港道路的頂面是 `FULL_WORLD_HEIGHT.road = 0.025 m`。Surveyed paint 原本的局部高度是 0.010–0.016 m，因此現行模式通過 `surfaceY` 將整批標線上移 0.025 m，實際世界高度為 **0.035–0.041 m**，不會藏在校准後的瀝青下面。舊 detailed presentation 的 `surfaceY` 預設仍是 0，沒有雙重抬高。

## 限制

- TIS_16 只覆蓋其已保存的中環核心資料範圍；本次沒有為全港其他道路臆造車道線、斑馬線或信號。
- 沒有新增路緣牆或路口封閉幾何，避免擋住合法行車及行人路線。
- 沒有改變 HSBC／渣打外觀、正式道路寬度、交通流向、橋隧模型或全港可行駛道路資料。

## 驗收

- 針對性 source／geometry tests 及完整 `node --test "tests/*.test.cjs"`。
- Chromium 強制 WebGL runtime：標線、黃格、信號與香港道路材質近景；沒有 JavaScript／WebGL 錯誤。
- 另拍攝青馬大橋橋面（ground Y = 32 m）及西區海底隧道內部（ground Y = -22 m）；兩者均使用 `MeshStandardNodeMaterial`，乾隧道與橋面沒有隨機街道人孔蓋。
