import type { LatLng, RouteData } from '@/types'

const FETCH_TIMEOUT_MS = 8000;

function preprocessWaypoints(waypoints: LatLng[]): LatLng[] {
  let pts = waypoints;
  
  // Simplify if more than 50 waypoints
  if (pts.length > 50) {
    const step = Math.ceil((pts.length - 2) / 45);
    const simplified = [pts[0]];
    for (let i = 1; i < pts.length - 1; i += step) simplified.push(pts[i]);
    simplified.push(pts[pts.length - 1]);
    pts = simplified;
  }
  
  // Deduplicate consecutive identical points
  const deduped = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(pts[i].lat - prev.lat) > 0.00001 || Math.abs(pts[i].lng - prev.lng) > 0.00001) {
      deduped.push(pts[i]);
    }
  }
  
  // Close the loop
  const first = deduped[0], last = deduped[deduped.length - 1];
  if (Math.abs(first.lat - last.lat) > 0.00001 || Math.abs(first.lng - last.lng) > 0.00001) deduped.push(first);
  pts = deduped;
  
  if (pts.length < 2) throw new Error('Insufficient waypoints for route');
  
  return pts;
}

function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('OSRM request timeout'));
    }, timeoutMs);

    fetch(url, { signal: controller.signal })
      .then(resolve, reject)
      .finally(() => clearTimeout(timer));
  });
}

export async function getOSRMRoute(waypoints: LatLng[]): Promise<RouteData> {
  const pts = preprocessWaypoints(waypoints);
  
  // Build coordinates string
  const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true`;
  
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error('שגיאת שרת OSRM');
  
  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
    throw new Error('לא נמצא מסלול');
  }
  
  return {
    geometry: data.routes[0].geometry,
    distance: data.routes[0].distance,
    duration: data.routes[0].duration,
    waypoints: pts,
    steps: data.routes[0].legs ? data.routes[0].legs.flatMap((l: { steps?: unknown[] }) => l.steps || []) : []
  };
}

export async function getOSRMTrip(waypoints: LatLng[]): Promise<RouteData> {
  const pts = preprocessWaypoints(waypoints);
  
  // Build coordinates string
  const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/trip/v1/foot/${coords}?source=first&roundtrip=true&overview=full&geometries=geojson&steps=true`;
  
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error('שגיאת שרת OSRM');
  
  const data = await response.json();
  if (data.code !== 'Ok' || !data.trips || !data.trips.length) {
    throw new Error('לא נמצא מסלול');
  }
  
  return {
    geometry: data.trips[0].geometry,
    distance: data.trips[0].distance,
    duration: data.trips[0].duration,
    waypoints: pts,
    steps: data.trips[0].legs ? data.trips[0].legs.flatMap((l: { steps?: unknown[] }) => l.steps || []) : []
  };
}

// Test trip once, cache the result. Avoids doubling every OSRM call.
let tripSupported: boolean | null = null;

export async function getOSRMRouteOrTrip(waypoints: LatLng[]): Promise<RouteData> {
  // If we already know trip doesn't work, skip straight to route
  if (tripSupported === false) {
    return await getOSRMRoute(waypoints);
  }

  try {
    const result = await getOSRMTrip(waypoints);
    tripSupported = true;
    return result;
  } catch {
    // Whether trip was untested (null) or previously working (true),
    // disable it on failure. This prevents repeated 8s timeouts when
    // the OSRM server rate-limits the trip endpoint.
    if (tripSupported === null) {
      console.debug('[routing] OSRM trip endpoint unavailable, falling back to route');
    } else {
      console.debug('[routing] OSRM trip failed (rate-limited?), disabling trip for remaining calls');
    }
    tripSupported = false;
    return await getOSRMRoute(waypoints);
  }
}

// Reset trip detection (useful for testing)
export function resetTripDetection(): void {
  tripSupported = null;
}
