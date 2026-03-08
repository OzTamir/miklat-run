import { useMapEvents } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import { reverseGeocode } from '@/lib/api';

export function MapClickHandler() {
  const routeData = useRouteStore((s) => s.routeData);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const hasEndPoint = useRouteStore((s) => s.hasEndPoint);
  const resetSegmentHighlight = useRouteStore((s) => s.resetSegmentHighlight);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);
  const setEndPoint = useRouteStore((s) => s.setEndPoint);

  useMapEvents({
    click(e) {
      if (highlightedSegmentIdx !== null) {
        resetSegmentHighlight();
        return;
      }

      if (routeData) {
        return;
      }

      const { lat, lng } = e.latlng;
      const target = !hasEndPoint || !startLatLng ? 'start' : 'end';
      const setPoint = target === 'start' ? setStartPoint : setEndPoint;
      setPoint({ lat, lng });

      reverseGeocode(lat, lng).then((result) => {
        const currentState = useRouteStore.getState();
        if (currentState.routeData) {
          return;
        }

        const addr = result.display_name;
        if (target === 'start') {
          const startUnchanged = currentState.startLatLng
            && Math.abs(currentState.startLatLng.lat - lat) < 0.000001
            && Math.abs(currentState.startLatLng.lng - lng) < 0.000001;
          if (startUnchanged) {
            setStartPoint({ lat, lng }, addr);
          }
          return;
        }

        const endUnchanged = currentState.endLatLng
          && Math.abs(currentState.endLatLng.lat - lat) < 0.000001
          && Math.abs(currentState.endLatLng.lng - lng) < 0.000001;
        if (currentState.hasEndPoint && endUnchanged) {
          setEndPoint({ lat, lng }, addr);
        }
      }).catch(() => {
        // geocode failure is non-critical — start point is already set
      });
    },
  });

  return null;
}
