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
      {'\uD83D\uDCCD \u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05DE\u05E4\u05D4 \u05DB\u05D3\u05D9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DE\u05D0\u05D9\u05E4\u05D4 \u05DC\u05E8\u05D5\u05E5'}
    </div>
  );
}
