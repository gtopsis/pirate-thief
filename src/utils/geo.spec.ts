import { describe, it, expect } from 'vitest'
import {
  getCoordsForLocation,
  getRemoteJobs,
  getUnmappableJobs,
  isRemoteLocation
} from '@/utils/geo'
import type { Job } from '@/types/types'

// Named coordinates so the test tables below read like plain English
// instead of repeating "magic" lat/lng pairs. These match
// src/data/greek-cities.json, generated from GeoNames data (see
// scripts/generate-greek-cities.mjs) -- re-run that generator's output
// through this file if it's ever regenerated and these drift.
const ATHENS: [number, number] = [37.9838, 23.7278]
const THESSALONIKI: [number, number] = [40.6407, 22.9349]
const HERAKLION_CRETE: [number, number] = [35.3279, 25.1434]
// Neo Heraklio / Nea Irakleio is a distinct suburb of Athens (Attica),
// unrelated to Heraklion in Crete despite the similar name.
const NEO_HERAKLIO_ATHENS_SUBURB: [number, number] = [38.0427, 23.7673]
const AG_PARASKEVI: [number, number] = [38.0167, 23.8333]
const KIFISIA: [number, number] = [38.0744, 23.8111]

const jobAt = (location: string): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location,
  techArea: 'Backend',
  url: 'https://x'
})

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

  describe('comma-separated locations', () => {
    it.each<[string, [number, number]]>([
      // Left-to-right, most-specific-first: the first segment that
      // resolves wins, regardless of what follows.
      ['Kifisia, Attica, Greece', KIFISIA],
      ['Athens, Attica, Greece', ATHENS],
      // The first segment doesn't resolve, so the next one is tried.
      ['Somewhere Unknown, Athens', ATHENS]
    ])('resolves "%s" to its first matching segment', (location, expected) => {
      expect(getCoordsForLocation(location)).toEqual(expected)
    })

    it.each(['Attica, Greece', 'Unknown Place, Attica, Greece'])(
      'returns null for "%s" (no segment resolves to a known city)',
      (location) => {
        expect(getCoordsForLocation(location)).toBeNull()
      }
    )
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

describe('isRemoteLocation', () => {
  it.each(['Remote', 'Remote, Greece', 'Fully Remote', 'REMOTE', 'Greece', 'greece'])(
    'returns true for "%s"',
    (location) => {
      expect(isRemoteLocation(location)).toBe(true)
    }
  )

  it.each(['Athens', 'Athens (Remote)', 'Remote-work friendly Athens office', 'Unknown City'])(
    'returns false for "%s" (resolves to a city, or has no "remote" keyword)',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )

  it.each(['Remote, Athens', 'Kifisia, Attica, Greece'])(
    'returns false for "%s" (a real, resolvable city takes precedence over "remote"/"Greece")',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )

  it.each(['Unknown Place, Attica, Greece', 'Unknown Place, Greece'])(
    'returns false for "%s" (an unresolved place name isn\'t the same as "Greece"/"Remote" alone)',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )
})

describe('getUnmappableJobs', () => {
  it('returns only jobs whose location could not be geocoded and are not remote listings', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Thessaloniki')
    ]

    const unmappable = getUnmappableJobs(jobs)

    expect(unmappable.map((job) => job.location)).toEqual(['Definitely Not A Known City'])
  })

  it('returns an empty array when every job is mappable', () => {
    const jobs = [jobAt('Athens'), jobAt('Thessaloniki')]

    expect(getUnmappableJobs(jobs)).toEqual([])
  })
})

describe('getRemoteJobs', () => {
  it('returns only remote job listings', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Athens (Remote)'),
      jobAt('Greece'),
      jobAt('Kifisia, Attica, Greece'),
      jobAt('Thessaloniki')
    ]

    const remote = getRemoteJobs(jobs)

    expect(remote.map((job) => job.location)).toEqual(['Remote', 'Greece'])
  })

  it('returns an empty array when no jobs are remote', () => {
    const jobs = [jobAt('Athens'), jobAt('Thessaloniki')]

    expect(getRemoteJobs(jobs)).toEqual([])
  })
})
