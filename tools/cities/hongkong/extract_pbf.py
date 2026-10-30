#!/usr/bin/env python3
"""Extract the Hong Kong builder's OSM JSON caches from a Geofabrik PBF.

The generated files intentionally match the small Overpass subset used by build.mjs:
ways carry tags and full geometry; selected park/building relations carry their way
members with geometry. Nothing is synthesized for missing roads, coast or buildings.
"""

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import osmium

MAJOR = re.compile(r"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$")
MINOR = re.compile(r"^(unclassified|residential|living_street|service|pedestrian)$")
PARK_LEISURE = {"park", "garden", "playground", "pitch", "recreation_ground", "nature_reserve"}
PARK_LANDUSE = {"grass", "forest", "recreation_ground"}
PARK_NATURAL = {"wood", "scrub"}
PLACE_TYPES = {"city", "town", "suburb", "quarter", "neighbourhood", "village", "hamlet", "island", "islet", "archipelago"}
DOWNLOAD_URL = "https://download.geofabrik.de/asia/china/hong-kong-latest.osm.pbf"


def tag_dict(tags):
    return {key: value for key, value in tags}


def is_park_way(tags):
    return tags.get("leisure") in PARK_LEISURE or tags.get("landuse") in PARK_LANDUSE or tags.get("natural") in PARK_NATURAL


def is_landmark_way(tags):
    return bool(tags.get("building") and tags.get("name") and (tags.get("height") or tags.get("building:levels")))


def is_park_relation(tags):
    return tags.get("leisure") in {"park", "garden", "nature_reserve"}


def is_landmark_relation(tags):
    return bool(tags.get("building") and tags.get("name") and tags.get("height"))


class RelationCollector(osmium.SimpleHandler):
    def __init__(self, include_places=False):
        super().__init__()
        self.relations = []
        self.member_refs = set()
        self.include_places = include_places

    def relation(self, relation):
        tags = tag_dict(relation.tags)
        park = is_park_relation(tags)
        landmark = is_landmark_relation(tags)
        place = self.include_places and tags.get("place") in {"island", "archipelago"} and bool(tags.get("name"))
        if not park and not landmark and not place:
            return
        members = [(member.ref, member.role) for member in relation.members if member.type == "w"]
        self.relations.append({"id": relation.id, "tags": tags, "members": members, "park": park, "landmark": landmark, "place": place})
        self.member_refs.update(ref for ref, _ in members)


class CacheExtractor(osmium.SimpleHandler):
    def __init__(self, bounds, relations, member_refs, source, include_places=False):
        super().__init__()
        self.bounds = bounds
        self.relations = relations
        self.member_refs = member_refs
        self.source = source
        self.include_places = include_places
        filenames = [
            "roads_major.json", "roads_minor_sw.json", "roads_minor_se.json",
            "roads_minor_nw.json", "roads_minor_ne.json", "coastline.json",
            "parks.json", "landmarks.json"
        ]
        if include_places:
            filenames.append("places.json")
        self.caches = {name: [] for name in filenames}
        self.member_geometry = {}
        south, west, north, east = bounds
        mid_lat = (south + north) / 2
        mid_lon = (west + east) / 2
        self.tiles = {
            "roads_minor_sw.json": (south, west, mid_lat, mid_lon),
            "roads_minor_se.json": (south, mid_lon, mid_lat, east),
            "roads_minor_nw.json": (mid_lat, west, north, mid_lon),
            "roads_minor_ne.json": (mid_lat, mid_lon, north, east),
        }

    @staticmethod
    def overlaps(geometry, bounds):
        south, west, north, east = bounds
        return any(south <= point["lat"] <= north and west <= point["lon"] <= east for point in geometry)

    @staticmethod
    def geometry(way):
        geometry = []
        for node in way.nodes:
            if not node.location.valid():
                return None
            geometry.append({"lat": node.lat, "lon": node.lon})
        return geometry

    def node(self, node):
        if not self.include_places or not node.location.valid():
            return
        tags = tag_dict(node.tags)
        if tags.get("place") not in PLACE_TYPES:
            return
        if not (tags.get("name:zh") or tags.get("name:zh-Hant") or tags.get("name")):
            return
        south, west, north, east = self.bounds
        if not (south <= node.lat <= north and west <= node.lon <= east):
            return
        self.caches["places.json"].append({
            "type": "node", "id": node.id, "lat": node.lat, "lon": node.lon, "tags": tags
        })

    def way(self, way):
        tags = tag_dict(way.tags)
        highway = tags.get("highway", "")
        major = bool(MAJOR.match(highway))
        minor = bool(MINOR.match(highway))
        coastline = tags.get("natural") == "coastline"
        park = is_park_way(tags)
        landmark = is_landmark_way(tags)
        member = way.id in self.member_refs
        if not (major or minor or coastline or park or landmark or member):
            return
        geometry = self.geometry(way)
        if not geometry:
            return
        if member:
            self.member_geometry[way.id] = geometry
        element = {"type": "way", "id": way.id, "tags": tags, "geometry": geometry}
        if major and self.overlaps(geometry, self.bounds):
            self.caches["roads_major.json"].append(element)
        if minor:
            for filename, tile in self.tiles.items():
                if self.overlaps(geometry, tile):
                    self.caches[filename].append(element)
        if coastline and self.overlaps(geometry, self.bounds):
            self.caches["coastline.json"].append(element)
        if park and self.overlaps(geometry, self.bounds):
            self.caches["parks.json"].append(element)
        if landmark and self.overlaps(geometry, self.bounds):
            self.caches["landmarks.json"].append(element)

    def finish_relations(self):
        for relation in self.relations:
            members = []
            overlaps = False
            for ref, role in relation["members"]:
                geometry = self.member_geometry.get(ref)
                if not geometry:
                    continue
                members.append({"type": "way", "ref": ref, "role": role, "geometry": geometry})
                overlaps = overlaps or self.overlaps(geometry, self.bounds)
            if not members or not overlaps:
                continue
            element = {
                "type": "relation", "id": relation["id"], "tags": relation["tags"], "members": members
            }
            if relation["park"]:
                self.caches["parks.json"].append(element)
            if relation["landmark"]:
                self.caches["landmarks.json"].append(element)
            if relation.get("place") and self.include_places:
                self.caches["places.json"].append(element)

    def write(self, out_dir):
        self.finish_relations()
        counts = {}
        for filename, elements in self.caches.items():
            if not elements:
                raise RuntimeError(f"{filename} has no elements inside the requested bounds")
            payload = {"source": self.source, "elements": elements}
            with (out_dir / filename).open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
            counts[filename] = len(elements)
        return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--places", action="store_true", help="also extract named place nodes and island relations for the full-Hong-Kong atlas")
    for name in ("south", "west", "north", "east"):
        parser.add_argument(f"--{name}", required=True, type=float)
    args = parser.parse_args()
    if not (args.south < args.north and args.west < args.east):
        parser.error("invalid bounds")
    bounds = (args.south, args.west, args.north, args.east)
    digest = hashlib.sha256(args.input.read_bytes()).hexdigest()
    reader = osmium.io.Reader(str(args.input))
    source_timestamp = reader.header().get("timestamp")
    reader.close()
    source = {
        "dataset": "Geofabrik Hong Kong OSM extract",
        "downloadUrl": DOWNLOAD_URL,
        "sha256": digest,
        "sourceTimestamp": source_timestamp,
        "attribution": "© OpenStreetMap contributors",
        "license": "ODbL 1.0",
    }

    collector = RelationCollector(include_places=args.places)
    collector.apply_file(str(args.input))
    extractor = CacheExtractor(bounds, collector.relations, collector.member_refs, source, include_places=args.places)
    extractor.apply_file(str(args.input), locations=True)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    counts = extractor.write(args.out_dir)
    manifest = {
        **source,
        "extractedAt": datetime.now(timezone.utc).isoformat(),
        "bounds": {"south": args.south, "west": args.west, "north": args.north, "east": args.east},
        "relationCandidates": len(collector.relations),
        "counts": counts,
    }
    with (args.out_dir / "extraction-manifest.json").open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
