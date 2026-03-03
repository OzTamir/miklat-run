import { describe, expect, it } from 'vitest'

import type { Shelter } from '@/types'
import { buildGrid, nearestShelterDist } from './spatial-index'

const GRID_SIZE = 0.003

const shelters: Shelter[] = [
  {
    id: 1,
    lat: 32.081,
    lng: 34.781,
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
    lat: 32.083,
    lng: 34.785,
    address: 'Shelter B',
    type: 'public',
    status: 'active',
    notes: '',
    area: 150,
    open: 'yes',
    hours: '24/7',
  },
]

describe('buildGrid', () => {
  it('creates a populated grid from shelter array', () => {
    const grid = buildGrid(shelters)
    expect(grid.size).toBeGreaterThan(0)
  })

  it('places shelter in the expected grid cell key', () => {
    const grid = buildGrid(shelters)
    const gx = Math.floor(shelters[0].lng / GRID_SIZE)
    const gy = Math.floor(shelters[0].lat / GRID_SIZE)
    const key = `${gx},${gy}`

    expect(grid.has(key)).toBe(true)
    expect(grid.get(key)?.some((s) => s.id === shelters[0].id)).toBe(true)
  })
})

describe('nearestShelterDist', () => {
  it('returns correct distance for a known shelter position', () => {
    const grid = buildGrid(shelters)
    const distance = nearestShelterDist(shelters[0].lat, shelters[0].lng, grid)
    expect(distance).toBeCloseTo(0, 3)
  })

  it('returns Infinity for empty grid', () => {
    const distance = nearestShelterDist(32.0853, 34.7818, new Map())
    expect(distance).toBe(Infinity)
  })
})
