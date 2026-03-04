import type { Shelter, SafetyPoint, SafetyZone, RouteSegment, OSRMStep } from '@/types';
import {
  haversine,
  nearestShelter,
  calcBearing,
  bearingToHebrew,
  buildGrid,
  nearestShelterDist,
} from '@/lib/geo';
import {
  SAFETY_THRESHOLDS_M,
  SAFETY_ZONE_COLORS,
  SEGMENT_BUILDER_CONSTS,
} from './consts';

interface MergedStep {
  name: string;
  distance: number;
  bearing: number;
}

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
  const shelterGrid = shelters.length > 0 ? buildGrid(shelters) : null;

  // 1. Compute safety for ALL coordinates (no sampling)
  const allSafety: SafetyPoint[] = [];
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    let minDist = shelterGrid ? nearestShelterDist(lat, lng, shelterGrid) : Infinity;

    // Fallback when the nearby grid cells are empty.
    if (!Number.isFinite(minDist)) {
      for (const s of shelters) {
        const d = haversine(lat, lng, s.lat, s.lng);
        if (d < minDist) minDist = d;
        if (d < SAFETY_THRESHOLDS_M.veryCloseBreak) break;
      }
    }

    let zone: SafetyZone;
    if (minDist <= SAFETY_THRESHOLDS_M.greenMax) {
      zone = 'green';
    } else if (minDist <= SAFETY_THRESHOLDS_M.yellowMax) {
      zone = 'yellow';
    } else {
      zone = 'red';
    }

    const color = SAFETY_ZONE_COLORS[zone];
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
        color: SAFETY_ZONE_COLORS.green,
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
  const targetSegs = Math.max(
    SEGMENT_BUILDER_CONSTS.targetSegmentsMin,
    Math.min(
      SEGMENT_BUILDER_CONSTS.targetSegmentsMax,
      Math.round(totalDist / SEGMENT_BUILDER_CONSTS.targetSegmentDistanceDivisorM),
    ),
  );
  const minSegDist = totalDist / (targetSegs * SEGMENT_BUILDER_CONSTS.minSegmentDistanceSlackFactor);
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
        if (segDist >= ms.distance * SEGMENT_BUILDER_CONSTS.stepToGeometryCoverageRatio) break;
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
      color: SAFETY_ZONE_COLORS[dominantZone],
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
