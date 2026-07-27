import { describe, it, expect } from 'vitest'
import { getCoordsForLocation, getUnmappableJobs } from '@/utils/geo'
import type { Job } from '@/types/types'

describe('getCoordsForLocation', () => {
  it('resolves well-known Greek cities', () => {
    expect(getCoordsForLocation('Athens')).toEqual([37.9838, 23.7275])
    expect(getCoordsForLocation('Thessaloniki')).toEqual([40.6401, 22.9444])
  })

  it('resolves Heraklion, Crete', () => {
    expect(getCoordsForLocation('Heraklion, Crete')).toEqual([35.3617, 25.1648])
    expect(getCoordsForLocation('Iraklio, Crete')).toEqual([35.3617, 25.1648])
  })

  it('does not confuse Neo Heraklio (Athens suburb) with Heraklion, Crete', () => {
    // Neo Heraklio / Nea Irakleio is a distinct suburb of Athens (Attica),
    // unrelated to Heraklion in Crete despite the similar name.
    const athensSuburbCoords: [number, number] = [38.0489, 23.7621]
    const crete: [number, number] = [35.3617, 25.1648]

    expect(getCoordsForLocation('Neo Heraklio')).toEqual(athensSuburbCoords)
    expect(getCoordsForLocation('Neo Heraklio, Athens')).toEqual(athensSuburbCoords)
    expect(getCoordsForLocation('Neo Heraklion')).toEqual(athensSuburbCoords)
    expect(getCoordsForLocation('Nea Irakleio')).toEqual(athensSuburbCoords)

    expect(getCoordsForLocation('Neo Heraklio')).not.toEqual(crete)
  })

  it('returns null for non-mappable locations', () => {
    expect(getCoordsForLocation('Remote')).toBeNull()
    expect(getCoordsForLocation('Greece')).toBeNull()
    expect(getCoordsForLocation('Unknown City')).toBeNull()
  })

  describe('normalization', () => {
    it('ignores accents/diacritics', () => {
      // "Néo Iraklio" with an accented e should normalize the same as
      // the plain-ASCII alias "neo iraklio".
      expect(getCoordsForLocation('Néo Iraklio')).toEqual([38.0489, 23.7621])
    })

    it('treats punctuation variants of the same place the same way', () => {
      const coords: [number, number] = [38.0167, 23.8167]
      expect(getCoordsForLocation('Ag. Paraskevi')).toEqual(coords)
      expect(getCoordsForLocation('Ag-Paraskevi')).toEqual(coords)
      expect(getCoordsForLocation('AG PARASKEVI')).toEqual(coords)
    })
  })

  describe('fuzzy matching (typos)', () => {
    it('resolves a single-character typo of a city name', () => {
      // "Athns" is missing the middle "e" of "Athens".
      expect(getCoordsForLocation('Athns')).toEqual([37.9838, 23.7275])
      // "Thessalonki" is missing an "i" from "Thessaloniki".
      expect(getCoordsForLocation('Thessalonki')).toEqual([40.6401, 22.9444])
    })

    it('resolves a typo of a multi-word alias without confusing it with a similar city', () => {
      // "Neo Heraklo" is a typo of "Neo Heraklio" (missing the final "i"),
      // and must still resolve to the Athens suburb, not Heraklion, Crete.
      expect(getCoordsForLocation('Neo Heraklo')).toEqual([38.0489, 23.7621])
    })

    it('does not force a match for strings that are not close to any known place', () => {
      expect(getCoordsForLocation('Definitely Not A Known City')).toBeNull()
      expect(getCoordsForLocation('Wakanda')).toBeNull()
    })
  })
})

describe('getUnmappableJobs', () => {
  const makeJob = (location: string): Job => ['Acme', 'Engineer', location, 'Backend', 'https://x']

  it('returns only jobs whose location could not be geocoded', () => {
    const jobs: Job[] = [
      makeJob('Athens'),
      makeJob('Definitely Not A Known City'),
      makeJob('Remote'),
      makeJob('Thessaloniki')
    ]

    const unmappable = getUnmappableJobs(jobs)

    expect(unmappable).toHaveLength(2)
    expect(unmappable.map((job) => job[2])).toEqual(['Definitely Not A Known City', 'Remote'])
  })

  it('returns an empty array when every job is mappable', () => {
    const jobs: Job[] = [makeJob('Athens'), makeJob('Thessaloniki')]
    expect(getUnmappableJobs(jobs)).toEqual([])
  })
})
