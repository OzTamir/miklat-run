import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';

export function MapController() {
  const map = useMap();
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const prevStartRef = useRef(startLatLng);

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
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, computedSegments]);

  return null;
}
