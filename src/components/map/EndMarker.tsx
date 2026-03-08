import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';

const endIcon = L.divIcon({
  className: 'end-marker',
  html: '<div></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function EndMarker() {
  const hasEndPoint = useRouteStore((s) => s.hasEndPoint);
  const endLatLng = useRouteStore((s) => s.endLatLng);

  if (!hasEndPoint || !endLatLng) return null;

  return (
    <Marker
      position={[endLatLng.lat, endLatLng.lng]}
      icon={endIcon}
    />
  );
}
