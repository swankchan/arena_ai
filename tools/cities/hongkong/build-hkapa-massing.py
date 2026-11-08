#!/usr/bin/env python3
"""Rebuild approximate HKAPA visual footprints; requires Shapely.

OSM source: building way 117088641 and service way 1193439765, © OpenStreetMap
contributors, ODbL 1.0. The selected driveway width and all subdivisions are
modelling estimates, not surveyed building or road dimensions.
"""
import json
from pathlib import Path
from shapely.geometry import Polygon, LineString, box

ROOT = Path(__file__).resolve().parents[3]
source = json.loads((ROOT / 'tools/data/hongkong/hkapa-building-osm.json').read_text())
def project(lon, lat):
    return ((lon - 114.1596) * 103056.81753522092, -(lat - 22.2819) * 110734.09626824585)
footprint = Polygon([project(p['lon'], p['lat']) for p in source['geometry']])
# Three consecutive central service-way nodes; buffer and cut are modelling choices.
driveway = LineString([project(*p) for p in [(114.1693111,22.2805117),(114.1695198,22.2803482),(114.1699742,22.2798758)]]).buffer(4.2, cap_style='square', join_style='mitre')
west, east = sorted(footprint.difference(driveway).geoms, key=lambda p: p.centroid.x)
def largest(p):
    return max(p.geoms, key=lambda q:q.area) if p.geom_type == 'MultiPolygon' else p
def flat(p):
    return [round(v, 4) for pt in largest(p).exterior.coords for v in pt]
data = {
    'academic': flat(west.intersection(box(979,-1000,2000,2000))),
    'western': flat(west.intersection(box(0,-1000,979,2000))),
    'theatre': flat(east),
    'driveway': flat(driveway),
    'theatreFront': flat(east.intersection(box(0,191,2000,1000))),
    'theatreRear': flat(east.intersection(box(0,-1000,2000,191))),
}
output = '// OSM building way 117088641 and driveway way 1193439765; divisions, road width and heights are approximate.\nexport const HKAPA_MASSING = Object.freeze(' + json.dumps(data, separators=(',',':')) + ');\n'
(ROOT / 'js/cities/hongkong/hkapa-massing-data.js').write_text(output)
