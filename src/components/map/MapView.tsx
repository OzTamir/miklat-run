import { useTheme } from 'next-themes';
import { MapContainer, Pane, TileLayer, ZoomControl } from 'react-leaflet';
import { MapController } from './MapController';
import { MapClickHandler } from './MapClickHandler';
import { ShelterSync } from './ShelterSync';
import { StartMarker } from './StartMarker';
import { EndMarker } from './EndMarker';
import { ShelterMarkers } from './ShelterMarkers';
import { ActiveShelterMarkers } from './ActiveShelterMarkers';
import { RouteLayer } from './RouteLayer';
import { SegmentMarkers } from './SegmentMarkers';
import { DirectionArrows } from './DirectionArrows';

const TEL_AVIV_CENTER: [number, number] = [32.0853, 34.7818];
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

const BASEMAPS = {
  dark: {
    baseUrl:
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    labelUrl:
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
  },
  light: {
    baseUrl:
      'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    labelUrl:
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  },
} as const;

export function MapView() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'light' ? 'light' : 'dark';
  const basemap = BASEMAPS[theme];

  return (
    <MapContainer
      center={TEL_AVIV_CENTER}
      zoom={14}
      zoomControl={false}
      className="h-full w-full flex-1"
    >
      <ZoomControl position="topleft" />
      <TileLayer
        key={`${theme}-base`}
        url={basemap.baseUrl}
        subdomains="abcd"
        maxZoom={19}
        attribution={ATTRIBUTION}
      />
      <MapController />
      <MapClickHandler />
      <ShelterSync />
      <StartMarker />
      <EndMarker />
      <ShelterMarkers />
      <ActiveShelterMarkers />
      <RouteLayer />
      <SegmentMarkers />
      <DirectionArrows />
      <Pane
        name="street-labels"
        style={{ zIndex: 450, pointerEvents: 'none' }}
      >
        <TileLayer
          key={`${theme}-labels`}
          url={basemap.labelUrl}
          pane="street-labels"
          subdomains="abcd"
          maxZoom={19}
          attribution={ATTRIBUTION}
        />
      </Pane>
    </MapContainer>
  );
}
