import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { useRouteStore } from '@/stores/route-store';

const startIcon = L.divIcon({
  className: 'start-marker',
  html: '<div></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function StartMarker() {
  const startLatLng = useRouteStore((s) => s.startLatLng);

  if (!startLatLng) return null;

  return (
    <Marker
      position={[startLatLng.lat, startLatLng.lng]}
      icon={startIcon}
    />
  );
}
