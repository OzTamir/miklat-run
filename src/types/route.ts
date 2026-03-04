import type { LatLng, SafetyZone, SafetyPoint } from './geo';
import type { Shelter } from './shelter';
import type { LineString } from 'geojson';

export interface OSRMStep {
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    bearing_before: number;
    bearing_after: number;
  };
  geometry?: LineString;
}

export interface RouteData {
  geometry: LineString;
  distance: number;
  duration: number;
  waypoints: LatLng[];
  steps: OSRMStep[];
}

export interface RouteSegment {
  index: number;
  zone: SafetyZone;
  color: string;
  startCoord: LatLng;
  endCoord: LatLng;
  midCoord: LatLng;
  distance: number;
  direction: string;
  bearing: number;
  streetName: string;
  nearestShelter: Shelter | null;
  nearestShelterDist: number;
  polyCoords: [number, number][];
  safetyPoints: SafetyPoint[];
}

export interface RouteCandidate {
  routeData: RouteData;
  actualDist: number;
  distError: number;
  sf: number;
  turnCount?: number;
  turnDensity?: number;
  longestContinueM?: number;
  qualityScore?: number;
}

export type RouteMode = 'distance' | 'pace';
