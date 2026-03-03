import type { Shelter } from '@/types'

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function nearestShelter(lat: number, lng: number, shelters: Shelter[]): { distance: number; shelter: Shelter | null } {
  let minDist = Infinity
  let closest: Shelter | null = null
  for (const s of shelters) {
    const d = haversine(lat, lng, s.lat, s.lng)
    if (d < minDist) {
      minDist = d
      closest = s
    }
  }
  return { distance: minDist, shelter: closest }
}
