# Statue Square & The Cenotaph: Sources, Architectural Reconstruction & Engineering Specifications

## Overview and Historical Context

Statue Square (皇后像廣場) and The Cenotaph (和平紀念碑 / 英軍陣亡紀念碑) form the ceremonial civic heart of Central, Hong Kong.
The area is bifurcated by Chater Road into the **South Garden** (flanked by the HSBC Main Building and Prince's Building) and the **North Garden** (flanked by Mandarin Oriental and the Court of Final Appeal / Old Supreme Court), extending towards Connaught Road Central and City Hall.

- **OpenStreetMap Relation [6970394](https://www.openstreetmap.org/relation/6970394)**:
  - South Garden: [Way 42293434](https://www.openstreetmap.org/way/42293434) (v15), area ~3,800 m².
  - North Garden: [Way 25607730](https://www.openstreetmap.org/way/25607730) (v9), area ~2,700 m².
  - Both geometries originate from `tools/data/hongkong/parks.json` and must remain strictly separated by Chater Road.

- **The Cenotaph (和平紀念碑 / 英軍陣亡紀念碑)**:
  - [OSM Way 737551130](https://www.openstreetmap.org/way/737551130) (v4), 10.66 m high, centred at approximately `22.281632° N, 114.160575° E` (`x: 100.51, z: 29.69`), situated in the memorial grass lawn directly between Statue Square North and the Court of Final Appeal.
  - **Antiquities and Monuments Office (AMO)**: Gazetted as a Declared Monument on 23 October 2015.
  - **Design & Architect**: Unveiled on 24 May 1923 by Governor Sir Reginald Stubbs. It was designed by renowned British architect **Sir Edwin Lutyens** as an almost identical replica of the Whitehall Cenotaph in London, built of fine-dressed Hong Kong granite / limestone.
  - Commemorates the dead of World War I (1914–1918) and World War II (1939–1945).

---

## Architectural & Mapped Features

### 1. The Cenotaph (和平紀念碑)
- **Granite Dais / Podium**:
  - Three expanding low ceremonial steps (0.24m, 0.20m, 0.20m rise) forming the stepped platform upon which dignitaries lay tribute wreaths during Remembrance Sunday and Liberation Day services.
- **Pylon & Entasis Profile (10.66 m Total Height)**:
  - Stepped base plinth (`5.13 m × 3.07 m`).
  - Subtle entasis taper through lower shaft, upper setback course, upper entablature, frieze, and projecting molded cornice.
  - Crowned with an empty tomb chest (**Catafalque / 棺柩空冢**) and a stepped stone lid.
  - Fine horizontal ashlar joints spaced at 0.56 m intervals up all four facades.
- **Sculpted Stone Laurel Wreaths (石雕月桂花圈)**:
  - Four carved stone laurel wreaths mounted on the north, south, east, and west upper facades immediately beneath the catafalque.
- **Inscriptions**:
  - North & South facades: Engraved Roman capital lettering **"THE GLORIOUS DEAD"** and **"1914 - 1918" / "1939 - 1945"**.
  - East & West facades: Engraved Chinese characters **「英靈不滅 浩氣長存」** (carved in the 1970s/80s to honor Chinese and local defenders of Hong Kong).
- **Ceremonial Flagstaffs & Ensign Standards**:
  - Six tall bronze flagstaffs (three on the east flank, three on the west flank) with gilded spherical finials.
  - Ceremonial heraldic flags suspended from the masts.
- **Remembrance Day Poppy Tributes (國殤紀念虞美人花圈)**:
  - Scarlet red floral poppy tribute wreaths placed on the ceremonial steps at the foot of the monument.
- **Night Lighting (WebGPU TSL)**:
  - Four angled ground floodlights casting warm, solemn 3000K uplight onto the limestone pylon faces via `MeshStandardNodeMaterial` with `emissiveNode = color(...).mul(nightAmount())`.

### 2. Sir Thomas Jackson, Bart. Bronze Statue (昃臣爵士銅像)
- [OSM Node 9705188417](https://www.openstreetmap.org/node/9705188417) (v11) at `22.2810055° N, 114.1596580° E` (`x: -0.38, z: 92.48`).
- Sir Thomas Jackson, Bart. (1841–1915), legendary Chief Manager of The Hongkong and Shanghai Banking Corporation (HSBC), credited with establishing Hong Kong as a premier financial hub.
- Unveiled in 1906, sculpted by Mario Raggi. Facing directly **East** towards the Old Supreme Court / Court of Final Appeal and Jackson Road.
- **Pedestal**:
  - Multi-tiered classical Hong Kong granite pedestal with molded plinth, die block, and projecting molded capital cornice.
  - Bronze dedication plaque facing east.
  - Bronze figure clad in Victorian gentleman's formal frock coat, buttoned waistcoat, cravat, and formal trousers.
  - Four corner protective bronze bollards with plinth illumination.

### 3. Modernist Water Features & Reflecting Pools (噴泉水池)
- Five mapped OSM water polygons:
  - [Way 295407496](https://www.openstreetmap.org/way/295407496) (v2): South reflecting pool.
  - [Way 295407519](https://www.openstreetmap.org/way/295407519) (v2) & [Way 1242565441](https://www.openstreetmap.org/way/1242565441) (v1): Central interconnecting reflecting pools.
  - [Way 295407520](https://www.openstreetmap.org/way/295407520) (v2): North pool in South Garden.
  - [Way 107324771](https://www.openstreetmap.org/way/107324771) (v2): North Garden rectangular fountain basin.
- Granite bullnose perimeter coping stone edging with physics colliders.
- Parabolic foaming geyser fountain jets and peripheral bubbling water nozzles.
- Submerged underwater cyan-blue night LED luminaires (`waterGlow` with `emissiveNode`).

### 4. Alan Fitch 1965 Folded Concrete Canopies (折疊薄殼混凝土遮蔭涼亭)
- Designed by Government Architect Alan Fitch in 1965 during the grand modernist redesign of Statue Square.
- Mapped OSM shelters: [Way 1242565444](https://www.openstreetmap.org/way/1242565444), [Way 1242565445](https://www.openstreetmap.org/way/1242565445), [Way 1242565448](https://www.openstreetmap.org/way/1242565448), [Way 1242565450](https://www.openstreetmap.org/way/1242565450).
- True V-folded origami thin-shell concrete roof canopies with stainless steel tubular columns and cast anchor shoes.
- Recessed warm ceiling downlights (`warmLight` with `emissiveNode`) providing inviting evening illuminance.

### 5. Architectural Fountain Mosaic Relief Walls
- Two landmark Alan Fitch architectural fountain screens:
  - Dark bronze/terracotta modernist relief mosaic screen.
  - Light sculptured architectural concrete breeze-block relief screen.

### 6. MTR Central Station Entrances & Park Amenities
- MTR Central Station Entrance K & L portals with granite parapets and red glowing MTR logo totems.
- Classic dark-green cast-iron and solid teak wood park benches.
- Deep green cast-iron park lamp posts with warm spherical luminaires.
- Raised stone planters with Royal Palms (*Roystonea regia*) and neatly clipped hedges.

---

## Technical Validation & Test Coverage

1. **Road Clearance & Geometric Rigor**:
   - Paving grid cells: >2,200 sampled at 1.6 m resolution, verified strictly inside park rings and with `fullRoadSurfaceAt(x, z, 0.4) === null`.
   - Tree sites: >30 verified inside park rings with 2.9 m road clearance.
   - All 5 pools and Cenotaph verified with 0.2 m clearance from traffic surfaces.
2. **WebGPU TSL Night Lighting**:
   - Zero external textures needed for lights. All emissive nodes leverage `nightAmount()` to automatically turn on at dusk and off at dawn.
3. **Physics Colliders**:
   - Over 80 solid box colliders covering the Cenotaph dais, Jackson plinth, pool coping, canopy columns, benches, and MTR entrance portals.
