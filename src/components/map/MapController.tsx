import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';

const PADDING = 40;
const OVERVIEW_WIDTH_PX = 320;
const MD_BREAKPOINT = 768;
const MAX_SEGMENT_ZOOM = 17;

function isMobile() {
  return window.innerWidth < MD_BREAKPOINT;
}

function getFitBoundsPadding(overviewVisible: boolean): L.FitBoundsOptions {
  const base: L.FitBoundsOptions = { maxZoom: MAX_SEGMENT_ZOOM };

  if (!overviewVisible) {
    return { ...base, padding: [PADDING, PADDING] };
  }

  if (isMobile()) {
    const bottomSheetPx = window.innerHeight * 0.5;
    return {
      ...base,
      paddingTopLeft: [PADDING, PADDING],
      paddingBottomRight: [PADDING, bottomSheetPx + PADDING],
    };
  }

  return {
    ...base,
    paddingTopLeft: [OVERVIEW_WIDTH_PX + PADDING, PADDING],
    paddingBottomRight: [PADDING, PADDING],
  };
}

export function MapController() {
  const map = useMap();
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const overviewVisible = useRouteStore((s) => s.overviewVisible);
  const prevStartRef = useRef(startLatLng);
  const prevHighlightRef = useRef<number | null>(null);

  useEffect(() => {
    if (startLatLng && startLatLng !== prevStartRef.current) {
      map.flyTo([startLatLng.lat, startLatLng.lng], 15);
    }
    prevStartRef.current = startLatLng;
  }, [map, startLatLng]);

  useEffect(() => {
    if (computedSegments.length === 0) return;

    const allCoords: [number, number][] = computedSegments.flatMap(
      (seg) => seg.polyCoords,
    );
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, getFitBoundsPadding(overviewVisible));
    }
  }, [map, computedSegments, overviewVisible]);

  useEffect(() => {
    if (highlightedSegmentIdx === null) {
      prevHighlightRef.current = null;
      return;
    }
    if (computedSegments.length === 0) return;
    if (highlightedSegmentIdx === prevHighlightRef.current) return;
    prevHighlightRef.current = highlightedSegmentIdx;

    const segment = computedSegments.find(
      (s) => s.index === highlightedSegmentIdx,
    );
    if (!segment) return;

    const coords = segment.polyCoords;
    if (coords.length >= 2) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, getFitBoundsPadding(overviewVisible));
    } else {
      map.setView([segment.midCoord.lat, segment.midCoord.lng], 17);
    }
  }, [map, highlightedSegmentIdx, computedSegments, overviewVisible]);

  return null;
}
