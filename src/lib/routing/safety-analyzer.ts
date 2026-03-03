import type { Shelter, SafetyPoint, SafetyZone, RouteSegment } from '@/types';
import { buildGrid, nearestShelterDist } from '@/lib/geo';

/**
 * Analyze route safety by sampling coordinates and computing nearest shelter distance.
 * Uses a spatial grid index for fast lookups.
 */
export function analyzeRouteSafety(
  coords: [number, number][],
  shelters: Shelter[],
): SafetyPoint[] {
  const grid = buildGrid(shelters);
  const step = Math.max(1, Math.floor(coords.length / 500));
  const points: SafetyPoint[] = [];

  for (let i = 0; i < coords.length; i += step) {
    const [lng, lat] = coords[i];
    const minDist = nearestShelterDist(lat, lng, grid);

    let zone: SafetyZone;
    let color: string;
    if (minDist <= 150) {
      zone = 'green';
      color = '#3aba6f';
    } else if (minDist <= 250) {
      zone = 'yellow';
      color = '#e8c93a';
    } else {
      zone = 'red';
      color = '#e85a3a';
    }

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
  const safePercent = Math.round(((greenCount + yellowCount) / total) * 100);
  const greenPercent = Math.round((greenCount / total) * 100);
  const yellowPercent = Math.round((yellowCount / total) * 100);

  return { safePercent, greenPercent, yellowPercent };
}
