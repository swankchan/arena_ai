#!/usr/bin/env python3
"""Regenerate the experimental preview profile from the joint solver."""
import json
import pathlib
import subprocess

root=pathlib.Path(__file__).resolve().parents[3]
raw=subprocess.check_output(['python3',str(root/'tools/cities/hongkong/peak-tram-joint-profile.py')],cwd=root,text=True)
profile=json.loads(raw)
if not profile.pop('status','').startswith('solved'):
 raise RuntimeError('joint profile solver did not converge')
path=root/'js/cities/hongkong/peak-tram-profile-data.js'
path.write_text('// Experimental generated profile, not surveyed or installed in the game. See docs/peak-tram-track-preview.md.\nexport const PEAK_TRAM_PROFILE = '+json.dumps(profile,separators=(',',':'))+';\n')
print(f'Wrote {path.relative_to(root)}')
