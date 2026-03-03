# Miklat Run — מסלול מוגן

**A web app for Israeli runners to plan routes that keep them within 3-4 minutes of the nearest bomb shelter at all times.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-orange)

---

## What is this?

When a rocket siren sounds in Israel, civilians have roughly 90 seconds to reach a bomb shelter (מקלט, *miklat*). For people indoors, that's manageable. For runners outdoors, it's a real problem — you might be 500 meters from the nearest shelter with no idea which direction to go.

Miklat Run solves this by generating circular running routes in Tel Aviv that are optimized to stay close to public bomb shelters. Every point on the route is scored by how long it would take to reach the nearest shelter on foot. If you're ever caught in a siren, you'll know you're never more than a minute or two away.

The app uses real data for **498 public shelters in Tel Aviv** and routes you along actual streets via OSRM (OpenStreetMap Routing Machine).

### Safety zones

Every segment of your route is color-coded:

- 🟢 **Green** — within 150m (~1 min to shelter)
- 🟡 **Yellow** — 150-250m (~2-3 min)
- 🔴 **Red** — beyond 250m (>3 min, exposed)

The goal is to keep as much of your route green as possible.

---

## Features

- **Click-to-start** — click anywhere on the map to set your starting point
- **Address search** — type a Tel Aviv address to set the start
- **Distance or time mode** — plan by target distance (1-15km) or by pace and time
- **Over/under preference** — prefer routes slightly longer or shorter than target
- **Adaptive route generation** — iteratively calibrates to hit the target distance (up to 10 iterations)
- **Color-coded route** — segments colored by shelter proximity
- **Segment overview** — slide-in panel with per-segment safety details
- **Interactive segments** — click a segment on the map or in the overview to highlight it
- **Shelter visibility** — all 498 shelters shown on the map, active ones highlighted near your route
- **Route confirmation** — if the generated route differs more than 15% from your target, the app asks before showing it
- **Dark theme** — always-dark UI designed for CartoDB dark map tiles
- **Responsive** — desktop sidebar and mobile bottom sheet layout
- **Hebrew RTL interface**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.9 |
| Build | Vite 7.3 |
| Styling | Tailwind CSS 4 (CSS-first config), shadcn/ui (New York style) |
| Maps | Leaflet 1.9 via react-leaflet 5 |
| State | Zustand 5 |
| Routing API | OSRM (OpenStreetMap Routing Machine) — public endpoint |
| Geocoding | Nominatim (OpenStreetMap) — public endpoint |
| Testing | Vitest 4 (61 tests) |
| Notifications | Sonner |

No API keys required. OSRM and Nominatim are free public services.

---

## Getting Started

```bash
git clone https://github.com/<user>/miklat-run.git
cd miklat-run
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Dev server with HMR |
| `npm run build` | `tsc -b && vite build` | TypeScript check + production build |
| `npm run preview` | `vite preview` | Preview production build |
| `npm test` | `vitest run` | Run all tests |
| `npm run test:watch` | `vitest` | Watch mode |
| `npm run lint` | `eslint .` | Lint |

---

## Project Structure

```
src/
├── components/
│   ├── map/          # Leaflet map components (11 files)
│   ├── sidebar/      # Control panel components (9 files)
│   ├── overview/     # Route segment detail panel
│   ├── shared/       # Overlays and dialogs
│   └── ui/           # shadcn/ui components (CLI-installed)
├── lib/
│   ├── api/          # OSRM and Nominatim clients
│   ├── geo/          # Haversine, bearing, spatial index
│   └── routing/      # Route planner, search, segments, safety
├── stores/           # Zustand state management
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── data/             # Shelter data (498 locations)
└── styles/           # Leaflet style overrides
```

---

## How It Works

1. **Route planning** — generates elliptical waypoints through nearby shelters based on your start point and target distance
2. **Adaptive calibration** — iteratively adjusts a scale factor to hit the target distance (up to 6-10 OSRM calls)
3. **OSRM routing** — snaps waypoints to real streets and returns turn-by-turn geometry
4. **Safety analysis** — every coordinate on the route is scored by proximity to the nearest shelter using a spatial index
5. **Segment building** — merges OSRM steps into 6-12 logical segments, each colored by its worst safety score

---

## Documentation

- [Architecture](docs/architecture.md) — system design, data flow, state management
- [Routing Algorithm](docs/routing-algorithm.md) — how routes are planned and optimized
- [Components](docs/components.md) — component reference with props and store dependencies
- [API Reference](docs/api-reference.md) — OSRM and Nominatim client documentation
- [Development Guide](docs/development.md) — setup, conventions, testing, common tasks

---

## License

See [LICENSE](LICENSE) for details.
