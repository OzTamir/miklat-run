export interface LatLng {
  lat: number;
  lng: number;
}

export type Coordinate = LatLng;

export type SafetyZone = 'green' | 'yellow' | 'red';

export interface SafetyPoint {
  lat: number;
  lng: number;
  minDist: number;
  zone: SafetyZone;
  color: string;
}
