"""Offline experiment only; requires Shapely 2.2.0. Coordinates are local metres.

Derive a conservative-looking but not engineered 8m inset of the mapped venue.
Run from repository root, then run build-happy-valley-inset-cut-experiment.mjs.
"""
import json
import subprocess
from pathlib import Path
from shapely.geometry import Polygon

js = """import {HAPPY_VALLEY_SITE as s} from './js/cities/hongkong/happy-valley-racecourse-architecture.js';
console.log(JSON.stringify(Array.from({length:s.ring.length/2},(_,i)=>[s.ring[i*2],s.ring[i*2+1]])));"""
ring = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], text=True))
site = Polygon(ring)
assert site.is_valid
inset = site.buffer(-8, join_style='mitre')
assert inset.geom_type == 'Polygon' and inset.is_valid and len(inset.interiors) == 0
Path('tools/data/hongkong/happy-valley-inset-experiment.json').write_text(json.dumps(list(inset.exterior.coords)))
