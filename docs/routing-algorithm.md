# Routing Algorithm

## Overview

The goal is to generate a circular running route of a target distance that passes near as many bomb shelters as possible. "Near" means within 150-250 meters — close enough to reach in 1-3 minutes of running.

The algorithm has three phases:

1. **Route Planning** — generate candidate waypoints through shelters
2. **Route Search** — call OSRM repeatedly with adaptive scale factors to hit the target distance
3. **Segment Building** — convert the raw OSRM response into enriched, safety-annotated segments

---

## Phase 1: Route Planning (`src/lib/routing/route-planner.ts`)

### Entry point: `planRouteWaypoints(start, targetDistM, shelters)`

This function generates a list of waypoints (lat/lng coordinates) that form a loop through nearby shelters. The waypoints are then passed to OSRM to snap them to actual streets.

### Elliptical loop generation

The algorithm generates an ellipse around the start point and finds the nearest shelter to each point on the ellipse:

```typescript
const loopRadius = targetDistM / (2 * Math.PI * 1.4);
const numPoints = Math.max(4, Math.min(16, Math.round(targetDistM / 500)));
```

- `loopRadius`: the radius of the ellipse in meters. The `1.4` factor accounts for the fact that street routes are ~40% longer than straight-line distances.
- `numPoints`: how many waypoints to place around the ellipse. Scales with distance — a 5km route gets ~10 points, a 1km route gets 4.

The ellipse is slightly randomized each attempt:
- `ryM = radius * (0.6 + Math.random() * 0.6)` — the y-axis radius varies between 60% and 120% of the x-axis radius, creating oval shapes
- The whole ellipse is rotated by `angle = (attempt / 10) * 2π + random * 0.3`

### 10 attempts, best score wins

`planRouteWaypoints` runs `tryBuildLoop` 10 times with different rotation angles. Each attempt produces a candidate loop. The best-scoring loop is returned.

**Scoring formula:**
```typescript
const distRatio = Math.min(estRouteDist, targetDistM) / Math.max(estRouteDist, targetDistM);
const score = shelterCount * 0.15 + distRatio * 0.85;
```

Distance accuracy (85% weight) matters more than shelter count (15% weight). A loop that's the right length but passes fewer shelters beats a shelter-dense loop that's the wrong length.

### Shelter snapping

For each ideal ellipse point, the algorithm finds the nearest unused shelter within `radius * 0.8` meters. It also enforces a maximum edge distance (`MAX_EDGE`) between consecutive waypoints:

```typescript
const MAX_EDGE = targetDistM < 5000 ? 800 : 450;
```

Shorter routes use a larger max edge (800m) because there are fewer waypoints. Longer routes use 450m to keep the route dense with shelters.

### Bridge shelters

When two consecutive waypoints are more than `MAX_EDGE` apart, `bridgeShelters()` fills the gap by finding intermediate shelters that make progress toward the destination:

```typescript
// For each bridge step:
// - Find a shelter within maxEdge of current position
// - That makes progress toward the target (dToTarget decreases)
// - Add it as an intermediate waypoint
```

This prevents long stretches of route with no nearby shelters.

### Fallback

If no loop with 3+ waypoints is found (e.g., the start point is in a shelter-sparse area), the algorithm falls back to a simple out-and-back: it takes the nearest shelters within 2km and builds a linear path until 40% of the target distance is covered, then returns to start.

---

## Phase 2: Route Search (`src/lib/routing/route-search.ts`)

### The problem

OSRM routes along actual streets, so the straight-line waypoints from Phase 1 produce a route of unpredictable length. A 5km target might produce a 4.2km or 6.8km route depending on street layout. Phase 2 solves this by iteratively adjusting a **scale factor** (`sf`) applied to `targetDistM` before calling Phase 1.

### Entry point: `generateRoute(params)`

```typescript
const result = await generateRoute({
  start: startLatLng,
  targetDistKm: 5,
  bias: 'over',
  isRetry: false,
  shelters,
  onProgress: (msg) => setLoading(true, msg),
});
```

Returns `GenerateRouteResult | null`:
```typescript
interface GenerateRouteResult {
  routeData: RouteData;
  needsConfirmation: boolean;  // true if error > 15%
  bestDistKm: number;
  errorPct: number;
}
```

### Adaptive calibration loop

`searchForRoutes` runs up to 6 iterations (10 if `extended=true`):

```typescript
for (let iter = 0; iter < maxCalibIters; iter++) {
  const waypoints = planRouteWaypoints(start, targetDistM * sf, shelters);
  const routeData = await getOSRMRoute(waypoints);
  const actualDist = getRouteDistance(routeData);
  const distError = Math.abs(actualDist - targetDistM) / targetDistM;

  candidates.push({ routeData, actualDist, distError, sf });

  if (distError < convergenceThreshold) break;  // 10% normal, 6% extended

  const ratio = targetDistM / actualDist;
  sf *= extended ? (0.6 * ratio + 0.4) : ratio;
  sf = Math.max(0.1, Math.min(3.0, sf));
}
```

The scale factor adjustment is: if the route came out 20% too long, multiply `sf` by `1/1.2 ≈ 0.83`. In extended mode, the adjustment is dampened (`0.6 * ratio + 0.4`) to avoid overshooting.

### Bias expansion

After calibration converges, the algorithm generates additional candidates with scale factors biased toward the user's preference:

```typescript
const biasOffsets = bias === 'over'
  ? [1.02, 1.05, 1.10, 1.15]   // try routes slightly longer than target
  : [0.98, 0.95, 0.90, 0.85];  // try routes slightly shorter than target
```

Each offset is applied to the calibrated `sf`, producing routes that are systematically over or under the target. This gives `selectByBias` more candidates to choose from.

### Extended scatter (retry mode)

When `isRetry=true` (user clicked "Search More" in the confirmation dialog), the algorithm runs with `extended=true`. If the best candidate still has >10% error after calibration and bias expansion, it tries a wide scatter of scale factors:

```typescript
const scatterFactors = [0.3, 0.5, 0.7, 0.85, 1.0, 1.2, 1.5, 1.8];
```

This is a brute-force search across a wide range, hoping one of them lands close to the target.

### `selectByBias(candidates, targetDistM, bias)`

Sorts candidates to find the best one given the user's bias preference:

- **`bias === 'over'`**: prefer routes that are at or above target distance, sorted by absolute error. If none are over, fall back to the closest under.
- **`bias === 'under'`**: prefer routes at or below target, sorted by absolute error. If none are under, fall back to the closest over.

### Confirmation flow

If the best candidate has `errorPct > 0.15` (15%), `generateRoute` sets `needsConfirmation: true`. The UI shows `RouteConfirmDialog` with three options:

- **Accept** — use the route as-is despite the distance mismatch
- **Search More** — re-run with `isRetry=true` (extended mode, more iterations)
- **Cancel** — dismiss without applying any route

---

## Phase 3: Segment Building (`src/lib/routing/segment-builder.ts`)

### Entry point: `buildLogicalSegments(coords, steps, totalDist, shelters)`

Takes the raw OSRM output (GeoJSON coordinates + turn-by-turn steps) and produces `RouteSegment[]` — enriched objects that the UI uses for the colored polylines, segment cards, and direction arrows.

### Step 1: Safety for all coordinates

Every coordinate in the route gets a safety classification. This is done with a brute-force O(n × m) loop (n = route coords, m = shelters), not the spatial index, because accuracy matters here:

```typescript
for (let i = 0; i < coords.length; i++) {
  const [lng, lat] = coords[i];  // NOTE: GeoJSON is [lng, lat]
  let minDist = Infinity;
  for (const s of shelters) {
    const d = haversine(lat, lng, s.lat, s.lng);
    if (d < minDist) minDist = d;
    if (d < 50) break;  // early exit if very close
  }
  // classify as green/yellow/red
}
```

**Safety zones:**
- `green` — ≤150m from nearest shelter (safe, can reach in ~1 min)
- `yellow` — 150-250m (marginal, ~2-3 min)
- `red` — >250m (exposed, >3 min)

### Step 2: Filter valid OSRM steps

OSRM steps with `distance === 0` or `maneuver.type === 'arrive'` are filtered out. The 'arrive' step is the final "you have arrived" instruction which has no useful geometry.

### Step 3: Merge small steps into logical segments

OSRM can return 50+ turn-by-turn steps for a 5km route. The UI wants 6-12 logical segments. The algorithm merges consecutive steps until a minimum distance threshold is reached:

```typescript
const targetSegs = Math.max(6, Math.min(12, Math.round(totalDist / 800)));
const minSegDist = totalDist / (targetSegs * 1.5);
```

For each merged group, the "main step" (longest by distance) provides the street name and bearing.

### Step 4: Build RouteSegment objects

Each merged step gets:
- **Coordinate range**: the slice of `allSafety` points that fall within this step's distance
- **Dominant zone**: whichever of green/yellow/red has the most coordinate points
- **Midpoint**: the middle coordinate (used for segment number marker placement)
- **Nearest shelter**: `nearestShelter(midCoord, shelters)` — brute force, called once per segment
- **Bearing and direction**: from OSRM's `bearing_after`, or calculated from start/end coords. Converted to Hebrew cardinal direction via `bearingToHebrew()`
- **polyCoords**: `[lat, lng][]` — note this is lat-first for Leaflet (opposite of GeoJSON)

---

## Safety Analysis (`src/lib/routing/safety-analyzer.ts`)

`analyzeRouteSafety` is a lighter version used for display purposes. It samples every Nth coordinate (up to 500 samples) and uses the spatial grid index for fast lookups. This is faster than the full per-coordinate analysis in `buildLogicalSegments`.

`computeSafetyStats` aggregates safety across all segments' `safetyPoints` to produce the percentages shown in `RouteInfo`.

---

## Spatial Index (`src/lib/geo/spatial-index.ts`)

A simple grid-based spatial index for fast nearest-shelter lookups.

```typescript
const GRID_SIZE = 0.003  // degrees (~330m at Tel Aviv latitude)
```

**Building the grid** (`buildGrid`): each shelter is placed in a grid cell based on `floor(lng / 0.003)` and `floor(lat / 0.003)`. Multiple shelters can share a cell.

**Querying** (`nearestShelterDist`): for a given point, check the 3×3 neighborhood of cells (the point's cell plus all 8 neighbors). This covers a ~1km radius, which is more than enough to find the nearest shelter in Tel Aviv's dense shelter network.

The grid is used in `ActiveShelterMarkers` (to find shelters near the route) and in `analyzeRouteSafety` (for the safety stats display). The full `buildLogicalSegments` function does not use the grid — it iterates all shelters directly for accuracy.

---

## Coordinate System Gotcha

**GeoJSON uses `[lng, lat]` order. Leaflet uses `[lat, lng]` order.**

OSRM returns GeoJSON geometry, so `coords[i]` is `[lng, lat]`. Every place in the codebase that reads OSRM coordinates must destructure as:

```typescript
const [lng, lat] = coords[i];  // correct
const [lat, lng] = coords[i];  // WRONG — will place markers in the ocean
```

The OSRM URL is also built with `lng,lat` order:
```typescript
const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
```

When building `polyCoords` for Leaflet, the order is flipped back:
```typescript
polyCoords: segSafetyPoints.map(p => [p.lat, p.lng] as [number, number])
```

This is the single most common source of bugs in this codebase. Always check coordinate order when touching routing or map code.
