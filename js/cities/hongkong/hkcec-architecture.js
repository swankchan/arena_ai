// HK-B0043: Hong Kong Convention and Exhibition Centre with Convention Plaza Apartments (會景閣).
// The four exact OSM rings remain separate: New Wing, Old Wing, the multi-level Atrium and the apartment tower.
// Convention Plaza Office Tower (way 107497689), Grand Hyatt and Renaissance Harbour View are NOT substituted
// for the requested apartment tower. The HKCEC wings are the podium complex of this single inventory entry.
import { minimumAreaObb, flatRingBounds, pointInFlatRing } from './landmark-site.js';

const RAW_SOURCES = {
  "newWing": {
    "type": "way",
    "id": 26490011,
    "version": 20,
    "wayTimestamp": "2023-10-21T07:19:47Z",
    "changeset": 142910648,
    "retrieved": "2026-11-03",
    "sourceUrl": "https://api.openstreetmap.org/api/0.6/way/26490011/full.json",
    "sourceTimestamp": "2026-10-29T21:21:26Z",
    "sourceSha256": "c6fd49e15358616f46e3f00efb041ef2dfe6df470274b6074bc6492f3e406224",
    "sourceDataset": "Geofabrik Hong Kong OSM extract; current way metadata checked against OSM API",
    "attribution": "© OpenStreetMap contributors",
    "license": "ODbL 1.0",
    "tags": {
      "addr:housename": "香港會議展覽中心 Hong Kong Convention and Exhibition Centre",
      "addr:housename:en": "Hong Kong Convention and Exhibition Centre",
      "addr:housename:zh": "香港會議展覽中心",
      "alt_name": "第2期 Phase 2",
      "alt_name:en": "Phase 2",
      "alt_name:zh": "第1期",
      "building": "commercial",
      "building:levels": "5",
      "layer": "3",
      "name": "新翼 New Wing",
      "name:en": "New Wing",
      "name:zh": "新翼",
      "roof:levels": "2",
      "roof:shape": "half-hipped",
      "wikidata": "Q597725",
      "wikimedia_commons": "Category:Hong Kong Convention and Exhibition Centre",
      "wikipedia": "en:Hong Kong Convention and Exhibition Centre"
    },
    "geometry": [
      {
        "id": 290330131,
        "lon": 114.1723069,
        "lat": 22.2827012
      },
      {
        "id": 1599951204,
        "lon": 114.1722941,
        "lat": 22.2827171
      },
      {
        "id": 290330134,
        "lon": 114.172204,
        "lat": 22.2828612
      },
      {
        "id": 1599951256,
        "lon": 114.1721554,
        "lat": 22.2829372
      },
      {
        "id": 6875521361,
        "lon": 114.1721596,
        "lat": 22.2830438
      },
      {
        "id": 308229442,
        "lon": 114.1721656,
        "lat": 22.2831959
      },
      {
        "id": 9339975871,
        "lon": 114.1721806,
        "lat": 22.2833498
      },
      {
        "id": 290330135,
        "lon": 114.1721863,
        "lat": 22.2834084
      },
      {
        "id": 1599951154,
        "lon": 114.1722117,
        "lat": 22.2835681
      },
      {
        "id": 1599951177,
        "lon": 114.1722583,
        "lat": 22.2837299
      },
      {
        "id": 1599951249,
        "lon": 114.1723159,
        "lat": 22.2838891
      },
      {
        "id": 9681836915,
        "lon": 114.1723338,
        "lat": 22.2839324
      },
      {
        "id": 1599951132,
        "lon": 114.1723707,
        "lat": 22.2840213
      },
      {
        "id": 9681896720,
        "lon": 114.1723963,
        "lat": 22.2840765
      },
      {
        "id": 1599951247,
        "lon": 114.1724282,
        "lat": 22.2841455
      },
      {
        "id": 1599951156,
        "lon": 114.1725167,
        "lat": 22.2842402
      },
      {
        "id": 290330137,
        "lon": 114.1725652,
        "lat": 22.2842574
      },
      {
        "id": 1599951184,
        "lon": 114.1725816,
        "lat": 22.2843439
      },
      {
        "id": 1599951111,
        "lon": 114.1725939,
        "lat": 22.2843932
      },
      {
        "id": 1599951239,
        "lon": 114.1726064,
        "lat": 22.2844436
      },
      {
        "id": 1599951112,
        "lon": 114.1726177,
        "lat": 22.2844714
      },
      {
        "id": 1599951188,
        "lon": 114.172627,
        "lat": 22.2844946
      },
      {
        "id": 1599951180,
        "lon": 114.1726546,
        "lat": 22.2845389
      },
      {
        "id": 1599951113,
        "lon": 114.1726875,
        "lat": 22.2845803
      },
      {
        "id": 6853998894,
        "lon": 114.1726919,
        "lat": 22.2845856
      },
      {
        "id": 1599951133,
        "lon": 114.1727237,
        "lat": 22.284624
      },
      {
        "id": 1599951137,
        "lon": 114.1727576,
        "lat": 22.2846492
      },
      {
        "id": 1599951163,
        "lon": 114.1727968,
        "lat": 22.2846733
      },
      {
        "id": 1599951213,
        "lon": 114.172846,
        "lat": 22.284696
      },
      {
        "id": 290330225,
        "lon": 114.1728954,
        "lat": 22.2847033
      },
      {
        "id": 1599951186,
        "lon": 114.1729502,
        "lat": 22.2847029
      },
      {
        "id": 1599951130,
        "lon": 114.173,
        "lat": 22.2846881
      },
      {
        "id": 1599951236,
        "lon": 114.1730358,
        "lat": 22.2846683
      },
      {
        "id": 1599951187,
        "lon": 114.1730722,
        "lat": 22.2846443
      },
      {
        "id": 1599951166,
        "lon": 114.1731123,
        "lat": 22.2846167
      },
      {
        "id": 1599951160,
        "lon": 114.1731176,
        "lat": 22.2846109
      },
      {
        "id": 1599951211,
        "lon": 114.1731494,
        "lat": 22.284576
      },
      {
        "id": 6853998895,
        "lon": 114.1731532,
        "lat": 22.2845716
      },
      {
        "id": 1599951185,
        "lon": 114.1731905,
        "lat": 22.2845282
      },
      {
        "id": 1599951182,
        "lon": 114.1732151,
        "lat": 22.2845
      },
      {
        "id": 1599951139,
        "lon": 114.1732463,
        "lat": 22.2844632
      },
      {
        "id": 1599951232,
        "lon": 114.1732768,
        "lat": 22.2844184
      },
      {
        "id": 1599951127,
        "lon": 114.1733001,
        "lat": 22.2843722
      },
      {
        "id": 290330140,
        "lon": 114.1733349,
        "lat": 22.2842603
      },
      {
        "id": 1599951234,
        "lon": 114.1733972,
        "lat": 22.2842466
      },
      {
        "id": 290330226,
        "lon": 114.1734635,
        "lat": 22.284177
      },
      {
        "id": 1599951212,
        "lon": 114.1735578,
        "lat": 22.2840593
      },
      {
        "id": 1599951209,
        "lon": 114.1736334,
        "lat": 22.2839417
      },
      {
        "id": 1599951135,
        "lon": 114.1737279,
        "lat": 22.2837976
      },
      {
        "id": 290330267,
        "lon": 114.1737909,
        "lat": 22.2836312
      },
      {
        "id": 1599951198,
        "lon": 114.1738361,
        "lat": 22.2834723
      },
      {
        "id": 1599951254,
        "lon": 114.1738562,
        "lat": 22.2833054
      },
      {
        "id": 290330144,
        "lon": 114.1738513,
        "lat": 22.2831364
      },
      {
        "id": 290330270,
        "lon": 114.1738306,
        "lat": 22.2830029
      },
      {
        "id": 1599951158,
        "lon": 114.1737843,
        "lat": 22.2828162
      },
      {
        "id": 1599951121,
        "lon": 114.1737619,
        "lat": 22.2827465
      },
      {
        "id": 1599951229,
        "lon": 114.1736053,
        "lat": 22.2824674
      },
      {
        "id": 1599951124,
        "lon": 114.1735279,
        "lat": 22.2823761
      },
      {
        "id": 290330229,
        "lon": 114.1734171,
        "lat": 22.2823022
      },
      {
        "id": 6853998890,
        "lon": 114.1728506,
        "lat": 22.2822596
      },
      {
        "id": 1952740879,
        "lon": 114.1727114,
        "lat": 22.2822491
      },
      {
        "id": 1599951214,
        "lon": 114.1726521,
        "lat": 22.2823075
      },
      {
        "id": 1599951252,
        "lon": 114.1725562,
        "lat": 22.2824186
      },
      {
        "id": 290330131,
        "lon": 114.1723069,
        "lat": 22.2827012
      }
    ]
  },
  "oldWing": {
    "type": "way",
    "id": 26490161,
    "version": 13,
    "wayTimestamp": "2024-10-16T02:27:19Z",
    "changeset": 157944489,
    "retrieved": "2026-11-03",
    "sourceUrl": "https://api.openstreetmap.org/api/0.6/way/26490161/full.json",
    "sourceTimestamp": "2026-10-29T21:21:26Z",
    "sourceSha256": "c6fd49e15358616f46e3f00efb041ef2dfe6df470274b6074bc6492f3e406224",
    "sourceDataset": "Geofabrik Hong Kong OSM extract; current way metadata checked against OSM API",
    "attribution": "© OpenStreetMap contributors",
    "license": "ODbL 1.0",
    "tags": {
      "addr:housename": "香港會議展覽中心 Hong Kong Convention and Exhibition Centre",
      "addr:housename:en": "Hong Kong Convention and Exhibition Centre",
      "addr:housename:zh": "香港會議展覽中心",
      "addr:housenumber": "1",
      "addr:street": "港灣道 Harbour Road",
      "addr:street:en": "Harbour Road",
      "addr:street:zh": "港灣道",
      "alt_name": "第1期 Phase 1",
      "alt_name:en": "Phase 1",
      "alt_name:zh": "第1期",
      "building": "commercial",
      "building:function": "podium",
      "building:levels": "10",
      "name": "舊翼 Old Wing",
      "name:en": "Old Wing",
      "name:zh": "舊翼"
    },
    "geometry": [
      {
        "id": 1235363444,
        "lon": 114.1718951,
        "lat": 22.2812319
      },
      {
        "id": 12254183043,
        "lon": 114.1719101,
        "lat": 22.2810594
      },
      {
        "id": 12254183026,
        "lon": 114.1719131,
        "lat": 22.2810253
      },
      {
        "id": 1235363314,
        "lon": 114.1719311,
        "lat": 22.2808187
      },
      {
        "id": 7044272477,
        "lon": 114.1719624,
        "lat": 22.280794
      },
      {
        "id": 12254183046,
        "lon": 114.1719741,
        "lat": 22.2807847
      },
      {
        "id": 1235363480,
        "lon": 114.1721711,
        "lat": 22.2806296
      },
      {
        "id": 7044325104,
        "lon": 114.1726112,
        "lat": 22.2806624
      },
      {
        "id": 9050732251,
        "lon": 114.1727247,
        "lat": 22.2806704
      },
      {
        "id": 7044272476,
        "lon": 114.1729263,
        "lat": 22.2806846
      },
      {
        "id": 7044325108,
        "lon": 114.173063,
        "lat": 22.2806943
      },
      {
        "id": 7044325107,
        "lon": 114.1732512,
        "lat": 22.2807082
      },
      {
        "id": 1235363347,
        "lon": 114.1735866,
        "lat": 22.2807313
      },
      {
        "id": 9221275747,
        "lon": 114.1737293,
        "lat": 22.2807411
      },
      {
        "id": 1235363510,
        "lon": 114.17382,
        "lat": 22.2807473
      },
      {
        "id": 290331038,
        "lon": 114.1739665,
        "lat": 22.280908
      },
      {
        "id": 490737301,
        "lon": 114.173961,
        "lat": 22.2809754
      },
      {
        "id": 1235363290,
        "lon": 114.173941,
        "lat": 22.2812178
      },
      {
        "id": 6853998903,
        "lon": 114.1739364,
        "lat": 22.2812746
      },
      {
        "id": 1235363389,
        "lon": 114.1739289,
        "lat": 22.281366
      },
      {
        "id": 290331039,
        "lon": 114.1739096,
        "lat": 22.281602
      },
      {
        "id": 1235363498,
        "lon": 114.1736519,
        "lat": 22.281584
      },
      {
        "id": 927570124,
        "lon": 114.1736255,
        "lat": 22.2815822
      },
      {
        "id": 12254183039,
        "lon": 114.1735164,
        "lat": 22.2815745
      },
      {
        "id": 1235363384,
        "lon": 114.1732883,
        "lat": 22.2815586
      },
      {
        "id": 927570119,
        "lon": 114.1724992,
        "lat": 22.2814956
      },
      {
        "id": 12254183042,
        "lon": 114.1721304,
        "lat": 22.2814681
      },
      {
        "id": 1235363553,
        "lon": 114.1721111,
        "lat": 22.2814667
      },
      {
        "id": 12254183036,
        "lon": 114.1719053,
        "lat": 22.2814514
      },
      {
        "id": 7044272482,
        "lon": 114.1718763,
        "lat": 22.2814492
      },
      {
        "id": 1235363444,
        "lon": 114.1718951,
        "lat": 22.2812319
      }
    ]
  },
  "atrium": {
    "type": "way",
    "id": 79444510,
    "version": 14,
    "wayTimestamp": "2024-10-16T02:27:19Z",
    "changeset": 157944489,
    "retrieved": "2026-11-03",
    "sourceUrl": "https://api.openstreetmap.org/api/0.6/way/79444510/full.json",
    "sourceTimestamp": "2026-10-29T21:21:26Z",
    "sourceSha256": "c6fd49e15358616f46e3f00efb041ef2dfe6df470274b6074bc6492f3e406224",
    "sourceDataset": "Geofabrik Hong Kong OSM extract; current way metadata checked against OSM API",
    "attribution": "© OpenStreetMap contributors",
    "license": "ODbL 1.0",
    "tags": {
      "addr:housename": "香港會議展覽中心 Hong Kong Convention and Exhibition Centre",
      "addr:housename:en": "Hong Kong Convention and Exhibition Centre",
      "addr:housename:zh": "香港會議展覽中心",
      "building": "bridge",
      "building:levels": "8",
      "building:min_level": "1",
      "building:use": "commercial",
      "fixme": "Check floors",
      "layer": "1",
      "name": "中庭 Atrium",
      "name:en": "Atrium",
      "name:zh": "中庭",
      "roof:levels": "2",
      "roof:shape": "flat"
    },
    "geometry": [
      {
        "id": 1952740881,
        "lon": 114.173818,
        "lat": 22.282745
      },
      {
        "id": 1599951121,
        "lon": 114.1737619,
        "lat": 22.2827465
      },
      {
        "id": 1599951229,
        "lon": 114.1736053,
        "lat": 22.2824674
      },
      {
        "id": 1599951124,
        "lon": 114.1735279,
        "lat": 22.2823761
      },
      {
        "id": 290330229,
        "lon": 114.1734171,
        "lat": 22.2823022
      },
      {
        "id": 6853998890,
        "lon": 114.1728506,
        "lat": 22.2822596
      },
      {
        "id": 1952740879,
        "lon": 114.1727114,
        "lat": 22.2822491
      },
      {
        "id": 1599951214,
        "lon": 114.1726521,
        "lat": 22.2823075
      },
      {
        "id": 1599951252,
        "lon": 114.1725562,
        "lat": 22.2824186
      },
      {
        "id": 290330131,
        "lon": 114.1723069,
        "lat": 22.2827012
      },
      {
        "id": 9681896778,
        "lon": 114.1723131,
        "lat": 22.2826526
      },
      {
        "id": 7045777026,
        "lon": 114.1723151,
        "lat": 22.2826374
      },
      {
        "id": 5391761319,
        "lon": 114.1723496,
        "lat": 22.2823682
      },
      {
        "id": 290330271,
        "lon": 114.1724037,
        "lat": 22.2820596
      },
      {
        "id": 927570119,
        "lon": 114.1724992,
        "lat": 22.2814956
      },
      {
        "id": 1235363384,
        "lon": 114.1732883,
        "lat": 22.2815586
      },
      {
        "id": 12254183039,
        "lon": 114.1735164,
        "lat": 22.2815745
      },
      {
        "id": 927570124,
        "lon": 114.1736255,
        "lat": 22.2815822
      },
      {
        "id": 11355665917,
        "lon": 114.1736195,
        "lat": 22.2816548
      },
      {
        "id": 10618842100,
        "lon": 114.1736088,
        "lat": 22.2817848
      },
      {
        "id": 927570130,
        "lon": 114.1735854,
        "lat": 22.28207
      },
      {
        "id": 4475207941,
        "lon": 114.1736239,
        "lat": 22.2821573
      },
      {
        "id": 4475207947,
        "lon": 114.1736802,
        "lat": 22.2822849
      },
      {
        "id": 1952740878,
        "lon": 114.173731,
        "lat": 22.2824
      },
      {
        "id": 1952740881,
        "lon": 114.173818,
        "lat": 22.282745
      }
    ]
  },
  "apartments": {
    "type": "way",
    "id": 107497692,
    "version": 8,
    "wayTimestamp": "2025-12-27T08:33:19Z",
    "changeset": 176470912,
    "retrieved": "2026-11-03",
    "sourceUrl": "https://api.openstreetmap.org/api/0.6/way/107497692/full.json",
    "sourceTimestamp": "2026-10-29T21:21:26Z",
    "sourceSha256": "c6fd49e15358616f46e3f00efb041ef2dfe6df470274b6074bc6492f3e406224",
    "sourceDataset": "Geofabrik Hong Kong OSM extract; current way metadata checked against OSM API",
    "attribution": "© OpenStreetMap contributors",
    "license": "ODbL 1.0",
    "tags": {
      "addr:housename": "香港會議展覽中心 Hong Kong Convention and Exhibition Centre",
      "addr:housename:en": "Hong Kong Convention and Exhibition Centre",
      "addr:housename:zh": "香港會議展覽中心",
      "apartments": "detached",
      "building": "apartments",
      "building:levels": "47",
      "building:material": "glass",
      "building:min_level": "10",
      "height": "164",
      "location": "podium",
      "name": "會景閣 Convention Plaza",
      "name:en": "Convention Plaza",
      "name:zh": "會景閣",
      "tourism": "apartment"
    },
    "geometry": [
      {
        "id": 1235363394,
        "lon": 114.1726946,
        "lat": 22.2807531
      },
      {
        "id": 1235363354,
        "lon": 114.1726873,
        "lat": 22.280837
      },
      {
        "id": 12254183044,
        "lon": 114.1722317,
        "lat": 22.2808031
      },
      {
        "id": 12254183052,
        "lon": 114.1721065,
        "lat": 22.2809017
      },
      {
        "id": 1235363505,
        "lon": 114.1720945,
        "lat": 22.2810388
      },
      {
        "id": 12254183051,
        "lon": 114.1720916,
        "lat": 22.2810729
      },
      {
        "id": 12254183043,
        "lon": 114.1719101,
        "lat": 22.2810594
      },
      {
        "id": 12254183026,
        "lon": 114.1719131,
        "lat": 22.2810253
      },
      {
        "id": 1235363314,
        "lon": 114.1719311,
        "lat": 22.2808187
      },
      {
        "id": 7044272477,
        "lon": 114.1719624,
        "lat": 22.280794
      },
      {
        "id": 12254183046,
        "lon": 114.1719741,
        "lat": 22.2807847
      },
      {
        "id": 1235363480,
        "lon": 114.1721711,
        "lat": 22.2806296
      },
      {
        "id": 7044325104,
        "lon": 114.1726112,
        "lat": 22.2806624
      },
      {
        "id": 1235363394,
        "lon": 114.1726946,
        "lat": 22.2807531
      }
    ]
  }
};
const freezeSource = (source) => Object.freeze({ ...source, tags: Object.freeze(source.tags),
  geometry: Object.freeze(source.geometry.map((point) => Object.freeze(point))) });
export const HKCEC_NEW_WING_OSM_SOURCE = freezeSource(RAW_SOURCES.newWing);
export const HKCEC_OLD_WING_OSM_SOURCE = freezeSource(RAW_SOURCES.oldWing);
export const HKCEC_ATRIUM_OSM_SOURCE = freezeSource(RAW_SOURCES.atrium);
export const HKCEC_APARTMENT_OSM_SOURCE = freezeSource(RAW_SOURCES.apartments);
export const HKCEC_OSM_SOURCES = Object.freeze({
  newWing: HKCEC_NEW_WING_OSM_SOURCE, oldWing: HKCEC_OLD_WING_OSM_SOURCE,
  atrium: HKCEC_ATRIUM_OSM_SOURCE, apartments: HKCEC_APARTMENT_OSM_SOURCE
});

const KX = 103056.81753522092, KY = 110734.09626824585;
const project = (lon, lat) => [(lon - 114.1596) * KX, -(lat - 22.2819) * KY];
function ringArea(ring) { let area = 0; for (let i = 0; i + 3 < ring.length; i += 2) area += ring[i] * ring[i + 3] - ring[i + 2] * ring[i + 1]; return Math.abs(area * .5); }
function makeSite(source, englishName) {
  const ring = Object.freeze(source.geometry.flatMap(({ lon, lat }) => project(lon, lat)));
  const footprint = minimumAreaObb(ring), cs = Math.cos(footprint.ry), sn = Math.sin(footprint.ry);
  const localRing = Object.freeze(ring.flatMap((value, index, array) => {
    if (index % 2) return []; const dx = value - footprint.x, dz = array[index + 1] - footprint.z;
    return [dx * cs - dz * sn, dx * sn + dz * cs];
  }));
  return Object.freeze({ name: source.tags.name, englishName, osmType: 'way', osmId: source.id, source,
    ring, localRing, localBounds: flatRingBounds(localRing), bounds: flatRingBounds(ring), ...footprint, area: ringArea(ring) });
}
export const HKCEC_NEW_WING_SITE = makeSite(HKCEC_NEW_WING_OSM_SOURCE, 'Hong Kong Convention and Exhibition Centre New Wing');
export const HKCEC_OLD_WING_SITE = makeSite(HKCEC_OLD_WING_OSM_SOURCE, 'Hong Kong Convention and Exhibition Centre Old Wing');
export const HKCEC_ATRIUM_SITE = makeSite(HKCEC_ATRIUM_OSM_SOURCE, 'HKCEC Atrium Link Extension');
export const HKCEC_APARTMENT_SITE = makeSite(HKCEC_APARTMENT_OSM_SOURCE, 'Convention Plaza Apartments');

// SOM's phase-II facts and Wong & Ouyang's atrium facts are retained independently of OSM level tags.
export const HKCEC_PHASE2_COMPLETION_YEAR = 1997, HKCEC_ORIGINAL_COMPLETION_YEAR = 1988, HKCEC_ATRIUM_COMPLETION_YEAR = 2009;
export const HKCEC_PHASE2_ARCHITECTS = 'Wong & Ouyang (HK) Ltd in association with Skidmore, Owings & Merrill (SOM)';
export const HKCEC_ORIGINAL_ARCHITECT = 'Ng Chun Man & Associates Architects & Engineers';
export const HKCEC_SOM_HEIGHT = 55, HKCEC_SOM_STORIES = 6, HKCEC_SOM_SITE_AREA_HECTARES = 6.48, HKCEC_SOM_GROSS_AREA = 158000;
export const HKCEC_SOM_CLEAR_SPAN = 80, HKCEC_SOM_VAULTED_CEILING_FEET = 75;
export const HKCEC_WO_ATRIUM_LEVELS = 3, HKCEC_WO_ATRIUM_AREA = 19400, HKCEC_WO_ATRIUM_SPAN = 80;
export const HKCEC_WO_PHASE2_HALLS = 3, HKCEC_WO_PHASE2_EXHIBITION_AREA = 26000, HKCEC_WO_CONVENTION_HALL_SEATS = 4200;
export const HKCEC_NEW_WING_OSM_LEVELS = Number(HKCEC_NEW_WING_OSM_SOURCE.tags['building:levels']);
export const HKCEC_OLD_WING_OSM_LEVELS = Number(HKCEC_OLD_WING_OSM_SOURCE.tags['building:levels']);
export const HKCEC_ATRIUM_OSM_LEVELS = Number(HKCEC_ATRIUM_OSM_SOURCE.tags['building:levels']);

export const HKCEC_APARTMENT_HEIGHT = Number(HKCEC_APARTMENT_OSM_SOURCE.tags.height);
export const HKCEC_APARTMENT_OSM_LEVELS = Number(HKCEC_APARTMENT_OSM_SOURCE.tags['building:levels']);
export const HKCEC_APARTMENT_OSM_MIN_LEVEL = Number(HKCEC_APARTMENT_OSM_SOURCE.tags['building:min_level']);
export const HKCEC_APARTMENT_COMPLETION_YEAR = 1989, HKCEC_APARTMENT_OFFICIAL_RESIDENTIAL_LEVELS = 35;
export const HKCEC_APARTMENT_OFFICIAL_FIRST_RESIDENTIAL_LEVEL = 11, HKCEC_APARTMENT_OFFICIAL_LAST_RESIDENTIAL_LEVEL = 46;
export const HKCEC_APARTMENT_OFFICIAL_APPROX_UNITS = 600;
// Photo-directed visual controls, not surveyed engineering levels. The 35 silver-glass courses follow the official floors 11–46.
export const HKCEC_PLAZA_TOP = .15, HKCEC_COVERED_ROAD_SOFFIT = 8, HKCEC_VEHICLE_ENVELOPE = 4.7;
export const HKCEC_OLD_WING_ROOF = 34, HKCEC_ATRIUM_ROOF = 32, HKCEC_NEW_WING_HEIGHT = HKCEC_SOM_HEIGHT;
export const HKCEC_APARTMENT_PODIUM_TOP = HKCEC_OLD_WING_ROOF, HKCEC_APARTMENT_MAIN_ROOF = 158;
export const HKCEC_APARTMENT_VISUAL_COURSES = HKCEC_APARTMENT_OFFICIAL_RESIDENTIAL_LEVELS;
export const HKCEC_APARTMENT_TARGET_PANEL_WIDTH = 1.65;

// Golden Bauhinia Square (金紫荊廣場), Reunification Monument & Flagpoles
export const HKCEC_GOLDEN_BAUHINIA_SITE = Object.freeze({
  x: 1452, z: -272,
  sculptureName: '永遠盛開的紫荊花雕塑 Forever Blooming Bauhinia Sculpture',
  sculptureHeight: 6,
  pedestalRadius: 3.4,
  pedestalHeight: 1.68
});
export const HKCEC_REUNIFICATION_MONUMENT_SITE = Object.freeze({
  x: 1462, z: -262,
  name: '香港回歸祖國紀念碑 Hong Kong Reunification Monument',
  height: 20,
  rings: 206
});
export const HKCEC_FLAGPOLE_DAIS_SITE = Object.freeze({
  x: 1442, z: -282,
  name: '金紫荊廣場升旗台 Golden Bauhinia Square Flagpole Dais',
  flagpoleCount: 2,
  flagpoleHeight: 14
});

export function hkcecEdgeOutward(ring, edge) {
  const i = edge * 2, ax = ring[i], az = ring[i + 1], bx = ring[i + 2], bz = ring[i + 3], dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  let area = 0; for (let j = 0; j + 3 < ring.length; j += 2) area += ring[j] * ring[j + 3] - ring[j + 2] * ring[j + 1];
  const sign = area >= 0 ? 1 : -1; return { nx: dz / length * sign, nz: -dx / length * sign, length, ry: Math.atan2(-dz, dx) };
}
export function hkcecLocalToWorld(site, x, z) { const cs = Math.cos(site.ry), sn = Math.sin(site.ry); return { x: site.x + cs * x + sn * z, z: site.z - sn * x + cs * z }; }
export function hkcecWorldToLocal(site, x, z) { const cs = Math.cos(site.ry), sn = Math.sin(site.ry), dx = x - site.x, dz = z - site.z; return { x: dx * cs - dz * sn, z: dx * sn + dz * cs }; }
export function hkcecFrameToWorld(frame, x, z) { const cs = Math.cos(frame.ry), sn = Math.sin(frame.ry); return { x: frame.x + cs * x + sn * z, z: frame.z - sn * x + cs * z }; }
function photoDirectedFrame(site, sourceEdge, name, evidence) {
  const ring = site.localRing, i = sourceEdge * 2, localX = (ring[i] + ring[i + 2]) * .5, localZ = (ring[i + 1] + ring[i + 3]) * .5;
  const edge = hkcecEdgeOutward(ring, sourceEdge), world = hkcecLocalToWorld(site, localX, localZ), cs = Math.cos(site.ry), sn = Math.sin(site.ry);
  const nx = cs * edge.nx + sn * edge.nz, nz = -sn * edge.nx + cs * edge.nz;
  return Object.freeze({ nodeId: null, sourceEdge, localX, localZ, x: world.x, z: world.z,
    nx, nz, ry: Math.atan2(nx, nz), name, evidence });
}
export const HKCEC_MAIN_ENTRANCE = photoDirectedFrame(HKCEC_OLD_WING_SITE, 9, 'HKCEC Harbour Road main entrance',
  'Photo-directed Harbour Road entrance on the Old Wing southern source edge; way 26490161 has no entrance-tagged node.');
export const HKCEC_APARTMENT_ENTRANCE = photoDirectedFrame(HKCEC_APARTMENT_SITE, 11, 'Convention Plaza Apartments Harbour Road entrance',
  '28Hse and the official Convention Plaza Apartments page identify the Harbour Road entrance, bilingual lobby sign, red carpet, glazing and cylindrical columns. Photo-directed source-edge midpoint; way 107497692 has no entrance-tagged node.');
export const HKCEC_ENTRANCE_LAYOUTS = Object.freeze({
  main: Object.freeze({ width: 22, depth: 8, canopy: 5.7, roadClearWidth: 6.5, bayCentre: 10.1, bayWidth: 1.5, doorWidth: 1.1,
    columnRadius: .4, columns: Object.freeze([[-12, 2.25], [12, 2.25]].map((p) => Object.freeze(p))), signWidth: 18, signHeight: 1.25, fontSize: 58 }),
  apartment: Object.freeze({ width: 26, depth: 6.5, canopy: 5.4, roadClearWidth: 15.8, bayCentre: 10.45, bayWidth: 5.1, doorWidth: 2.8,
    columnRadius: .48, columns: Object.freeze([[-11.75, -5.75], [11.75, -5.75]].map((p) => Object.freeze(p))), signWidth: 15.8, signHeight: 1.05, fontSize: 62 })
});
export const HKCEC_GROUND_SAMPLE = Object.freeze({ x: HKCEC_MAIN_ENTRANCE.x, z: HKCEC_MAIN_ENTRANCE.z });
export const HKCEC_GROUND_RINGS = Object.freeze([HKCEC_NEW_WING_SITE.ring, HKCEC_OLD_WING_SITE.ring, HKCEC_ATRIUM_SITE.ring, HKCEC_APARTMENT_SITE.ring]);
// Precomputed against every non-tunnel HK_FULL_ROADS segment with lane-half-width + 1.2 m clearance.
// Upper storeys bridge the retained service roads; these are the only ground-to-soffit structural columns.
export const HKCEC_COLUMN_POSITIONS = Object.freeze({
  newWing: Object.freeze([[-87.72,-70.362],[-86.009,-71.745],[-50.365,-86.924],[-33.511,-86.924],[25.932,-79.546],[43.767,-74.261],[48.626,-72.593],[58.603,-69.154],[64.808,-66.742],[72.564,-63.737],[83.378,-55.008],[85.465,-50.083],[95.099,-48.745],[100.601,-47.678],[106.226,-46.596],[109.345,-45.545],[111.947,-44.682],[116.954,-42.019],[121.66,-38.799],[122.263,-38.367],[126.632,-35.248],[129.549,-31.859],[132.364,-27.92],[135.062,-22.946],[136.057,-17.888],[136.22,-12.242],[134.77,-7.053],[132.714,-3.286],[130.196,0.56],[127.294,4.802],[126.672,5.372],[122.93,8.788],[122.458,9.198],[117.796,13.215],[114.768,15.863],[110.814,19.226],[105.972,22.549],[100.947,25.137],[88.696,29.175],[87.416,35.647],[79.965,42.758],[67.296,52.948],[54.569,61.211],[38.98,71.529],[20.804,78.693],[3.392,83.994],[-15.002,86.742],[-33.722,86.924],[-48.573,85.334],[-69.408,81.325],[-108.683,64.307],[-119.079,56.706],[-129.981,-33.211],[-118.05,-43.539],[-9.241,-77.859],[-31.227,-77.052],[-53.212,-76.245],[-75.197,-75.438],[57.521,-58.296],[35.536,-57.488],[13.551,-56.681],[-8.434,-55.874],[-30.419,-55.067],[-52.405,-54.26],[-74.39,-53.453],[102.299,-37.925],[80.314,-37.117],[58.328,-36.31],[36.343,-35.503],[14.358,-34.696],[-7.627,-33.889],[-29.612,-33.082],[-51.597,-32.275],[-73.583,-31.468],[-117.553,-29.853],[125.091,-16.747],[103.106,-15.939],[81.121,-15.132],[59.136,-14.325],[37.15,-13.518],[15.165,-12.711],[-6.82,-11.904],[-28.805,-11.097],[-50.79,-10.289],[-72.776,-9.482],[125.898,5.239],[103.913,6.046],[81.928,6.853],[59.943,7.66],[37.958,8.467],[15.972,9.274],[-6.013,10.081],[-27.998,10.889],[-49.983,11.696],[-71.968,12.503],[82.735,28.838],[60.75,29.645],[38.765,30.452],[16.78,31.26],[-5.206,32.067],[-27.191,32.874],[-49.176,33.681],[-71.161,34.488],[-93.146,35.295],[61.557,51.63],[39.572,52.438],[17.587,53.245],[-4.399,54.052],[-26.384,54.859],[-48.369,55.666],[-70.354,56.473],[-92.339,57.28],[-114.324,58.088],[18.394,75.23],[-3.591,76.037],[-25.577,76.844],[-47.562,77.651],[-69.547,78.458]].map((p) => Object.freeze(p))),
  oldWing: Object.freeze([[-21.807,105.023],[-2.643,104.945],[1.145,104.925],[24.098,104.827],[46.87,81.77],[46.721,36.269],[46.733,24.539],[46.714,-29.882],[46.81,-64.541],[46.854,-79.288],[46.885,-88.66],[30.298,-105.076],[22.813,-105.082],[-4.108,-105.082],[-10.415,-105.091],[-20.566,-105.095],[-46.775,-105.113],[-46.83,-75.753],[-46.841,-64.477],[-46.885,-40.904],[-46.156,40.714],[-46.029,78.843],[-46.027,80.838],[-32.14,96.144],[-12.199,97.675],[7.742,99.206],[-30.609,76.202],[-10.668,77.734],[9.273,79.265],[29.215,80.796],[-29.078,56.261],[-9.137,57.792],[10.805,59.324],[30.746,60.855],[-27.547,36.32],[-7.605,37.851],[12.336,39.382],[32.277,40.914],[-45.957,14.847],[-26.015,16.379],[-6.074,17.91],[13.867,19.441],[33.809,20.972],[-44.425,-5.094],[-24.484,-3.563],[-4.543,-2.032],[15.398,-0.5],[-42.894,-25.035],[-22.953,-23.504],[-3.012,-21.973],[16.93,-20.442],[36.871,-18.91],[-41.363,-44.977],[-21.422,-43.445],[-1.48,-41.914],[18.461,-40.383],[38.402,-38.852],[-39.832,-64.918],[-19.89,-63.387],[0.051,-61.855],[19.992,-60.324],[39.934,-58.793],[-18.359,-83.328],[1.582,-81.797],[21.523,-80.265],[41.465,-78.734],[-16.828,-103.269],[3.113,-101.738],[23.055,-100.207]].map((p) => Object.freeze(p))),
  atrium: Object.freeze([[53.673,-31.493],[44.964,-22.007],[-45.609,-21.173],[-54.545,-34.179],[-77.828,-67.304],[-77.593,-61.89],[-73.187,4.289],[-68.037,67.304],[13.579,66.421],[37.152,66.421],[48.428,66.411],[48.341,12.237],[66.034,-23.082],[-69.722,-41.643],[-71.216,-21.699],[-54.259,19.683],[-55.753,39.627],[-34.315,21.177],[-35.809,41.121],[-14.371,22.67],[-15.865,42.615],[7.067,4.22],[5.573,24.164],[4.079,44.108],[2.585,64.053],[27.011,5.714],[22.53,65.546],[45.461,27.152],[43.967,47.096],[71.381,-51.131]].map((p) => Object.freeze(p))),
});
// Ground curtain-wall intervals are individually checked against all non-tunnel carriageways (lane half-width + 0.8 m).
// Old Wing edge 9 is open for the main entrance; adjoining edge 6 also leaves a 17.0625 m clear portal
// around the midpoint of the photo-directed Convention Plaza Apartments entrance (15.8 m clear lobby frontage).
export const HKCEC_GROUND_FACADE_SEGMENTS = Object.freeze({
  newWing: Object.freeze([[0,0,1],[3,0.25,0.5],[3,0.5,0.75],[3,0.75,1],[4,0,0.166667],[4,0.166667,0.333333],[4,0.333333,0.5],[4,0.5,0.666667],[4,0.666667,0.833333],[4,0.833333,1],[5,0,0.166667],[5,0.166667,0.333333],[5,0.333333,0.5],[5,0.5,0.666667],[5,0.666667,0.833333],[8,0.857143,1],[9,0,0.142857],[9,0.142857,0.285714],[9,0.285714,0.428571],[9,0.428571,0.571429],[9,0.571429,0.714286],[9,0.714286,0.857143],[9,0.857143,1],[10,0,0.5],[10,0.5,1],[11,0,0.25],[11,0.25,0.5],[11,0.5,0.75],[11,0.75,1],[12,0,0.333333],[12,0.333333,0.666667],[12,0.666667,1],[13,0,0.333333],[13,0.333333,0.666667],[13,0.666667,1],[14,0,0.2],[14,0.2,0.4],[14,0.4,0.6],[14,0.6,0.8],[14,0.8,1],[15,0,0.5],[15,0.5,1],[16,0,0.25],[16,0.25,0.5],[16,0.5,0.75],[16,0.75,1],[17,0,0.5],[17,0.5,1],[18,0,0.5],[18,0.5,1],[19,0,0.5],[19,0.5,1],[20,0,1],[21,0,0.5],[21,0.5,1],[22,0,0.5],[22,0.5,1],[23,0,1],[24,0,0.5],[24,0.5,1],[25,0,0.5],[25,0.5,1],[26,0,0.5],[26,0.5,1],[27,0,0.5],[27,0.5,1],[28,0,0.5],[28,0.5,1],[29,0,0.5],[29,0.5,1],[30,0,0.5],[30,0.5,1],[31,0,0.5],[31,0.5,1],[32,0,0.5],[32,0.5,1],[33,0,0.5],[33,0.5,1],[34,0,1],[35,0,0.5],[35,0.5,1],[36,0,1],[37,0,0.333333],[37,0.333333,0.666667],[37,0.666667,1],[38,0,0.5],[38,0.5,1],[39,0,0.5],[39,0.5,1],[40,0,0.5],[40,0.5,1],[41,0,0.5],[41,0.5,1],[42,0,0.2],[42,0.2,0.4],[42,0.4,0.6],[42,0.6,0.8],[42,0.8,1],[43,0,0.333333],[43,0.333333,0.666667],[43,0.666667,1],[44,0,0.25],[44,0.25,0.5],[44,0.5,0.75],[44,0.75,1],[45,0,0.166667],[45,0.166667,0.333333],[45,0.333333,0.5],[45,0.5,0.666667],[45,0.666667,0.833333],[45,0.833333,1],[46,0,0.166667],[46,0.166667,0.333333],[46,0.333333,0.5],[46,0.5,0.666667],[46,0.666667,0.833333],[46,0.833333,1],[47,0,0.142857],[47,0.142857,0.285714],[47,0.285714,0.428571],[47,0.428571,0.571429],[47,0.571429,0.714286],[47,0.714286,0.857143],[47,0.857143,1],[48,0,0.142857],[48,0.142857,0.285714],[48,0.285714,0.428571],[48,0.428571,0.571429],[48,0.571429,0.714286],[48,0.714286,0.857143],[48,0.857143,1],[49,0,0.142857],[49,0.142857,0.285714],[49,0.285714,0.428571],[49,0.428571,0.571429],[49,0.571429,0.714286],[49,0.714286,0.857143],[49,0.857143,1],[50,0,0.142857],[50,0.142857,0.285714],[50,0.285714,0.428571],[50,0.428571,0.571429],[50,0.571429,0.714286],[50,0.714286,0.857143],[50,0.857143,1],[51,0,0.142857],[51,0.142857,0.285714],[51,0.285714,0.428571],[51,0.428571,0.571429],[51,0.571429,0.714286],[51,0.714286,0.857143],[51,0.857143,1],[52,0,0.2],[52,0.2,0.4],[52,0.4,0.6],[52,0.6,0.8],[52,0.8,1],[53,0,0.125],[53,0.125,0.25],[53,0.25,0.375],[53,0.375,0.5],[53,0.5,0.625],[53,0.625,0.75],[53,0.75,0.875],[53,0.875,1],[54,0,0.333333],[54,0.333333,0.666667],[55,0.333333,0.416667],[55,0.416667,0.5],[55,0.5,0.583333],[55,0.583333,0.666667],[55,0.666667,0.75],[55,0.75,0.833333],[55,0.833333,0.916667],[55,0.916667,1],[56,0,0.2],[56,0.2,0.4],[56,0.4,0.6],[56,0.6,0.8],[56,0.8,1],[57,0,0.2],[57,0.2,0.4],[57,0.4,0.6],[61,0,0.166667],[61,0.166667,0.333333],[62,0,0.071429],[62,0.071429,0.142857],[62,0.142857,0.214286],[62,0.214286,0.285714],[62,0.285714,0.357143],[62,0.357143,0.428571],[62,0.857143,0.928571],[62,0.928571,1]].map((p) => Object.freeze(p))),
  oldWing: Object.freeze([[0,0,0.142857],[0,0.142857,0.285714],[0,0.285714,0.428571],[0,0.428571,0.571429],[0,0.571429,0.714286],[0,0.714286,0.857143],[0,0.857143,1],[1,0,0.5],[1,0.5,1],[2,0,0.125],[2,0.125,0.25],[2,0.25,0.375],[2,0.375,0.5],[2,0.5,0.625],[2,0.625,0.75],[2,0.75,0.875],[2,0.875,1],[5,0.222222,0.333333],[5,0.333333,0.444444],[5,0.444444,0.555556],[5,0.555556,0.666667],[5,0.666667,0.777778],[5,0.777778,0.888889],[5,0.888889,1],[6,0,0.0625],[6,0.0625,0.125],[6,0.6875,0.75],[6,0.75,0.8125],[6,0.8125,0.875],[6,0.875,0.9375],[6,0.9375,1],[7,0,0.25],[7,0.25,0.5],[7,0.5,0.75],[7,0.75,1],[8,0,0.142857],[8,0.142857,0.285714],[8,0.285714,0.428571],[8,0.428571,0.571429],[8,0.571429,0.714286],[10,0.285714,0.428571],[10,0.428571,0.571429],[10,0.571429,0.714286],[10,0.714286,0.857143],[10,0.857143,1],[11,0,0.083333],[11,0.083333,0.166667],[11,0.166667,0.25],[11,0.25,0.333333],[11,0.333333,0.416667],[11,0.416667,0.5],[11,0.5,0.583333],[11,0.583333,0.666667],[11,0.666667,0.75],[11,0.75,0.833333],[11,0.833333,0.916667],[11,0.916667,1],[12,0,0.2],[12,0.2,0.4],[12,0.4,0.6],[12,0.6,0.8],[12,0.8,1],[13,0,0.25],[13,0.25,0.5],[13,0.5,0.75],[13,0.75,1],[14,0,0.125],[14,0.125,0.25],[14,0.25,0.375],[14,0.375,0.5],[14,0.5,0.625],[14,0.625,0.75],[14,0.75,0.875],[14,0.875,1],[15,0,0.333333],[15,0.333333,0.666667],[15,0.666667,1],[16,0,0.111111],[16,0.111111,0.222222],[16,0.222222,0.333333],[16,0.333333,0.444444],[16,0.444444,0.555556],[16,0.555556,0.666667],[16,0.666667,0.777778],[16,0.777778,0.888889],[16,0.888889,1],[17,0,0.333333],[17,0.333333,0.666667],[17,0.666667,1],[18,0,0.25],[18,0.25,0.5],[18,0.5,0.75],[18,0.75,1],[19,0,0.111111],[19,0.111111,0.222222],[19,0.222222,0.333333],[19,0.333333,0.444444],[19,0.777778,0.888889],[19,0.888889,1],[20,0,0.111111],[20,0.111111,0.222222],[20,0.222222,0.333333],[20,0.333333,0.444444],[20,0.444444,0.555556],[20,0.555556,0.666667],[22,0,0.25],[22,0.25,0.5],[22,0.5,0.75],[22,0.75,1],[23,0,0.125],[23,0.125,0.25],[23,0.25,0.375],[23,0.375,0.5],[23,0.5,0.625],[23,0.625,0.75],[23,0.75,0.875],[23,0.875,1],[24,0,0.035714],[24,0.035714,0.071429],[24,0.071429,0.107143],[24,0.107143,0.142857],[24,0.142857,0.178571],[24,0.178571,0.214286],[24,0.214286,0.25],[24,0.25,0.285714],[24,0.285714,0.321429],[24,0.321429,0.357143],[24,0.357143,0.392857],[24,0.392857,0.428571],[24,0.428571,0.464286],[24,0.464286,0.5],[24,0.5,0.535714],[24,0.535714,0.571429],[24,0.571429,0.607143],[24,0.607143,0.642857],[24,0.642857,0.678571],[24,0.678571,0.714286],[24,0.714286,0.75],[24,0.75,0.785714],[24,0.785714,0.821429],[24,0.821429,0.857143],[24,0.857143,0.892857],[24,0.892857,0.928571],[24,0.928571,0.964286],[24,0.964286,1],[25,0,0.076923],[25,0.076923,0.153846],[25,0.153846,0.230769],[25,0.230769,0.307692],[25,0.307692,0.384615],[25,0.384615,0.461538],[25,0.461538,0.538462],[25,0.538462,0.615385],[25,0.615385,0.692308],[25,0.692308,0.769231],[25,0.769231,0.846154],[25,0.846154,0.923077],[25,0.923077,1],[26,0,1],[27,0,0.125],[27,0.125,0.25],[27,0.25,0.375],[27,0.375,0.5],[27,0.5,0.625],[27,0.625,0.75],[29,0.111111,0.222222],[29,0.222222,0.333333],[29,0.333333,0.444444],[29,0.444444,0.555556],[29,0.555556,0.666667],[29,0.666667,0.777778],[29,0.777778,0.888889],[29,0.888889,1]].map((p) => Object.freeze(p))),
});
export function isHkcecPoint(x, z) { return HKCEC_GROUND_RINGS.some((ring) => pointInFlatRing(ring, x, z)); }
export function hkcecGroundHeightAt(x, z, ground, grounds) { return isHkcecPoint(x, z) ? grounds.plaza : ground; }
export function hkcecLocalCollider(site, x, z, w, d, minY, maxY, ry = site.ry) {
  const p = hkcecLocalToWorld(site, x, z), cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
export function hkcecEdgeCollider(site, ring, edge, minY, maxY, depth = .42) {
  const i = edge * 2, { ry, length } = hkcecEdgeOutward(ring, edge);
  return hkcecLocalCollider(site, (ring[i] + ring[i + 2]) * .5, (ring[i + 1] + ring[i + 3]) * .5, length + .02, depth, minY, maxY, site.ry + ry);
}
export function hkcecRingColliders(site, ring, minY, maxY, depth = .42) {
  const out = []; for (let edge = 0; edge < ring.length / 2 - 1; edge++) out.push(hkcecEdgeCollider(site, ring, edge, minY, maxY, depth)); return out;
}
export function hkcecFrameCollider(site, frame, x, z, w, d, minY, maxY) {
  const p = hkcecFrameToWorld(frame, x, z), ry = frame.ry, cs = Math.cos(ry), sn = Math.sin(ry), hx = w * .5, hz = d * .5;
  return { shape: 'box', x: p.x, z: p.z, w, d, ry, minY, maxY,
    minX: p.x - Math.abs(cs) * hx - Math.abs(sn) * hz, maxX: p.x + Math.abs(cs) * hx + Math.abs(sn) * hz,
    minZ: p.z - Math.abs(sn) * hx - Math.abs(cs) * hz, maxZ: p.z + Math.abs(sn) * hx + Math.abs(cs) * hz,
    obb: { cx: p.x, cz: p.z, hx, hz, cs, sn } };
}
