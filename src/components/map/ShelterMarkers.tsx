import { CircleMarker, Popup } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import type { Shelter } from '@/types';

function ShelterPopup({ shelter }: { shelter: Shelter }) {
  return (
    <div style={{ minWidth: 180 }}>
      <b>{shelter.address}</b>
      <br />
      <span style={{ color: 'var(--color-text-secondary)' }}>סוג:</span> {shelter.type}
      <br />
      {shelter.area > 0 && (
        <>
          <span style={{ color: 'var(--color-text-secondary)' }}>שטח:</span> {shelter.area} מ&quot;ר
          <br />
        </>
      )}
      {shelter.notes && (
        <>
          <span style={{ color: 'var(--color-text-secondary)' }}>הערות:</span> {shelter.notes}
        </>
      )}
    </div>
  );
}

export function ShelterMarkers() {
  const shelters = useRouteStore((s) => s.shelters);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);

  if (highlightedSegmentIdx !== null) return null;

  return (
    <>
      {shelters.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={4}
          fillColor="#e8913a"
          fillOpacity={0.3}
          color="#e8913a"
          opacity={0.45}
          weight={1}
        >
          <Popup>
            <ShelterPopup shelter={s} />
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

export { ShelterPopup };
