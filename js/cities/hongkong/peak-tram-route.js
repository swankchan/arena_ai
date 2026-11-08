// Data-only route trace, not a playable railway. OSM relation 3264047 v20, © OpenStreetMap contributors, ODbL 1.0.
// Nodes are latitude/longitude in uphill order. The 2026 OSM stop_position at Garden Road replaces the
// historical former stop 279086619; terminal platform/track alignment needs field validation.
import { projectHongKongLonLat } from './authored-landmark-site.js';
const node=(id,lat,lon)=>Object.freeze({id,lat,lon,world:Object.freeze(projectHongKongLonLat(lon,lat))});
const N={
 lower:node(2525250101,22.2771695,114.1585770), n1:node(2525250108,22.2769392,114.1583785),n2:node(12121482731,22.2768893,114.1583380),n3:node(9625531416,22.2768355,114.1582941),n4:node(9625547917,22.2767649,114.1582439),kennedy:node(526904599,22.2765450,114.1580862),n5:node(990120464,22.2764321,114.1580080),n6:node(990120648,22.2762955,114.1579122),n7:node(6534947838,22.2756926,114.1574881),macdonnell:node(988059698,22.2751722,114.1571206),bowenFormer:node(13329898979,22.2747827,114.1568307),n8:node(26412146,22.2742035,114.1564041),may:node(988059498,22.2733633,114.1558870),switchLower:node(2715451261,22.2730611,114.1556754),
 a1:node(2715451257,22.2723574,114.1551776),a2:node(6001942311,22.2722980,114.1551248),a3:node(6001942312,22.2722192,114.1550396),a4:node(9628742356,22.2719353,114.1548486),a5:node(9628742357,22.2715303,114.1545673),a6:node(9628742358,22.2710864,114.1542534),a7:node(9628742359,22.2709635,114.1541532),a8:node(9628742360,22.2709040,114.1540965),a9:node(9628742361,22.2708276,114.1539696),a10:node(9628742362,22.2707511,114.1537372),a11:node(9628742363,22.2707279,114.1536027),a12:node(9628742364,22.2707327,114.1534450),a13:node(9628742365,22.2707523,114.1532799),a14:node(9628742366,22.2707971,114.1528732),a15:node(9628742367,22.2708323,114.1525915),
 b1:node(6001942313,22.2729948,114.1556136),b2:node(6001942314,22.2729253,114.1555332),b3:node(2715451259,22.2728732,114.1554799),b4:node(9628742354,22.2721453,114.1549689),b5:node(9628742355,22.2712816,114.1543629),b6:node(26412144,22.2710967,114.1542349),b7:node(2525250128,22.2710300,114.1541816),b8:node(2525250110,22.2709637,114.1541117),b9:node(2525250171,22.2709084,114.1540389),b10:node(2525250188,22.2708634,114.1539661),b11:node(760552193,22.2708224,114.1538857),b12:node(2525250131,22.2707940,114.1538063),b13:node(2525250167,22.2707709,114.1537159),b14:node(2525250116,22.2707542,114.1536219),b15:node(26412143,22.2707494,114.1535337),b16:node(2525250139,22.2707533,114.1534625),
 switchUpper:node(9628742368,22.2708793,114.1524047),barker:node(988059821,22.2709577,114.1517471),n9:node(5880372272,22.2709780,114.1515542),n10:node(5880372271,22.2709886,114.1514534),n11:node(2525250104,22.2711097,114.1503039),peak:node(26412045,22.2711230,114.1501414),upperEnd:node(2529451076,22.2711364,114.1499900)
};
export const PEAK_TRAM_NODES=Object.freeze(N);
export const PEAK_TRAM_SEGMENTS=Object.freeze([
 {id:85404150,nodes:[N.lower,N.n1]}, {id:1308940441,bridge:true,nodes:[N.n1,N.n2]}, {id:1308940440,nodes:[N.n2,N.n3]}, {id:1046739317,bridge:true,nodes:[N.n3,N.n4]}, {id:1046739316,nodes:[N.n4,N.kennedy,N.n5]}, {id:85404052,bridge:true,nodes:[N.n5,N.n6]}, {id:265943515,nodes:[N.n6,N.n7,N.macdonnell,N.bowenFormer,N.n8,N.may,N.switchLower]},
 {id:265943513,branch:'A',nodes:[N.switchLower,N.a1,N.a2,N.a3,N.a4,N.a5,N.a6,N.a7,N.a8,N.a9,N.a10,N.a11,N.a12,N.a13,N.a14,N.a15,N.switchUpper]},
 {id:265943512,branch:'B',nodes:[N.switchLower,N.b1,N.b2,N.b3,N.b4,N.b5,N.b6,N.b7,N.b8,N.b9,N.b10,N.b11,N.b12,N.b13,N.b14,N.b15,N.b16,N.switchUpper]},
 {id:1165024097,nodes:[N.switchUpper,N.barker,N.n9]}, {id:622565242,bridge:true,nodes:[N.n9,N.n10]}, {id:4338940,nodes:[N.n10,N.n11]}, {id:1117280223,buildingPassage:true,nodes:[N.n11,N.peak,N.upperEnd]},
].map(s=>Object.freeze({...s,nodes:Object.freeze(s.nodes)})));
export function peakTramRoute(branch='A') {
 if(branch!=='A'&&branch!=='B')throw new RangeError('branch must be A or B');
 const out=[];for(const segment of PEAK_TRAM_SEGMENTS){if(segment.branch&&segment.branch!==branch)continue;for(const p of segment.nodes){if(out.length&&out.at(-1).id===p.id)continue;out.push(p);}}
 return out;
}
