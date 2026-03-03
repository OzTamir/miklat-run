# Development Guide

## Prerequisites

- Node.js 18+ (the project uses ES modules and modern JS features)
- npm or bun (npm is used in examples below)

## Setup

```bash
git clone <repo-url>
cd miklat-run
npm install
```

## Scripts

From `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `tsc -b && vite build` | TypeScript check + production build |
| `preview` | `vite preview` | Preview the production build locally |
| `test` | `vitest run` | Run all tests once |
| `test:watch` | `vitest` | Run tests in watch mode |
| `lint` | `eslint .` | Lint all files |

The build output goes to `dist/`. Bundle sizes: ~694KB JS, ~65KB CSS (single SPA chunk, no code splitting needed for this app size).

## Project Configuration

### Vite (`vite.config.ts`)

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
```

- `@vitejs/plugin-react` — React Fast Refresh
- `@tailwindcss/vite` — Tailwind v4 Vite plugin (replaces PostCSS setup)
- `@` alias maps to `src/` — use `@/components/...` instead of `../../components/...`

### TypeScript

`tsconfig.json` uses strict mode. The project has zero `any` types in source files. If you need to escape the type system temporarily, use `unknown` with a type guard rather than `any`.

---

## Tailwind v4 Conventions

Tailwind v4 is fundamentally different from v3. There's no `tailwind.config.js`. Everything lives in CSS.

### CSS-first configuration

All design tokens are defined in `src/index.css` using the `@theme` directive:

```css
@theme {
  --color-bg: #141b2d;
  --color-bg-surface: #1a2237;
  --color-bg-surface-2: #212b44;
  --color-bg-surface-3: #2a3556;

  --color-text-primary: #e8ecf4;
  --color-text-secondary: #8b95a8;
  --color-text-muted: #5c6578;

  --color-accent: #e8913a;
  --color-accent-hover: #f0a050;
  --color-accent-dim: rgba(232, 145, 58, 0.15);

  --color-safe: #3aba6f;
  --color-caution: #e8c93a;
  --color-danger: #e85a3a;
  --color-safe-dim: rgba(58, 186, 111, 0.15);
  --color-caution-dim: rgba(232, 201, 58, 0.15);
  --color-danger-dim: rgba(232, 90, 58, 0.15);

  --font-sans: "Rubik", system-ui, sans-serif;
  --radius-default: 8px;
  --shadow-default: 0 4px 24px rgba(0, 0, 0, 0.3);
}
```

These tokens become Tailwind utility classes automatically:
- `--color-bg` → `bg-bg`, `text-bg`, `border-bg`
- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-safe` → `bg-safe`, `text-safe`
- etc.

### Dark mode

The app is always dark. `index.html` has `class="dark"` on `<html>`. The dark variant is configured in CSS:

```css
@custom-variant dark (&:is(.dark *));
```

There's no light mode and no toggle. Don't add one without a design decision.

### No `tailwind.config.js`

If you're used to Tailwind v3, resist the urge to create a config file. It won't work with v4. All customization goes in `src/index.css`.

### Arbitrary values

For one-off values not in the theme, use Tailwind's arbitrary value syntax:
```html
<div class="w-[340px] z-[2000] bg-[rgba(20,27,45,0.85)]">
```

### Overriding shadcn styles

shadcn components use `cva` (class-variance-authority) for styling. To override their styles from outside, use the `!` prefix:

```tsx
<AlertDialogAction className="!bg-accent !text-white !font-semibold">
```

Without `!`, the cva styles take precedence and your classes are ignored.

---

## shadcn/ui

### Never write shadcn components manually

Always use the CLI:

```bash
npx shadcn@latest add <component-name>
```

Examples:
```bash
npx shadcn@latest add button
npx shadcn@latest add alert-dialog
npx shadcn@latest add slider
```

The CLI reads `components.json` for configuration and places the component in `src/components/ui/`.

### Configuration (`components.json`)

```json
{
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- `style: "new-york"` — the shadcn style variant (more compact than "default")
- `rsc: false` — not a Next.js RSC project
- `baseColor: "zinc"` — the base color palette for shadcn's CSS variables

### Currently installed components

`alert-dialog`, `badge`, `button`, `card`, `dialog`, `input`, `scroll-area`, `separator`, `slider`, `sonner`, `toggle-group`, `toggle`

### Customizing shadcn components

Since the components are copied into the project, you can edit them. But be careful: re-running `npx shadcn@latest add` will overwrite your changes. Document any customizations.

The `RouteConfirmDialog` uses `AlertDialogAction` with a custom `variant="outline"` prop — this was added to the `alert-dialog.tsx` component to support the secondary action button style.

---

## Testing

### Setup

Tests use Vitest with the configuration in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

`globals: true` means you don't need to import `describe`, `it`, `expect` — they're available globally.

### Running tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npx vitest run        # same as npm test
npx vitest --reporter=verbose  # verbose output
```

### Test files

61 tests across 8 test files, all co-located with their source:

| Test file | Tests | What it covers |
|-----------|-------|----------------|
| `src/lib/geo/haversine.test.ts` | ~8 | Distance calculations |
| `src/lib/geo/bearing.test.ts` | ~6 | Bearing + Hebrew directions |
| `src/lib/geo/spatial-index.test.ts` | ~8 | Grid index build + query |
| `src/lib/api/osrm.test.ts` | ~10 | OSRM client, preprocessing, error handling |
| `src/lib/api/nominatim.test.ts` | ~8 | Nominatim search + reverse geocode |
| `src/lib/routing/route-search.test.ts` | ~8 | selectByBias, generateRoute |
| `src/lib/routing/safety-analyzer.test.ts` | ~6 | Safety zone classification |
| `src/lib/routing/segment-builder.test.ts` | ~7 | Segment building logic |

### Writing tests

```typescript
import { describe, expect, it, vi } from 'vitest';
import { haversine } from './haversine';

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine(32.0, 34.0, 32.0, 34.0)).toBe(0);
  });

  it('calculates distance between Tel Aviv landmarks', () => {
    const dist = haversine(32.0853, 34.7818, 32.0900, 34.7900);
    expect(dist).toBeCloseTo(900, -2);  // ~900m, within 100m
  });
});
```

### Mocking fetch for API tests

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

it('calls OSRM with correct coordinate order', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      code: 'Ok',
      routes: [{ geometry: { type: 'LineString', coordinates: [] }, distance: 5000, duration: 2500, legs: [] }]
    })
  });
  vi.stubGlobal('fetch', mockFetch);

  await getOSRMRoute([{ lat: 32.0853, lng: 34.7818 }]);

  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining('34.7818,32.0853'),  // lng,lat order
    expect.any(Object)
  );
});
```

---

## Common Tasks

### Adding a new component

1. Create the file in the appropriate directory:
   - Map-related: `src/components/map/MyComponent.tsx`
   - Sidebar controls: `src/components/sidebar/MyComponent.tsx`
   - App-level overlays: `src/components/shared/MyComponent.tsx`

2. Export from the barrel file:
   ```typescript
   // src/components/map/index.ts
   export { MyComponent } from './MyComponent';
   ```

3. Import using the barrel:
   ```typescript
   import { MyComponent } from '@/components/map';
   ```

### Modifying routing logic

The routing files have tests. After any change:

```bash
npx vitest run src/lib/routing/
```

Key invariants to maintain:
- `planRouteWaypoints` must always return at least 1 waypoint (the start point)
- `buildLogicalSegments` must always return at least 1 segment
- Coordinate order: GeoJSON is `[lng, lat]`, Leaflet is `[lat, lng]`

### Updating shelter data

1. Replace `src/data/shelters.json` with new data
2. Maintain the exact schema (all 11 fields, same types)
3. Update the count in documentation if it changes from 498
4. Run `npm run build` to verify TypeScript is happy
5. Run `npx vitest run` to verify tests pass

### Adding a shadcn component

```bash
npx shadcn@latest add <component-name>
```

The component appears in `src/components/ui/`. Import it:
```typescript
import { ComponentName } from '@/components/ui/component-name';
```

### Adding a new Tailwind token

Add to the `@theme` block in `src/index.css`:
```css
@theme {
  --color-my-new-color: #ff6b6b;
}
```

Then use it as `bg-my-new-color`, `text-my-new-color`, etc.

### Debugging routing issues

The `onProgress` callback in `generateRoute` logs progress messages to the `LoadingOverlay`. To see more detail, add `console.log` calls in `route-search.ts` or `route-planner.ts` and watch the browser console.

The most common issues:
- **Route too short/long**: the scale factor calibration isn't converging. Check if the start point is in a dense street grid (calibration works better there).
- **No route found**: OSRM returned an error. Check the browser network tab for the OSRM request and response.
- **Markers in wrong location**: coordinate order bug. Check that `[lng, lat]` is used for OSRM and `[lat, lng]` for Leaflet.

---

## Code Conventions

### Hebrew strings

All Hebrew text in JSX uses Unicode escapes:
```tsx
// Correct
<span>{'\u05DE\u05E1\u05DC\u05D5\u05DC'}</span>  // "מסלול"

// Avoid — can cause RTL/LTR mixing issues in some editors
<span>מסלול</span>
```

The app root has `dir="rtl"` on the outer div, so RTL layout is handled by CSS, not by the text direction of individual strings.

### Store subscriptions

Subscribe to the minimum slice needed:
```typescript
// Good — only re-renders when startLatLng changes
const startLatLng = useRouteStore((s) => s.startLatLng);

// Avoid — re-renders on any store change
const store = useRouteStore();
```

### Coordinate types

- `LatLng` (`{ lat: number, lng: number }`) — used throughout the app for internal coordinates
- `[number, number]` as `[lat, lng]` — used for Leaflet positions
- `[number, number]` as `[lng, lat]` — used for GeoJSON coordinates (OSRM output)

Always add a comment when the order isn't obvious from context.

### Component file structure

```typescript
// 1. Imports
import { useState } from 'react';
import { useRouteStore } from '@/stores/route-store';

// 2. Types/interfaces (if any)
interface MyComponentProps { ... }

// 3. Helper functions (if any)
function helperFn() { ... }

// 4. Main component (named export)
export function MyComponent({ prop }: MyComponentProps) {
  // hooks first
  const value = useRouteStore((s) => s.value);
  const [local, setLocal] = useState(false);

  // early returns
  if (!value) return null;

  // render
  return <div>...</div>;
}
```

---

## Build Output

```
dist/
├── index.html
└── assets/
    ├── index-[hash].js    # ~694KB (includes React, Leaflet, all app code)
    └── index-[hash].css   # ~65KB (Tailwind utilities + shadcn styles)
```

The shelter data (498 shelters × ~200 bytes each ≈ ~100KB) is bundled into the JS chunk. This is intentional — it avoids a runtime fetch and keeps the app functional offline after the initial load.
