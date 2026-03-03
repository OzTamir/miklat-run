import { describe, expect, it } from 'vitest'
import { scaleWaypoints } from './route-planner'
import { haversine } from '@/lib/geo'

const start = { lat: 32.08, lng: 34.78 }

describe('scaleWaypoints', () => {
  it('returns identical waypoints when factor is 1.0', () => {
    const wps = [start, { lat: 32.09, lng: 34.79 }, start]
    const result = scaleWaypoints(start, wps, 1.0)
    expect(result).toEqual(wps)
  })

  it('doubles distance from start when factor is 2.0', () => {
    const wp = { lat: 32.09, lng: 34.79 }
    const wps = [start, wp, start]
    const result = scaleWaypoints(start, wps, 2.0)
    
    const origDist = haversine(start.lat, start.lng, wp.lat, wp.lng)
    const scaledDist = haversine(start.lat, start.lng, result[1].lat, result[1].lng)
    expect(scaledDist).toBeCloseTo(origDist * 2, 0)
  })

  it('halves distance from start when factor is 0.5', () => {
    const wp = { lat: 32.09, lng: 34.79 }
    const wps = [start, wp, start]
    const result = scaleWaypoints(start, wps, 0.5)
    
    const origDist = haversine(start.lat, start.lng, wp.lat, wp.lng)
    const scaledDist = haversine(start.lat, start.lng, result[1].lat, result[1].lng)
    expect(scaledDist).toBeCloseTo(origDist * 0.5, 0)
  })

  it('preserves start/end points unchanged', () => {
    const wps = [start, { lat: 32.09, lng: 34.79 }, { lat: 32.085, lng: 34.785 }, start]
    const result = scaleWaypoints(start, wps, 3.0)
    expect(result[0]).toEqual(start)
    expect(result[result.length - 1]).toEqual(start)
  })

  it('returns empty array for empty input', () => {
    expect(scaleWaypoints(start, [], 2.0)).toEqual([])
  })
})
