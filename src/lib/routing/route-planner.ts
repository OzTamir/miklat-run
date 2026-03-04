import type { LatLng, Shelter } from '@/types';
import { calcBearing, haversine } from '@/lib/geo';
import {
  ROUTING_SHARED_CONSTS,
  ROUTE_PLANNER_ATTEMPT_CONFIGS,
  ROUTE_PLANNER_CONSTS,
} from './consts';

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

function normalizeBearingDelta(delta: number): number {
  const wrapped = ((delta % ROUTING_SHARED_CONSTS.degreesInCircle) + ROUTING_SHARED_CONSTS.degreesInCircle)
    % ROUTING_SHARED_CONSTS.degreesInCircle;
  return wrapped > ROUTING_SHARED_CONSTS.halfCircleDegrees
    ? ROUTING_SHARED_CONSTS.degreesInCircle - wrapped
    : wrapped;
}

export function planRouteWaypoints(
  start: LatLng,
  targetDistM: number,
  shelters: Shelter[],
  riskFactor = 0,
): LatLng[] {
  const clampedRisk = Math.max(0, Math.min(1, riskFactor));
  const maxEdge = Math.max(
    ROUTE_PLANNER_CONSTS.maxEdgeMinM,
    Math.min(
      ROUTE_PLANNER_CONSTS.maxEdgeMaxM,
      targetDistM / ROUTE_PLANNER_CONSTS.maxEdgeTargetDivisorM,
    ),
  ) * (1 + ROUTE_PLANNER_CONSTS.riskMaxEdgeBoostRatio * clampedRisk);

  const indexedShelters: IndexedShelter[] = shelters.map((s, i) => ({
    ...s,
    idx: i,
    distToStart: haversine(start.lat, start.lng, s.lat, s.lng),
  }));

  const loopRadius = targetDistM / (2 * Math.PI * ROUTE_PLANNER_CONSTS.loopStreetDetourFactor);
  const numPoints = Math.max(
    ROUTE_PLANNER_CONSTS.loopPointsMin,
    Math.min(
      ROUTE_PLANNER_CONSTS.loopPointsMax,
      Math.round(targetDistM / ROUTE_PLANNER_CONSTS.loopPointDistanceDivisorM),
    ),
  ) - Math.round(ROUTE_PLANNER_CONSTS.riskLoopPointReduction * clampedRisk);
  const searchRadius = Math.max(
    ROUTE_PLANNER_CONSTS.shelterSearchRadiusMinM,
    loopRadius * ROUTE_PLANNER_CONSTS.shelterSearchRadiusLoopMultiplier,
  ) * (1 + ROUTE_PLANNER_CONSTS.riskSearchRadiusBoostRatio * clampedRisk);

  const allShelters = indexedShelters
    .filter((s) => s.distToStart <= searchRadius)
    .sort((a, b) => a.distToStart - b.distToStart)
    .slice(0, ROUTE_PLANNER_CONSTS.shelterCandidateLimit);

  let bestRoute: LoopResult | null = null;
  let bestScore = -1;

  for (const attempt of ROUTE_PLANNER_ATTEMPT_CONFIGS) {
    const route = tryBuildLoop(
      start,
      allShelters,
      loopRadius,
      numPoints,
      attempt.angleRad,
      maxEdge,
      targetDistM,
      attempt.ellipseRatio,
      clampedRisk,
    );

    if (route && route.score > bestScore) {
      bestScore = route.score;
      bestRoute = route;
    }
  }

  if (!bestRoute || bestRoute.waypoints.length < 3) {
    const nearby = indexedShelters
      .filter((s) => s.distToStart <= ROUTE_PLANNER_CONSTS.fallbackNearbyRadiusM)
      .sort((a, b) => a.distToStart - b.distToStart);

    if (nearby.length < 2) {
      return [{ lat: start.lat, lng: start.lng }];
    }

    const wp: LatLng[] = [{ lat: start.lat, lng: start.lng }];
    let dist = 0;
    let prev = start;

    for (const s of nearby) {
      const stepDist = haversine(prev.lat, prev.lng, s.lat, s.lng);
      const distBack = haversine(s.lat, s.lng, start.lat, start.lng);
      if (dist + stepDist + distBack > targetDistM * ROUTE_PLANNER_CONSTS.fallbackTargetShare) {
        break;
      }

      wp.push({ lat: s.lat, lng: s.lng });
      dist += stepDist;
      prev = s;
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
  ellipseRatio: number,
  riskFactor = 0,
): LoopResult | null {
  const clampedRisk = Math.max(0, Math.min(1, riskFactor));
  const DEG_PER_M_LAT = 1 / ROUTE_PLANNER_CONSTS.metersPerDegree;
  const DEG_PER_M_LNG = 1 / (
    ROUTE_PLANNER_CONSTS.metersPerDegree
    * Math.cos(start.lat * Math.PI / ROUTING_SHARED_CONSTS.halfCircleDegrees)
  );

  const rxM = radius;
  const ryM = radius * ellipseRatio;

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
  let segmentCount = 0;
  let bridgeCount = 0;
  let cumulativeBearingDelta = 0;
  let prevSegmentBearing: number | null = null;

  const appendWaypoint = (point: LatLng): void => {
    const legDist = haversine(prevPos.lat, prevPos.lng, point.lat, point.lng);
    if (legDist < ROUTE_PLANNER_CONSTS.appendWaypointMinLegM) {
      prevPos = point;
      return;
    }

    waypoints.push({ lat: point.lat, lng: point.lng });
    totalStraightDist += legDist;
    const bearing = calcBearing(prevPos.lat, prevPos.lng, point.lat, point.lng);
    if (prevSegmentBearing !== null) {
      cumulativeBearingDelta += normalizeBearingDelta(bearing - prevSegmentBearing);
    }
    prevSegmentBearing = bearing;
    prevPos = point;
    segmentCount++;
  };

  for (const ideal of idealPoints) {
    let best: IndexedShelter | null = null;
    let bestScore = Infinity;
    let bestIdealDist = Infinity;
    const idealBearing = calcBearing(prevPos.lat, prevPos.lng, ideal.lat, ideal.lng);

    for (const s of allShelters) {
      if (usedShelters.has(s.idx)) {
        continue;
      }

      const dFromPrev = haversine(prevPos.lat, prevPos.lng, s.lat, s.lng);
      if (dFromPrev > maxEdge * ROUTE_PLANNER_CONSTS.candidateFromPreviousMaxEdgeMultiplier) {
        continue;
      }

      const idealDist = haversine(ideal.lat, ideal.lng, s.lat, s.lng);
      const candidateBearing = calcBearing(prevPos.lat, prevPos.lng, s.lat, s.lng);
      const headingDelta = normalizeBearingDelta(candidateBearing - idealBearing);
      const edgeTargetPenalty = Math.abs(dFromPrev - maxEdge * ROUTE_PLANNER_CONSTS.edgeTargetRatio)
        * ROUTE_PLANNER_CONSTS.edgeTargetPenaltyWeight;
      const shortHopPenalty = dFromPrev < maxEdge * ROUTE_PLANNER_CONSTS.shortHopRatio
        ? (maxEdge * ROUTE_PLANNER_CONSTS.shortHopRatio - dFromPrev)
          * (ROUTE_PLANNER_CONSTS.shortHopPenaltyWeight + ROUTE_PLANNER_CONSTS.riskShortHopPenaltyBoost * clampedRisk)
        : 0;
      const headingPenalty = headingDelta
        * (ROUTE_PLANNER_CONSTS.headingPenaltyWeight + ROUTE_PLANNER_CONSTS.riskHeadingPenaltyBoost * clampedRisk);
      const candidateScore = idealDist
        + dFromPrev * ROUTE_PLANNER_CONSTS.candidateDistanceWeight
        + edgeTargetPenalty
        + shortHopPenalty
        + headingPenalty;

      if (candidateScore < bestScore) {
        bestScore = candidateScore;
        bestIdealDist = idealDist;
        best = s;
      }
    }

    if (best && bestIdealDist < radius * ROUTE_PLANNER_CONSTS.idealPointAcceptanceRadiusRatio) {
      const gap = haversine(prevPos.lat, prevPos.lng, best.lat, best.lng);

      if (gap > maxEdge) {
        const bridgeBearing = calcBearing(prevPos.lat, prevPos.lng, best.lat, best.lng);
        const bridged = bridgeShelters(
          prevPos,
          best,
          allShelters,
          usedShelters,
          maxEdge,
          bridgeBearing,
          clampedRisk,
        );
        for (const bs of bridged) {
          appendWaypoint({ lat: bs.lat, lng: bs.lng });
          usedShelters.add(bs.idx);
          shelterCount++;
          bridgeCount++;
        }
      }

      appendWaypoint({ lat: best.lat, lng: best.lng });
      usedShelters.add(best.idx);
      shelterCount++;
    }
  }

  const distBack = haversine(prevPos.lat, prevPos.lng, start.lat, start.lng);
  if (distBack > maxEdge) {
    const bridgeBearing = calcBearing(prevPos.lat, prevPos.lng, start.lat, start.lng);
    const bridged = bridgeShelters(
      prevPos,
      start,
      allShelters,
      usedShelters,
      maxEdge,
      bridgeBearing,
      clampedRisk,
    );
    for (const bs of bridged) {
      appendWaypoint({ lat: bs.lat, lng: bs.lng });
      usedShelters.add(bs.idx);
      shelterCount++;
      bridgeCount++;
    }
  }
  appendWaypoint({ lat: start.lat, lng: start.lng });

  const estRouteDist = totalStraightDist * ROUTE_PLANNER_CONSTS.estimatedStreetDistanceMultiplier;
  const distRatio = Math.min(estRouteDist, targetDistM) / Math.max(estRouteDist, targetDistM);
  const shelterScore = Math.min(1, shelterCount / Math.max(1, numPoints));
  const avgBearingDelta = segmentCount > 1 ? cumulativeBearingDelta / (segmentCount - 1) : 0;
  const headingSmoothness = 1 - Math.min(1, avgBearingDelta / ROUTE_PLANNER_CONSTS.headingSmoothnessDenominatorDeg);
  const bridgePenalty = Math.min(
    1,
    bridgeCount / Math.max(ROUTE_PLANNER_CONSTS.bridgePenaltyMinDivisor, numPoints / 2),
  );
  const smoothnessScore = headingSmoothness * ROUTE_PLANNER_CONSTS.smoothnessHeadingWeight
    + (1 - bridgePenalty) * ROUTE_PLANNER_CONSTS.smoothnessBridgeWeight;
  const distanceWeight = ROUTE_PLANNER_CONSTS.scoreDistanceWeight
    - (ROUTE_PLANNER_CONSTS.scoreDistanceWeight - ROUTE_PLANNER_CONSTS.riskScoreDistanceWeightMin) * clampedRisk;
  const shelterWeight = ROUTE_PLANNER_CONSTS.scoreShelterWeight
    - (ROUTE_PLANNER_CONSTS.scoreShelterWeight - ROUTE_PLANNER_CONSTS.riskScoreShelterWeightMin) * clampedRisk;
  const smoothnessWeight = ROUTE_PLANNER_CONSTS.scoreSmoothnessWeight
    + (ROUTE_PLANNER_CONSTS.riskScoreSmoothnessWeightMax - ROUTE_PLANNER_CONSTS.scoreSmoothnessWeight) * clampedRisk;
  const score = distRatio * distanceWeight
    + shelterScore * shelterWeight
    + smoothnessScore * smoothnessWeight;

  return { waypoints, score, shelterCount, estDist: estRouteDist };
}

export function bridgeShelters(
  from: LatLng,
  to: LatLng,
  allShelters: IndexedShelter[],
  usedShelters: Set<number>,
  maxEdge: number,
  preferredBearing?: number,
  riskFactor = 0,
): IndexedShelter[] {
  const clampedRisk = Math.max(0, Math.min(1, riskFactor));
  const result: IndexedShelter[] = [];
  let current = from;
  const targetDist = haversine(from.lat, from.lng, to.lat, to.lng);
  const allowedSteps = Math.max(
    1,
    ROUTE_PLANNER_CONSTS.bridgeMaxSteps
      - Math.round(ROUTE_PLANNER_CONSTS.riskBridgeStepReduction * clampedRisk),
  );
  const maxSteps = Math.min(allowedSteps, Math.ceil(targetDist / maxEdge));

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

      if (dFromCurr <= maxEdge && dFromCurr > ROUTE_PLANNER_CONSTS.bridgeMinStepDistanceM) {
        const progress = distToTarget - dToTarget;
        if (
          progress > maxEdge
          * (ROUTE_PLANNER_CONSTS.bridgeProgressMinRatio + ROUTE_PLANNER_CONSTS.riskBridgeProgressRatioBoost * clampedRisk)
        ) {
          const detour = dFromCurr + dToTarget - distToTarget;
          const stepBearing = calcBearing(current.lat, current.lng, s.lat, s.lng);
          const headingPenalty = preferredBearing === undefined
            ? 0
            : normalizeBearingDelta(stepBearing - preferredBearing) * ROUTE_PLANNER_CONSTS.bridgeHeadingPenaltyWeight;
          const score = progress - detour * ROUTE_PLANNER_CONSTS.bridgeDetourPenaltyWeight - headingPenalty;
          if (score > bestScore) {
            bestScore = score;
            best = s;
          }
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
