import type { LatLng, Shelter, RouteData, RouteCandidate, DistanceBias } from '@/types';
import { haversine } from '@/lib/geo';
import { getOSRMRoute } from '@/lib/api';
import { planRouteWaypoints } from './route-planner';

const ACCEPTABLE_ERROR = 0.15;

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

export async function searchForRoutes(
  start: LatLng,
  targetDistM: number,
  bias: DistanceBias,
  extended: boolean,
  shelters: Shelter[],
  onProgress?: (message: string) => void,
): Promise<RouteCandidate[]> {
  const candidates: RouteCandidate[] = [];
  let sf = 1.0;

  const maxCalibIters = extended ? 10 : 6;
  const convergenceThreshold = extended ? 0.06 : 0.10;

  for (let iter = 0; iter < maxCalibIters; iter++) {
    onProgress?.(iter === 0 ? 'בונה גרף מקלטים...' : `מכייל מסלול (ניסיון ${iter + 1}/${maxCalibIters})...`);
    const waypoints = planRouteWaypoints(start, targetDistM * sf, shelters);
    if (waypoints.length < 2) {
      break;
    }

    onProgress?.(iter === 0 ? 'מחשב מסלול רחובות...' : `מחשב מסלול (ניסיון ${iter + 1}/${maxCalibIters})...`);
    const routeData = await getOSRMRoute(waypoints);

    const actualDist = getRouteDistance(routeData);
    const distError = Math.abs(actualDist - targetDistM) / targetDistM;
    candidates.push({ routeData, actualDist, distError, sf });

    if (distError < convergenceThreshold) {
      break;
    }

    const ratio = targetDistM / actualDist;
    sf *= extended ? (0.6 * ratio + 0.4) : ratio;
    sf = Math.max(0.1, Math.min(3.0, sf));
  }

  if (candidates.length > 0) {
    const calibratedSf = candidates[candidates.length - 1].sf;
    const biasOffsets = bias === 'over'
      ? [1.02, 1.05, 1.10, 1.15, ...(extended ? [1.20, 1.25, 0.98] : [])]
      : [0.98, 0.95, 0.90, 0.85, ...(extended ? [0.80, 0.75, 1.02] : [])];

    const maxBias = extended ? biasOffsets.length : Math.min(4, biasOffsets.length);
    for (let i = 0; i < maxBias; i++) {
      if (candidates.length >= (extended ? 14 : 8)) {
        break;
      }

      const bsf = calibratedSf * biasOffsets[i];
      onProgress?.(`מחפש מסלול ${bias === 'over' ? 'מעל' : 'מתחת'} ליעד (${i + 1})...`);
      const waypoints = planRouteWaypoints(start, targetDistM * bsf, shelters);
      if (waypoints.length < 2) {
        continue;
      }

      const routeData = await getOSRMRoute(waypoints);
      const actualDist = getRouteDistance(routeData);
      const distError = Math.abs(actualDist - targetDistM) / targetDistM;
      if (distError < 0.50) {
        candidates.push({ routeData, actualDist, distError, sf: bsf });
      }
    }
  }

  if (extended && candidates.length > 0) {
    const bestSoFar = selectByBias(candidates, targetDistM, bias);
    const bestError = bestSoFar ? Math.abs(getRouteDistance(bestSoFar) - targetDistM) / targetDistM : 1;

    if (bestError > 0.10) {
      onProgress?.('מנסה גישות נוספות...');
      const scatterFactors = [0.3, 0.5, 0.7, 0.85, 1.0, 1.2, 1.5, 1.8];
      for (const factor of scatterFactors) {
        if (candidates.length >= 20) {
          break;
        }

        const waypoints = planRouteWaypoints(start, targetDistM * factor, shelters);
        if (waypoints.length < 2) {
          continue;
        }

        const routeData = await getOSRMRoute(waypoints);
        const actualDist = getRouteDistance(routeData);
        const distError = Math.abs(actualDist - targetDistM) / targetDistM;
        if (distError < 0.50) {
          candidates.push({ routeData, actualDist, distError, sf: factor });
        }
      }
    }
  }

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
