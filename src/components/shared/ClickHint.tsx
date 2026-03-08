import { useEffect, useState } from 'react';
import { useRouteStore } from '@/stores/route-store';

export function ClickHint() {
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const endLatLng = useRouteStore((s) => s.endLatLng);
  const hasEndPoint = useRouteStore((s) => s.hasEndPoint);
  const routeData = useRouteStore((s) => s.routeData);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (routeData !== null) return null;

  const message = !startLatLng
    ? 'לחץ על המפה כדי לבחור מאיפה לרוץ'
    : hasEndPoint && !endLatLng
      ? 'לחץ על המפה שוב כדי לבחור איפה לסיים'
      : null;

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-[60px] left-1/2 z-[999] -translate-x-1/2 rounded-full border app-border-soft app-overlay-surface-strong px-4 py-2 text-[13px] text-text-secondary shadow-default pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {`📍 ${message}`}
    </div>
  );
}
