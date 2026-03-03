import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';

function createSegIcon(index: number): L.DivIcon {
  return L.divIcon({
    className: 'seg-number-marker',
    html: `<span>${index + 1}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function SegmentMarkers() {
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const highlightSegment = useRouteStore((s) => s.highlightSegment);

  if (computedSegments.length === 0) return null;

  return (
    <>
      {computedSegments.map((seg, idx) => {
        const isVisible =
          highlightedSegmentIdx === null || highlightedSegmentIdx === seg.index;

        if (!isVisible) return null;

        return (
          <Marker
            key={`seg-marker-${idx}`}
            position={[seg.midCoord.lat, seg.midCoord.lng]}
            icon={createSegIcon(idx)}
            eventHandlers={{ click: () => highlightSegment(seg.index) }}
          />
        );
      })}
    </>
  );
}
