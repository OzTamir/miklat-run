import type { Shelter } from '@/types'
import { haversine } from './haversine'

const GRID_SIZE = 0.003

export function buildGrid(shelters: Shelter[]): Map<string, Shelter[]> {
  const grid = new Map<string, Shelter[]>()
  shelters.forEach(s => {
    const gx = Math.floor(s.lng / GRID_SIZE)
    const gy = Math.floor(s.lat / GRID_SIZE)
    const key = `${gx},${gy}`
    if (!grid.has(key)) {
      grid.set(key, [])
    }
    grid.get(key)!.push(s)
  })
  return grid
}

export function nearestShelterDist(lat: number, lng: number, grid: Map<string, Shelter[]>): number {
  const gx = Math.floor(lng / GRID_SIZE)
  const gy = Math.floor(lat / GRID_SIZE)
  let minDist = Infinity
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gx + dx},${gy + dy}`
      const cell = grid.get(key)
      if (!cell) continue
      for (const s of cell) {
        const d = haversine(lat, lng, s.lat, s.lng)
        if (d < minDist) minDist = d
      }
    }
  }
  return minDist
}
