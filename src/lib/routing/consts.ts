import type { SafetyZone } from '@/types';

export const ROUTING_SHARED_CONSTS = {
  degreesInCircle: 360,
  halfCircleDegrees: 180,
  metersPerKilometer: 1000,
  secondsPerMinute: 60,
  percentScale: 100,
} as const;

export const RISK_TOLERANCE_CONSTS = {
  minAllowedAvgShelterTimeSec: 60,
  maxAllowedAvgShelterTimeSec: 210,
  defaultAllowedAvgShelterTimeSec: 120,
  sliderStepSec: 15,
  shelterApproachSpeedMps: 2.4,
} as const;

export const SAFETY_ZONE_COLORS: Record<SafetyZone, string> = {
  green: '#3aba6f',
  yellow: '#e8c93a',
  red: '#e85a3a',
};

export const SAFETY_THRESHOLDS_M = {
  greenMax: 150,
  yellowMax: 250,
  veryCloseBreak: 50,
} as const;

export const SEGMENT_BUILDER_CONSTS = {
  targetSegmentsMin: 6,
  targetSegmentsMax: 12,
  targetSegmentDistanceDivisorM: 800,
  minSegmentDistanceSlackFactor: 1.5,
  stepToGeometryCoverageRatio: 0.95,
} as const;

export const SAFETY_ANALYZER_CONSTS = {
  maxSamplePoints: 500,
} as const;

export const ROUTE_PLANNER_CONSTS = {
  metersPerDegree: 111_320,
  loopStreetDetourFactor: 1.4,
  maxEdgeMinM: 520,
  maxEdgeMaxM: 1300,
  maxEdgeTargetDivisorM: 5,
  loopPointsMin: 4,
  loopPointsMax: 8,
  loopPointDistanceDivisorM: 1000,
  shelterSearchRadiusMinM: 1400,
  shelterSearchRadiusLoopMultiplier: 2.05,
  shelterCandidateLimit: 200,
  fallbackNearbyRadiusM: 2000,
  fallbackTargetShare: 0.55,
  appendWaypointMinLegM: 1,
  candidateFromPreviousMaxEdgeMultiplier: 1.9,
  edgeTargetRatio: 0.78,
  edgeTargetPenaltyWeight: 0.18,
  shortHopRatio: 0.45,
  shortHopPenaltyWeight: 0.7,
  headingPenaltyWeight: 2.6,
  candidateDistanceWeight: 0.21,
  idealPointAcceptanceRadiusRatio: 0.82,
  estimatedStreetDistanceMultiplier: 1.26,
  headingSmoothnessDenominatorDeg: 70,
  bridgePenaltyMinDivisor: 2,
  smoothnessHeadingWeight: 0.65,
  smoothnessBridgeWeight: 0.35,
  scoreDistanceWeight: 0.62,
  scoreShelterWeight: 0.14,
  scoreSmoothnessWeight: 0.24,
  bridgeMaxSteps: 3,
  bridgeMinStepDistanceM: 30,
  bridgeProgressMinRatio: 0.14,
  bridgeDetourPenaltyWeight: 1.35,
  bridgeHeadingPenaltyWeight: 2.4,
  riskMaxEdgeBoostRatio: 0.42,
  riskLoopPointReduction: 2,
  riskSearchRadiusBoostRatio: 0.22,
  riskShortHopPenaltyBoost: 0.5,
  riskHeadingPenaltyBoost: 1.0,
  riskBridgeStepReduction: 2,
  riskBridgeProgressRatioBoost: 0.16,
  riskScoreDistanceWeightMin: 0.58,
  riskScoreShelterWeightMin: 0.04,
  riskScoreSmoothnessWeightMax: 0.38,
} as const;

export const ROUTE_PLANNER_ATTEMPT_CONFIGS: ReadonlyArray<{
  angleRad: number;
  ellipseRatio: number;
}> = [
  { angleRad: 0, ellipseRatio: 0.78 },
  { angleRad: Math.PI / 3, ellipseRatio: 0.92 },
  { angleRad: (2 * Math.PI) / 3, ellipseRatio: 1.0 },
  { angleRad: Math.PI, ellipseRatio: 0.86 },
  { angleRad: (4 * Math.PI) / 3, ellipseRatio: 0.72 },
  { angleRad: (5 * Math.PI) / 3, ellipseRatio: 1.08 },
] as const;

export const ROUTE_SEARCH_CONSTS = {
  acceptableErrorRatio: 0.15,
  earlyExcellentErrorRatio: 0.03,
  maxCandidateDistanceErrorRatio: 0.32,
  qualityScoreEpsilon: 0.015,
  distanceTieToleranceMinM: 35,
  distanceTieToleranceRatio: 0.025,
  duplicateDistanceThresholdM: 45,
  duplicateScaleFactorDelta: 0.015,
  scaleFactorMin: 0.12,
  scaleFactorMax: 2.4,
  scaleFactorDedupPrecision: 3,
  turnByBearingThresholdDeg: 34,
  minRouteDistanceForTurnDensityKm: 0.2,
  distanceScoreErrorMultiplier: 1.2,
  continuityTargetMinM: 800,
  continuityTargetRatio: 0.26,
  qualityDistanceWeight: 0.5,
  qualityTurnWeight: 0.3,
  qualityContinuityWeight: 0.2,
  boundsInterpolationMinFactor: 0.9,
  boundsInterpolationMaxFactor: 1.1,
  waypointDedupCoordEpsilonDeg: 0.00001,
  optimizeMinWaypointCount: 4,
  closedLoopDistanceThresholdM: 5,
  optimizeCoreMinPoints: 3,
  optimizeMinGapM: 85,
  optimizeMinGapTargetRatio: 0.014,
  optimizeMinVerticesBase: 4,
  optimizeMinVerticesDistanceDivisorM: 1700,
  optimizeMinVerticesOffset: 2,
  optimizeShortConnectorMinM: 120,
  optimizeShortConnectorTargetRatio: 0.018,
  optimizeModestTurnMaxDeg: 72,
  optimizeNearStraightMaxDeg: 30,
  optimizeTinyDetourMinM: 45,
  optimizeTinyDetourTargetRatio: 0.008,
  optimizeThinnedMinPoints: 6,
  optimizeThinnedMaxPoints: 9,
  optimizeThinnedDistanceDivisorM: 1100,
  optimizeThinnedOffset: 3,
  maxCalibrationIterations: 4,
  maxCalibrationIterationsExtended: 6,
  convergenceErrorRatio: 0.07,
  convergenceErrorRatioExtended: 0.05,
  improvementMargin: 0.005,
  maxNoImprovementStreak: 2,
  noImprovementEarlyStopMinIteration: 2,
  noImprovementEarlyStopMaxErrorRatio: 0.14,
  correctionStrengthHighError: 0.86,
  correctionStrengthDefault: 0.8,
  correctionStrengthExtended: 0.76,
  highErrorSwitchThreshold: 0.2,
  dampedRatioMin: 0.5,
  dampedRatioMax: 1.6,
  overshootRatioThreshold: 1.6,
  overshootScaleMultiplier: 0.84,
  undershootRatioThreshold: 0.62,
  undershootScaleMultiplier: 1.15,
  localRefinementErrorThreshold: 0.03,
  maxCandidates: 6,
  maxCandidatesExtended: 10,
  extendedScatterErrorThreshold: 0.08,
  maxScatterCandidates: 12,
  turnDensityTieBreakEpsilon: 0.01,
  initialScaleFactor: 1.0,
  riskQualityDistanceWeightMin: 0.42,
  riskQualityTurnWeightMax: 0.38,
  riskQualityContinuityWeightMax: 0.2,
  riskMinGapBoostRatio: 0.45,
  riskMinVerticesReduction: 2,
  riskModestTurnBoostDeg: 26,
  riskNearStraightBoostDeg: 10,
  riskMaxPointsReduction: 2,
  riskTieToleranceBoostRatio: 0.45,
} as const;

export const ROUTE_SEARCH_TURN_MANEUVER_TYPES = [
  'turn',
  'fork',
  'roundabout',
  'rotary',
  'end of road',
  'on ramp',
  'off ramp',
  'use lane',
  'uturn',
] as const;

export const ROUTE_SEARCH_LOCAL_REFINEMENT_OFFSETS = {
  normal: [0.985, 1.015, 0.97, 1.03],
  extended: [0.985, 1.015, 0.97, 1.03, 0.955, 1.045],
} as const;

export const ROUTE_SEARCH_SCATTER_FACTORS_EXTENDED = [0.94, 0.98, 1.02, 1.06] as const;
