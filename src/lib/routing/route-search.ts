import type { LatLng, Shelter, RouteData, RouteCandidate } from '@/types';
import { calcBearing, haversine } from '@/lib/geo';
import { getOSRMRoute } from '@/lib/api';
import { planRouteWaypoints } from './route-planner';
import {
  ROUTING_SHARED_CONSTS,
  ROUTE_SEARCH_CONSTS,
  ROUTE_SEARCH_LOCAL_REFINEMENT_OFFSETS,
  ROUTE_SEARCH_SCATTER_FACTORS_EXTENDED,
  ROUTE_SEARCH_TURN_MANEUVER_TYPES,
} from './consts';

const TURN_MANEUVERS: ReadonlySet<string> = new Set<string>(ROUTE_SEARCH_TURN_MANEUVER_TYPES);

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

function normalizeBearingDelta(delta: number): number {
  const wrapped = ((delta % ROUTING_SHARED_CONSTS.degreesInCircle) + ROUTING_SHARED_CONSTS.degreesInCircle)
    % ROUTING_SHARED_CONSTS.degreesInCircle;
  return wrapped > ROUTING_SHARED_CONSTS.halfCircleDegrees
    ? ROUTING_SHARED_CONSTS.degreesInCircle - wrapped
    : wrapped;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function estimateScaleFromBounds(
  lowerBound: RouteCandidate,
  upperBound: RouteCandidate,
  targetDistM: number,
): number {
  const distSpan = upperBound.actualDist - lowerBound.actualDist;
  if (distSpan <= 1) {
    return (lowerBound.sf + upperBound.sf) / 2;
  }

  const t = (targetDistM - lowerBound.actualDist) / distSpan;
  const interpolated = lowerBound.sf + (upperBound.sf - lowerBound.sf) * t;
  const minSf = Math.min(lowerBound.sf, upperBound.sf) * ROUTE_SEARCH_CONSTS.boundsInterpolationMinFactor;
  const maxSf = Math.max(lowerBound.sf, upperBound.sf) * ROUTE_SEARCH_CONSTS.boundsInterpolationMaxFactor;
  return clamp(interpolated, minSf, maxSf);
}

function buildCandidate(
  routeData: RouteData,
  targetDistM: number,
  sf: number,
): RouteCandidate {
  const actualDist = getRouteDistance(routeData);
  const distError = Math.abs(actualDist - targetDistM) / targetDistM;

  let turnCount = 0;
  let currentContinueDist = 0;
  let longestContinueM = 0;
  let prevBearing: number | null = null;

  for (const step of routeData.steps) {
    if (!step?.maneuver || step.distance <= 0 || step.maneuver.type === 'arrive') {
      continue;
    }

    const maneuverType = step.maneuver.type.toLowerCase();
    const currBearing = step.maneuver.bearing_after;
    const bearingDelta = prevBearing === null ? 0 : normalizeBearingDelta(currBearing - prevBearing);
    const isTurn = TURN_MANEUVERS.has(maneuverType) || bearingDelta > ROUTE_SEARCH_CONSTS.turnByBearingThresholdDeg;

    if (isTurn) {
      turnCount++;
      currentContinueDist = step.distance;
    } else {
      currentContinueDist += step.distance;
    }

    if (currentContinueDist > longestContinueM) {
      longestContinueM = currentContinueDist;
    }

    prevBearing = currBearing;
  }

  const routeKm = Math.max(
    ROUTE_SEARCH_CONSTS.minRouteDistanceForTurnDensityKm,
    actualDist / ROUTING_SHARED_CONSTS.metersPerKilometer,
  );
  const turnDensity = turnCount / routeKm;
  const distanceScore = Math.max(0, 1 - distError * ROUTE_SEARCH_CONSTS.distanceScoreErrorMultiplier);
  const turnScore = 1 / (1 + turnDensity);
  const continuityTarget = Math.max(
    ROUTE_SEARCH_CONSTS.continuityTargetMinM,
    targetDistM * ROUTE_SEARCH_CONSTS.continuityTargetRatio,
  );
  const continuityScore = Math.min(1, longestContinueM / continuityTarget);
  const qualityScore = distanceScore * ROUTE_SEARCH_CONSTS.qualityDistanceWeight
    + turnScore * ROUTE_SEARCH_CONSTS.qualityTurnWeight
    + continuityScore * ROUTE_SEARCH_CONSTS.qualityContinuityWeight;

  return {
    routeData,
    actualDist,
    distError,
    sf,
    turnCount,
    turnDensity,
    longestContinueM,
    qualityScore,
  };
}

function thinUniform(points: LatLng[], maxPoints: number): LatLng[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const result: LatLng[] = [points[0]];
  const stride = (points.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.round(i * stride);
    const next = points[idx];
    const prev = result[result.length - 1];
    if (
      Math.abs(next.lat - prev.lat) > ROUTE_SEARCH_CONSTS.waypointDedupCoordEpsilonDeg
      || Math.abs(next.lng - prev.lng) > ROUTE_SEARCH_CONSTS.waypointDedupCoordEpsilonDeg
    ) {
      result.push(next);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function optimizeWaypointsForContinuity(waypoints: LatLng[], targetDistM: number): LatLng[] {
  if (waypoints.length <= ROUTE_SEARCH_CONSTS.optimizeMinWaypointCount) {
    return waypoints;
  }

  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];
  const isClosed = haversine(first.lat, first.lng, last.lat, last.lng)
    < ROUTE_SEARCH_CONSTS.closedLoopDistanceThresholdM;
  const core = isClosed ? waypoints.slice(0, -1) : [...waypoints];
  if (core.length <= ROUTE_SEARCH_CONSTS.optimizeCoreMinPoints) {
    return core;
  }

  const minGap = Math.max(
    ROUTE_SEARCH_CONSTS.optimizeMinGapM,
    targetDistM * ROUTE_SEARCH_CONSTS.optimizeMinGapTargetRatio,
  );
  const deduped: LatLng[] = [core[0]];
  for (let i = 1; i < core.length; i++) {
    const curr = core[i];
    const prev = deduped[deduped.length - 1];
    if (haversine(prev.lat, prev.lng, curr.lat, curr.lng) >= minGap || i === core.length - 1) {
      deduped.push(curr);
    }
  }
  if (deduped.length <= ROUTE_SEARCH_CONSTS.optimizeCoreMinPoints) {
    return deduped;
  }

  const minVertices = Math.max(
    ROUTE_SEARCH_CONSTS.optimizeMinVerticesBase,
    Math.round(targetDistM / ROUTE_SEARCH_CONSTS.optimizeMinVerticesDistanceDivisorM)
      + ROUTE_SEARCH_CONSTS.optimizeMinVerticesOffset,
  );
  const smoothed: LatLng[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const remaining = deduped.length - i - 1;
    const canRemove = smoothed.length + remaining >= minVertices;

    if (!canRemove) {
      smoothed.push(curr);
      continue;
    }

    const inLeg = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    const outLeg = haversine(curr.lat, curr.lng, next.lat, next.lng);
    const direct = haversine(prev.lat, prev.lng, next.lat, next.lng);
    const detour = Math.max(0, inLeg + outLeg - direct);

    const inBearing = calcBearing(prev.lat, prev.lng, curr.lat, curr.lng);
    const outBearing = calcBearing(curr.lat, curr.lng, next.lat, next.lng);
    const turnDelta = normalizeBearingDelta(outBearing - inBearing);

    const shortLeg = Math.min(inLeg, outLeg);
    const shortConnector = shortLeg < Math.max(
      ROUTE_SEARCH_CONSTS.optimizeShortConnectorMinM,
      targetDistM * ROUTE_SEARCH_CONSTS.optimizeShortConnectorTargetRatio,
    );
    const modestTurn = turnDelta < ROUTE_SEARCH_CONSTS.optimizeModestTurnMaxDeg;
    const nearStraight = turnDelta < ROUTE_SEARCH_CONSTS.optimizeNearStraightMaxDeg;
    const tinyDetour = detour < Math.max(
      ROUTE_SEARCH_CONSTS.optimizeTinyDetourMinM,
      targetDistM * ROUTE_SEARCH_CONSTS.optimizeTinyDetourTargetRatio,
    );

    if ((shortConnector && modestTurn) || (nearStraight && tinyDetour)) {
      continue;
    }

    smoothed.push(curr);
  }
  smoothed.push(deduped[deduped.length - 1]);

  const maxPoints = Math.max(
    ROUTE_SEARCH_CONSTS.optimizeThinnedMinPoints,
    Math.min(
      ROUTE_SEARCH_CONSTS.optimizeThinnedMaxPoints,
      Math.round(targetDistM / ROUTE_SEARCH_CONSTS.optimizeThinnedDistanceDivisorM)
        + ROUTE_SEARCH_CONSTS.optimizeThinnedOffset,
    ),
  );
  return thinUniform(smoothed, maxPoints);
}

export async function searchForRoutes(
  start: LatLng,
  targetDistM: number,
  extended: boolean,
  shelters: Shelter[],
  onProgress?: (message: string) => void,
): Promise<RouteCandidate[]> {
  const candidates: RouteCandidate[] = [];
  const evaluatedScaleFactors = new Set<string>();

  const pushCandidate = (candidate: RouteCandidate): void => {
    if (candidate.distError > ROUTE_SEARCH_CONSTS.maxCandidateDistanceErrorRatio) {
      return;
    }

    const duplicate = candidates.some(
      (existing) =>
        Math.abs(existing.actualDist - candidate.actualDist) < ROUTE_SEARCH_CONSTS.duplicateDistanceThresholdM
        && Math.abs(existing.sf - candidate.sf) < ROUTE_SEARCH_CONSTS.duplicateScaleFactorDelta,
    );

    if (!duplicate) {
      candidates.push(candidate);
    }
  };

  const evaluateScaleFactor = async (sf: number): Promise<RouteCandidate | null> => {
    const normalized = Math.max(ROUTE_SEARCH_CONSTS.scaleFactorMin, Math.min(ROUTE_SEARCH_CONSTS.scaleFactorMax, sf));
    const sfKey = normalized.toFixed(ROUTE_SEARCH_CONSTS.scaleFactorDedupPrecision);
    if (evaluatedScaleFactors.has(sfKey)) {
      return null;
    }

    evaluatedScaleFactors.add(sfKey);
    const rawWaypoints = planRouteWaypoints(start, targetDistM * normalized, shelters);
    const waypoints = optimizeWaypointsForContinuity(rawWaypoints, targetDistM);
    if (waypoints.length < 2) {
      return null;
    }

    const routeData = await getOSRMRoute(waypoints);
    return buildCandidate(routeData, targetDistM, normalized);
  };

  let sf: number = ROUTE_SEARCH_CONSTS.initialScaleFactor;
  let lowerBound: RouteCandidate | null = null;
  let upperBound: RouteCandidate | null = null;
  let bestErrorSeen = Infinity;
  let noImprovementStreak = 0;

  const maxCalibIters = extended
    ? ROUTE_SEARCH_CONSTS.maxCalibrationIterationsExtended
    : ROUTE_SEARCH_CONSTS.maxCalibrationIterations;
  const convergenceThreshold = extended
    ? ROUTE_SEARCH_CONSTS.convergenceErrorRatioExtended
    : ROUTE_SEARCH_CONSTS.convergenceErrorRatio;

  for (let iter = 0; iter < maxCalibIters; iter++) {
    onProgress?.(iter === 0 ? 'בונה גרף מקלטים...' : `מכייל מסלול (ניסיון ${iter + 1}/${maxCalibIters})...`);
    onProgress?.(iter === 0 ? 'מחשב מסלול רחובות...' : `מחשב מסלול (ניסיון ${iter + 1}/${maxCalibIters})...`);
    const candidate = await evaluateScaleFactor(sf);
    if (!candidate) {
      break;
    }

    pushCandidate(candidate);

    if (candidate.distError + ROUTE_SEARCH_CONSTS.improvementMargin < bestErrorSeen) {
      bestErrorSeen = candidate.distError;
      noImprovementStreak = 0;
    } else {
      noImprovementStreak++;
    }

    if (candidate.actualDist <= targetDistM) {
      if (!lowerBound || candidate.actualDist > lowerBound.actualDist) {
        lowerBound = candidate;
      }
    } else if (!upperBound || candidate.actualDist < upperBound.actualDist) {
      upperBound = candidate;
    }

    if (candidate.distError <= ROUTE_SEARCH_CONSTS.earlyExcellentErrorRatio || candidate.distError < convergenceThreshold) {
      break;
    }

    if (lowerBound && upperBound) {
      sf = estimateScaleFromBounds(lowerBound, upperBound, targetDistM);
      if (noImprovementStreak >= ROUTE_SEARCH_CONSTS.maxNoImprovementStreak) {
        break;
      }
      continue;
    }

    const ratio = targetDistM / candidate.actualDist;
    const correctionStrength = candidate.distError > ROUTE_SEARCH_CONSTS.highErrorSwitchThreshold
      ? ROUTE_SEARCH_CONSTS.correctionStrengthHighError
      : (extended ? ROUTE_SEARCH_CONSTS.correctionStrengthExtended : ROUTE_SEARCH_CONSTS.correctionStrengthDefault);
    const dampedRatio = 1 + (ratio - 1) * correctionStrength;
    const boundedRatio = clamp(dampedRatio, ROUTE_SEARCH_CONSTS.dampedRatioMin, ROUTE_SEARCH_CONSTS.dampedRatioMax);
    sf *= boundedRatio;

    if (candidate.actualDist > targetDistM * ROUTE_SEARCH_CONSTS.overshootRatioThreshold) {
      sf *= ROUTE_SEARCH_CONSTS.overshootScaleMultiplier;
    } else if (candidate.actualDist < targetDistM * ROUTE_SEARCH_CONSTS.undershootRatioThreshold) {
      sf *= ROUTE_SEARCH_CONSTS.undershootScaleMultiplier;
    }

    sf = clamp(sf, ROUTE_SEARCH_CONSTS.scaleFactorMin, ROUTE_SEARCH_CONSTS.scaleFactorMax);

    if (
      noImprovementStreak >= ROUTE_SEARCH_CONSTS.maxNoImprovementStreak
      && iter >= ROUTE_SEARCH_CONSTS.noImprovementEarlyStopMinIteration
      && bestErrorSeen < ROUTE_SEARCH_CONSTS.noImprovementEarlyStopMaxErrorRatio
    ) {
      break;
    }
  }

  if (candidates.length > 0) {
    const bestKnown = selectClosestRoute(candidates, targetDistM);
    const calibratedSf = bestKnown
      ? candidates.find((candidate) => candidate.routeData === bestKnown)?.sf ?? sf
      : candidates[candidates.length - 1].sf;

    const bestError = bestKnown
      ? Math.abs(getRouteDistance(bestKnown) - targetDistM) / targetDistM
      : 1;

    const localOffsets = extended
      ? ROUTE_SEARCH_LOCAL_REFINEMENT_OFFSETS.extended
      : ROUTE_SEARCH_LOCAL_REFINEMENT_OFFSETS.normal;

    if (bestError > ROUTE_SEARCH_CONSTS.localRefinementErrorThreshold) {
      for (let i = 0; i < localOffsets.length; i++) {
        const maxCandidates = extended
          ? ROUTE_SEARCH_CONSTS.maxCandidatesExtended
          : ROUTE_SEARCH_CONSTS.maxCandidates;
        if (candidates.length >= maxCandidates) {
          break;
        }

        onProgress?.(`מחדד מרחק יעד (${i + 1})...`);
        const candidate = await evaluateScaleFactor(calibratedSf * localOffsets[i]);
        if (candidate) {
          pushCandidate(candidate);
        }
      }
    }
  }

  if (extended && candidates.length > 0) {
    const bestSoFar = selectClosestRoute(candidates, targetDistM);
    const bestError = bestSoFar ? Math.abs(getRouteDistance(bestSoFar) - targetDistM) / targetDistM : 1;

    if (bestError > ROUTE_SEARCH_CONSTS.extendedScatterErrorThreshold) {
      onProgress?.('מנסה גישות נוספות...');
      const centerSf = bestSoFar
        ? candidates.find((candidate) => candidate.routeData === bestSoFar)?.sf ?? sf
        : sf;
      for (const factor of ROUTE_SEARCH_SCATTER_FACTORS_EXTENDED) {
        if (candidates.length >= ROUTE_SEARCH_CONSTS.maxScatterCandidates) {
          break;
        }

        const candidate = await evaluateScaleFactor(centerSf * factor);
        if (candidate) {
          pushCandidate(candidate);
        }
      }
    }
  }

  return candidates;
}

export function selectClosestRoute(
  candidates: RouteCandidate[],
  targetDistM: number,
): RouteData | null {
  if (candidates.length === 0) {
    return null;
  }

  const tieTolerance = Math.max(
    ROUTE_SEARCH_CONSTS.distanceTieToleranceMinM,
    targetDistM * ROUTE_SEARCH_CONSTS.distanceTieToleranceRatio,
  );

  const ranked = [...candidates].sort((a, b) => {
    const aErr = Math.abs(a.actualDist - targetDistM);
    const bErr = Math.abs(b.actualDist - targetDistM);

    if (Math.abs(aErr - bErr) > tieTolerance) {
      return aErr - bErr;
    }

    const aQuality = a.qualityScore ?? 0;
    const bQuality = b.qualityScore ?? 0;
    if (Math.abs(aQuality - bQuality) > ROUTE_SEARCH_CONSTS.qualityScoreEpsilon) {
      return bQuality - aQuality;
    }

    const aTurnDensity = a.turnDensity ?? Number.POSITIVE_INFINITY;
    const bTurnDensity = b.turnDensity ?? Number.POSITIVE_INFINITY;
    if (Math.abs(aTurnDensity - bTurnDensity) > ROUTE_SEARCH_CONSTS.turnDensityTieBreakEpsilon) {
      return aTurnDensity - bTurnDensity;
    }

    return aErr - bErr;
  });

  return ranked[0].routeData;
}

export interface GenerateRouteParams {
  start: LatLng;
  targetDistKm: number;
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
  const { start, targetDistKm, isRetry, shelters, onProgress } = params;
  const targetDistM = targetDistKm * ROUTING_SHARED_CONSTS.metersPerKilometer;

  onProgress?.('מחפש מקלטים בקרבת מקום...');
  const candidates = await searchForRoutes(start, targetDistM, isRetry, shelters, onProgress);
  const bestRouteData = candidates.length > 0
    ? selectClosestRoute(candidates, targetDistM)
    : null;

  if (!bestRouteData) {
    return null;
  }

  const bestDist = getRouteDistance(bestRouteData);
  const errorPct = Math.abs(bestDist - targetDistM) / targetDistM;
  const needsConfirmation = errorPct > ROUTE_SEARCH_CONSTS.acceptableErrorRatio;

  return {
    routeData: bestRouteData,
    needsConfirmation,
    bestDistKm: bestDist / ROUTING_SHARED_CONSTS.metersPerKilometer,
    errorPct,
  };
}
