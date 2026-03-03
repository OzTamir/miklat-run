import { describe, expect, it } from 'vitest'

import type { RouteCandidate } from '@/types'
import { selectByBias } from './route-search'

function makeCandidate(actualDist: number, sf = 1.0): RouteCandidate {
  return {
    routeData: {
      geometry: { type: 'LineString' as const, coordinates: [[34.78, 32.08], [34.79, 32.09]] },
      distance: actualDist,
      duration: actualDist / 1.4,
      waypoints: [{ lat: 32.08, lng: 34.78 }, { lat: 32.09, lng: 34.79 }],
      steps: [],
    },
    actualDist,
    distError: 0,
    sf,
  }
}

describe('selectByBias', () => {
  it('returns null for empty candidates array', () => {
    expect(selectByBias([], 1000, 'over')).toBeNull()
  })

  it('returns the single candidate routeData when only one candidate exists', () => {
    const candidate = makeCandidate(1200)
    expect(selectByBias([candidate], 1000, 'over')).toBe(candidate.routeData)
  })

  it('with over bias prefers candidates at or above target distance', () => {
    const under = makeCandidate(980)
    const over = makeCandidate(1020)
    const selected = selectByBias([under, over], 1000, 'over')

    expect(selected).toBe(over.routeData)
  })

  it('with over bias picks over-target candidate closest to target', () => {
    const farOver = makeCandidate(1300)
    const nearestOver = makeCandidate(1050)
    const midOver = makeCandidate(1100)
    const candidates = [farOver, nearestOver, midOver]
    const selected = selectByBias(candidates, 1000, 'over')

    expect(selected).toBe(nearestOver.routeData)
  })

  it('with over bias falls back to closest under-target candidate when no over-target candidates exist', () => {
    const farUnder = makeCandidate(700)
    const nearestUnder = makeCandidate(920)
    const midUnder = makeCandidate(840)
    const candidates = [farUnder, nearestUnder, midUnder]
    const selected = selectByBias(candidates, 1000, 'over')

    expect(selected).toBe(nearestUnder.routeData)
  })

  it('with under bias prefers candidates below target distance', () => {
    const over = makeCandidate(1030)
    const under = makeCandidate(970)
    const selected = selectByBias([over, under], 1000, 'under')

    expect(selected).toBe(under.routeData)
  })

  it('with under bias picks under-target candidate closest to target', () => {
    const nearUnder = makeCandidate(960)
    const nearestUnder = makeCandidate(990)
    const farUnder = makeCandidate(900)
    const candidates = [nearUnder, nearestUnder, farUnder]
    const selected = selectByBias(candidates, 1000, 'under')

    expect(selected).toBe(nearestUnder.routeData)
  })

  it('with under bias falls back to closest over-target candidate when no under-target candidates exist', () => {
    const candidates = [makeCandidate(1010), makeCandidate(1090), makeCandidate(1040)]
    const selected = selectByBias(candidates, 1000, 'under')

    expect(selected).toBe(candidates[0].routeData)
  })

  it('handles candidates with identical distances deterministically', () => {
    const candidates = [makeCandidate(1050), makeCandidate(1050), makeCandidate(1100)]
    const selected = selectByBias(candidates, 1000, 'over')

    expect(selected).toBe(candidates[0].routeData)
  })

  it('treats exact target distance as over-target for over bias', () => {
    const exact = makeCandidate(1000)
    const nearUnder = makeCandidate(999)
    const selected = selectByBias([nearUnder, exact], 1000, 'over')

    expect(selected).toBe(exact.routeData)
  })
})
