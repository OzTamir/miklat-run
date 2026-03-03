# Components

Each component is documented with its purpose, props/state, store dependencies, and parent. Components in `src/components/ui/` are shadcn-managed and not documented here — see [development.md](./development.md) for how to add them.

---

## Map Components (`src/components/map/`)

### `MapView`

**Purpose**: The root map component. Wraps Leaflet's `MapContainer` with the CartoDB dark tile layer and mounts all child map components.

**Props**: none

**Store dependencies**: none (children read from store directly)

**Parent**: `App` (inside `<main>`)

**Key details**:
- Initial center: `[32.0853, 34.7818]` (Tel Aviv city center), zoom 14
- Tile URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` with subdomains `abcd`
- `zoomControl={false}` — ZoomControl is added separately at `position="topleft"` to control placement
- All child components that use `useMap()` or `useMapEvents()` must be rendered inside `MapContainer`

---

### `MapController`

**Purpose**: Handles imperative map operations that can't be expressed declaratively. Watches store state and calls Leaflet's `map.flyTo()` and `map.fitBounds()` in response.

**Props**: none (renders `null`)

**Store dependencies**:
- `startLatLng` — when it changes, flies to the new point at zoom 15
- `computedSegments` — when a route is generated, fits the map bounds to show the full route with 40px padding

**Parent**: `MapView`

**Key details**:
- Uses `useRef` to track the previous `startLatLng` so it only flies on change, not on initial render
- Uses `useMap()` from react-leaflet to get the Leaflet map instance
- `map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] })` — padding is in pixels

---

### `MapClickHandler`

**Purpose**: Listens for map click events. On click, sets the start point immediately (for instant marker feedback), then fires a reverse geocode request to get the address.

**Props**: none (renders `null`)

**Store dependencies**:
- `highlightedSegmentIdx` — if a segment is highlighted, a click clears the highlight instead of setting a new start point
- `resetSegmentHighlight` — called when a click clears a highlight
- `setStartPoint` — called with `{ lat, lng }` immediately, then again with the address string after geocoding

**Parent**: `MapView`

**Key details**:
- Uses `useMapEvents({ click })` from react-leaflet
- Reverse geocode failure is silently swallowed — the start point is already set, the address just stays empty
- The two-step `setStartPoint` call (once without address, once with) means the marker appears instantly while geocoding happens in the background

---

### `StartMarker`

**Purpose**: Shows an orange circle marker at the user's selected start point.

**Props**: none

**Store dependencies**:
- `startLatLng` — renders `null` when `null`

**Parent**: `MapView`

**Key details**:
- Uses a `divIcon` (custom HTML marker) rather than Leaflet's default icon, to avoid the default blue pin
- The icon is an orange circle: `background: #e8913a; border-radius: 50%; border: 2px solid white`
- `iconSize: [16, 16]`, `iconAnchor: [8, 8]` — centered on the coordinate

---

### `ShelterMarkers`

**Purpose**: Renders all 498 shelters as small, semi-transparent orange `CircleMarker`s. These are always visible regardless of whether a route exists.

**Props**: none

**Store dependencies**:
- `shelters` — the full array from `useRouteStore`

**Parent**: `MapView`

**Key details**:
- `radius={4}`, `fillOpacity={0.45}`, `opacity={0.6}` — intentionally dim so they don't clutter the map
- Each marker has a `<Popup>` with the shelter's address, type, status, area, and notes (in Hebrew)
- The `ShelterPopup` component is exported separately so `ActiveShelterMarkers` can reuse it

---

### `ActiveShelterMarkers`

**Purpose**: When a route exists, highlights the shelters that are within 250m of the route. These appear brighter and larger than the background shelter markers.

**Props**: none

**Store dependencies**:
- `shelters` — full shelter array
- `computedSegments` — used to extract all route coordinates

**Parent**: `MapView`

**Key details**:
- Returns `null` when `computedSegments.length === 0`
- Uses `useMemo` to avoid recomputing on every render
- Uses the spatial grid index (`buildGrid`, then manual 3×3 cell search) for performance — iterating all 498 shelters against all route coordinates would be O(n×m)
- `radius={8}`, `fillOpacity={1}`, `color="#fff"` (white border) — visually distinct from background shelters
- `ACTIVE_RANGE_M = 250` — matches the red zone threshold

---

### `RouteLayer`

**Purpose**: Renders the route as colored polylines. Each segment's coordinates are grouped by safety zone color, and each color group becomes a separate `<Polyline>`.

**Props**: none

**Store dependencies**:
- `computedSegments` — the route segments with `safetyPoints` and `polyCoords`
- `highlightedSegmentIdx` — controls opacity (highlighted = full, others = dimmed to 0.2)
- `highlightSegment` — called when a polyline is clicked

**Parent**: `MapView`

**Key details**:
- `groupByColor(safetyPoints)` splits a segment's safety points into runs of the same color. This produces smooth color transitions along the route rather than per-segment coloring.
- Highlighted segment: `weight={7}`, `opacity={1.0}`
- Normal segment: `weight={5}`, `opacity={0.85}`
- Dimmed segment: `opacity={0.2}`
- Clicking a polyline calls `highlightSegment(segIdx)`, which also highlights the corresponding `SegmentCard`

---

### `SegmentMarkers`

**Purpose**: Places numbered circle markers at the midpoint of each segment. Clicking a marker highlights that segment.

**Props**: none

**Store dependencies**:
- `computedSegments`
- `highlightedSegmentIdx` — when a segment is highlighted, only that segment's marker is shown
- `highlightSegment`

**Parent**: `MapView`

**Key details**:
- Uses `L.divIcon` with `className="seg-number-marker"` — styled in `leaflet-overrides.css`
- `iconSize: [24, 24]`, `iconAnchor: [12, 12]` — centered on the midpoint coordinate
- When `highlightedSegmentIdx !== null`, only the highlighted segment's marker renders (others return `null`)

---

### `DirectionArrows`

**Purpose**: Places rotated arrow characters (▲) along each segment to show running direction.

**Props**: none

**Store dependencies**:
- `computedSegments`
- `highlightedSegmentIdx` — same visibility logic as `SegmentMarkers`

**Parent**: `MapView`

**Key details**:
- `getArrowPositions(polyCoords, 3)` places 3 arrows per segment at evenly spaced fractions (25%, 50%, 75%)
- Each arrow's bearing is calculated from the two adjacent coordinates using `calcBearing()`
- The arrow character is rotated via inline CSS: `transform: rotate(${bearing}deg)`
- `interactive={false}` — arrows don't respond to clicks

---

### `MapLegend`

**Purpose**: A fixed overlay in the bottom-left corner explaining the map symbols and route colors.

**Props**: none

**Store dependencies**: none

**Parent**: `App` (outside `MapView`, positioned with `fixed`)

**Key details**:
- `z-[1000]` — above the map tiles but below the sidebar and overlays
- Shows: shelter marker (dim), active shelter marker (bright), green/yellow/red route line colors with distance labels
- Responsive: smaller padding and font on mobile (`max-md:p-2 max-md:text-xs`)

---

## Sidebar Components (`src/components/sidebar/`)

### `Sidebar`

**Purpose**: The main control panel. On desktop it's a fixed 340px right panel. On mobile it's a bottom sheet that slides up/down.

**Props**: `children?: ReactNode` (rarely used)

**Store dependencies**:
- `sidebarExpanded` — controls mobile bottom sheet position
- `toggleSidebar` — called by the mobile drag handle button

**Parent**: `App`

**Key details**:
- Desktop: `hidden md:flex md:flex-col md:w-[340px]` — always visible, no toggle
- Mobile: `fixed inset-x-0 bottom-0 z-40` with `translate-y-0` (expanded) or `translate-y-[calc(100%-56px)]` (collapsed, showing only the header)
- `maxHeight: '70vh'` on mobile to leave the map visible
- The `SidebarHeader` component renders the app logo (inline SVG) and title/subtitle
- Title is "מסלול מוגן", subtitle is "תכנון ריצה בטוחה בתל אביב" (both as Unicode escapes)

---

### `AddressSearch`

**Purpose**: Text input for searching an address in Tel Aviv. Results appear in a dropdown; selecting one sets the start point.

**Props**: none

**Store dependencies**: none directly — delegates to `useAddressSearch` hook

**Parent**: `Sidebar`

**Key details**:
- Uses `useAddressSearch` hook which debounces Nominatim calls by 1000ms
- Shows a spinner icon while searching, search icon otherwise
- Dropdown closes when clicking outside (via `mousedown` listener on `document`)
- Results are displayed RTL with `text-right`
- The hint text below the input says "או לחץ על המפה לבחירת נקודה" (or click the map)

---

### `ModeToggle`

**Purpose**: Toggles between "by distance" and "by pace + time" route planning modes.

**Props**: none

**Store dependencies**:
- `routeMode` — current mode
- `setRouteMode` — called on button click

**Parent**: `Sidebar`

**Key details**:
- Two buttons in a pill container: "לפי מרחק" and "לפי קצב + זמן"
- Active button: `bg-accent text-white`
- Switching mode shows/hides `DistanceMode` and `PaceMode` (they render `null` when not active)

---

### `DistanceMode`

**Purpose**: Shows a distance slider (1-15km, step 0.5) when `routeMode === 'distance'`.

**Props**: none

**Store dependencies**:
- `routeMode` — renders `null` when not `'distance'`
- `targetDistanceKm` — current value
- `setTargetDistance` — called on slider change

**Parent**: `Sidebar`

**Key details**:
- Uses shadcn `<Slider>` with `dir="rtl"` (right-to-left, so higher values are on the right in Hebrew layout)
- The accent color is applied via Tailwind arbitrary selectors: `[&_[data-slot=slider-range]]:bg-accent`
- Labels show "ק"מ 1" and "ק"מ 15" (reversed for RTL)

---

### `PaceMode`

**Purpose**: Shows pace inputs (min:sec per km) and a time slider (10-90 min) when `routeMode === 'pace'`. Displays the computed distance.

**Props**: none

**Store dependencies**:
- `routeMode` — renders `null` when not `'pace'`
- `paceMin`, `paceSec`, `timeMinutes` — current values
- `setPace`, `setTimeMinutes` — called on input changes
- `computedDistanceKm` — derived value shown as "מרחק משוער: X.X ק"מ"

**Parent**: `Sidebar`

**Key details**:
- Pace inputs are plain `<input type="number">` (not shadcn), styled to match the dark theme
- Minutes range: 3-12, seconds range: 0-59 (step 15)
- The computed distance preview uses `computedDistanceKm()` which is `timeMinutes / (paceMin + paceSec/60)`

---

### `BiasToggle`

**Purpose**: Lets the user prefer routes that are slightly over or under the target distance.

**Props**: none

**Store dependencies**:
- `distanceBias` — `'over'` or `'under'`
- `setDistanceBias`

**Parent**: `Sidebar`

**Key details**:
- Two buttons: "מעל" (over) and "מתחת" (under)
- Explainer text below: "המסלול יהיה מעט ארוך מהמרחק שנבחר" or "...קצר..."
- This preference is passed to `selectByBias()` in the routing algorithm

---

### `GenerateButton`

**Purpose**: The primary action button. Triggers route generation. Shows a spinner while generating.

**Props**: none

**Store dependencies**:
- `canGenerate` — `() => startLatLng !== null` — disables button when no start point
- `useRouteGeneration().generate` — called on click
- `useRouteGeneration().isGenerating` — shows spinner, disables button

**Parent**: `Sidebar`

**Key details**:
- `isGenerating` comes from `useRouteGenerationState` (the separate Zustand store inside `useRouteGeneration.ts`), not from `useRouteStore.isLoading`
- Both `GenerateButton` and `RouteConfirmDialogWrapper` call `useRouteGeneration()` and get the same store instance — this is why `useRouteGenerationState` is a Zustand store rather than React state
- Button text: "צור מסלול" with a left-pointing arrow icon (RTL layout)
- `disabled:opacity-40` when disabled

---

### `RouteInfo`

**Purpose**: Displays route statistics after a route is generated: distance, estimated time, safety percentage bar, and a warning if any red zones exist.

**Props**: none

**Store dependencies**:
- `routeData` — renders `null` when `null`
- `computedSegments` — passed to `computeSafetyStats()`
- `paceMin`, `paceSec` — used to calculate estimated time

**Parent**: `Sidebar`

**Key details**:
- `computeSafetyStats(segments)` returns `{ safePercent, greenPercent, yellowPercent }`
- Safety bar color: `bg-safe` (≥80%), `bg-caution` (≥60%), `bg-danger` (<60%)
- Shows green% and yellow% in separate stat boxes
- Warning box appears when `safePercent < 100`: "⚠️ ישנם קטעים במסלול שאינם קרובים למקלט. נא לשים לב!"

---

### `HowItWorks`

**Purpose**: A static three-step explanation of how to use the app.

**Props**: none

**Store dependencies**: none

**Parent**: `Sidebar`

**Key details**:
- Steps (as Unicode escapes in source): "בחר נקודת התחלה...", "קבע אורך מסלול רצוי", "לחץ 'צור מסלול'..."
- Footer note: "המסלול מתוכנן כך שבכל נקודה תהיה במרחק הליכה קצר ממקלט ציבורי."

---

## Overview Components (`src/components/overview/`)

### `RouteOverview`

**Purpose**: A slide-in panel showing the full segment list with summary stats. On desktop it slides in from the left. On mobile it slides up from the bottom.

**Props**: none

**Store dependencies**:
- `overviewVisible` — controls slide animation
- `computedSegments` — renders `SegmentCard` for each
- `highlightedSegmentIdx` — passed to each card as `isActive`
- `highlightSegment`, `resetSegmentHighlight` — segment interaction
- `setOverviewVisible` — called by close button
- `routeData` — for distance/time display in header
- `paceMin`, `paceSec` — for time calculation

**Parent**: `App`

**Key details**:
- Desktop: `absolute top-0 bottom-0 left-0 z-[15] w-[320px]` — slides in from left, sits on top of the map
- Mobile: `fixed inset-x-0 bottom-0 z-[15] max-h-[65vh]` — slides up from bottom
- `z-[15]` — above the map but below the sidebar (`z-40`) and overlays (`z-[2000]`)
- `OverviewHeader` shows distance, time, and safety% with accent-colored values
- Closing the panel also resets the segment highlight

---

### `SegmentCard`

**Purpose**: A clickable card for one route segment. Shows the segment number, zone color, distance, direction, and nearest shelter.

**Props**:
```typescript
interface SegmentCardProps {
  segment: RouteSegment;
  isActive: boolean;
  onClick: () => void;
}
```

**Store dependencies**: none (receives data via props)

**Parent**: `RouteOverview`

**Key details**:
- Left border color matches the segment's safety zone: `style={{ borderRight: '3px solid ${segment.color}' }}` (RTL, so "left" border is on the right side visually)
- Active state: `bg-accent-dim` background
- Shows: segment number, distance in meters, Hebrew direction, street name (if available), nearest shelter address and distance
- Clicking calls `onClick` which calls `highlightSegment(seg.index)` in the parent

---

## Shared Components (`src/components/shared/`)

### `RouteConfirmDialog`

**Purpose**: An `AlertDialog` that appears when the best route found differs from the target distance by more than 15%. Gives the user three choices.

**Props**:
```typescript
interface RouteConfirmDialogProps {
  open: boolean;
  targetKm: number;
  bestKm: number;
  bestTime: number;
  isRetry: boolean;
  onAction: (action: 'accept' | 'retry' | 'cancel') => void;
}
```

**Store dependencies**: none (receives data via props from `RouteConfirmDialogWrapper` in `App.tsx`)

**Parent**: `RouteConfirmDialogWrapper` in `App.tsx`

**Key details**:
- Uses shadcn `AlertDialog` — the `open` prop is controlled externally
- `onOpenChange={(isOpen) => { if (!isOpen) onAction('cancel') }}` — handles Radix's auto-close (e.g., pressing Escape)
- **Critical**: all three action buttons use `e.preventDefault()` to prevent Radix from auto-closing the dialog before the action handler runs. Without this, the dialog closes before `handleConfirmation` can process the action.
- Button styles use `!` prefix (e.g., `!bg-accent`) to override shadcn's `Button` cva styles
- `isRetry` changes the "Search More" button text to "Try Again (Extended Search)" and adds a note that extended search was already tried

---

### `LoadingOverlay`

**Purpose**: A full-screen semi-transparent overlay with a spinner and progress message. Shown during route generation.

**Props**: none

**Store dependencies**:
- `isLoading` — renders `null` when `false`
- `loadingMessage` — the progress text (e.g., "מחפש מקלטים בקרבת מקום...")

**Parent**: `App`

**Key details**:
- `z-[2000]` — above everything including the sidebar
- Background: `rgba(20,27,45,0.85)` — matches `--color-bg` with 85% opacity
- Spinner: `border-t-accent` on a `border-bg-surface-3` ring
- Progress messages are set by `onProgress` callbacks in the routing algorithm

---

### `ClickHint`

**Purpose**: A floating pill hint that says "click the map to choose a start point". Auto-dismisses after 4 seconds.

**Props**: none

**Store dependencies**:
- `startLatLng` — renders `null` once a start point is set
- `routeData` — also renders `null` once a route exists

**Parent**: `App`

**Key details**:
- `useState(true)` for visibility, `setTimeout(() => setVisible(false), 4000)` for auto-dismiss
- Uses CSS opacity transition for fade-out: `transition-opacity duration-300`
- `pointer-events-none` — doesn't block map clicks
- `fixed bottom-[60px]` — positioned above the mobile bottom sheet handle
- Only shown on first load, before any interaction

---

## shadcn/ui Components (`src/components/ui/`)

These are installed via the shadcn CLI and should not be edited manually. The 12 installed components are:

| Component | Used by |
|-----------|---------|
| `alert-dialog` | `RouteConfirmDialog` |
| `badge` | (available, not currently used) |
| `button` | `GenerateButton`, `RouteConfirmDialog` |
| `card` | (available, not currently used) |
| `dialog` | (available, not currently used) |
| `input` | `AddressSearch` |
| `scroll-area` | `Sidebar`, `RouteOverview` |
| `separator` | `Sidebar` |
| `slider` | `DistanceMode`, `PaceMode` |
| `sonner` | `App` (toast notifications) |
| `toggle-group` | (available, not currently used) |
| `toggle` | (available, not currently used) |

To add a new shadcn component: `npx shadcn@latest add <component-name>`. Never write these by hand.
