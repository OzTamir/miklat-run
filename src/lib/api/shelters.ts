import type { Shelter } from '@/types'
import { SHELTERS } from '@/data'
import { nearestShelter } from '@/lib/geo'

interface NearbySheltersParams {
  lat: number
  lng: number
  radiusKm: number
}

type UnknownRecord = Record<string, unknown>

const MAX_RADIUS_KM = 20
const NEAREST_ADDRESS_MAX_DISTANCE_M = 180

const TYPE_TRANSLATIONS: Record<string, string> = {
  public_shelter: 'מקלט ציבורי',
  school_shelter: 'מקלט ציבורי במוסדות חינוך',
  parking_shelter: 'חניון מחסה לציבור',
  community_shelter: 'מקלט קהילתי',
  protected_space: 'מרחב מוגן',
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toSafeString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function isUnknownAddress(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.length === 0 || normalized === 'unknown address' || normalized === 'כתובת לא ידועה'
}

function translateShelterType(rawType: string): string {
  const normalized = rawType
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!normalized) return ''
  if (TYPE_TRANSLATIONS[normalized]) return TYPE_TRANSLATIONS[normalized]
  return rawType
}

function resolveAddress(
  lat: number,
  lng: number,
  address: string,
  buildingName: string,
  nearest: Shelter | null,
  nearestDistanceM: number,
): string {
  if (!isUnknownAddress(address)) return address
  if (!isUnknownAddress(buildingName)) return buildingName

  if (nearest && nearestDistanceM <= NEAREST_ADDRESS_MAX_DISTANCE_M) {
    return nearest.address
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

function pickArrayPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const record = payload as UnknownRecord
  const candidateKeys = ['data', 'result', 'rows', 'bunkers', 'shelters']
  for (const key of candidateKeys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function normalizeShelter(raw: unknown, index: number): Shelter | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as UnknownRecord

  const lat = toFiniteNumber(record.lat ?? record.latitude ?? record.y)
  const lng = toFiniteNumber(record.lng ?? record.lon ?? record.longitude ?? record.x)
  if (lat === null || lng === null) return null

  const rawId = record.id ?? record.shelter_id
  const idNumeric = toFiniteNumber(rawId)
  const id = idNumeric !== null ? Math.round(idNumeric) : hashString(toSafeString(rawId) || `row-${index}`)

  const area = toFiniteNumber(record.area ?? record.capacity) ?? 0
  const isClosed = Boolean(record.is_closed)
  const address = toSafeString(record.address)
  const buildingName = toSafeString(record.building_name)
  const rawType = toSafeString(record.type ?? record.shelter_type)
  const translatedType = translateShelterType(rawType)

  const nearest = nearestShelter(lat, lng, SHELTERS)
  const fallbackType = nearest.shelter && nearest.distance <= NEAREST_ADDRESS_MAX_DISTANCE_M
    ? nearest.shelter.type
    : ''
  const resolvedType = translatedType || fallbackType || 'מקלט'

  return {
    id,
    lat,
    lng,
    address: resolveAddress(
      lat,
      lng,
      address,
      buildingName,
      nearest.shelter,
      nearest.distance,
    ),
    type: resolvedType,
    status: toSafeString(record.status) || (isClosed ? 'closed' : 'open'),
    notes: toSafeString(record.notes) || buildingName,
    area,
    open: toSafeString(record.open) || (isClosed ? 'לא' : 'כן'),
    hours: toSafeString(record.hours),
  }
}

export async function fetchNearbyShelters({
  lat,
  lng,
  radiusKm,
}: NearbySheltersParams): Promise<Shelter[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid shelter lookup coordinates')
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
    throw new Error('Invalid shelter lookup radius')
  }

  const response = await fetch('/api/nearby-shelters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lat,
      lng,
      radius_km: radiusKm,
    }),
  })

  if (!response.ok) {
    throw new Error('Shelter lookup failed')
  }

  const payload = await response.json()
  const rows = pickArrayPayload(payload)
  const shelters = rows
    .map((row, index) => normalizeShelter(row, index))
    .filter((shelter): shelter is Shelter => shelter !== null)

  return shelters
}
