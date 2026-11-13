import { authoredOsmSource, makeAuthoredSite, projectHongKongLonLat } from './authored-landmark-site.js';
// © OpenStreetMap contributors, ODbL 1.0; retrieved 2026-11-07.
export const STATUE_SQUARE_SOUTH_SOURCE = authoredOsmSource({"type":"way","id":42293434,"version":15,"geometry":[{"lat":22.2814185,"lon":114.1595963},{"lat":22.2813607,"lon":114.1595772},{"lat":22.2813111,"lon":114.1595608},{"lat":22.2812849,"lon":114.1596536},{"lat":22.2810851,"lon":114.1595876},{"lat":22.2810723,"lon":114.1595834},{"lat":22.2810487,"lon":114.1595756},{"lat":22.2810057,"lon":114.1595614},{"lat":22.2809864,"lon":114.159555},{"lat":22.2809692,"lon":114.1595493},{"lat":22.2809725,"lon":114.1595377},{"lat":22.2809758,"lon":114.1595261},{"lat":22.2809942,"lon":114.1594612},{"lat":22.2808806,"lon":114.1594236},{"lat":22.2808622,"lon":114.1594886},{"lat":22.2808589,"lon":114.1595002},{"lat":22.2808556,"lon":114.1595118},{"lat":22.2808194,"lon":114.1596395},{"lat":22.2808079,"lon":114.1596803},{"lat":22.2807947,"lon":114.1597283},{"lat":22.2807471,"lon":114.1598977},{"lat":22.2807119,"lon":114.1600231},{"lat":22.2809014,"lon":114.1600877},{"lat":22.2809271,"lon":114.1600964},{"lat":22.2811177,"lon":114.1601614},{"lat":22.2811412,"lon":114.1601694},{"lat":22.2812461,"lon":114.1602051},{"lat":22.2813225,"lon":114.1599435},{"lat":22.2813357,"lon":114.159897},{"lat":22.2813923,"lon":114.1596891},{"lat":22.2814185,"lon":114.1595963}],"tags":{"name":"Statue Square"},"evidence":"OSM outer ring of relation 6970394; interiors and detailed forms are photo-directed."});
export const STATUE_SQUARE_SOUTH = makeAuthoredSite('statueSquareSouth','皇后像廣場','Statue Square',STATUE_SQUARE_SOUTH_SOURCE,{role:'garden'});
export const STATUE_SQUARE_NORTH_SOURCE = authoredOsmSource({"type":"way","id":25607730,"version":9,"geometry":[{"lat":22.282001,"lon":114.1598774},{"lat":22.2816268,"lon":114.159762},{"lat":22.2814756,"lon":114.1603347},{"lat":22.2816577,"lon":114.1603908},{"lat":22.2816793,"lon":114.1603976},{"lat":22.2817008,"lon":114.1604042},{"lat":22.2818498,"lon":114.1604501},{"lat":22.282001,"lon":114.1598774}],"tags":{"name":"Statue Square"},"evidence":"OSM outer ring of relation 6970394; interiors and detailed forms are photo-directed."});
export const STATUE_SQUARE_NORTH = makeAuthoredSite('statueSquareNorth','皇后像廣場','Statue Square',STATUE_SQUARE_NORTH_SOURCE,{role:'garden'});
// Individual OSM feature geometry in [longitude, latitude] order, closed where applicable.
export const SQUARE_WATER = Object.freeze([
 {id:295407496, version:2, ring:[[114.1597941,22.2809870],[114.1598909,22.2809587],[114.1598388,22.2808056],[114.1597416,22.2808342],[114.1597460,22.2808470],[114.1597941,22.2809870]]},
 {id:295407519, version:2, ring:[[114.1598917,22.2811704],[114.1599496,22.2811535],[114.1599218,22.2810721],[114.1600006,22.2810491],[114.1599787,22.2809848],[114.1598420,22.2810247],[114.1598727,22.2811147],[114.1598917,22.2811704]]},
 {id:1242565441,version:1, ring:[[114.1598917,22.2811704],[114.1598727,22.2811147],[114.1598496,22.2811214],[114.1598263,22.2811282],[114.1598033,22.2811349],[114.1597801,22.2811417],[114.1597431,22.2811525],[114.1597621,22.2812082],[114.1597991,22.2811974],[114.1598222,22.2811906],[114.1598453,22.2811839],[114.1598685,22.2811771],[114.1598917,22.2811704]]},
 {id:295407520, version:2, ring:[[114.1599451,22.2813196],[114.1599349,22.2812896],[114.1600020,22.2812701],[114.1599896,22.2812337],[114.1600568,22.2812141],[114.1600794,22.2812804],[114.1599451,22.2813196]]},
 {id:107324771, version:2, ring:[[114.1599444,22.2818405],[114.1598904,22.2816660],[114.1600791,22.2816161],[114.1601330,22.2817906],[114.1599444,22.2818405]]}
].map(p=>Object.freeze({...p,world:Object.freeze(p.ring.flatMap(([lon,lat])=>projectHongKongLonLat(lon,lat)))})));
export const SQUARE_SHELTERS=Object.freeze([
 {id:1242565444,ring:[[114.1597801,22.2811417],[114.1597495,22.2810518],[114.1597125,22.2810626],[114.1597431,22.2811525]]},
 {id:1242565445,ring:[[114.1598268,22.2812788],[114.1597991,22.2811974],[114.1597621,22.2812082],[114.1597899,22.2812896]]},
 {id:1242565448,ring:[[114.1600444,22.2811777],[114.1600305,22.2811370],[114.1598963,22.2811761],[114.1599101,22.2812168]]},
 {id:1242565450,ring:[[114.1599627,22.2809378],[114.1599014,22.2807579],[114.1598574,22.2807707],[114.1599187,22.2809506]]}
].map(p=>Object.freeze({...p,world:Object.freeze(p.ring.flatMap(([lon,lat])=>projectHongKongLonLat(lon,lat)))})));
export const JACKSON_POSITION=Object.freeze(projectHongKongLonLat(114.1596580,22.2810055)); // OSM node 9705188417 v11.
export const CENOTAPH_RING=Object.freeze([[114.1605951,22.2816122],[114.1605473,22.2816248],[114.1605555,22.2816515],[114.1606033,22.2816389],[114.1605951,22.2816122]].flatMap(([lon,lat])=>projectHongKongLonLat(lon,lat))); // way 737551130 v4, 10.66 m.

// 和平紀念碑（英軍陣亡紀念碑）歷史與建築規範
// The Cenotaph (Hong Kong) Historic & Architectural Specifications
export const CENOTAPH_SOURCE = Object.freeze({
  id: 'HK-CENTRAL-CENOTAPH',
  osmWayId: 737551130,
  name: '和平紀念碑（英軍陣亡紀念碑）The Cenotaph',
  nameEn: 'The Cenotaph, Hong Kong',
  architect: 'Sir Edwin Lutyens (設計原版為倫敦白廳和平紀念碑 Whitehall Cenotaph 同款複製品)',
  unveiledDate: '1923-05-24',
  declaredMonumentDate: '2015-10-23',
  heightMetres: 10.66,
  material: '細琢花崗岩 / 淺灰石灰岩 (Fine-dressed Hong Kong granite / limestone)',
  inscriptions: Object.freeze([
    'THE GLORIOUS DEAD',
    '1914-1918',
    '1939-1945',
    '英靈不滅 浩氣長存'
  ]),
  flagstaffsCount: 6,
  wreathsCount: 4,
  researchSources: Object.freeze([
    {
      url: 'https://www.amo.gov.hk/en/historic-buildings/declared-monuments/hong-kong-island/the-cenotaph/index.html',
      title: 'The Cenotaph, Central — Antiquities and Monuments Office (AMO)',
      evidence: 'Declared monument in 2015; unveiled 24 May 1923; designed by Sir Edwin Lutyens as a replica of London Whitehall Cenotaph; 10.66m high; commemorates victims of WWI and WWII.'
    },
    {
      url: 'https://fpf.ccidahk.gov.hk/en/location/detail.php?id=1369',
      title: 'Statue Square — Film Services Office',
      evidence: 'Statue Square divided into north and south sections by Chater Road; features 1965 Alan Fitch folded plate canopies, reflecting pools, and Sir Thomas Jackson bronze statue.'
    }
  ])
});

