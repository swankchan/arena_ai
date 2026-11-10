#!/usr/bin/env python3
"""Regenerate the eight Noto Sans TC outlines used by the winning-post label.

Usage: python build-happy-valley-post-glyphs.py /path/to/NotoSansTC.ttf > OUTPUT
Requires fonttools. Input SHA-256 and upstream URL are recorded in the reference README.
"""
import hashlib
import json
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

path = sys.argv[1]
with open(path, 'rb') as stream:
    if hashlib.sha256(stream.read()).hexdigest() != '864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f':
        raise SystemExit('Unexpected source font; verify upstream and update provenance first')
font = TTFont(path)
glyphs = font.getGlyphSet(location={'wght': 700})
cmap = font.getBestCmap()
output = {}
for character in sorted(set('跑馬地香港賽會場')):
    name = cmap[ord(character)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    output[character] = {'path': pen.getCommands(), 'advance': font['hmtx'][name][0]}
print('// Noto Sans TC bold glyph outlines, subset of SIL OFL font; see references/hongkong/happy-valley/OFL-NotoSansTC.txt.')
print('export const WINNING_POST_GLYPHS = ' + json.dumps(output, ensure_ascii=False, separators=(',', ':')) + ';')
