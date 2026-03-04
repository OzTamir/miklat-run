import type { RouteData } from '@/types';

const DEFAULT_TRACK_NAME = 'Miklat Run Route';
const GPX_CREATOR = 'Miklat Run';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatCoord(value: number): string {
  return value.toFixed(6);
}

export function buildRouteGpx(
  routeData: RouteData,
  options?: { trackName?: string; generatedAt?: Date },
): string {
  const coords = routeData.geometry.coordinates;
  if (!coords.length) {
    throw new Error('לא נמצאו נקודות למסלול');
  }

  const safeTrackName = escapeXml(options?.trackName ?? DEFAULT_TRACK_NAME);
  const generatedAtIso = (options?.generatedAt ?? new Date()).toISOString();

  const trackPoints = coords
    .map((coord) => {
      const [lng, lat, ele] = coord;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const latText = formatCoord(lat);
      const lngText = formatCoord(lng);
      const eleText = Number.isFinite(ele) ? `<ele>${ele}</ele>` : '';
      return eleText.length > 0
        ? `<trkpt lat="${latText}" lon="${lngText}">${eleText}</trkpt>`
        : `<trkpt lat="${latText}" lon="${lngText}" />`;
    })
    .filter((trkpt): trkpt is string => trkpt !== null);

  if (!trackPoints.length) {
    throw new Error('לא נמצאו נקודות תקינות למסלול');
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="' + GPX_CREATOR + '" xmlns="http://www.topografix.com/GPX/1/1">',
    '<metadata>',
    `<name>${safeTrackName}</name>`,
    `<time>${generatedAtIso}</time>`,
    '</metadata>',
    '<trk>',
    `<name>${safeTrackName}</name>`,
    '<trkseg>',
    ...trackPoints,
    '</trkseg>',
    '</trk>',
    '</gpx>',
  ].join('\n');
}

export function makeGpxFilename(date: Date = new Date()): string {
  const iso = date.toISOString().replace(/\.\d{3}Z$/, 'Z').replaceAll(':', '-');
  return `miklat-route-${iso}.gpx`;
}

export function downloadRouteAsGpx(
  routeData: RouteData,
  options?: { trackName?: string; generatedAt?: Date; filename?: string },
): void {
  const gpx = buildRouteGpx(routeData, options);
  const blob = new Blob([gpx], { type: 'application/gpx+xml;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options?.filename ?? makeGpxFilename(options?.generatedAt);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
