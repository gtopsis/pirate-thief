import { describe, it, expect } from 'vitest'
import { getCoordsForLocation, getUnmappableJobs } from '@/utils/geo'
import type { Job } from '@/types/types'

// Named coordinates so the test tables below read like plain English
// instead of repeating "magic" lat/lng pairs.
const ATHENS: [number, number] = [37.9838, 23.7275]
const THESSALONIKI: [number, number] = [40.6401, 22.9444]
const HERAKLION_CRETE: [number, number] = [35.3617, 25.1648]
// Neo Heraklio / Nea Irakleio is a distinct suburb of Athens (Attica),
// unrelated to Heraklion in Crete despite the similar name.
const NEO_HERAKLIO_ATHENS_SUBURB: [number, number] = [38.0489, 23.7621]
const AG_PARASKEVI: [number, number] = [38.0167, 23.8167]

describe('getCoordsForLocation', () => {
  it.each<[string, [number, number]]>([
    ['Athens', ATHENS],
    ['Thessaloniki', THESSALONIKI],
    ['Heraklion, Crete', HERAKLION_CRETE],
    ['Iraklio, Crete', HERAKLION_CRETE]
  ])('resolves "%s" to its known coordinates', (location, expected) => {
    expect(getCoordsForLocation(location)).toEqual(expected)
  })

  it.each(['Neo Heraklio', 'Neo Heraklio, Athens', 'Neo Heraklion', 'Nea Irakleio'])(
    'resolves "%s" to the Athens suburb, not Heraklion, Crete',
    (location) => {
      expect(getCoordsForLocation(location)).toEqual(NEO_HERAKLIO_ATHENS_SUBURB)
      expect(getCoordsForLocation(location)).not.toEqual(HERAKLION_CRETE)
    }
  )

  it.each(['Remote', 'Greece', 'Unknown City'])('returns null for "%s"', (location) => {
    expect(getCoordsForLocation(location)).toBeNull()
  })

  describe('normalization', () => {
    it.each<[string, [number, number]]>([
      // Accented "é" should normalize the same as the plain-ASCII alias.
      ['Néo Iraklio', NEO_HERAKLIO_ATHENS_SUBURB],
      // Punctuation-only variants of the same place should all resolve
      // the same way.
      ['Ag. Paraskevi', AG_PARASKEVI],
      ['Ag-Paraskevi', AG_PARASKEVI],
      ['AG PARASKEVI', AG_PARASKEVI]
    ])('normalizes "%s" to the same place as its canonical spelling', (location, expected) => {
      expect(getCoordsForLocation(location)).toEqual(expected)
    })
  })

  describe('fuzzy matching (typos)', () => {
    it.each<[string, [number, number]]>([
      ['Athns', ATHENS], // missing the middle "e"
      ['Thessalonki', THESSALONIKI], // missing an "i"
      // Missing the final "i"; must still resolve to the Athens suburb,
      // not be fuzzily pulled towards Heraklion, Crete instead.
      ['Neo Heraklo', NEO_HERAKLIO_ATHENS_SUBURB]
    ])('resolves the typo "%s"', (location, expected) => {
      expect(getCoordsForLocation(location)).toEqual(expected)
    })

    it.each(['Definitely Not A Known City', 'Wakanda'])(
      'does not force a match for "%s"',
      (location) => {
        expect(getCoordsForLocation(location)).toBeNull()
      }
    )
  })
})

describe('getUnmappableJobs', () => {
  // A Job is the tuple [company, title, location, techArea, url].
  const jobAt = (location: string): Job => ['Acme', 'Engineer', location, 'Backend', 'https://x']

  it('returns only jobs whose location could not be geocoded', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Thessaloniki')
    ]

    const unmappable = getUnmappableJobs(jobs)

    expect(unmappable.map((job) => job[2])).toEqual(['Definitely Not A Known City', 'Remote'])
  })

  it('returns an empty array when every job is mappable', () => {
    const jobs = [jobAt('Athens'), jobAt('Thessaloniki')]

    expect(getUnmappableJobs(jobs)).toEqual([])
  })
})
