import { describe, expect, it } from 'vitest'

import type { RouteSegment, SafetyZone, Shelter } from '@/types'
import { analyzeRouteSafety, computeSafetyStats } from './safety-analyzer'

const shelters: Shelter[] = [
  { id: 1, lat: 32.08, lng: 34.78, address: 'Center', type: 'public', status: 'active', notes: '', area: 100, open: 'yes', hours: '24/7' },
]

function makeSegment(index: number, zones: SafetyZone[]): RouteSegment {
  return {
    index,
    zone: zones[0] ?? 'red',
    color: '#3aba6f',
    startCoord: { lat: 32.08, lng: 34.78 },
    endCoord: { lat: 32.081, lng: 34.781 },
    midCoord: { lat: 32.0805, lng: 34.7805 },
    distance: 100,
    direction: '',
    bearing: 0,
    streetName: '',
    nearestShelter: shelters[0],
    nearestShelterDist: 10,
    polyCoords: [[32.08, 34.78], [32.081, 34.781]],
    safetyPoints: zones.map((zone, i) => ({
      lat: 32.08 + i * 0.00001,
      lng: 34.78 + i * 0.00001,
      minDist: zone === 'green' ? 100 : zone === 'yellow' ? 200 : 300,
      zone,
      color: zone === 'green' ? '#3aba6f' : zone === 'yellow' ? '#e8c93a' : '#e85a3a',
    })),
  }
}

describe('analyzeRouteSafety', () => {
  it('returns SafetyPoint array with expected zones based on shelter distance', () => {
    const coords: [number, number][] = [
      [34.78, 32.08],
      [34.78, 32.0818],
      [34.78, 32.084],
    ]

    const points = analyzeRouteSafety(coords, shelters)
    expect(points).toHaveLength(3)
    expect(points.map((p) => p.zone)).toEqual(['green', 'yellow', 'red'])
  })

  it('classifies points within 150m of shelter as green', () => {
    const points = analyzeRouteSafety([[34.78, 32.0809]], shelters)
    expect(points[0].zone).toBe('green')
    expect(points[0].minDist).toBeLessThanOrEqual(150)
  })

  it('classifies points between 150m and 250m from shelter as yellow', () => {
    const points = analyzeRouteSafety([[34.78, 32.0818]], shelters)
    expect(points[0].zone).toBe('yellow')
    expect(points[0].minDist).toBeGreaterThan(150)
    expect(points[0].minDist).toBeLessThanOrEqual(250)
  })

  it('classifies points farther than 250m from shelter as red', () => {
    const points = analyzeRouteSafety([[34.78, 32.084]], shelters)
    expect(points[0].zone).toBe('red')
    expect(points[0].minDist).toBeGreaterThan(250)
  })

  it('handles empty coords array', () => {
    expect(analyzeRouteSafety([], shelters)).toEqual([])
  })

  it('samples large coordinate sets using floor(coords.length / 500)', () => {
    const coords: [number, number][] = Array.from({ length: 1500 }, (_, i) => [
      34.78 + i * 0.00001,
      32.08,
    ])

    const points = analyzeRouteSafety(coords, shelters)
    expect(points.length).toBe(500)
  })
})

describe('computeSafetyStats', () => {
  it('returns 100 safe and green for all-green segments', () => {
    const segments = [makeSegment(0, ['green', 'green', 'green'])]
    expect(computeSafetyStats(segments)).toEqual({
      safePercent: 100,
      greenPercent: 100,
      yellowPercent: 0,
    })
  })

  it('returns 0 safe and 0 green/yellow for all-red segments', () => {
    const segments = [makeSegment(0, ['red', 'red'])]
    expect(computeSafetyStats(segments)).toEqual({
      safePercent: 0,
      greenPercent: 0,
      yellowPercent: 0,
    })
  })

  it('returns correct percentages for mixed zones', () => {
    const segments = [
      makeSegment(0, ['green', 'green', 'yellow']),
      makeSegment(1, ['yellow', 'red', 'red']),
    ]

    expect(computeSafetyStats(segments)).toEqual({
      safePercent: 67,
      greenPercent: 33,
      yellowPercent: 33,
    })
  })

  it('returns zeros for empty segments array', () => {
    expect(computeSafetyStats([])).toEqual({
      safePercent: 0,
      greenPercent: 0,
      yellowPercent: 0,
    })
  })
})
