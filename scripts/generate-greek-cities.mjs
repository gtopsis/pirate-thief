// One-off generator for src/data/greek-cities.json.
//
// Builds a small, curated dataset from GeoNames' free (CC BY 4.0 --
// https://www.geonames.org/) place database for Greece: major national
// cities/regions, plus the main Attica (Athens/Piraeus metro) and
// Thessaloniki districts, since that's where the overwhelming majority
// of tech jobs actually are. This deliberately does NOT try to be
// exhaustive (an earlier iteration generated ~2,265 places from the full
// dataset and had to fight both alias collisions and fuzzy-matching
// false positives at that scale) -- CURATED_PLACE_GROUPS below is the
// single source of truth for what's included; add a name there and
// re-run to expand coverage.
//
// For each name in CURATED_PLACE_GROUPS, every GeoNames row whose
// asciiname/name/alternate-name (exactly, case-insensitively) matches is
// treated as a candidate; see resolvePlaceName() for how the single best
// candidate is then picked.
//
// Re-run with `pnpm generate:greek-cities` after editing the list below.

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import extract from 'extract-zip'

const GEONAMES_URL = 'https://download.geonames.org/export/dump/GR.zip'
const OUTPUT_PATH = fileURLToPath(new URL('../src/data/greek-cities.json', import.meta.url))

const LATIN_ONLY = /^[A-Za-z0-9 .\-']+$/
// GeoNames' alternate-name lists include short abbreviations and
// IATA/UN-LOCODE-style airport codes (e.g. "her", "skg", "mjt") that are
// too short to safely substring-match: geo.ts resolves exact matches by
// checking whether the (space-normalized) input *contains* an alias, so
// a 3-letter code can accidentally match inside an unrelated word (e.g.
// "her", Heraklion's code, inside "somewhere"). Aliases shorter than
// this are dropped; the search term itself is always kept regardless of
// its length (see resolvePlaceName).
const MIN_ALIAS_LENGTH = 4

// prettier-ignore
const CURATED_PLACE_GROUPS = [
  {
    // Major national cities, plus main regions/islands (for jobs listed
    // only by region, not city) -- no admin-area restriction, since
    // these are meant to resolve nationally.
    adminFilter: null,
    names: [
      'Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Chania', 'Rethymno',
      'Larissa', 'Volos', 'Ioannina', 'Kavala', 'Serres', 'Alexandroupoli',
      'Xanthi', 'Komotini', 'Katerini', 'Kozani', 'Kastoria', 'Florina',
      'Veroia', 'Edessa', 'Drama', 'Trikala', 'Karditsa', 'Lamia', 'Chalkida',
      'Livadeia', 'Thiva', 'Agrinio', 'Mesolongi', 'Tripoli', 'Sparta',
      'Kalamata', 'Nafplio', 'Corinth', 'Pyrgos', 'Rhodes', 'Kos', 'Mytilene',
      'Chios', 'Ermoupoli', 'Corfu', 'Zakynthos', 'Argostoli', 'Naxos',
      'Mykonos', 'Fira', 'Samos',
      'Crete', 'Peloponnese', 'Lesbos'
    ]
  },
  {
    // Attica (Athens & Piraeus metro) districts -- many of these names
    // (e.g. "Panorama", "Ampelokipoi") are common toponyms that also
    // exist as tiny, unrelated villages elsewhere in Greece, so matches
    // are restricted to Attica's admin1 code where possible.
    adminFilter: { admin1: 'ESYE31' },
    names: [
      'Piraeus', 'Glyfada', 'Marousi', 'Kifisia', 'Chalandri', 'Nea Smyrni',
      'Peristeri', 'Nikaia', 'Kallithea', 'Ilion', 'Agia Paraskevi',
      'Cholargos', 'Gerakas', 'Voula', 'Vouliagmeni', 'Vari', 'Palaio Faliro',
      'Zografou', 'Kaisariani', 'Papagou', 'Melissia', 'Pefki',
      'Metamorfosi', 'Neo Irakleio', 'Nea Ionia', 'Chaidari', 'Aigaleo',
      'Petroupoli', 'Acharnes', 'Elefsina', 'Megara', 'Rafina', 'Spata',
      'Koropi', 'Salamina', 'Korydallos', 'Keratsini', 'Perama', 'Alimos',
      'Argyroupoli', 'Elliniko', 'Ymittos', 'Dafni'
    ]
  },
  {
    // Thessaloniki districts -- restricted to Thessaloniki's own admin2
    // code (rather than just Central Macedonia's admin1), since several
    // of these names (e.g. "Toumba"/"Panorama") also match unrelated
    // villages elsewhere in the wider region.
    adminFilter: { admin1: 'ESYE12', admin2: '13' },
    names: [
      'Kalamaria', 'Pylaia', 'Panorama', 'Evosmos', 'Neapoli', 'Sykies',
      'Stavroupoli', 'Ampelokipoi', 'Menemeni', 'Pavlos Melas', 'Toumba',
      'Charilaou'
    ]
  }
]

// GeoNames sometimes gives the exact same bare alias to more than one
// curated place -- e.g. "Neo Irakleio" (Athens suburb) and "Heraklion"
// (the major Cretan city) both alternately go by "Irakleio"/"Iraklio".
// Only the designated owner below keeps that specific bare alias; every
// other entry has it stripped (their other, unambiguous aliases are
// unaffected). See geo.spec.ts's existing "Neo Heraklio vs Heraklion,
// Crete" test coverage for why this distinction matters.
const AMBIGUOUS_ALIAS_OWNERS = new Map([
  ['irakleio', 'Irakleion'],
  ['irakleion', 'Irakleion'],
  ['iraklio', 'Irakleion'],
  ['iraklion', 'Irakleion'],
  ['heraklion', 'Irakleion'],
  // "Candia" was Heraklion's historic Venetian-era name.
  ['candia', 'Irakleion'],
  // "Kreta" (German/several other languages for Crete) also turns up as
  // an alternate name on the Chania row -- keep it on the region.
  ['kreta', 'Crete'],
  // "Neapolis" is ancient Kavala's Greek/Roman name, but also an exact
  // alternate spelling of the modern Neapoli district in Thessaloniki;
  // keep it with the latter since that's the literal, current-day match.
  ['neapolis', 'Neapoli']
])

// Aliases too generic to safely assign to any single curated place --
// e.g. "Chora"/"Kastro" are common nouns ("the town" / "the castle")
// that double as the historic name of the main settlement on many Greek
// islands and hilltop towns, not just the ones in this curated list.
// Dropped everywhere rather than guessing an owner.
const AMBIGUOUS_ALIASES_TO_DROP = new Set(['chora', 'khora', 'kastro'])

// Common real-world spelling variants that people actually type but that
// GeoNames doesn't happen to list as an alternate name for this specific
// row (unlike "irakleio"/"iraklio" etc., which the Crete row already
// carries, Neo Irakleio's row doesn't include the common "Heraklio"-with-
// an-h spelling of its own "Irakleio" part) -- keyed by canonical name.
const EXTRA_ALIASES = new Map([
  [
    'Neo Irakleio',
    ['neo heraklio', 'neo heraklion', 'neo iraklio', 'nea irakleio', 'nea heraklio', 'nea iraklio']
  ]
])

/**
 * @typedef {Object} GeonameRow
 * @property {number} population
 * @property {string} name
 * @property {string} asciiName
 * @property {number} lat
 * @property {number} lng
 * @property {string[]} altNames
 * @property {string} featureClass
 * @property {string} featureCode
 * @property {string} admin1
 * @property {string} admin2
 */

/**
 * @typedef {Object} CityEntry
 * @property {string} canonical
 * @property {[number, number]} coords
 * @property {string[]} aliases
 * @property {true} fuzzy
 */

const normalizeName = (input) =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/** Downloads and unzips GeoNames' GR.zip into tmpDir, returning GR.txt's raw contents. */
const downloadGeonamesData = async (tmpDir) => {
  console.log('Downloading GeoNames GR.zip...')
  const response = await fetch(GEONAMES_URL)
  if (!response.ok) {
    throw new Error(`Failed to download GeoNames data: ${response.status}`)
  }

  const zipPath = join(tmpDir, 'GR.zip')
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()))
  await extract(zipPath, { dir: tmpDir })

  return readFileSync(join(tmpDir, 'GR.txt'), 'utf-8')
}

/** Parses GeoNames' tab-separated dump format into GeonameRow objects. */
const parseGeonamesRows = (raw) => {
  /** @type {GeonameRow[]} */
  const rows = []

  for (const line of raw.split('\n')) {
    if (!line) continue

    const cols = line.split('\t')
    if (cols.length < 15) continue

    const [
      ,
      name,
      asciiName,
      altNamesRaw,
      latStr,
      lngStr,
      featureClass,
      featureCode,
      ,
      ,
      admin1,
      admin2
    ] = cols
    if (!asciiName) continue

    rows.push({
      population: Number(cols[14]) || 0,
      name,
      asciiName,
      lat: Number(latStr),
      lng: Number(lngStr),
      altNames: altNamesRaw ? altNamesRaw.split(',').map((n) => n.trim()) : [],
      featureClass,
      featureCode,
      admin1,
      admin2
    })
  }

  return rows
}

/** Every row whose name/asciiname/alternate-name exactly matches (case/accent-insensitively). */
const findCandidateRows = (rows, normalizedTarget) =>
  rows.filter((row) =>
    [row.name, row.asciiName, ...row.altNames].some((n) => normalizeName(n) === normalizedTarget)
  )

/**
 * Narrows candidates down to the given admin area (e.g. Attica or
 * Thessaloniki), if one is specified -- several district names (e.g.
 * "Panorama", "Toumba") are common toponyms that also match small,
 * unrelated villages elsewhere in Greece. Falls back to the unrestricted
 * candidate list if none match (or no admin area was specified).
 */
const scopeToAdminArea = (candidates, adminFilter) => {
  if (!adminFilter) return candidates

  const inAdminArea = candidates.filter(
    (row) =>
      row.admin1 === adminFilter.admin1 &&
      (!adminFilter.admin2 || row.admin2 === adminFilter.admin2)
  )
  return inAdminArea.length > 0 ? inAdminArea : candidates
}

/**
 * Picks the single best candidate row for a curated place name out of
 * everything findCandidateRows()/scopeToAdminArea() left standing.
 */
const pickBestRow = (candidates) => {
  // Prefer an actual populated place ("P") over a broader island/region/
  // admin-area row sharing the same name -- e.g. "Mytilene" should
  // resolve to the town (pop ~28k), not the whole island of Lesbos (pop
  // ~84k) just because it happens to have a bigger population figure.
  // Falls back to any feature class for names that only exist as an
  // island/region (e.g. Crete, Peloponnese).
  const populatedPlaces = candidates.filter((row) => row.featureClass === 'P')
  const pool = populatedPlaces.length > 0 ? populatedPlaces : candidates

  return pool.reduce((a, b) => {
    if (b.population !== a.population) return b.population > a.population ? b : a

    // Population is tied (often 0-vs-0 for small suburbs GeoNames
    // doesn't track separately) -- prefer a feature code that explicitly
    // marks "part of a populated place" (e.g. PPLX) over a bare PPL,
    // which is more likely to be an unrelated, similarly named village
    // that happened to share an admin area by chance.
    const bIsPartOfCity = b.featureCode !== 'PPL'
    const aIsPartOfCity = a.featureCode !== 'PPL'
    return bIsPartOfCity !== aIsPartOfCity ? (bIsPartOfCity ? b : a) : a
  })
}

/** Builds the deduped, filtered, lowercased alias list for a resolved row. */
const buildAliases = (row, normalizedTarget, canonical) => {
  const aliases = new Set()

  for (const candidate of [row.asciiName, row.name, ...row.altNames]) {
    const trimmed = candidate.trim()
    if (trimmed && trimmed.length >= MIN_ALIAS_LENGTH && LATIN_ONLY.test(trimmed)) {
      aliases.add(trimmed.toLowerCase())
    }
  }

  // Always include the search term itself, in case none of GeoNames' own
  // spellings happened to exactly match it (e.g. abbreviations) -- kept
  // regardless of length, unlike the GeoNames-derived aliases above.
  aliases.add(normalizedTarget)

  for (const extra of EXTRA_ALIASES.get(canonical) ?? []) {
    aliases.add(normalizeName(extra))
  }

  return Array.from(aliases).sort()
}

/** Resolves a single curated place name to a CityEntry, given the full GeoNames row list. */
const resolvePlaceName = (rows, placeName, adminFilter) => {
  const normalizedTarget = normalizeName(placeName)
  const candidates = findCandidateRows(rows, normalizedTarget)
  if (candidates.length === 0) return null

  const best = pickBestRow(scopeToAdminArea(candidates, adminFilter))
  const canonical = best.asciiName.trim()

  return {
    canonical,
    coords: [Number(best.lat.toFixed(4)), Number(best.lng.toFixed(4))],
    aliases: buildAliases(best, normalizedTarget, canonical),
    // Every place in this curated list is, by construction, a
    // major/well-known name -- so typo-tolerant fuzzy matching is safe
    // to enable across the board (unlike the earlier ~2,265-place
    // dataset, where it had to be restricted to a population threshold
    // to avoid false positives against obscure village names).
    fuzzy: true
  }
}

/** Strips the known-ambiguous aliases (see the constants above) from every entry in place. */
const resolveAliasAmbiguities = (entries) => {
  for (const entry of entries) {
    entry.aliases = entry.aliases.filter((alias) => {
      if (AMBIGUOUS_ALIASES_TO_DROP.has(alias)) return false
      const owner = AMBIGUOUS_ALIAS_OWNERS.get(alias)
      return !owner || owner === entry.canonical
    })
  }
}

/** Logs any alias shared by more than one entry, so it can be reviewed and resolved above. */
const reportAliasCollisions = (entries) => {
  const ownersByAlias = new Map()
  for (const entry of entries) {
    for (const alias of entry.aliases) {
      if (!ownersByAlias.has(alias)) ownersByAlias.set(alias, [])
      ownersByAlias.get(alias).push(entry.canonical)
    }
  }

  const collisions = Array.from(ownersByAlias.entries()).filter(([, owners]) => owners.length > 1)
  if (collisions.length === 0) return

  console.warn(`\n${collisions.length} alias(es) shared by more than one curated place:`)
  for (const [alias, owners] of collisions) {
    console.warn(`  "${alias}": ${owners.join(', ')}`)
  }
}

const main = async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'geonames-gr-'))

  try {
    const raw = await downloadGeonamesData(tmpDir)
    const rows = parseGeonamesRows(raw)

    /** @type {CityEntry[]} */
    const entries = []
    const notFound = []

    for (const { adminFilter, names } of CURATED_PLACE_GROUPS) {
      for (const placeName of names) {
        const entry = resolvePlaceName(rows, placeName, adminFilter)
        if (entry) {
          entries.push(entry)
        } else {
          notFound.push(placeName)
        }
      }
    }

    if (notFound.length > 0) {
      console.warn(`\nCould not find a GeoNames match for: ${notFound.join(', ')}`)
    }

    resolveAliasAmbiguities(entries)
    reportAliasCollisions(entries)

    entries.sort((a, b) => a.canonical.localeCompare(b.canonical))

    writeFileSync(OUTPUT_PATH, JSON.stringify(entries) + '\n')

    const totalNames = CURATED_PLACE_GROUPS.reduce((sum, g) => sum + g.names.length, 0)
    console.log(
      `\nWrote ${entries.length} of ${totalNames} curated place entries to ${OUTPUT_PATH}`
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

await main()
