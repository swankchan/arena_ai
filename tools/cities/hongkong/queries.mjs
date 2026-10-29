// Overpass queries for the Hong Kong core. Minor roads are fetched in four tiles so no single query times out.
export const MAJOR = /^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$/;
export const MINOR = /^(unclassified|residential|living_street|service|pedestrian)$/;

const roadQuery = (regex, b) =>
  `[out:json][timeout:240];way["highway"~"${regex}"](${b.south},${b.west},${b.north},${b.east});out geom;`;

export function roadQueries(bounds) {
  const midLat = (bounds.south + bounds.north) / 2;
  const midLon = (bounds.west + bounds.east) / 2;
  const tiles = [
    { name: 'sw', south: bounds.south, west: bounds.west, north: midLat, east: midLon },
    { name: 'se', south: bounds.south, west: midLon, north: midLat, east: bounds.east },
    { name: 'nw', south: midLat, west: bounds.west, north: bounds.north, east: midLon },
    { name: 'ne', south: midLat, west: midLon, north: bounds.north, east: bounds.east }
  ];
  const out = [{ name: 'major', file: 'roads_major.json', query: roadQuery(MAJOR.source, bounds) }];
  for (const tile of tiles) out.push({ name: `minor_${tile.name}`, file: `roads_minor_${tile.name}.json`, query: roadQuery(MINOR.source, tile) });
  return out;
}

export function coastlineQuery(bounds) {
  return `[out:json][timeout:240];way["natural"="coastline"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out geom;`;
}

export function parksQuery(bounds) {
  const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return `[out:json][timeout:240];(
    way["leisure"~"^(park|garden|playground|pitch|recreation_ground)$"](${b});
    way["landuse"~"^(grass|forest|recreation_ground)$"](${b});
    way["natural"~"^(wood|scrub)$"](${b});
    relation["leisure"~"^(park|garden)$"](${b});
  );out geom;`;
}

export function landmarksQuery(bounds) {
  const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return `[out:json][timeout:240];(
    way["building"]["name"]["height"](${b});
    way["building"]["name"]["building:levels"](${b});
    relation["building"]["name"]["height"](${b});
  );out geom;`;
}
