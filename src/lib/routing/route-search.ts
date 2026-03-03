import type { LatLng, Shelter, RouteData, RouteCandidate, DistanceBias } from '@/types';
import { haversine } from '@/lib/geo';
import { getOSRMRouteOrTrip } from '@/lib/api';
import { planRouteWaypoints, scaleWaypoints } from './route-planner';

const ACCEPTABLE_ERROR = 0.15;
const SEARCH_DEADLINE_MS = 30_000;
const OSRM_SLOW_THRESHOLD_MS = 4_000;

function dbg(msg: string, data?: Record<string, unknown>) {
  if (data) {
    console.debug(`[routing] ${msg}`, data);
  } else {
    console.debug(`[routing] ${msg}`);
  }
}

function getRouteDistance(routeData: RouteData): number {
  if (Number.isFinite(routeData.distance) && routeData.distance > 0) {
    return routeData.distance;
  }

  let dist = 0;
  for (let i = 1; i < routeData.waypoints.length; i++) {
    const prev = routeData.waypoints[i - 1];
    const curr = routeData.waypoints[i];
    dist += haversine(prev.lat, prev.lng, curr.lat, curr.lng);
  }
  return dist;
}

function estimateRouteDistance(waypoints: LatLng[]): number {
  let dist = 0;
  for (let i = 1; i < waypoints.length; i++) {
    dist += haversine(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
  }
  return dist * 1.4;
}

function pruneDetouredWaypoints(waypoints: LatLng[]): LatLng[] | null {
  if (waypoints.length <= 3) return null;

  const flagged = new Set<number>();
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    const throughWp = haversine(prev.lat, prev.lng, curr.lat, curr.lng)
      + haversine(curr.lat, curr.lng, next.lat, next.lng);
    const direct = haversine(prev.lat, prev.lng, next.lat, next.lng);

    if (direct > 0 && throughWp / direct > 2.5) {
      flagged.add(i);
    }
  }

  if (flagged.size === 0) return null;

  const pruned = waypoints.filter((_, idx) => !flagged.has(idx));
  return pruned.length >= 3 ? pruned : null;
}

export async function searchForRoutes(
  start: LatLng,
  targetDistM: number,
  bias: DistanceBias,
  extended: boolean,
  shelters: Shelter[],
  onProgress?: (message: string) => void,
): Promise<RouteCandidate[]> {
  const t0 = performance.now();
  const deadline = t0 + SEARCH_DEADLINE_MS;
  const candidates: RouteCandidate[] = [];
  let osrmCalls = 0;
  let osrmSlow = false;
  let consecutiveFailures = 0;

  const maxCalibIters = extended ? 4 : 3;
  const convergenceThreshold = extended ? 0.06 : 0.10;

  function pastDeadline(): boolean {
    return performance.now() > deadline;
  }

  async function callOSRM(waypoints: LatLng[]): Promise<RouteData | null> {
    if (pastDeadline()) {
      dbg('skipping OSRM call — past deadline');
      return null;
    }
    const tOsrm = performance.now();
    try {
      const result = await getOSRMRouteOrTrip(waypoints);
      osrmCalls++;
      consecutiveFailures = 0;
      const elapsed = performance.now() - tOsrm;
      if (elapsed > OSRM_SLOW_THRESHOLD_MS && !osrmSlow) {
        osrmSlow = true;
        dbg(`OSRM slow detected (${elapsed.toFixed(0)}ms) — reducing scope`);
      }
      return result;
    } catch (e) {
      osrmCalls++;
      consecutiveFailures++;
      dbg('OSRM call failed', { error: String(e), consecutiveFailures });
      return null;
    }
  }

  function shouldStop(): boolean {
    return pastDeadline() || consecutiveFailures >= 3;
  }

  dbg('searchForRoutes start', { targetDistM, bias, extended });

  onProgress?.('בונה מסלולים מועמדים...');
  const DEG_PER_M_LAT = 1 / 111320;
  const DEG_PER_M_LNG = 1 / (111320 * Math.cos(start.lat * Math.PI / 180));
  const OFFSET_M = 40;

  const offsets: LatLng[] = [{ lat: start.lat, lng: start.lng }];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    offsets.push({
      lat: start.lat + Math.sin(angle) * OFFSET_M * DEG_PER_M_LAT,
      lng: start.lng + Math.cos(angle) * OFFSET_M * DEG_PER_M_LNG,
    });
  }

  const baseShapes = offsets
    .map((offsetStart) => {
      const waypoints = planRouteWaypoints(offsetStart, targetDistM, shelters);
      if (waypoints.length < 2) {
        return null;
      }

      const latShift = offsetStart.lat - start.lat;
      const lngShift = offsetStart.lng - start.lng;
      const anchoredWaypoints = waypoints.map((wp) => ({
        lat: wp.lat - latShift,
        lng: wp.lng - lngShift,
      }));
      const estDist = estimateRouteDistance(anchoredWaypoints);
      const estError = Math.abs(estDist - targetDistM) / targetDistM;

      return {
        waypoints: anchoredWaypoints,
        estError,
      };
    })
    .filter((shape): shape is { waypoints: LatLng[]; estError: number } => shape !== null)
    .sort((a, b) => a.estError - b.estError)
    .slice(0, 3);

  dbg('base shapes generated', {
    count: baseShapes.length,
    estErrors: baseShapes.map(s => `${(s.estError * 100).toFixed(1)}%`),
    elapsed: `${(performance.now() - t0).toFixed(0)}ms`,
  });

  let bestCalibration: { waypoints: LatLng[]; sf: number; distError: number } | null = null;

  for (let shapeIdx = 0; shapeIdx < baseShapes.length; shapeIdx++) {
    if (shouldStop()) break;
    if (osrmSlow && shapeIdx > 0 && candidates.length > 0) {
      dbg(`skipping shape=${shapeIdx} — OSRM slow, have ${candidates.length} candidates`);
      break;
    }

    const baseShape = baseShapes[shapeIdx];
    let sf = 1;
    const effectiveMaxIters = osrmSlow ? Math.min(2, maxCalibIters) : maxCalibIters;

    for (let iter = 0; iter < effectiveMaxIters; iter++) {
      if (shouldStop()) break;
      onProgress?.(`מכייל מסלול (ניסיון ${iter + 1}/${effectiveMaxIters})...`);

      const scaledWaypoints = scaleWaypoints(start, baseShape.waypoints, sf);
      const tOsrm = performance.now();
      const routeData = await callOSRM(scaledWaypoints);
      if (!routeData) break;

      const actualDist = getRouteDistance(routeData);
      const distError = Math.abs(actualDist - targetDistM) / targetDistM;

      dbg(`calibrate shape=${shapeIdx} iter=${iter}`, {
        sf: sf.toFixed(3),
        actual: `${(actualDist / 1000).toFixed(2)}km`,
        error: `${(distError * 100).toFixed(1)}%`,
        osrmMs: `${(performance.now() - tOsrm).toFixed(0)}ms`,
      });

      candidates.push({ routeData, actualDist, distError, sf });

      if (!bestCalibration || distError < bestCalibration.distError) {
        bestCalibration = { waypoints: baseShape.waypoints, sf, distError };
      }

      if (distError < convergenceThreshold || actualDist <= 0) {
        dbg(`converged at shape=${shapeIdx} iter=${iter}`);
        break;
      }

      const ratio = targetDistM / actualDist;
      sf *= extended ? (0.6 * ratio + 0.4) : ratio;
      sf = Math.max(0.3, Math.min(2.5, sf));
    }
  }

  if (bestCalibration && !shouldStop() && !osrmSlow) {
    const biasOffsets = bias === 'over'
      ? [1.02, 1.05, 1.10, 1.15, ...(extended ? [1.20, 0.98] : [])]
      : [0.98, 0.95, 0.90, 0.85, ...(extended ? [0.80, 1.02] : [])];

    dbg('bias expansion', { offsets: biasOffsets, bestSf: bestCalibration.sf.toFixed(3) });

    for (let i = 0; i < biasOffsets.length; i++) {
      if (shouldStop()) break;
      const bsf = bestCalibration.sf * biasOffsets[i];
      onProgress?.(`מחפש מסלול ${bias === 'over' ? 'מעל' : 'מתחת'} ליעד (${i + 1})...`);

      const scaledWaypoints = scaleWaypoints(start, bestCalibration.waypoints, bsf);
      const routeData = await callOSRM(scaledWaypoints);
      if (!routeData) break;

      const actualDist = getRouteDistance(routeData);
      const distError = Math.abs(actualDist - targetDistM) / targetDistM;

      if (distError < 0.50) {
        candidates.push({ routeData, actualDist, distError, sf: bsf });
      }
    }
  } else if (osrmSlow && bestCalibration) {
    dbg('skipping bias expansion — OSRM slow');
  }

  if (bestCalibration && candidates.length > 0 && !shouldStop() && !osrmSlow) {
    const bestCandidate = selectByBias(candidates, targetDistM, bias);
    if (bestCandidate) {
      const bestError = Math.abs(getRouteDistance(bestCandidate) - targetDistM) / targetDistM;
      if (bestError > convergenceThreshold) {
        const pruned = pruneDetouredWaypoints(scaleWaypoints(start, bestCalibration.waypoints, bestCalibration.sf));
        if (pruned) {
          onProgress?.('משפר מסלול...');
          dbg('pruning pass', { prunedWaypoints: pruned.length });
          const routeData = await callOSRM(pruned);
          if (routeData) {
            const actualDist = getRouteDistance(routeData);
            const distError = Math.abs(actualDist - targetDistM) / targetDistM;
            if (distError < 0.50) {
              candidates.push({ routeData, actualDist, distError, sf: bestCalibration.sf });
            }
          }
        }
      }
    }
  }

  const best = candidates.length > 0 ? selectByBias([...candidates], targetDistM, bias) : null;
  dbg('searchForRoutes done', {
    candidates: candidates.length,
    osrmCalls,
    osrmSlow,
    elapsed: `${(performance.now() - t0).toFixed(0)}ms`,
    bestDist: best ? `${(getRouteDistance(best) / 1000).toFixed(2)}km` : 'none',
    bestError: best ? `${(Math.abs(getRouteDistance(best) - targetDistM) / targetDistM * 100).toFixed(1)}%` : 'n/a',
  });

  return candidates;
}

export function selectByBias(
  candidates: RouteCandidate[],
  targetDistM: number,
  bias: DistanceBias,
): RouteData | null {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0].routeData;
  }

  candidates.sort((a, b) => {
    const aOver = a.actualDist >= targetDistM;
    const bOver = b.actualDist >= targetDistM;
    const aErr = Math.abs(a.actualDist - targetDistM);
    const bErr = Math.abs(b.actualDist - targetDistM);

    if (bias === 'over') {
      if (aOver && bOver) {
        return aErr - bErr;
      }
      if (aOver && !bOver) {
        return -1;
      }
      if (!aOver && bOver) {
        return 1;
      }
      return aErr - bErr;
    }

    if (!aOver && !bOver) {
      return aErr - bErr;
    }
    if (!aOver && bOver) {
      return -1;
    }
    if (aOver && !bOver) {
      return 1;
    }
    return aErr - bErr;
  });

  return candidates[0].routeData;
}

export interface GenerateRouteParams {
  start: LatLng;
  targetDistKm: number;
  bias: DistanceBias;
  isRetry: boolean;
  shelters: Shelter[];
  onProgress?: (message: string) => void;
}

export interface GenerateRouteResult {
  routeData: RouteData;
  needsConfirmation: boolean;
  bestDistKm: number;
  errorPct: number;
}

export async function generateRoute(params: GenerateRouteParams): Promise<GenerateRouteResult | null> {
  const { start, targetDistKm, bias, isRetry, shelters, onProgress } = params;
  const targetDistM = targetDistKm * 1000;

  onProgress?.('מחפש מקלטים בקרבת מקום...');
  const candidates = await searchForRoutes(start, targetDistM, bias, isRetry, shelters, onProgress);
  const bestRouteData = candidates.length > 0 ? selectByBias(candidates, targetDistM, bias) : null;

  if (!bestRouteData) {
    return null;
  }

  const bestDist = getRouteDistance(bestRouteData);
  const errorPct = Math.abs(bestDist - targetDistM) / targetDistM;
  const needsConfirmation = errorPct > ACCEPTABLE_ERROR;

  return {
    routeData: bestRouteData,
    needsConfirmation,
    bestDistKm: bestDist / 1000,
    errorPct,
  };
}
