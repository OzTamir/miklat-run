import { useEffect, useRef } from 'react';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
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

const DASH = 4;
const GAP = 20;
const PATTERN = DASH + GAP;
const SPEED_PX_PER_S = 40;

function AnimatedSegmentOverlay() {
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const polylineRef = useRef<L.Polyline>(null);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    let frameId: number;
    const animate = (time: number) => {
      const offset = -((time * SPEED_PX_PER_S) / 1000) % PATTERN;
      const el = polyline.getElement();
      if (el) el.setAttribute('stroke-dashoffset', String(offset));
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [highlightedSegmentIdx]);

  if (highlightedSegmentIdx === null) return null;

  const seg = computedSegments.find((s) => s.index === highlightedSegmentIdx);
  if (!seg) return null;

  return (
    <Polyline
      ref={polylineRef}
      key={`animated-overlay-${highlightedSegmentIdx}`}
      positions={seg.polyCoords}
      pathOptions={{
        color: '#ffffff',
        weight: 4,
        opacity: 0.55,
        dashArray: `${DASH} ${GAP}`,
        lineCap: 'round',
        lineJoin: 'round',
      }}
      interactive={false}
    />
  );
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
      <AnimatedSegmentOverlay />
    </>
  );
}
