import { useMapEvents } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import { reverseGeocode } from '@/lib/api';

export function MapClickHandler() {
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const resetSegmentHighlight = useRouteStore((s) => s.resetSegmentHighlight);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);

  useMapEvents({
    click(e) {
      if (highlightedSegmentIdx !== null) {
        resetSegmentHighlight();
        return;
      }

      const { lat, lng } = e.latlng;
      setStartPoint({ lat, lng });

      reverseGeocode(lat, lng).then((result) => {
        const addr = result.display_name;
        setStartPoint({ lat, lng }, addr);
      }).catch(() => {
        // geocode failure is non-critical — start point is already set
      });
    },
  });

  return null;
}
