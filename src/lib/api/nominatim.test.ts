import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NominatimReverseResult, NominatimSearchResult } from '@/types'
import { reverseGeocode, searchAddress } from './nominatim'

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

beforeEach(() => {
  mockFetch.mockReset()
})

describe('searchAddress', () => {
  it('constructs URL with encoded query and Tel Aviv suffix', async () => {
    mockFetchResponse([])

    await searchAddress('דיזנגוף')

    const expectedQuery = encodeURIComponent('דיזנגוף תל אביב')
    expect(getCalledUrl()).toContain(`q=${expectedQuery}`)
    expect(getCalledUrl()).toContain('format=json')
    expect(getCalledUrl()).toContain('limit=5')
    expect(getCalledUrl()).toContain('countrycodes=il')
    expect(getCalledUrl()).toContain('accept-language=he')
  })

  it('sends required User-Agent header', async () => {
    mockFetchResponse([])

    await searchAddress('דיזנגוף')

    const options = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
    expect(options.headers['User-Agent']).toBe('MasluMugan/1.0')
  })

  it('returns parsed search results array on success', async () => {
    const results: NominatimSearchResult[] = [
      {
        place_id: 1,
        lat: '32.0809',
        lon: '34.7806',
        display_name: 'דיזנגוף 1, תל אביב',
        address: { road: 'דיזנגוף', city: 'תל אביב' },
      },
    ]
    mockFetchResponse(results)

    const output = await searchAddress('דיזנגוף')

    expect(output).toEqual(results)
  })

  it('throws when search HTTP response is not ok', async () => {
    mockFetchResponse([], false, 500)

    await expect(searchAddress('דיזנגוף')).rejects.toThrow('Nominatim search failed')
  })
})

describe('reverseGeocode', () => {
  it('constructs reverse URL with lat/lon params and expected options', async () => {
    mockFetchResponse({})

    await reverseGeocode(32.08, 34.78)

    expect(getCalledUrl()).toContain('lat=32.08')
    expect(getCalledUrl()).toContain('lon=34.78')
    expect(getCalledUrl()).toContain('format=json')
    expect(getCalledUrl()).toContain('accept-language=he')
    expect(getCalledUrl()).toContain('zoom=18')
  })

  it('sends required User-Agent header for reverse geocoding', async () => {
    mockFetchResponse({})

    await reverseGeocode(32.08, 34.78)

    const options = mockFetch.mock.calls[0][1] as { headers: Record<string, string> }
    expect(options.headers['User-Agent']).toBe('MasluMugan/1.0')
  })

  it('returns parsed reverse geocode result on success', async () => {
    const result: NominatimReverseResult = {
      place_id: 2,
      lat: '32.0809',
      lon: '34.7806',
      display_name: 'דיזנגוף 1, תל אביב',
      address: { road: 'דיזנגוף', house_number: '1', city: 'תל אביב' },
    }
    mockFetchResponse(result)

    const output = await reverseGeocode(32.08, 34.78)

    expect(output).toEqual(result)
  })

  it('throws when reverse geocode HTTP response is not ok', async () => {
    mockFetchResponse({}, false, 500)

    await expect(reverseGeocode(32.08, 34.78)).rejects.toThrow('Nominatim reverse geocode failed')
  })
})
