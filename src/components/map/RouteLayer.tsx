import { Polyline } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import type { SafetyPoint } from '@/types';

interface ColorGroup {
  color: string;
  positions: [number, number][];
}

function groupByColor(safetyPoints: SafetyPoint[]): ColorGroup[] {
  if (safetyPoints.length === 0) return [];

  const groups: ColorGroup[] = [];
  let currentColor = safetyPoints[0].color;
  let currentPositions: [number, number][] = [[safetyPoints[0].lat, safetyPoints[0].lng]];

  for (let i = 1; i < safetyPoints.length; i++) {
    const pt = safetyPoints[i];
    if (pt.color === currentColor) {
      currentPositions.push([pt.lat, pt.lng]);
    } else {
      currentPositions.push([pt.lat, pt.lng]);
      groups.push({ color: currentColor, positions: currentPositions });
      currentColor = pt.color;
      currentPositions = [[pt.lat, pt.lng]];
    }
  }

  groups.push({ color: currentColor, positions: currentPositions });
  return groups;
}

export function RouteLayer() {
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const highlightSegment = useRouteStore((s) => s.highlightSegment);

  if (computedSegments.length === 0) return null;

  return (
    <>
      {computedSegments.map((seg, segIdx) => {
        const colorGroups = groupByColor(seg.safetyPoints);
        const isHighlighted = highlightedSegmentIdx === seg.index;
        const isDimmed =
          highlightedSegmentIdx !== null && highlightedSegmentIdx !== seg.index;

        return colorGroups.map((group, groupIdx) => (
          <Polyline
            key={`seg-${segIdx}-grp-${groupIdx}`}
            positions={group.positions}
            pathOptions={{
              color: group.color,
              weight: isHighlighted ? 7 : 5,
              opacity: isDimmed ? 0.25 : isHighlighted ? 1.0 : 0.85,
              lineCap: 'round',
              lineJoin: 'round',
            }}
            eventHandlers={{ click: () => highlightSegment(seg.index) }}
          />
        ));
      })}
    </>
  );
}
