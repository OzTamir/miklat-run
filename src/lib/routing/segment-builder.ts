import type { Shelter, SafetyPoint, SafetyZone, RouteSegment, OSRMStep } from '@/types';
import { haversine, nearestShelter, calcBearing, bearingToHebrew } from '@/lib/geo';

interface MergedStep {
  name: string;
  distance: number;
  bearing: number;
}

const ZONE_COLORS: Record<SafetyZone, string> = {
  green: '#3aba6f',
  yellow: '#e8c93a',
  red: '#e85a3a',
};

/**
 * Build logical route segments from raw coordinates and OSRM steps.
 * Computes per-coordinate safety, merges small steps into logical segments,
 * and returns enriched RouteSegment objects with safety data.
 */
export function buildLogicalSegments(
  coords: [number, number][],
  steps: OSRMStep[],
  totalDist: number,
  shelters: Shelter[],
): RouteSegment[] {
  // 1. Compute safety for ALL coordinates (no sampling)
  const allSafety: SafetyPoint[] = [];
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    let minDist = Infinity;
    for (const s of shelters) {
      const d = haversine(lat, lng, s.lat, s.lng);
      if (d < minDist) minDist = d;
      if (d < 50) break;
    }

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

    allSafety.push({ lat, lng, minDist, zone, color });
  }

  // 2. Filter valid steps
  const validSteps = steps.filter(
    (s) => s.distance > 0 && s.maneuver && s.maneuver.type !== 'arrive',
  );

  // 3. Fallback if no valid steps: return single segment covering everything
  if (validSteps.length === 0) {
    const midIdx = Math.floor(allSafety.length / 2);
    const midPt = allSafety[midIdx] || allSafety[0];
    const ns = nearestShelter(midPt.lat, midPt.lng, shelters);
    return [
      {
        index: 0,
        zone: 'green',
        color: '#3aba6f',
        startCoord: allSafety[0],
        endCoord: allSafety[allSafety.length - 1],
        midCoord: midPt,
        distance: Math.round(totalDist),
        direction: '',
        bearing: 0,
        streetName: '',
        nearestShelter: ns.shelter,
        nearestShelterDist: Math.round(ns.distance),
        polyCoords: allSafety.map((p) => [p.lat, p.lng] as [number, number]),
        safetyPoints: allSafety,
      },
    ];
  }

  // 4. Merge small steps into logical segments
  const targetSegs = Math.max(6, Math.min(12, Math.round(totalDist / 800)));
  const minSegDist = totalDist / (targetSegs * 1.5);
  const mergedSteps: MergedStep[] = [];
  let accumDist = 0;
  let accumSteps: OSRMStep[] = [];

  for (let i = 0; i < validSteps.length; i++) {
    accumSteps.push(validSteps[i]);
    accumDist += validSteps[i].distance;
    const isLast = i === validSteps.length - 1;

    if (accumDist >= minSegDist || isLast) {
      const mainStep = accumSteps.reduce((a, b) =>
        a.distance > b.distance ? a : b,
      );
      mergedSteps.push({
        name: mainStep.name || '',
        distance: accumDist,
        bearing: mainStep.maneuver ? mainStep.maneuver.bearing_after : 0,
      });
      accumDist = 0;
      accumSteps = [];
    }
  }

  // 5. Assign coordinate ranges to each merged segment and build RouteSegments
  const segments: RouteSegment[] = [];
  let coordIdx = 0;

  for (let si = 0; si < mergedSteps.length; si++) {
    const ms = mergedSteps[si];
    const segStartIdx = coordIdx;
    let segDist = 0;
    const isLastSeg = si === mergedSteps.length - 1;

    if (isLastSeg) {
      coordIdx = coords.length - 1;
    } else {
      while (coordIdx < coords.length - 1) {
        const [lng1, lat1] = coords[coordIdx];
        const [lng2, lat2] = coords[coordIdx + 1];
        const d = haversine(lat1, lng1, lat2, lng2);
        segDist += d;
        coordIdx++;
        if (segDist >= ms.distance * 0.95) break;
      }
    }

    const segEndIdx = coordIdx;
    const segSafetyPoints = allSafety.slice(segStartIdx, segEndIdx + 1);

    if (segSafetyPoints.length === 0) continue;

    let actualSegDist = 0;
    for (let j = 1; j < segSafetyPoints.length; j++) {
      actualSegDist += haversine(
        segSafetyPoints[j - 1].lat,
        segSafetyPoints[j - 1].lng,
        segSafetyPoints[j].lat,
        segSafetyPoints[j].lng,
      );
    }

    const zoneCounts: Record<SafetyZone, number> = {
      green: 0,
      yellow: 0,
      red: 0,
    };
    segSafetyPoints.forEach((p) => zoneCounts[p.zone]++);
    const dominantZone = (
      Object.entries(zoneCounts) as [SafetyZone, number][]
    ).sort((a, b) => b[1] - a[1])[0][0];

    const midIdx = Math.floor(segSafetyPoints.length / 2);
    const midPt = segSafetyPoints[midIdx];
    const startPt = segSafetyPoints[0];
    const endPt = segSafetyPoints[segSafetyPoints.length - 1];

    const bearing =
      ms.bearing ||
      calcBearing(startPt.lat, startPt.lng, endPt.lat, endPt.lng);

    const ns = nearestShelter(midPt.lat, midPt.lng, shelters);

    segments.push({
      index: si,
      zone: dominantZone,
      color: ZONE_COLORS[dominantZone],
      startCoord: { lat: startPt.lat, lng: startPt.lng },
      endCoord: { lat: endPt.lat, lng: endPt.lng },
      midCoord: { lat: midPt.lat, lng: midPt.lng },
      distance: Math.round(actualSegDist),
      direction: bearingToHebrew(bearing),
      bearing,
      streetName: ms.name,
      nearestShelter: ns.shelter,
      nearestShelterDist: Math.round(ns.distance),
      polyCoords: segSafetyPoints.map(
        (p) => [p.lat, p.lng] as [number, number],
      ),
      safetyPoints: segSafetyPoints,
    });
  }

  return segments;
}
