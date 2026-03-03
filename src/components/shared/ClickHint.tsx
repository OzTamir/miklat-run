import { useEffect, useState } from 'react';
import { useRouteStore } from '@/stores/route-store';

export function ClickHint() {
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const routeData = useRouteStore((s) => s.routeData);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (startLatLng !== null || routeData !== null) return null;

  return (
    <div
      className={`fixed bottom-[60px] left-1/2 z-[999] -translate-x-1/2 rounded-full border border-white/10 bg-bg-surface px-4 py-2 text-[13px] text-text-secondary shadow-default pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {'📍 לחץ על המפה כדי לבחור מאיפה לרוץ'}
    </div>
  );
}
