# API Reference

The app uses two external APIs and one static data source. All API calls are made from the browser (no backend proxy).

---

## OSRM Routing API

**Client**: `src/lib/api/osrm.ts`  
**Entry point**: `getOSRMRoute(waypoints: LatLng[]): Promise<RouteData>`

### Endpoint

```
GET https://router.project-osrm.org/route/v1/foot/{coordinates}
```

`{coordinates}` is a semicolon-separated list of `lng,lat` pairs.

**CRITICAL: coordinate order is `lng,lat`, not `lat,lng`.**

```typescript
// Correct
const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');

// Wrong — will route to wrong locations
const coords = pts.map(p => `${p.lat},${p.lng}`).join(';');
```

### Query parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `overview` | `full` | Return the full route geometry (not simplified) |
| `geometries` | `geojson` | Return geometry as GeoJSON LineString |
| `steps` | `true` | Include turn-by-turn steps in each leg |

Full URL example:
```
https://router.project-osrm.org/route/v1/foot/34.7818,32.0853;34.7900,32.0900;34.7818,32.0853?overview=full&geometries=geojson&steps=true
```

### Response shape

```typescript
{
  code: 'Ok',
  routes: [
    {
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [lng, lat], ...]  // GeoJSON order
      },
      distance: 5234.7,    // meters
      duration: 2617.3,    // seconds
      legs: [
        {
          steps: [
            {
              distance: 123.4,
              duration: 61.7,
              name: 'Dizengoff Street',
              maneuver: {
                type: 'depart',
                bearing_before: 0,
                bearing_after: 45
              }
            },
            // ...more steps
          ]
        }
      ]
    }
  ]
}
```

The client maps this to `RouteData`:
```typescript
interface RouteData {
  geometry: LineString;    // GeoJSON geometry
  distance: number;        // meters
  duration: number;        // seconds
  waypoints: LatLng[];     // the input waypoints (not OSRM's snapped waypoints)
  steps: OSRMStep[];       // flattened from all legs
}
```

### Preprocessing in `getOSRMRoute`

Before calling OSRM, the client applies three transformations:

**1. Simplify if >50 waypoints**

OSRM has URL length limits. If the waypoint list exceeds 50 points, it's downsampled to ~47 interior points (keeping first and last):

```typescript
if (pts.length > 50) {
  const step = Math.ceil((pts.length - 2) / 45);
  const simplified = [pts[0]];
  for (let i = 1; i < pts.length - 1; i += step) simplified.push(pts[i]);
  simplified.push(pts[pts.length - 1]);
  pts = simplified;
}
```

**2. Deduplicate consecutive identical points**

Points within 0.00001 degrees (~1 meter) of each other are removed. OSRM can return errors or unexpected results with duplicate coordinates.

**3. Close the loop**

If the first and last waypoints aren't the same (within 0.00001°), the first point is appended to the end. This ensures the route returns to the start.

### Error handling

- Non-OK HTTP response: throws `'שגיאת שרת OSRM'` (OSRM server error)
- `data.code !== 'Ok'` or empty routes: throws `'לא נמצא מסלול'` (route not found)
- Both errors are caught in `useRouteGeneration` and shown as toast notifications

### Rate limits

The public OSRM demo server (`router.project-osrm.org`) has no documented rate limit but is a shared resource. The routing algorithm makes 6-20 requests per route generation. For production use, consider self-hosting OSRM or using a commercial routing API.

---

## Nominatim Geocoding API

**Client**: `src/lib/api/nominatim.ts`  
**Functions**: `searchAddress(query)`, `reverseGeocode(lat, lng)`

### Required header

All Nominatim requests must include a `User-Agent` header identifying the application:

```typescript
const USER_AGENT = 'MasluMugan/1.0'

fetch(url, { headers: { 'User-Agent': USER_AGENT } })
```

Nominatim's usage policy requires this. Requests without a User-Agent may be blocked.

### Search endpoint

```
GET https://nominatim.openstreetmap.org/search
```

**Parameters**:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `q` | `{query} תל אביב` | Search query, always appended with " תל אביב" |
| `format` | `json` | JSON response |
| `limit` | `5` | Max results |
| `countrycodes` | `il` | Restrict to Israel |
| `accept-language` | `he` | Return Hebrew place names |

The " תל אביב" suffix is appended automatically in `searchAddress()`:
```typescript
const url = `...?q=${encodeURIComponent(query + ' תל אביב')}&...`
```

This means searching "דיזנגוף" finds "Dizengoff Street, Tel Aviv" rather than streets named Dizengoff in other cities.

**Response** (`NominatimSearchResult[]`):
```typescript
interface NominatimSearchResult {
  place_id: number;
  lat: string;      // NOTE: string, not number
  lon: string;      // NOTE: string, not number — also "lon" not "lng"
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    city?: string;
  };
}
```

When selecting a result, parse the coordinates:
```typescript
setStartPoint(
  { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
  result.display_name,
);
```

### Reverse geocode endpoint

```
GET https://nominatim.openstreetmap.org/reverse
```

**Parameters**:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `lat` | `{latitude}` | Point latitude |
| `lon` | `{longitude}` | Point longitude |
| `format` | `json` | JSON response |
| `accept-language` | `he` | Hebrew address |
| `zoom` | `18` | Address detail level (18 = street address) |

**Response** (`NominatimReverseResult`):
```typescript
interface NominatimReverseResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;  // full formatted address
  address: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    city?: string;
  };
}
```

The `display_name` is used directly as the start address label.

### Rate limit

Nominatim's usage policy allows **1 request per second** maximum. The `useAddressSearch` hook enforces this with a 1000ms debounce:

```typescript
const DEBOUNCE_MS = 1000;

timerRef.current = setTimeout(async () => {
  const data = await searchAddress(value);
  // ...
}, DEBOUNCE_MS);
```

Reverse geocode calls (on map click) are not debounced — they're triggered by user clicks which are naturally rate-limited.

---

## Shelter Data (`src/data/shelters.json`)

**Not an API** — this is a static JSON file imported at build time.

### Import

```typescript
// src/data/index.ts
import sheltersData from './shelters.json';
export const SHELTERS: Shelter[] = sheltersData as Shelter[];

// src/stores/route-store.ts
import { SHELTERS } from '@/data';
// ...
shelters: SHELTERS,  // loaded once at store initialization
```

### Schema

```typescript
interface Shelter {
  id: number;        // unique identifier (e.g., 11450)
  lat: number;       // latitude (e.g., 32.042632)
  lng: number;       // longitude (e.g., 34.779913)
  address: string;   // Hebrew street address (e.g., "שדרות גורי ישראל 31")
  type: string;      // shelter type in Hebrew (see types below)
  status: string;    // operational status (e.g., "כשיר לשימוש")
  notes: string;     // access instructions in Hebrew (can be empty string)
  area: number;      // floor area in square meters (0 if unknown)
  open: string;      // "כן" (yes) or "לא" (no)
  hours: string;     // opening hours (e.g., "פתיחה אוטומטית בשעת חירום")
}
```

### Shelter types

The `type` field contains Hebrew strings. Common values:
- `"מקלט ציבורי"` — public shelter
- `"מקלט ציבורי במוסדות חינוך"` — shelter in educational institution
- `"חניון מחסה לציבור"` — public parking shelter

### Statistics

- **498 shelters** total in the dataset
- All are in Tel Aviv
- All have `status: "כשיר לשימוש"` (fit for use) — the dataset only includes operational shelters
- IDs start at 11450 (Tel Aviv municipality numbering)

### Updating shelter data

To update the shelter data:
1. Replace `src/data/shelters.json` with the new data
2. Maintain the same schema (all fields required, same types)
3. Run `npm run build` to verify the import works
4. Run `npx vitest run` to verify tests still pass (tests don't use real shelter data, but the build will catch schema errors)

The shelter data is sourced from the Tel Aviv municipality's open data portal.

---

## Geo Utilities

These are internal utilities, not external APIs, but documented here for completeness.

### `haversine(lat1, lng1, lat2, lng2): number`

Returns the great-circle distance in meters between two coordinates. Uses the Haversine formula with Earth radius 6,371,000m.

```typescript
haversine(32.0853, 34.7818, 32.0900, 34.7900)  // ~900 meters
```

### `nearestShelter(lat, lng, shelters): { distance: number, shelter: Shelter | null }`

Brute-force O(n) search through all shelters. Returns the nearest shelter and its distance. Used in `buildLogicalSegments` for per-segment nearest shelter info.

### `calcBearing(lat1, lng1, lat2, lng2): number`

Returns the bearing in degrees (0-360, clockwise from north) from point 1 to point 2.

### `bearingToHebrew(bearing): string`

Converts a bearing to a Hebrew cardinal direction:
- 0° → "צפונה" (north)
- 45° → "צפון-מזרח" (northeast)
- 90° → "מזרחה" (east)
- etc.

8 directions total, each covering a 45° arc.

### `buildGrid(shelters): Map<string, Shelter[]>`

Builds a spatial grid index. Grid cell size is 0.003 degrees (~330m). Returns a `Map` keyed by `"gx,gy"` strings.

### `nearestShelterDist(lat, lng, grid): number`

Queries the spatial grid for the nearest shelter distance. Checks the 3×3 neighborhood of cells around the query point.
