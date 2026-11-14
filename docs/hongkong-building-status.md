# 原本 100 幢建築物：實際場景狀態核對

整理日期：**2026-11-07**。這份是對原本 `HK-B0001–B0100` 清單的 **active scene code audit**，不是另造一份候選清單，也不把 OSM 候選資料當成已建成。

**驗證限制**：標記「精修」只代表已有照片導向外觀，並非完整 WebGPU、室內或實際駕駛測試通過；大會堂亦仍須按用戶意見覆核。

## 結論

| 口徑 | 數量 | 說明 |
| --- | ---: | --- |
| 原 inventory 正式「已加入」 | **44** | 全部同時標示精修及 Landmark；有專用 world module 並接入 active `buildSimpleHongKongWorld`。 |
| 原表待製作、但實際已由其他組件生成，現已補精修 | **5** | 大會堂高／低座、HKCEC 新／舊翼、茶具文物館；各自有原 ID 精修驗證，仍不是新增獨立 Landmark。 |
| 有對應場景模型且已精修的清單行（上述兩類合計） | **49** | 44 個正式獨立 Landmark 加 5 個已精修公共／綜合組件。 |
| 未見專用實作、仍應視為待製作 | **51** | 沒有可核實的專用建模及 active 整合；不以舊 generic landmark 盒體充當完成。 |

**一句講晒：正式獨立 Landmark 44 幢；連同已補精修的 5 個公共／綜合組件，100 行入面有 49 行有模型且完成精修；仍有 51 行未做。**

inventory 已同步更新為「49 已加入／51 待製作」，並保留「44 個正式獨立 Landmark」口徑；這份 audit 將组件精修與獨立 Landmark 分開，避免把兩種完成混為一談。

## A. 正式已加入、精修及 Landmark（44）

| ID | 建築物 | 地區 | 主要實作 |
| --- | --- | --- | --- |
| `HK-B0001` | 滙豐總行大廈 HSBC Main Building | 中環 | `hsbc-headquarters-world.js` |
| `HK-B0002` | 渣打銀行大廈 Standard Chartered Bank Building | 中環 | `standard-chartered-world.js` |
| `HK-B0003` | 國際金融中心二期 Two International Finance Centre | 中環 | `two-ifc-world.js` |
| `HK-B0004` | 環球貿易廣場 International Commerce Centre | 西九龍 | `icc-world.js` |
| `HK-B0005` | 中銀大廈 Bank of China Tower | 中環 | `bank-of-china-world.js` |
| `HK-B0006` | 中環廣場 Central Plaza | 灣仔 | `central-plaza-world.js` |
| `HK-B0007` | 中環中心 The Center | 中環 | `the-center-world.js` |
| `HK-B0008` | 如心廣場 Nina Tower | 荃灣 | `nina-tower-world.js` |
| `HK-B0009` | 長江集團中心 Cheung Kong Center | 中環 | `cheung-kong-world.js` |
| `HK-B0010` | K11 Atelier（Victoria Dockside） | 尖沙咀 | `k11-atelier-world.js` |
| `HK-B0011` | 天璽I The Cullinan I | 西九龍 | `cullinan-i-world.js` |
| `HK-B0012` | 天璽II The Cullinan II | 西九龍 | `cullinan-ii-world.js` |
| `HK-B0013` | 名鑄 The Masterpiece | 尖沙咀 | `masterpiece-world.js` |
| `HK-B0014` | 朗豪坊辦公大樓 Langham Place Office Tower | 旺角 | `langham-place-world.js` |
| `HK-B0015` | 御峰 The Summit | 半山區 | `summit-world.js` |
| `HK-B0016` | 合和中心 Hopewell Centre | 灣仔 | `hopewell-world.js` |
| `HK-B0017` | 新鴻基中心 Sun Hung Kai Centre | 灣仔 | `sun-hung-kai-world.js` |
| `HK-B0018` | 太古廣場二座 Two Pacific Place | 金鐘 | `two-pacific-place-world.js` |
| `HK-B0019` | AIRSIDE | 啟德 | `airside-world.js` |
| `HK-B0020` | 利園一期 Lee Garden One | 銅鑼灣 | `lee-garden-one-world.js` |
| `HK-B0021` | 國際金融中心一期 One International Finance Centre | 中環 | `one-ifc-world.js` |
| `HK-B0022` | 冠君大廈 Champion Tower | 中環 | `champion-tower-world.js` |
| `HK-B0023` | 長江集團中心二期 Cheung Kong Center II | 金鐘 | `ckc2-world.js` |
| `HK-B0024` | 金鐘道政府合署高座 Queensway Government Offices High Block | 金鐘 | `qgo-world.js` |
| `HK-B0025` | 香港港麗酒店 Conrad Hong Kong | 金鐘 | `conrad-world.js` |
| `HK-B0026` | 希慎廣場 Hysan Place | 銅鑼灣 | `hysan-place-world.js` |
| `HK-B0027` | 太古坊二座 Two Taikoo Place | 鰂魚涌 | `two-taikoo-place-world.js` |
| `HK-B0028` | The Henderson | 中環 | `the-henderson-world.js` |
| `HK-B0029` | 交易廣場第一座 One Exchange Square | 中環 | `one-exchange-square-world.js` |
| `HK-B0030` | 交易廣場第二座 Two Exchange Square | 中環 | `two-exchange-square-world.js` |
| `HK-B0036` | 稅務大樓 Revenue Tower | 灣仔 | `revenue-tower-world.js` |
| `HK-B0037` | 怡和大廈 Jardine House | 中環 | `jardine-house-world.js` |
| `HK-B0056` | 皇室大廈安達人壽大樓 Chubb Tower, Windsor House | 銅鑼灣 | `windsor-house-world.js` |
| `HK-B0059` | 恒生銀行總行大廈 Hang Seng Bank Headquarters | 中環 | `hang-seng-world.js` |
| `HK-B0043` | 會景閣 Convention Plaza Apartments | 灣仔 | `hkcec-world.js` |
| `HK-B0084` | 星光行 Star House | 尖沙咀 | `star-house-world.js` |
| `HK-B0085` | 馬哥孛羅香港酒店 Marco Polo Hongkong Hotel | 尖沙咀 | `marco-polo-hongkong-world.js` |
| `HK-B0086` | 海洋中心 Ocean Centre | 尖沙咀 | `ocean-centre-world.js` |
| `HK-B0090` | 時代廣場 Times Square | 銅鑼灣 | `times-square-world.js` |
| `HK-B0092` | 終審法院 The Court of Final Appeal | 中環 | `court-of-final-appeal-world.js` |
| `HK-B0033` | 太古廣場三座 Three Pacific Place | 金鐘 | `three-pacific-place-world.js` |
| `HK-B0042` | 香港JW萬豪酒店 JW Marriott Hotel Hong Kong | 金鐘 | `jw-marriott-world.js` |
| `HK-B0045` | 太古廣場一座 One Pacific Place | 金鐘 | `one-pacific-place-world.js` |
| `HK-B0046` | 告羅士打大廈 Gloucester Tower | 中環 | `gloucester-tower-world.js` |

## B. 組件模型已補原 ID 精修（5）

這 5 行不是新增的獨立 Landmark；但已各自按照片／可靠資料補足精修、碰撞及測試，不再是「有模型但未精修」。

| ID | 建築物 | 地區 | 實際狀態／證據 |
| --- | --- | --- | --- |
| `HK-B0082` | 香港大會堂高座 Hong Kong City Hall High Block | 中環 | **已加入・已精修・公共組件** — `city-hall-world.js` High Block；補深混凝土模數 fins、樓層陰影縫及全周天台 coping，保留真實入口及高低座步道。獨立 commit `59ab0f2`。 |
| `HK-B0088` | 香港會議展覽中心新翼 HKCEC New Wing | 灣仔 | **已加入・已精修・綜合組件** — `hkcec-world.js` New Wing；新翼海旁增設金紫荊廣場（永遠盛開的紫荊花鍍金雕塑、三層紅色花崗岩圓台座、香港回歸祖國紀念碑、雙旗桿國旗與區旗組）、海濱長廊觀景欄杆、大會堂挑高前廳內部樓層與夜景暖光、飛鳥屋頂三脊頂紅色航空障礙燈；保留三層飛鳥屋頂與細曲面牆 fins。 |
| `HK-B0089` | 香港會議展覽中心舊翼 HKCEC Old Wing | 灣仔 | **已加入・已精修・綜合組件** — `hkcec-world.js` Old Wing；補海向長邊 93 段淺色弧形露台板、欄杆及圓角端部，道路／入口 collider 數保持不變。獨立 commit `59e26ad`。 |
| `HK-B0093` | 茶具文物館 Flagstaff House Museum of Tea Ware | 中環 | **已加入・已精修・公園組件** — 新增 `flagstaff-house-architecture.js`／`flagstaff-house-world.js`，不再用通用 heritage 盒體；保留 OSM ring、DTM 及兩個真實入口，補 Greek Revival 柱廊、線腳、拱窗、百葉、紅瓦屋顶及煙囪。獨立 commit `bae5901`。 |
| `HK-B0100` | 香港大會堂低座 Hong Kong City Hall Low Block | 中環 | **已加入・已精修・公共組件** — `city-hall-world.js` Low Block；保留 L 形來源立面，補 12 個花崗岩菱形窗框、9 道深遮陽板及 17 組天窗 curb，保留 3.2 m 入口開口。獨立 commit `6c0b28f`。 |

### 這類組件的邊界

- `HK-B0043` 本身是會景閣；其 HKCEC 綜合模型另包含 New Wing、Old Wing 及不屬這 100 行的 Atrium，所以 B0088／B0089 是有模型的組件，不是新增兩次正式交付。
- `HK-CENTRAL-CH` 同時生成大會堂 High Block、Low Block、附屬建築及 Memorial Garden；這裡只把原清單的 B0082／B0100 對應出來，不把附屬設施額外計數。
- 茶具文物館仍屬香港公園組件，不新增一個獨立 Landmark；但現在由專用 Flagstaff House module 生成，已按 B0093 補上照片導向精修，不再呼叫通用 heritage builder。

## C. 仍待製作／未見專用實作（51）

| ID | 建築物 | 地區 | 原表高度參考 | 位置／footprint 依據 |
| --- | --- | --- | --- | --- |
| `HK-B0031` | 力寶中心第二座 Lippo Centre Tower 2 | 金鐘 | 186 m | OSM way 107336263 |
| `HK-B0032` | 友邦金融中心 AIA Central | 中環 | 185 m | OSM way 107324767 |
| `HK-B0034` | 會展廣場辦公大樓 Convention Plaza Office Tower | 灣仔 | 181 m | OSM way 107497689 |
| `HK-B0035` | 入境事務大樓 Immigration Tower（外觀已加入、地台／天橋等待完成） | 灣仔 | 180 m | OSM way 510722228；[現況](immigration-tower.md) |
| `HK-B0038` | 華潤大廈 China Resources Building | 灣仔 | 178 m | OSM way 107497701 |
| `HK-B0039` | 遠東金融中心 Far East Finance Centre | 金鐘 | 176 m | OSM way 107336261 |
| `HK-B0040` | 力寶中心第一座 Lippo Centre Tower 1 | 金鐘 | 172 m | OSM way 107336260 |
| `HK-B0041` | 中國工商銀行大廈 ICBC Tower | 金鐘 | 167 m | OSM way 107497693 |
| `HK-B0044` | 香港康得思酒店 Cordis Hong Kong | 旺角 | 162 m | OSM way 185564131 |
| `HK-B0047` | 世貿中心 wwwtc | 銅鑼灣 | 152 m | OSM relation 19456337 |
| `HK-B0048` | 新世界大廈 New World Tower | 中環 | 151 m | OSM way 1323550598 |
| `HK-B0049` | 多盛大廈 Dorset House | 鰂魚涌 | 151 m | OSM way 100652800 |
| `HK-B0050` | 萬麗海景酒店 Renaissance Hong Kong Harbour View Hotel | 灣仔 | 150 m | OSM way 107497707 |
| `HK-B0051` | 大新金融中心 Dah Sing Financial Centre | 灣仔 | 150 m | OSM way 200283000 |
| `HK-B0052` | 美國銀行中心 Bank of America Tower | 金鐘 | 146 m | OSM relation 17045256 |
| `HK-B0053` | 海港中心 Harbour Centre | 灣仔 | 146 m | OSM relation 18183384 |
| `HK-B0054` | 鷹君中心 Great Eagle Centre | 灣仔 | 146 m | OSM relation 18183385 |
| `HK-B0055` | 交易廣場第三座 Three Exchange Square | 中環 | 144 m | OSM way 148554950 |
| `HK-B0057` | 統一中心 United Centre | 金鐘 | 140 m | OSM way 107336258 |
| `HK-B0058` | 灣仔政府大樓 Wanchai Tower | 灣仔 | 137 m | OSM way 27087041 |
| `HK-B0060` | 中國建設銀行大廈 CCB Tower | 中環 | 135 m | OSM way 242113651 |
| `HK-B0061` | iSQUARE | 尖沙咀 | 130 m | OSM relation 15829461 |
| `HK-B0062` | 香港君悅酒店 Grand Hyatt Hong Kong | 灣仔 | 129 m | OSM way 107497699 |
| `HK-B0063` | 海富中心一座 Admiralty Centre Tower 1 | 金鐘 | 126 m | OSM way 107336262 |
| `HK-B0064` | 中信大廈 CITIC Tower | 金鐘 | 126 m | OSM way 107353963 |
| `HK-B0065` | 協成行中心 Hip Shing Hong Centre | 中環 | 125 m | OSM way 148554937 |
| `HK-B0066` | 瑞安中心 Shui On Centre | 灣仔 | 118 m | OSM way 241998997 |
| `HK-B0067` | 港運大廈 Island Place Tower | 北角 | 116.2 m | OSM way 100652797 |
| `HK-B0068` | 中國人民解放軍駐香港部隊大廈 Chinese People's Liberation Army Forces Hong Kong Building | 中環 | 113 m | OSM way 101959095 |
| `HK-B0069` | 海濱廣場一座 One Harbourfront | 紅磡 | 110 m | OSM way 151401235 |
| `HK-B0070` | 海濱廣場二座 Two Harbourfront | 紅磡 | 110 m | OSM way 151401236 |
| `HK-B0071` | 修頓中心 Southorn Centre | 灣仔 | 107 m | OSM way 148858987 |
| `HK-B0072` | 海富中心二座 Admiralty Centre Tower 2 | 金鐘 | 104 m | OSM way 107336259 |
| `HK-B0073` | 海港政府大樓 Harbour Building | 中環 | 96 m | OSM way 26599387 |
| `HK-B0074` | K11 ARTUS 寓館 K11 ARTUS | 尖沙咀 | 96 m | OSM way 693489169 |
| `HK-B0075` | 庫務大樓 Treasury Building | 長沙灣 | 95.3 m | OSM way 1089354187 |
| `HK-B0076` | 工業貿易大樓 Trade and Industry Tower | 啟德 | 93.5 m | OSM way 385568445 |
| `HK-B0077` | 朗豪坊購物商場 Langham Place The Mall | 旺角 | 90 m | OSM way 102411832 |
| `HK-B0078` | 西九龍法院大樓 West Kowloon Law Courts Building | 西九龍 | 88 m | OSM way 858895719 |
| `HK-B0079` | 啟匯 Harbourside HQ | 啟德 | 85 m | OSM way 198558927 |
| `HK-B0080` | 雙子匯一期 The Twins Tower 1 | 啟德 | 80 m | OSM relation 20599094 |
| `HK-B0081` | 雙子匯二期 The Twins Tower 2 | 啟德 | 120 m | OSM relation 20599095 |
| `HK-B0083` | 中電總部 CLP Headquarters | 九龍塘 | 57 m | OSM way 1138054767 |
| `HK-B0087` | 香港朗廷酒店 The Langham Hong Kong | 尖沙咀 | 55 m | OSM way 159324344 |
| `HK-B0091` | 美利尼依格羅酒店 The Murray, Hong Kong, A Niccolo Hotel | 中環 | — | OSM way 85320844 |
| `HK-B0094` | 法國外方傳道會大樓 French Mission Building | 中環 | — | OSM way 85320697 |
| `HK-B0095` | 利園二期 Lee Garden Two | 銅鑼灣 | — | OSM way 199305182 |
| `HK-B0096` | 東角中心 East Point Centre | 銅鑼灣 | — | OSM way 294141091 |
| `HK-B0097` | 圓方 Elements | 西九龍 | 30 m | OSM way 1415166820 |
| `HK-B0098` | 戲曲中心 Xiqu Centre | 西九龍 | — | OSM way 545997140 |
| `HK-B0099` | K11人文購物藝術館 K11 MUSEA | 尖沙咀 | 37 m | OSM way 1044263638 |

### C 類的近似誤判已排除

- B0034 會展廣場辦公大樓、B0041 ICBC Tower、B0094 法國外方傳道會大樓及 B0099 K11 MUSEA 雖然在相鄰模組的註解／身份區分出現，但沒有因此當成已建成。
- B0077 朗豪坊購物商場也不由 B0014 朗豪坊辦公大樓的塔身或 podium 柱代替；兩個 OSM 元件及交付範圍不同。

## 不計入這 100 行的其他場景項目

- 中央圖書館、海運大廈／LCX、太空館、文化中心、鐘樓、添馬政府總部、1881、酒店及其他額外公共／綜合組件，不因這份 100 行 audit 而改變分類。
- 紅磡香港體育館不是原本 `HK-B0001–B0100` 的一行；它已另行接入，不計入這 100 幢。
- `HK-B0068` 中國人民解放軍駐香港部隊大廈仍在 C 類；之前只有 OSM／照片研究，沒有可稱為已建成的 PLA world module。

## 核對方法及限制

- 以 `docs/hongkong-building-inventory.md` 的 100 行為母清單，檢查專用 module、active `buildHongKongWorld → buildSimpleHongKongWorld` 整合，以及組件實際 build function。
- 40 個正式已加入項目的 module 檔案及 import 均存在；B 類另外逐項核對 City Hall、HKCEC、Hong Kong Park 的生成程式。
- 這是程式／整合狀態整理，不是對 100 幢逐一重新做瀏覽器目測，也不表示每幢都沒有後續造型或道路修正需要。
- 原有 `tools/data/hongkong/landmarks.json` 只作來源／候選資料；沒有用 JSON 中出現的待製作建築來冒充 active scene 完成。
