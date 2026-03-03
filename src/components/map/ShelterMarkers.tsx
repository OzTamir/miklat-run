import { CircleMarker, Popup } from 'react-leaflet';
import { useRouteStore } from '@/stores/route-store';
import type { Shelter } from '@/types';

function ShelterPopup({ shelter }: { shelter: Shelter }) {
  return (
    <div style={{ minWidth: 180 }}>
      <b>{shelter.address}</b>
      <br />
      <span style={{ color: '#8b95a8' }}>סוג:</span> {shelter.type}
      <br />
      <span style={{ color: '#8b95a8' }}>מצב:</span> {shelter.status}
      <br />
      {shelter.area > 0 && (
        <>
          <span style={{ color: '#8b95a8' }}>שטח:</span> {shelter.area} מ&quot;ר
          <br />
        </>
      )}
      {shelter.notes && (
        <>
          <span style={{ color: '#8b95a8' }}>הערות:</span> {shelter.notes}
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
          fillOpacity={0.45}
          color="#e8913a"
          opacity={0.6}
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
