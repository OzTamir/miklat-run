import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { MapController } from './MapController';
import { MapClickHandler } from './MapClickHandler';
import { ShelterSync } from './ShelterSync';
import { StartMarker } from './StartMarker';
import { ShelterMarkers } from './ShelterMarkers';
import { ActiveShelterMarkers } from './ActiveShelterMarkers';
import { RouteLayer } from './RouteLayer';
import { SegmentMarkers } from './SegmentMarkers';
import { DirectionArrows } from './DirectionArrows';

const TEL_AVIV_CENTER: [number, number] = [32.0853, 34.7818];
const CARTO_DARK_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

export function MapView() {
  return (
    <MapContainer
      center={TEL_AVIV_CENTER}
      zoom={14}
      zoomControl={false}
      className="h-full w-full flex-1"
    >
      <ZoomControl position="topleft" />
      <TileLayer
        url={CARTO_DARK_URL}
        subdomains="abcd"
        maxZoom={19}
        attribution={ATTRIBUTION}
      />
      <MapController />
      <MapClickHandler />
      <ShelterSync />
      <StartMarker />
      <ShelterMarkers />
      <ActiveShelterMarkers />
      <RouteLayer />
      <SegmentMarkers />
      <DirectionArrows />
    </MapContainer>
  );
}
