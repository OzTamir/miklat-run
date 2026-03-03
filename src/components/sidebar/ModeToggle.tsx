import { useRouteStore } from '@/stores/route-store';
import type { RouteMode } from '@/types';

const MODES: { value: RouteMode; label: string }[] = [
  { value: 'distance', label: '\u05DC\u05E4\u05D9 \u05DE\u05E8\u05D7\u05E7' },
  { value: 'pace', label: '\u05DC\u05E4\u05D9 \u05E7\u05E6\u05D1 + \u05D6\u05DE\u05DF' },
];

export function ModeToggle() {
  const routeMode = useRouteStore((s) => s.routeMode);
  const setRouteMode = useRouteStore((s) => s.setRouteMode);

  return (
    <div className="flex gap-0 rounded-lg bg-bg-surface-2 p-1">
      {MODES.map((mode) => {
        const isActive = routeMode === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => setRouteMode(mode.value)}
            className={`flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition-all text-center ${
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
