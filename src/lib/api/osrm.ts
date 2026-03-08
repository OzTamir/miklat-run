import type { LatLng, RouteData } from '@/types'

interface GetOSRMRouteOptions {
  closeLoop?: boolean
}

export async function getOSRMRoute(
  waypoints: LatLng[],
  options: GetOSRMRouteOptions = {},
): Promise<RouteData> {
  const { closeLoop = true } = options
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
  
  if (closeLoop) {
    const first = deduped[0], last = deduped[deduped.length - 1];
    if (Math.abs(first.lat - last.lat) > 0.00001 || Math.abs(first.lng - last.lng) > 0.00001) {
      deduped.push(first);
    }
  }
  pts = deduped;
  
  if (pts.length < 2) throw new Error('Insufficient waypoints for route');
  
  // Build coordinates string
  const coords = pts.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson&steps=true`;
  
  const response = await fetch(url);
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
