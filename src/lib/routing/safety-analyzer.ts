import type { Shelter, SafetyPoint, SafetyZone, RouteSegment } from '@/types';
import { buildGrid, nearestShelterDist } from '@/lib/geo';
import {
  ROUTING_SHARED_CONSTS,
  SAFETY_ANALYZER_CONSTS,
  SAFETY_THRESHOLDS_M,
  SAFETY_ZONE_COLORS,
} from './consts';

/**
 * Analyze route safety by sampling coordinates and computing nearest shelter distance.
 * Uses a spatial grid index for fast lookups.
 */
export function analyzeRouteSafety(
  coords: [number, number][],
  shelters: Shelter[],
): SafetyPoint[] {
  const grid = buildGrid(shelters);
  const step = Math.max(1, Math.floor(coords.length / SAFETY_ANALYZER_CONSTS.maxSamplePoints));
  const points: SafetyPoint[] = [];

  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i];
    const minDist = nearestShelterDist(lat, lng, grid);

    let zone: SafetyZone;
    if (minDist <= SAFETY_THRESHOLDS_M.greenMax) {
      zone = 'green';
    } else if (minDist <= SAFETY_THRESHOLDS_M.yellowMax) {
      zone = 'yellow';
    } else {
      zone = 'red';
    }

    const color = SAFETY_ZONE_COLORS[zone];
    points.push({ lat, lng, minDist, zone, color });
  }

  return points;
}

/**
 * Compute aggregate safety statistics across all route segments.
 * Returns percentage of route that is safe (green+yellow), green-only, and yellow-only.
 */
export function computeSafetyStats(
  segments: RouteSegment[],
): { safePercent: number; greenPercent: number; yellowPercent: number } {
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  segments.forEach((seg) => {
    seg.safetyPoints.forEach((sp) => {
      if (sp.zone === 'green') greenCount++;
      else if (sp.zone === 'yellow') yellowCount++;
      else redCount++;
    });
  });

  const total = greenCount + yellowCount + redCount || 1;
  const safePercent = Math.round(
    ((greenCount + yellowCount) / total) * ROUTING_SHARED_CONSTS.percentScale,
  );
  const greenPercent = Math.round(
    (greenCount / total) * ROUTING_SHARED_CONSTS.percentScale,
  );
  const yellowPercent = Math.round(
    (yellowCount / total) * ROUTING_SHARED_CONSTS.percentScale,
  );

  return { safePercent, greenPercent, yellowPercent };
}
