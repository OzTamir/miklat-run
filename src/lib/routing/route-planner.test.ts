import { describe, expect, it } from 'vitest'

import { haversine } from '@/lib/geo'
import type { Shelter } from '@/types'
import { planRouteWaypoints } from './route-planner'

const shelters: Shelter[] = [
  { id: 1, lat: 32.081, lng: 34.782, address: 'A', type: 'public', status: 'open', notes: '', area: 0, open: 'yes', hours: '' },
  { id: 2, lat: 32.082, lng: 34.786, address: 'B', type: 'public', status: 'open', notes: '', area: 0, open: 'yes', hours: '' },
  { id: 3, lat: 32.084, lng: 34.79, address: 'C', type: 'public', status: 'open', notes: '', area: 0, open: 'yes', hours: '' },
  { id: 4, lat: 32.086, lng: 34.794, address: 'D', type: 'public', status: 'open', notes: '', area: 0, open: 'yes', hours: '' },
]

describe('planRouteWaypoints', () => {
  it('keeps loop routes closed when no end point is provided', () => {
    const start = { lat: 32.08, lng: 34.78 }
    const waypoints = planRouteWaypoints(start, 4000, shelters, 0.25)

    expect(waypoints[0]).toEqual(start)
    expect(waypoints.at(-1)).toEqual(start)
  })

  it('returns an open route from start to end when an end point is provided', () => {
    const start = { lat: 32.08, lng: 34.78 }
    const end = { lat: 32.088, lng: 34.798 }
    const waypoints = planRouteWaypoints(start, 4200, shelters, 0.2, end)

    expect(waypoints[0]).toEqual(start)
    expect(waypoints.at(-1)).toEqual(end)
    expect(haversine(waypoints[0].lat, waypoints[0].lng, waypoints.at(-1)!.lat, waypoints.at(-1)!.lng)).toBeGreaterThan(0)
    expect(waypoints).not.toHaveLength(1)
  })
})
