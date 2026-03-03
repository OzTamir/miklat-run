import { useRouteStore } from '@/stores/route-store';
import type { DistanceBias } from '@/types';

const BIASES: { value: DistanceBias; label: string }[] = [
  { value: 'over', label: '\u05DE\u05E2\u05DC' },
  { value: 'under', label: '\u05DE\u05EA\u05D7\u05EA' },
];

const EXPLAINERS: Record<DistanceBias, string> = {
  over: '\u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05D9\u05D4\u05D9\u05D4 \u05DE\u05E2\u05D8 \u05D0\u05E8\u05D5\u05DA \u05DE\u05D4\u05DE\u05E8\u05D7\u05E7 \u05E9\u05E0\u05D1\u05D7\u05E8',
  under: '\u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05D9\u05D4\u05D9\u05D4 \u05DE\u05E2\u05D8 \u05E7\u05E6\u05E8 \u05DE\u05D4\u05DE\u05E8\u05D7\u05E7 \u05E9\u05E0\u05D1\u05D7\u05E8',
};

export function BiasToggle() {
  const distanceBias = useRouteStore((s) => s.distanceBias);
  const setDistanceBias = useRouteStore((s) => s.setDistanceBias);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-0 rounded-lg bg-bg-surface-2 p-1">
        {BIASES.map((bias) => {
          const isActive = distanceBias === bias.value;
          return (
            <button
              key={bias.value}
              type="button"
              onClick={() => setDistanceBias(bias.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {bias.label}
            </button>
          );
        })}
      </div>

      <p className="text-[12px] text-text-muted">{EXPLAINERS[distanceBias]}</p>
    </div>
  );
}
