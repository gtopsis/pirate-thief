import { describe, it, expect } from 'vitest'
import { getCoordsForLocation } from '@/utils/geo'

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
})
