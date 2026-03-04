import { useCallback, useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { fetchNearbyShelters } from '@/lib/api';
import { haversine } from '@/lib/geo';
import { useRouteStore } from '@/stores/route-store';

const RADIUS_MIN_KM = 3;
const RADIUS_MAX_KM = 12;
const RADIUS_PADDING_RATIO = 1.2;
const RADIUS_PADDING_KM = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function computeViewportRadiusKm(map: LeafletMap): number {
  const center = map.getCenter();
  const northEast = map.getBounds().getNorthEast();
  const southWest = map.getBounds().getSouthWest();

  const radiusToNeKm =
    haversine(center.lat, center.lng, northEast.lat, northEast.lng) / 1000;
  const radiusToSwKm =
    haversine(center.lat, center.lng, southWest.lat, southWest.lng) / 1000;

  const viewportRadiusKm =
    Math.max(radiusToNeKm, radiusToSwKm) * RADIUS_PADDING_RATIO + RADIUS_PADDING_KM;
  return round(clamp(viewportRadiusKm, RADIUS_MIN_KM, RADIUS_MAX_KM), 2);
}

export function ShelterSync() {
  const setShelters = useRouteStore((s) => s.setShelters);
  const requestSeqRef = useRef(0);
  const lastQueryRef = useRef<string>('');

  const fetchForViewport = useCallback(
    async (map: LeafletMap) => {
      const center = map.getCenter();
      const radiusKm = computeViewportRadiusKm(map);
      const lat = round(center.lat, 5);
      const lng = round(center.lng, 5);
      const queryKey = `${lat}|${lng}|${radiusKm}`;

      if (queryKey === lastQueryRef.current) {
        return;
      }
      lastQueryRef.current = queryKey;

      const requestSeq = ++requestSeqRef.current;
      try {
        const shelters = await fetchNearbyShelters({ lat, lng, radiusKm });
        if (requestSeq !== requestSeqRef.current) {
          return;
        }
        if (shelters.length > 0) {
          setShelters(shelters);
        }
      } catch {
        // Keep the current shelter set when fetch fails.
      }
    },
    [setShelters],
  );

  const map = useMapEvents({
    moveend(event) {
      void fetchForViewport(event.target as LeafletMap);
    },
  });

  useEffect(() => {
    void fetchForViewport(map);
  }, [map, fetchForViewport]);

  return null;
}
