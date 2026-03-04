import { describe, expect, it } from 'vitest'

import type { RouteCandidate } from '@/types'
import { selectClosestRoute } from './route-search'

function makeCandidate(
  actualDist: number,
  opts?: { sf?: number; qualityScore?: number; turnDensity?: number },
): RouteCandidate {
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
    sf: opts?.sf ?? 1,
    qualityScore: opts?.qualityScore,
    turnDensity: opts?.turnDensity,
  }
}

describe('selectClosestRoute', () => {
  it('returns null for empty candidates array', () => {
    expect(selectClosestRoute([], 1000)).toBeNull()
  })

  it('returns the single candidate routeData when only one candidate exists', () => {
    const candidate = makeCandidate(1200)
    expect(selectClosestRoute([candidate], 1000)).toBe(candidate.routeData)
  })

  it('picks the route with smallest absolute distance error regardless of side', () => {
    const under = makeCandidate(4960)
    const over = makeCandidate(5070)
    const selected = selectClosestRoute([under, over], 5000)

    expect(selected).toBe(under.routeData)
  })

  it('rejects extreme overshoot when a near-target route exists', () => {
    const near = makeCandidate(4920)
    const huge = makeCandidate(18000)
    const selected = selectClosestRoute([near, huge], 5000)

    expect(selected).toBe(near.routeData)
  })

  it('uses quality score as tie breaker when distances are effectively equal', () => {
    const a = makeCandidate(1008, { qualityScore: 0.44 })
    const b = makeCandidate(1010, { qualityScore: 0.71 })
    const selected = selectClosestRoute([a, b], 1000)

    expect(selected).toBe(b.routeData)
  })

  it('uses lower turn density as secondary tie breaker', () => {
    const a = makeCandidate(1005, { qualityScore: 0.6, turnDensity: 5.1 })
    const b = makeCandidate(1006, { qualityScore: 0.6, turnDensity: 3.2 })
    const selected = selectClosestRoute([a, b], 1000)

    expect(selected).toBe(b.routeData)
  })
})
