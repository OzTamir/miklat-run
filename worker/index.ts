const CACHE_TTL_SECONDS = 48 * 60 * 60;
const DB_CACHE_TTL_MS = 15 * 60 * 1000;
const EARTH_RADIUS_M = 6_371_000;

interface Env {
  ASSETS: Fetcher;
  DB?: D1Database;
}

interface NearbySheltersRequest {
  lat: number;
  lng: number;
  radius_km: number;
}

interface BunkerRow {
  id: string;
  location: string | null;
  address: string | null;
  building_name: string | null;
  capacity: number | null;
  is_closed: number | null;
  notes: string | null;
  shelter_type: string | null;
  shelter_type_he: string | null;
  area_sqm: number | null;
}

interface IndexedBunker {
  id: string;
  lat: number;
  lng: number;
  address: string | null;
  building_name: string | null;
  capacity: number | null;
  is_closed: number | null;
  notes: string | null;
  shelter_type: string | null;
  shelter_type_he: string | null;
  area_sqm: number | null;
}

let cachedBunkers: IndexedBunker[] | null = null;
let cachedBunkersExpiresAt = 0;
let cachedBunkersPromise: Promise<IndexedBunker[]> | null = null;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(headers: Headers): Headers {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return headers;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: withCors(
      new Headers({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      }),
    ),
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseNearbySheltersRequest(value: unknown): NearbySheltersRequest | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if (!isFiniteNumber(record.lat) || !isFiniteNumber(record.lng) || !isFiniteNumber(record.radius_km)) {
    return null;
  }

  if (record.radius_km <= 0) return null;

  return {
    lat: record.lat,
    lng: record.lng,
    radius_km: record.radius_km,
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function parseHexToBytes(value: string): Uint8Array | null {
  const normalized = value.trim().replace(/^\\x/i, '').replace(/^0x/i, '');
  if (normalized.length < 34 || normalized.length % 2 !== 0) return null;
  if (!/^[\da-fA-F]+$/.test(normalized)) return null;

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
    if (!Number.isFinite(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}

function parseEwkbPoint(hexValue: string | null): { lat: number; lng: number } | null {
  if (!hexValue) return null;

  const bytes = parseHexToBytes(hexValue);
  if (!bytes || bytes.byteLength < 21) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const byteOrder = view.getUint8(0);
  if (byteOrder !== 0 && byteOrder !== 1) return null;
  const littleEndian = byteOrder === 1;

  let offset = 1;
  const rawType = view.getUint32(offset, littleEndian);
  offset += 4;

  const hasSrid = (rawType & 0x20000000) !== 0;
  const geometryType = rawType & 0xff;
  if (geometryType !== 1) return null;

  if (hasSrid) {
    offset += 4;
  }

  if (bytes.byteLength < offset + 16) return null;

  const lng = view.getFloat64(offset, littleEndian);
  offset += 8;
  const lat = view.getFloat64(offset, littleEndian);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng };
}

function createCacheKey(request: Request, payload: NearbySheltersRequest): Request {
  const url = new URL(request.url);
  url.search = '';
  url.searchParams.set('lat', payload.lat.toFixed(5));
  url.searchParams.set('lng', payload.lng.toFixed(5));
  url.searchParams.set('radius_km', payload.radius_km.toFixed(3));
  return new Request(url.toString(), { method: 'GET' });
}

function buildSuccessHeaders(): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`);
  return withCors(headers);
}

async function loadBunkersFromDb(db: D1Database): Promise<IndexedBunker[]> {
  const now = Date.now();
  if (cachedBunkers && now < cachedBunkersExpiresAt) {
    return cachedBunkers;
  }

  if (cachedBunkersPromise && now < cachedBunkersExpiresAt) {
    return cachedBunkersPromise;
  }

  cachedBunkersExpiresAt = now + DB_CACHE_TTL_MS;
  cachedBunkersPromise = (async () => {
    const query = db.prepare(
      `SELECT
        id,
        location,
        address,
        building_name,
        capacity,
        is_closed,
        notes,
        shelter_type,
        shelter_type_he,
        area_sqm
      FROM bunkers
      WHERE location IS NOT NULL AND location != ''`,
    );

    const result = await query.all<BunkerRow>();
    const indexed: IndexedBunker[] = [];
    for (const row of result.results ?? []) {
      const point = parseEwkbPoint(row.location);
      if (!point) continue;

      indexed.push({
        id: row.id,
        lat: point.lat,
        lng: point.lng,
        address: row.address,
        building_name: row.building_name,
        capacity: row.capacity,
        is_closed: row.is_closed,
        notes: row.notes,
        shelter_type: row.shelter_type,
        shelter_type_he: row.shelter_type_he,
        area_sqm: row.area_sqm,
      });
    }

    cachedBunkers = indexed;
    return indexed;
  })();

  try {
    return await cachedBunkersPromise;
  } catch {
    cachedBunkers = null;
    cachedBunkersExpiresAt = 0;
    throw new Error('Failed to load bunkers from SQLite');
  } finally {
    cachedBunkersPromise = null;
  }
}

async function handleNearbyShelters(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const parsed = parseNearbySheltersRequest(body);
  if (!parsed) {
    return jsonError('Expected numeric lat, lng, and positive radius_km', 400);
  }

  const normalizedPayload: NearbySheltersRequest = {
    lat: round(parsed.lat, 5),
    lng: round(parsed.lng, 5),
    radius_km: round(parsed.radius_km, 3),
  };

  const cache = caches.default;
  const cacheKey = createCacheKey(request, normalizedPayload);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse?.ok) {
    const headers = withCors(new Headers(cachedResponse.headers));
    headers.set('X-Proxy-Cache', 'HIT');
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers,
    });
  }
  if (cachedResponse) {
    // Defensive cleanup for stale cache entries from previous behavior.
    ctx.waitUntil(cache.delete(cacheKey));
  }

  if (!env.DB) {
    return jsonError('Shelters database is not configured', 500);
  }

  let bunkers: IndexedBunker[];
  try {
    bunkers = await loadBunkersFromDb(env.DB);
  } catch {
    return jsonError('Failed to query shelters database', 502);
  }

  const radiusM = normalizedPayload.radius_km * 1000;
  const latDelta = normalizedPayload.radius_km / 110.574;
  const lonDenominator = Math.max(Math.cos(toRadians(normalizedPayload.lat)) * 111.320, 0.0001);
  const lngDelta = normalizedPayload.radius_km / lonDenominator;

  const minLat = normalizedPayload.lat - latDelta;
  const maxLat = normalizedPayload.lat + latDelta;
  const minLng = normalizedPayload.lng - lngDelta;
  const maxLng = normalizedPayload.lng + lngDelta;

  const nearby = bunkers
    .filter((bunker) => bunker.lat >= minLat && bunker.lat <= maxLat && bunker.lng >= minLng && bunker.lng <= maxLng)
    .map((bunker) => {
      const distanceM = haversineMeters(normalizedPayload.lat, normalizedPayload.lng, bunker.lat, bunker.lng);
      return {
        bunker,
        distanceM,
      };
    })
    .filter((entry) => entry.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .map(({ bunker, distanceM }) => ({
      id: bunker.id,
      lat: bunker.lat,
      lng: bunker.lng,
      latitude: bunker.lat,
      longitude: bunker.lng,
      address: bunker.address ?? 'Unknown address',
      building_name: bunker.building_name ?? '',
      shelter_type: bunker.shelter_type ?? bunker.shelter_type_he ?? '',
      capacity: bunker.capacity ?? 0,
      area: bunker.area_sqm ?? bunker.capacity ?? 0,
      is_closed: Boolean(bunker.is_closed),
      notes: bunker.notes ?? '',
      distance_m: round(distanceM, 2),
    }));

  const responseBody = JSON.stringify(nearby);
  const headers = buildSuccessHeaders();
  headers.set('X-Proxy-Cache', 'MISS');

  const clientResponse = new Response(responseBody, {
    status: 200,
    headers,
  });

  const cacheHeaders = buildSuccessHeaders();
  const cacheResponse = new Response(responseBody, {
    status: 200,
    headers: cacheHeaders,
  });
  ctx.waitUntil(cache.put(cacheKey, cacheResponse));

  return clientResponse;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/nearby-shelters') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: withCors(new Headers()),
        });
      }

      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: withCors(new Headers({ Allow: 'POST, OPTIONS' })),
        });
      }

      return handleNearbyShelters(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
