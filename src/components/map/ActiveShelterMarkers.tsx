import { useMemo } from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import { buildGrid, haversine } from '@/lib/geo';
import { ShelterPopup } from './ShelterMarkers';

const ACTIVE_RANGE_M = 250;
const GRID_SIZE = 0.003;

export function ActiveShelterMarkers() {
  const shelters = useRouteStore((s) => s.shelters);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);

  const activeShelters = useMemo(() => {
    if (computedSegments.length === 0) return [];

    const routeCoords: [number, number][] =
      highlightedSegmentIdx !== null
        ? (() => {
            const seg = computedSegments.find(
              (s) => s.index === highlightedSegmentIdx,
            );
            return seg ? seg.polyCoords : [];
          })()
        : computedSegments.flatMap((seg) => seg.polyCoords);

    if (routeCoords.length === 0) return [];

    const shelterGrid = buildGrid(shelters);
    const activeIds = new Set<number>();

    for (const [lat, lng] of routeCoords) {
      const gx = Math.floor(lng / GRID_SIZE);
      const gy = Math.floor(lat / GRID_SIZE);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = shelterGrid.get(`${gx + dx},${gy + dy}`);
          if (!cell) continue;
          for (const s of cell) {
            if (activeIds.has(s.id)) continue;
            if (haversine(lat, lng, s.lat, s.lng) <= ACTIVE_RANGE_M) {
              activeIds.add(s.id);
            }
          }
        }
      }
    }

    return shelters.filter((s) => activeIds.has(s.id));
  }, [shelters, computedSegments, highlightedSegmentIdx]);

  if (computedSegments.length === 0) return null;

  return (
    <>
      {activeShelters.map((s) => (
        <CircleMarker
          key={`active-${s.id}`}
          center={[s.lat, s.lng]}
          radius={8}
          fillColor="#e8913a"
          fillOpacity={1}
          color="#fff"
          weight={2}
        >
          <Popup>
            <ShelterPopup shelter={s} />
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
