import { describe, expect, it } from 'vitest';

import type { RouteData } from '@/types';
import { buildRouteGpx, makeGpxFilename } from './gpx';

const routeData: RouteData = {
  geometry: {
    type: 'LineString',
    coordinates: [
      [34.7818, 32.0853],
      [34.79, 32.09, 7],
    ],
  },
  distance: 1200,
  duration: 700,
  waypoints: [],
  steps: [],
};

describe('buildRouteGpx', () => {
  it('serializes coordinates as lat/lon track points', () => {
    const gpx = buildRouteGpx(routeData, {
      trackName: 'Route & Test',
      generatedAt: new Date('2026-03-04T08:00:00.000Z'),
    });

    expect(gpx).toContain('<name>Route &amp; Test</name>');
    expect(gpx).toContain('<trkpt lat="32.085300" lon="34.781800" />');
    expect(gpx).toContain('<trkpt lat="32.090000" lon="34.790000"><ele>7</ele></trkpt>');
    expect(gpx).toContain('<time>2026-03-04T08:00:00.000Z</time>');
  });

  it('throws when no geometry points exist', () => {
    expect(() => buildRouteGpx({
      ...routeData,
      geometry: { type: 'LineString', coordinates: [] },
    })).toThrow('לא נמצאו נקודות למסלול');
  });
});

describe('makeGpxFilename', () => {
  it('builds deterministic filename from ISO timestamp', () => {
    const filename = makeGpxFilename(new Date('2026-03-04T08:00:00.000Z'));
    expect(filename).toBe('miklat-route-2026-03-04T08-00-00Z.gpx');
  });
});
