# Architecture

## Project Overview

**Miklat Run** (מסלול מוגן) is a single-page web app for Israeli runners in Tel Aviv. It plans circular running routes that keep the runner within 3-4 minutes of the nearest public bomb shelter at every point. The app uses real shelter location data (498 shelters), OpenStreetMap routing, and a custom safety-scoring algorithm to generate routes color-coded by proximity to shelter.

The target user is someone who wants to run outdoors during a period of rocket threat and needs confidence that they can reach cover quickly if a siren sounds.

---

## Directory Tree

```
src/
├── App.tsx                    # Root layout, mounts all top-level components
├── main.tsx                   # React entry point, imports CSS, renders App
├── index.css                  # Tailwind v4 @theme config + shadcn CSS vars
├── vite-env.d.ts              # Vite type declarations
│
├── components/
│   ├── map/                   # All Leaflet/react-leaflet map components
│   │   ├── MapView.tsx        # MapContainer wrapper with tile layer
│   │   ├── MapController.tsx  # Imperative map ops (flyTo, fitBounds)
│   │   ├── MapClickHandler.tsx# Click-to-set-start + reverse geocode
│   │   ├── StartMarker.tsx    # Orange divIcon at start position
│   │   ├── ShelterMarkers.tsx # All 498 shelters as dim CircleMarkers
│   │   ├── ActiveShelterMarkers.tsx # Shelters within 250m of route (bright)
│   │   ├── RouteLayer.tsx     # Multi-color polylines per safety zone
│   │   ├── SegmentMarkers.tsx # Numbered markers at segment midpoints
│   │   ├── DirectionArrows.tsx# Rotated arrow characters along route
│   │   ├── MapLegend.tsx      # Fixed bottom-left legend overlay
│   │   └── index.ts           # Barrel export
│   │
│   ├── sidebar/               # Right panel (desktop) / bottom sheet (mobile)
│   │   ├── Sidebar.tsx        # Container with responsive layout
│   │   ├── AddressSearch.tsx  # Debounced Nominatim search input
│   │   ├── ModeToggle.tsx     # Distance vs Pace mode toggle
│   │   ├── DistanceMode.tsx   # Distance slider (1-15km)
│   │   ├── PaceMode.tsx       # Pace inputs + time slider
│   │   ├── BiasToggle.tsx     # Over/Under distance preference
│   │   ├── GenerateButton.tsx # Route generation trigger
│   │   ├── RouteInfo.tsx      # Route stats + safety bar
│   │   ├── HowItWorks.tsx     # Three-step explanation
│   │   └── index.ts
│   │
│   ├── overview/              # Slide-in segment detail panel
│   │   ├── RouteOverview.tsx  # Panel container with header stats
│   │   ├── SegmentCard.tsx    # Individual segment card
│   │   └── index.ts
│   │
│   ├── shared/                # App-level overlays
│   │   ├── RouteConfirmDialog.tsx # shadcn AlertDialog for distance mismatch
│   │   ├── LoadingOverlay.tsx # Full-screen spinner during generation
│   │   ├── ClickHint.tsx      # Auto-dismissing "click map" hint pill
│   │   └── index.ts
│   │
│   └── ui/                    # shadcn/ui components (CLI-installed, don't edit)
│       ├── alert-dialog.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── separator.tsx
│       ├── slider.tsx
│       ├── sonner.tsx
│       ├── toggle-group.tsx
│       └── toggle.tsx
│
├── stores/
│   └── route-store.ts         # Main Zustand store (all app state)
│
├── hooks/
│   ├── useRouteGeneration.ts  # Route generation orchestration + confirmation flow
│   └── useAddressSearch.ts    # Debounced address search state
│
├── lib/
│   ├── api/
│   │   ├── osrm.ts            # OSRM routing API client
│   │   ├── nominatim.ts       # Nominatim geocoding client
│   │   └── index.ts
│   │
│   ├── geo/
│   │   ├── haversine.ts       # Distance calculation + nearestShelter
│   │   ├── bearing.ts         # Bearing calculation + Hebrew direction names
│   │   ├── spatial-index.ts   # Grid-based spatial index for fast lookups
│   │   └── index.ts
│   │
│   └── routing/
│       ├── route-planner.ts   # Elliptical waypoint generation
│       ├── route-search.ts    # Adaptive calibration + bias selection
│       ├── segment-builder.ts # Build logical segments from OSRM output
│       ├── safety-analyzer.ts # Safety stats computation
│       └── index.ts
│
├── data/
│   ├── shelters.json          # 498 Tel Aviv public shelters (build-time import)
│   └── index.ts               # Re-exports SHELTERS constant
│
├── types/
│   ├── geo.ts                 # LatLng, SafetyZone, SafetyPoint
│   ├── route.ts               # RouteData, RouteSegment, RouteCandidate, etc.
│   ├── shelter.ts             # Shelter interface
│   ├── nominatim.ts           # Nominatim API response types
│   └── index.ts               # Barrel export
│
└── styles/
    └── leaflet-overrides.css  # Custom Leaflet popup/marker styles
```

---

## Component Hierarchy

```
App
├── RouteOverview          (slide-in panel, left on desktop / bottom sheet on mobile)
│   └── SegmentCard[]
│
├── main (absolute, fills viewport minus sidebar width on desktop)
│   └── MapView            (MapContainer)
│       ├── TileLayer      (CartoDB dark tiles)
│       ├── ZoomControl
│       ├── MapController  (imperative: flyTo, fitBounds — renders null)
│       ├── MapClickHandler(event handler — renders null)
│       ├── StartMarker
│       ├── ShelterMarkers (all 498, dim)
│       ├── ActiveShelterMarkers (filtered, bright)
│       ├── RouteLayer     (polylines)
│       ├── SegmentMarkers (numbered markers)
│       └── DirectionArrows
│
├── Sidebar                (right panel desktop / bottom sheet mobile)
│   ├── AddressSearch
│   ├── ModeToggle
│   ├── DistanceMode       (only when routeMode === 'distance')
│   ├── PaceMode           (only when routeMode === 'pace')
│   ├── BiasToggle
│   ├── GenerateButton
│   ├── RouteInfo          (only when routeData !== null)
│   └── HowItWorks
│
├── MapLegend              (fixed bottom-left overlay)
├── ClickHint              (auto-dismissing hint, only before start is set)
├── LoadingOverlay         (full-screen, only when isLoading)
├── RouteConfirmDialogWrapper → RouteConfirmDialog
└── Toaster                (sonner toast notifications)
```

---

## Data Flow

The app follows a unidirectional flow: user action → store update → component re-render.

```
User clicks map
    │
    ▼
MapClickHandler.useMapEvents('click')
    │  calls setStartPoint({ lat, lng })
    │  then reverseGeocode() → setStartPoint({ lat, lng }, address)
    ▼
useRouteStore.startLatLng updated
    │
    ├─► StartMarker re-renders (shows orange marker)
    ├─► MapController.useEffect fires → map.flyTo(startLatLng, 15)
    ├─► GenerateButton.canGenerate() → true → button enabled
    └─► AddressSearch shows address text

User clicks "Generate Route"
    │
    ▼
GenerateButton → useRouteGeneration().generate()
    │
    ▼
useRouteGenerationState.isGenerating = true
useRouteStore.isLoading = true (shows LoadingOverlay)
    │
    ▼
generateRoute() in route-search.ts
    │  planRouteWaypoints() → elliptical waypoints through shelters
    │  getOSRMRoute() → actual street route
    │  adaptive calibration loop (up to 6-10 iterations)
    │  selectByBias() → best candidate
    ▼
if errorPct > 15%:
    useRouteGenerationState.confirmationData = result
    → RouteConfirmDialog opens
else:
    buildLogicalSegments() → RouteSegment[]
    useRouteStore.setRouteResult(routeData, segments)
        │
        ├─► RouteLayer re-renders (colored polylines)
        ├─► SegmentMarkers re-renders (numbered markers)
        ├─► DirectionArrows re-renders
        ├─► ActiveShelterMarkers re-renders (filtered shelters)
        ├─► MapController.useEffect fires → map.fitBounds(route)
        ├─► RouteInfo re-renders (stats + safety bar)
        └─► RouteOverview slides in (overviewVisible = true)
```

---

## State Management

The app uses two Zustand stores.

### `useRouteStore` (main store — `src/stores/route-store.ts`)

All persistent app state lives here. Components subscribe to individual slices to avoid unnecessary re-renders.

```typescript
interface RouteState {
  // Start point
  startLatLng: LatLng | null;     // null until user clicks map or selects address
  startAddress: string;           // display name from reverse geocode

  // Route configuration
  routeMode: RouteMode;           // 'distance' | 'pace'
  targetDistanceKm: number;       // default 5, range 1-15
  distanceBias: DistanceBias;     // 'over' | 'under'
  paceMin: number;                // minutes part of pace (default 6)
  paceSec: number;                // seconds part of pace (default 0)
  timeMinutes: number;            // run duration for pace mode (default 30)

  // Route result
  routeData: RouteData | null;    // raw OSRM response + waypoints
  computedSegments: RouteSegment[]; // enriched segments with safety data
  highlightedSegmentIdx: number | null; // which segment is focused

  // UI state
  isLoading: boolean;
  loadingMessage: string;
  sidebarExpanded: boolean;       // mobile bottom sheet open/closed
  overviewVisible: boolean;       // RouteOverview panel visible

  // Data
  shelters: Shelter[];            // all 498 shelters (loaded from JSON at startup)

  // Computed (functions, not reactive)
  computedDistanceKm: () => number; // timeMinutes / (paceMin + paceSec/60)
  canGenerate: () => boolean;       // startLatLng !== null
}
```

**Actions**: `setStartPoint`, `setRouteMode`, `setTargetDistance`, `setDistanceBias`, `setPace`, `setTimeMinutes`, `setRouteResult`, `clearRoute`, `highlightSegment`, `resetSegmentHighlight`, `setLoading`, `toggleSidebar`, `setOverviewVisible`

### `useRouteGenerationState` (internal to `useRouteGeneration.ts`)

A separate Zustand store created inside the hook file. This is intentional: `GenerateButton` and `RouteConfirmDialogWrapper` both call `useRouteGeneration()`, and they need to share the same `isGenerating` / `confirmationData` state without prop drilling. A regular React state inside the hook would create separate instances per component.

```typescript
interface RouteGenerationState {
  isGenerating: boolean;
  isRetry: boolean;
  confirmationData: GenerateRouteResult | null;
}
```

---

## Hooks

### `useRouteGeneration` (`src/hooks/useRouteGeneration.ts`)

Orchestrates the full route generation flow. Returns `{ generate, isGenerating, isRetry, confirmationData, handleConfirmation }`.

- `generate(isRetryAttempt?)` — calls `generateRoute()`, handles loading state, shows toast on error, sets `confirmationData` if distance error > 15%
- `handleConfirmation(action: 'accept' | 'retry' | 'cancel')` — processes user response to the confirmation dialog. `'accept'` applies the route as-is, `'retry'` re-runs generation with `extended=true`, `'cancel'` dismisses

### `useAddressSearch` (`src/hooks/useAddressSearch.ts`)

Manages the address search input. Debounces Nominatim API calls by 1000ms (Nominatim rate limit). Returns `{ query, setQuery, results, isSearching, showResults, selectResult, clearResults }`.

When a result is selected, it calls `useRouteStore.setStartPoint()` directly.

---

## Key Design Decisions

### Why Zustand over React Context

Zustand allows multiple independent slices without provider nesting. Components subscribe to exactly the fields they need — `GenerateButton` only reads `canGenerate` and `isGenerating`, not the entire route state. Context would cause the entire subtree to re-render on any state change.

The separate `useRouteGenerationState` store (inside `useRouteGeneration.ts`) solves a specific problem: two components (`GenerateButton` and `RouteConfirmDialogWrapper`) both call `useRouteGeneration()` and need to share the same `isGenerating` flag. A module-level Zustand store achieves this without lifting state to `App`.

### Why react-leaflet

react-leaflet v5 provides declarative React components over Leaflet. It's React 19 compatible and handles the imperative Leaflet API cleanly. The `useMap()` hook (used in `MapController`) gives access to the Leaflet map instance for operations like `flyTo` and `fitBounds` that don't fit the declarative model.

### Why Tailwind v4 CSS-first config

Tailwind v4 moves configuration into CSS using the `@theme` directive. There's no `tailwind.config.js`. All custom tokens (`--color-bg`, `--color-accent`, safety colors, etc.) live in `src/index.css`. This keeps the design system in one place and makes tokens available as both CSS variables and Tailwind utility classes.

### Why shadcn/ui

shadcn components are copied into the project (not installed as a package), so they can be customized freely. The CLI handles the boilerplate. The "new-york" style with dark theme support fits the always-dark design. Components live in `src/components/ui/` and should never be written by hand — always use `npx shadcn@latest add <component>`.

### Why static shelter JSON

The 498 shelters are imported at build time from `src/data/shelters.json`. There's no API to fetch them from. Build-time import means zero runtime latency, no loading state for shelter data, and the data is bundled into the JS chunk. The tradeoff is that updating shelter data requires a rebuild.

### Always-dark app

`index.html` has `class="dark"` on `<html>`. There's no light mode and no toggle. The app is designed exclusively for the dark theme. The `@custom-variant dark (&:is(.dark *))` in `index.css` makes shadcn's dark variant work with this class-based approach.

### Hebrew strings as Unicode escapes

All Hebrew text in JSX uses Unicode escapes (e.g., `{'\u05DE\u05E1\u05DC\u05D5\u05DC'}` for "מסלול"). This avoids RTL/LTR mixing issues in source files and makes the code editor-agnostic. The app root has `dir="rtl"` set on the outer div.
