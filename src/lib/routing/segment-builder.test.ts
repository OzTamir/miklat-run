import { describe, expect, it } from 'vitest'

import { haversine } from '@/lib/geo'
import type { OSRMStep, Shelter } from '@/types'
import { buildLogicalSegments } from './segment-builder'

const testShelters: Shelter[] = [
  { id: 1, lat: 32.08, lng: 34.78, address: 'Test A', type: 'public', status: 'active', notes: '', area: 100, open: 'yes', hours: '24/7' },
  { id: 2, lat: 32.0825, lng: 34.788, address: 'Test B', type: 'public', status: 'active', notes: '', area: 120, open: 'yes', hours: '24/7' },
  { id: 3, lat: 32.085, lng: 34.801, address: 'Test C', type: 'public', status: 'active', notes: '', area: 90, open: 'yes', hours: '24/7' },
]

const testCoords: [number, number][] = Array.from({ length: 101 }, (_, i) => [
  34.78 + i * 0.00025,
  32.08 + i * 0.00004,
])

function coordsDistance(coords: [number, number][]): number {
  let total = 0
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1]
    const [lng2, lat2] = coords[i]
    total += haversine(lat1, lng1, lat2, lng2)
  }
  return total
}

function makeSteps(totalDist: number, count: number): OSRMStep[] {
  const perStep = totalDist / count
  return Array.from({ length: count }, (_, i) => ({
    distance: perStep,
    duration: perStep / 1.4,
    name: `Street ${i + 1}`,
    maneuver: {
      type: i === 0 ? 'depart' : 'turn',
      bearing_before: (i * 45) % 360,
      bearing_after: ((i + 1) * 45) % 360,
    },
  }))
}

describe('buildLogicalSegments', () => {
  it('returns single fallback segment when steps array is empty', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const segments = buildLogicalSegments(testCoords, [], totalDist, testShelters)

    expect(segments).toHaveLength(1)
    expect(segments[0].index).toBe(0)
    expect(segments[0].distance).toBe(totalDist)
  })

  it('returns single fallback segment when all steps have distance 0', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const zeroSteps: OSRMStep[] = [
      { distance: 0, duration: 10, name: 'Zero 1', maneuver: { type: 'depart', bearing_before: 0, bearing_after: 0 } },
      { distance: 0, duration: 10, name: 'Zero 2', maneuver: { type: 'turn', bearing_before: 0, bearing_after: 90 } },
    ]
    const segments = buildLogicalSegments(testCoords, zeroSteps, totalDist, testShelters)

    expect(segments).toHaveLength(1)
    expect(segments[0].distance).toBe(totalDist)
  })

  it('returns single fallback segment when all steps are arrive maneuvers', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const arriveSteps: OSRMStep[] = [
      { distance: 300, duration: 200, name: 'End 1', maneuver: { type: 'arrive', bearing_before: 0, bearing_after: 0 } },
      { distance: 450, duration: 300, name: 'End 2', maneuver: { type: 'arrive', bearing_before: 0, bearing_after: 0 } },
    ]
    const segments = buildLogicalSegments(testCoords, arriveSteps, totalDist, testShelters)

    expect(segments).toHaveLength(1)
    expect(segments[0].distance).toBe(totalDist)
  })

  it('with valid steps produces multiple segments', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)

    expect(segments.length).toBeGreaterThan(1)
  })

  it('assigns point and segment zones by shelter proximity thresholds', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)

    segments.forEach((segment) => {
      const dominant = { green: 0, yellow: 0, red: 0 }
      segment.safetyPoints.forEach((point) => {
        const minDist = Math.min(...testShelters.map((s) => haversine(point.lat, point.lng, s.lat, s.lng)))

        if (minDist <= 150) {
          expect(point.zone).toBe('green')
          dominant.green++
        } else if (minDist <= 250) {
          expect(point.zone).toBe('yellow')
          dominant.yellow++
        } else {
          expect(point.zone).toBe('red')
          dominant.red++
        }
      })

      const expectedZone = (Object.entries(dominant).sort((a, b) => b[1] - a[1])[0][0])
      expect(segment.zone).toBe(expectedZone)
    })
  })

  it('keeps segment count within computed lower and upper bounds', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)
    const minBound = 6
    const maxBound = 12

    expect(segments.length).toBeGreaterThanOrEqual(minBound)
    expect(segments.length).toBeLessThanOrEqual(maxBound)
  })

  it('ensures all segments have non-empty safetyPoints arrays', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)

    segments.forEach((segment) => {
      expect(segment.safetyPoints.length).toBeGreaterThan(0)
    })
  })

  it('ensures all segments have valid polyCoords arrays', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)

    segments.forEach((segment) => {
      expect(segment.polyCoords.length).toBeGreaterThan(0)
      segment.polyCoords.forEach((coord) => {
        expect(coord).toHaveLength(2)
        expect(Number.isFinite(coord[0])).toBe(true)
        expect(Number.isFinite(coord[1])).toBe(true)
      })
    })
  })

  it('assigns sequential indices starting from 0', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)

    segments.forEach((segment, idx) => {
      expect(segment.index).toBe(idx)
    })
  })

  it('returns segment distances that sum approximately to totalDist', () => {
    const totalDist = Math.round(coordsDistance(testCoords))
    const steps = makeSteps(totalDist, 8)
    const segments = buildLogicalSegments(testCoords, steps, totalDist, testShelters)
    const summedDist = segments.reduce((acc, seg) => acc + seg.distance, 0)

    expect(summedDist).toBeCloseTo(totalDist, -2)
  })
})
