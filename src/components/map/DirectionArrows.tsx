import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';
import { calcBearing } from '@/lib/geo';

function createArrowIcon(bearing: number): L.DivIcon {
  return L.divIcon({
    className: 'route-arrow',
    html: `<span style="transform:rotate(${Math.round(bearing)}deg)">▲</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function getArrowPositions(
  polyCoords: [number, number][],
  count: number,
): { lat: number; lng: number; bearing: number }[] {
  if (polyCoords.length < 2) return [];

  const positions: { lat: number; lng: number; bearing: number }[] = [];
  const totalPoints = polyCoords.length;

  for (let i = 0; i < count; i++) {
    const fraction = (i + 1) / (count + 1);
    const idx = Math.min(
      Math.floor(fraction * totalPoints),
      totalPoints - 2,
    );

    const [lat1, lng1] = polyCoords[idx];
    const [lat2, lng2] = polyCoords[Math.min(idx + 1, totalPoints - 1)];
    const bearing = calcBearing(lat1, lng1, lat2, lng2);

    const lat = (lat1 + lat2) / 2;
    const lng = (lng1 + lng2) / 2;

    positions.push({ lat, lng, bearing });
  }

  return positions;
}

export function DirectionArrows() {
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);

  if (computedSegments.length === 0) return null;

  return (
    <>
      {computedSegments.map((seg, segIdx) => {
        const isVisible =
          highlightedSegmentIdx === null || highlightedSegmentIdx === segIdx;

        if (!isVisible) return null;

        const arrows = getArrowPositions(seg.polyCoords, 3);

        return arrows.map((arrow, arrowIdx) => (
          <Marker
            key={`arrow-${segIdx}-${arrowIdx}`}
            position={[arrow.lat, arrow.lng]}
            icon={createArrowIcon(arrow.bearing)}
            interactive={false}
          />
        ));
      })}
    </>
  );
}
