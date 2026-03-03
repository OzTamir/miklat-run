import { describe, expect, it } from 'vitest'

import type { Shelter } from '@/types'
import { haversine, nearestShelter } from './haversine'

const shelters: Shelter[] = [
  {
    id: 1,
    lat: 32.0809,
    lng: 34.7806,
    address: 'Shelter A',
    type: 'public',
    status: 'active',
    notes: '',
    area: 100,
    open: 'yes',
    hours: '24/7',
  },
  {
    id: 2,
    lat: 31.7683,
    lng: 35.2137,
    address: 'Shelter B',
    type: 'public',
    status: 'active',
    notes: '',
    area: 150,
    open: 'yes',
    hours: '24/7',
  },
]

describe('haversine', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversine(0, 0, 0, 0)).toBe(0)
  })

  it('calculates known distance between Tel Aviv and Jerusalem (~54km)', () => {
    const distanceMeters = haversine(32.0853, 34.7818, 31.7683, 35.2137)
    expect(distanceMeters).toBeCloseTo(54000, -3)
  })

  it('is symmetric between two points', () => {
    const aToB = haversine(32.0853, 34.7818, 31.7683, 35.2137)
    const bToA = haversine(31.7683, 35.2137, 32.0853, 34.7818)
    expect(aToB).toBeCloseTo(bToA, 6)
  })
})

describe('nearestShelter', () => {
  it('returns the closest shelter from an array', () => {
    const result = nearestShelter(32.081, 34.781, shelters)
    expect(result.shelter?.id).toBe(1)
    expect(result.distance).toBeLessThan(100)
  })

  it('returns null shelter and Infinity distance for empty array', () => {
    const result = nearestShelter(32.0853, 34.7818, [])
    expect(result.shelter).toBeNull()
    expect(result.distance).toBe(Infinity)
  })
})
