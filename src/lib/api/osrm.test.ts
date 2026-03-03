import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LatLng, OSRMStep, RouteData } from '@/types'
import { getOSRMRoute } from './osrm'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

function getCalledUrl(): string {
  return String(mockFetch.mock.calls[0][0])
}

function getCoordsFromUrl(url: string): string[] {
  const coordsSection = url.split('/route/v1/foot/')[1].split('?')[0]
  return coordsSection.split(';')
}

function makeWaypoint(i: number): LatLng {
  return { lat: 32 + i * 0.001, lng: 34 + i * 0.001 }
}

const defaultRoute: RouteData = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [34.78, 32.08],
      [34.79, 32.09],
    ],
  },
  distance: 5000,
  duration: 3600,
  waypoints: [],
  steps: [],
}

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getOSRMRoute', () => {
  it('constructs OSRM URL using lng,lat coordinate order', async () => {
    const waypoints: LatLng[] = [
      { lat: 32.08, lng: 34.78 },
      { lat: 32.09, lng: 34.79 },
      { lat: 32.08, lng: 34.78 },
    ]
    mockFetchResponse({ code: 'Ok', routes: [{ ...defaultRoute, legs: [] }] })

    await getOSRMRoute(waypoints)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(getCalledUrl()).toBe(
      'https://router.project-osrm.org/route/v1/foot/34.78,32.08;34.79,32.09;34.78,32.08?overview=full&geometries=geojson&steps=true',
    )
  })

  it('simplifies waypoint list when input has more than 50 points', async () => {
    const waypoints = Array.from({ length: 60 }, (_, i) => makeWaypoint(i))
    mockFetchResponse({ code: 'Ok', routes: [{ ...defaultRoute, legs: [] }] })

    await getOSRMRoute(waypoints)

    const coords = getCoordsFromUrl(getCalledUrl())
    expect(coords).toHaveLength(32)
    expect(coords[0]).toBe(`${waypoints[0].lng},${waypoints[0].lat}`)
    expect(coords.at(-1)).toBe(coords[0])
    expect(coords).toContain(`${waypoints[1].lng},${waypoints[1].lat}`)
    expect(coords).not.toContain(`${waypoints[2].lng},${waypoints[2].lat}`)
  })

  it('deduplicates consecutive points within tolerance', async () => {
    const waypoints: LatLng[] = [
      { lat: 32.08, lng: 34.78 },
      { lat: 32.080005, lng: 34.780005 },
      { lat: 32.09, lng: 34.79 },
    ]
    mockFetchResponse({ code: 'Ok', routes: [{ ...defaultRoute, legs: [] }] })

    await getOSRMRoute(waypoints)

    const coords = getCoordsFromUrl(getCalledUrl())
    expect(coords).toEqual(['34.78,32.08', '34.79,32.09', '34.78,32.08'])
  })

  it('closes loop by appending first waypoint when path is open', async () => {
    const waypoints: LatLng[] = [
      { lat: 32.08, lng: 34.78 },
      { lat: 32.09, lng: 34.79 },
    ]
    mockFetchResponse({ code: 'Ok', routes: [{ ...defaultRoute, legs: [] }] })

    await getOSRMRoute(waypoints)

    const coords = getCoordsFromUrl(getCalledUrl())
    expect(coords).toEqual(['34.78,32.08', '34.79,32.09', '34.78,32.08'])
  })

  it('parses successful OSRM response into RouteData', async () => {
    const step: OSRMStep = {
      distance: 120,
      duration: 90,
      name: 'Street',
      maneuver: {
        type: 'turn',
        bearing_before: 10,
        bearing_after: 20,
      },
    }
    mockFetchResponse({
      code: 'Ok',
      routes: [
        {
          geometry: defaultRoute.geometry,
          distance: 5000,
          duration: 3600,
          legs: [{ steps: [step] }],
        },
      ],
    })
    const waypoints: LatLng[] = [
      { lat: 32.08, lng: 34.78 },
      { lat: 32.09, lng: 34.79 },
      { lat: 32.08, lng: 34.78 },
    ]

    const result = await getOSRMRoute(waypoints)

    expect(result.geometry).toEqual(defaultRoute.geometry)
    expect(result.distance).toBe(5000)
    expect(result.duration).toBe(3600)
    expect(result.waypoints).toEqual(waypoints)
    expect(result.steps).toEqual([step])
  })

  it('flattens steps across multiple legs', async () => {
    const steps = [
      { distance: 1, duration: 1, name: 'A', maneuver: { type: 'turn', bearing_before: 0, bearing_after: 0 } },
      { distance: 2, duration: 2, name: 'B', maneuver: { type: 'turn', bearing_before: 0, bearing_after: 0 } },
      { distance: 3, duration: 3, name: 'C', maneuver: { type: 'turn', bearing_before: 0, bearing_after: 0 } },
      { distance: 4, duration: 4, name: 'D', maneuver: { type: 'turn', bearing_before: 0, bearing_after: 0 } },
    ]
    mockFetchResponse({
      code: 'Ok',
      routes: [
        {
          geometry: defaultRoute.geometry,
          distance: 10,
          duration: 10,
          legs: [{ steps: steps.slice(0, 2) }, { steps: steps.slice(2) }],
        },
      ],
    })

    const result = await getOSRMRoute([
      { lat: 32.08, lng: 34.78 },
      { lat: 32.09, lng: 34.79 },
      { lat: 32.08, lng: 34.78 },
    ])

    expect(result.steps).toHaveLength(4)
    expect(result.steps).toEqual(steps)
  })

  it('throws Hebrew OSRM server error when HTTP response is not ok', async () => {
    mockFetchResponse({}, false, 500)

    await expect(
      getOSRMRoute([
        { lat: 32.08, lng: 34.78 },
        { lat: 32.09, lng: 34.79 },
      ]),
    ).rejects.toThrow('שגיאת שרת OSRM')
  })

  it('throws no-route error when OSRM code is not Ok', async () => {
    mockFetchResponse({ code: 'NoRoute', routes: [] })

    await expect(
      getOSRMRoute([
        { lat: 32.08, lng: 34.78 },
        { lat: 32.09, lng: 34.79 },
      ]),
    ).rejects.toThrow('לא נמצא מסלול')
  })

  it('throws on insufficient waypoints after preprocessing', async () => {
    await expect(getOSRMRoute([{ lat: 32.08, lng: 34.78 }])).rejects.toThrow(
      'Insufficient waypoints for route',
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
