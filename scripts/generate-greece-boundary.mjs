// One-off generator for src/data/greece-boundary.json.
//
// Extracts Greece's country outline (id 300) from Natural Earth's public
// domain 50m-resolution data, bundled as TopoJSON by the `world-atlas`
// package, and converts it to a plain GeoJSON Feature. Used to render a
// nationwide overlay for remote jobs (which could be worked from
// anywhere in Greece) on the map.
//
// Re-run with `node scripts/generate-greece-boundary.mjs` if the
// `world-atlas` dependency is ever updated and the boundary needs
// regenerating.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as topojson from 'topojson-client'
import world from 'world-atlas/countries-50m.json' with { type: 'json' }

const GREECE_COUNTRY_ID = '300'
const outputPath = fileURLToPath(new URL('../src/data/greece-boundary.json', import.meta.url))

const geo = topojson.feature(world, world.objects.countries)
const greece = geo.features.find((feature) => feature.id === GREECE_COUNTRY_ID)

if (!greece) {
  throw new Error(`Could not find country id ${GREECE_COUNTRY_ID} (Greece) in world-atlas data`)
}

writeFileSync(outputPath, JSON.stringify(greece.geometry) + '\n')

console.log(`Wrote Greece boundary (${greece.geometry.type}) to ${outputPath}`)
