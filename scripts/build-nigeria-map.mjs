// Regenerates lib/geo/nigeria-states.ts from open boundary data.
//
//   node scripts/build-nigeria-map.mjs
//
// Why precompute: projecting GeoJSON in the browser would mean shipping ~830KB
// of coordinates plus a mapping library to every dashboard load. Instead we
// project once here and emit plain SVG path strings against a fixed viewBox, so
// the app needs no map dependency at runtime and ships a fraction of the bytes.
//
// Source: geoBoundaries gbOpen NGA ADM1 (37 states incl. FCT), pinned to a
// commit for reproducibility.
// Licence: CC BY 4.0, (c) geoBoundaries (William & Mary geoLab).
// https://www.geoboundaries.org
import { writeFileSync, mkdirSync } from "node:fs";
import { geoIdentity, geoPath } from "d3-geo";

const SOURCE =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson";

// Fixed drawing surface. Nigeria is wider than tall, so the box follows suit.
const WIDTH = 800;
const HEIGHT = 680;

// geoBoundaries names this one differently from our states table.
const NAME_ALIASES = { "Abuja Federal Capital Territory": "Federal Capital Territory" };

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Could not fetch boundaries: ${res.status}`);
const geo = await res.json();

// Planar projection: geoBoundaries rings wind opposite to d3's spherical
// convention, which makes a true projection (geoMercator) read each state as the
// whole globe minus a hole and collapse the map. geoIdentity treats lon/lat as
// planar x/y (winding-insensitive); reflectY flips the axis for SVG's y-down.
// Nigeria sits near the equator, so the shape distortion versus Mercator is
// negligible.
const projection = geoIdentity().reflectY(true).fitSize([WIDTH, HEIGHT], geo);
// 1 decimal place is well under a pixel at this size and roughly halves the file.
const path = geoPath(projection).digits(1);

const states = geo.features
  .map((f) => {
    const raw = f.properties.shapeName;
    const name = NAME_ALIASES[raw] ?? raw;
    const d = path(f);
    if (!d) throw new Error(`No path generated for ${raw}`);
    const [cx, cy] = path.centroid(f);
    return { name, d, cx: Math.round(cx), cy: Math.round(cy) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

if (states.length !== 37) throw new Error(`Expected 37 states, got ${states.length}`);

const out = `// GENERATED FILE. Do not edit by hand.
// Regenerate: node scripts/build-nigeria-map.mjs
//
// Nigeria state boundaries as SVG paths, projected (Mercator) onto a fixed
// ${WIDTH}x${HEIGHT} viewBox. Precomputed so the app ships no map library.
//
// Source: geoBoundaries gbOpen NGA ADM1. Licence: CC BY 4.0,
// (c) geoBoundaries (William & Mary geoLab). https://www.geoboundaries.org

export const MAP_WIDTH = ${WIDTH};
export const MAP_HEIGHT = ${HEIGHT};

export type StateShape = {
  /** Matches \`states.name\` in the database. */
  name: string;
  /** SVG path data. */
  d: string;
  /** Label anchor (path centroid). */
  cx: number;
  cy: number;
};

export const NIGERIA_STATES: StateShape[] = ${JSON.stringify(states, null, 2)};
`;

mkdirSync("lib/geo", { recursive: true });
writeFileSync("lib/geo/nigeria-states.ts", out);
console.log(`Wrote lib/geo/nigeria-states.ts (${states.length} states, ${(out.length / 1024).toFixed(0)}KB)`);
