import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SHELTERS } from '@/data'
import { fetchNearbyShelters } from './shelters'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchNearbyShelters', () => {
  it('posts the expected payload to the worker proxy route', async () => {
    mockFetchResponse([])

    await fetchNearbyShelters({
      lat: 32.16,
      lng: 34.84,
      radiusKm: 3.04,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('/api/nearby-shelters')

    const options = mockFetch.mock.calls[0][1] as RequestInit
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(options.body).toBe(JSON.stringify({
      lat: 32.16,
      lng: 34.84,
      radius_km: 3.04,
    }))
  })

  it('normalizes worker rows (uuid + latitude/longitude)', async () => {
    mockFetchResponse([
      {
        id: 'd1d9b8cf-ffbd-48b2-ae00-48eeced6b778',
        address: 'Unknown address',
        building_name: 'מועדון התעופה הרצליה',
        shelter_type: 'public_shelter',
        latitude: 32.1622168,
        longitude: 34.8392112,
        is_closed: false,
      },
    ])

    const result = await fetchNearbyShelters({
      lat: 32.16,
      lng: 34.84,
      radiusKm: 3,
    })

    expect(result).toHaveLength(1)
    expect(typeof result[0].id).toBe('number')
    expect(result[0].lat).toBeCloseTo(32.1622168)
    expect(result[0].lng).toBeCloseTo(34.8392112)
    expect(result[0].address).toBe('מועדון התעופה הרצליה')
    expect(result[0].type).toBe('מקלט ציבורי')
    expect(result[0].open).toBe('כן')
  })

  it('fills unknown address from nearest known municipal shelter when close enough', async () => {
    const known = SHELTERS[0]
    mockFetchResponse([
      {
        id: 'unknown-address-id',
        address: 'Unknown address',
        building_name: null,
        shelter_type: 'public_shelter',
        latitude: known.lat,
        longitude: known.lng,
      },
    ])

    const result = await fetchNearbyShelters({
      lat: known.lat,
      lng: known.lng,
      radiusKm: 3,
    })

    expect(result).toHaveLength(1)
    expect(result[0].address).toBe(known.address)
  })

  it('supports wrapped payload arrays under data', async () => {
    mockFetchResponse({
      data: [
        {
          id: 7,
          lat: 32.1,
          lng: 34.8,
          address: 'רחוב הבדיקה 7',
          type: 'test',
        },
      ],
    })

    const result = await fetchNearbyShelters({
      lat: 32.16,
      lng: 34.84,
      radiusKm: 3,
    })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(7)
    expect(result[0].lat).toBe(32.1)
    expect(result[0].lng).toBe(34.8)
  })

  it('throws on non-ok HTTP response', async () => {
    mockFetchResponse({}, false, 500)

    await expect(fetchNearbyShelters({
      lat: 32.16,
      lng: 34.84,
      radiusKm: 3,
    })).rejects.toThrow('Shelter lookup failed')
  })

  it('throws on invalid lookup radius before fetch', async () => {
    await expect(fetchNearbyShelters({
      lat: 32.16,
      lng: 34.84,
      radiusKm: 0,
    })).rejects.toThrow('Invalid shelter lookup radius')

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
