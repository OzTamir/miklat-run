import shelterData from './shelters.json'

// Type definition - will be replaced with import from @/types once available
export interface Shelter {
  id: number
  lat: number
  lng: number
  address: string
  type: string
  status: string
  notes: string
  area: number
  open: string
  hours: string
}

export const SHELTERS: Shelter[] = shelterData as Shelter[]
