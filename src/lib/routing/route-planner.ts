import type { LatLng, Shelter } from '@/types';
import { haversine } from '@/lib/geo';

interface IndexedShelter extends Shelter {
  idx: number;
  distToStart: number;
}

interface LoopResult {
  waypoints: LatLng[];
  score: number;
  shelterCount: number;
  estDist: number;
}

export function planRouteWaypoints(start: LatLng, targetDistM: number, shelters: Shelter[]): LatLng[] {
  const MAX_EDGE = targetDistM < 5000 ? 800 : 450;

  const allShelters: IndexedShelter[] = shelters.map((s, i) => ({
    ...s,
    idx: i,
    distToStart: haversine(start.lat, start.lng, s.lat, s.lng),
  }));

  const loopRadius = targetDistM / (2 * Math.PI * 1.4);
  const numPoints = Math.max(4, Math.min(16, Math.round(targetDistM / 500)));

  let bestRoute: LoopResult | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 10; attempt++) {
    const angle = (attempt / 10) * Math.PI * 2 + Math.random() * 0.3;
    const route = tryBuildLoop(start, allShelters, loopRadius, numPoints, angle, MAX_EDGE, targetDistM);

    if (route && route.score > bestScore) {
      bestScore = route.score;
      bestRoute = route;
    }
  }

  if (!bestRoute || bestRoute.waypoints.length < 3) {
    const nearby = allShelters
      .filter((s) => s.distToStart <= 2000)
      .sort((a, b) => a.distToStart - b.distToStart);

    if (nearby.length < 2) {
      return [{ lat: start.lat, lng: start.lng }];
    }

    const wp: LatLng[] = [{ lat: start.lat, lng: start.lng }];
    let dist = 0;

    for (const s of nearby) {
      wp.push({ lat: s.lat, lng: s.lng });
      dist += s.distToStart;
      if (dist >= targetDistM * 0.4) {
        break;
      }
    }

    wp.push({ lat: start.lat, lng: start.lng });
    return wp;
  }

  return bestRoute.waypoints;
}

export function tryBuildLoop(
  start: LatLng,
  allShelters: IndexedShelter[],
  radius: number,
  numPoints: number,
  angle: number,
  maxEdge: number,
  targetDistM: number,
): LoopResult | null {
  const DEG_PER_M_LAT = 1 / 111320;
  const DEG_PER_M_LNG = 1 / (111320 * Math.cos(start.lat * Math.PI / 180));

  const rxM = radius;
  const ryM = radius * (0.6 + Math.random() * 0.6);

  const idealPoints: LatLng[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2;
    const px = Math.cos(t) * rxM;
    const py = Math.sin(t) * ryM;
    const rx = px * Math.cos(angle) - py * Math.sin(angle);
    const ry = px * Math.sin(angle) + py * Math.cos(angle);
    idealPoints.push({
      lat: start.lat + ry * DEG_PER_M_LAT,
      lng: start.lng + rx * DEG_PER_M_LNG,
    });
  }

  const usedShelters = new Set<number>();
  const waypoints: LatLng[] = [{ lat: start.lat, lng: start.lng }];
  let totalStraightDist = 0;
  let prevPos = start;
  let shelterCount = 0;

  for (const ideal of idealPoints) {
    let best: IndexedShelter | null = null;
    let bestDist = Infinity;

    for (const s of allShelters) {
      if (usedShelters.has(s.idx)) {
        continue;
      }

      const d = haversine(ideal.lat, ideal.lng, s.lat, s.lng);
      const dFromPrev = haversine(prevPos.lat, prevPos.lng, s.lat, s.lng);
      if (d < bestDist && dFromPrev < maxEdge * 3) {
        bestDist = d;
        best = s;
      }
    }

    if (best && bestDist < radius * 0.8) {
      const gap = haversine(prevPos.lat, prevPos.lng, best.lat, best.lng);

      if (gap > maxEdge) {
        const bridged = bridgeShelters(prevPos, best, allShelters, usedShelters, maxEdge);
        for (const bs of bridged) {
          waypoints.push({ lat: bs.lat, lng: bs.lng });
          totalStraightDist += haversine(prevPos.lat, prevPos.lng, bs.lat, bs.lng);
          prevPos = bs;
          usedShelters.add(bs.idx);
          shelterCount++;
        }
      }

      waypoints.push({ lat: best.lat, lng: best.lng });
      totalStraightDist += haversine(prevPos.lat, prevPos.lng, best.lat, best.lng);
      prevPos = best;
      usedShelters.add(best.idx);
      shelterCount++;
    }
  }

  const distBack = haversine(prevPos.lat, prevPos.lng, start.lat, start.lng);
  if (distBack > maxEdge) {
    const bridged = bridgeShelters(prevPos, start, allShelters, usedShelters, maxEdge);
    for (const bs of bridged) {
      waypoints.push({ lat: bs.lat, lng: bs.lng });
      usedShelters.add(bs.idx);
    }
  }
  waypoints.push({ lat: start.lat, lng: start.lng });

  const estRouteDist = totalStraightDist * 1.4;
  const distRatio = Math.min(estRouteDist, targetDistM) / Math.max(estRouteDist, targetDistM);
  const score = shelterCount * 0.15 + distRatio * 0.85;

  return { waypoints, score, shelterCount, estDist: estRouteDist };
}

export function bridgeShelters(
  from: LatLng,
  to: LatLng,
  allShelters: IndexedShelter[],
  usedShelters: Set<number>,
  maxEdge: number,
): IndexedShelter[] {
  const result: IndexedShelter[] = [];
  let current = from;
  const targetDist = haversine(from.lat, from.lng, to.lat, to.lng);
  const maxSteps = Math.min(5, Math.ceil(targetDist / maxEdge));

  for (let step = 0; step < maxSteps; step++) {
    const distToTarget = haversine(current.lat, current.lng, to.lat, to.lng);
    if (distToTarget <= maxEdge) {
      break;
    }

    let best: IndexedShelter | null = null;
    let bestScore = -Infinity;

    for (const s of allShelters) {
      if (usedShelters.has(s.idx)) {
        continue;
      }

      const dFromCurr = haversine(current.lat, current.lng, s.lat, s.lng);
      const dToTarget = haversine(s.lat, s.lng, to.lat, to.lng);

      if (dFromCurr <= maxEdge && dFromCurr > 30) {
         const progress = distToTarget - dToTarget;
         if (progress > bestScore) {
           bestScore = progress;
           best = s;
         }
       }
     }

     if (!best) {
      break;
    }
    result.push(best);
    usedShelters.add(best.idx);
    current = best;
  }

   return result;
}

export function scaleWaypoints(start: LatLng, waypoints: LatLng[], factor: number): LatLng[] {
  return waypoints.map(wp => {
    // If this waypoint IS the start point, keep it unchanged
    if (Math.abs(wp.lat - start.lat) < 0.000001 && Math.abs(wp.lng - start.lng) < 0.000001) {
      return wp;
    }
    return {
      lat: start.lat + (wp.lat - start.lat) * factor,
      lng: start.lng + (wp.lng - start.lng) * factor,
    };
  });
}
