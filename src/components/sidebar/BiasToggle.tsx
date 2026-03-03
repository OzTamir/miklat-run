import { useRouteStore } from '@/stores/route-store';
import type { DistanceBias } from '@/types';

const BIASES: { value: DistanceBias; label: string }[] = [
  { value: 'over', label: 'מעל' },
  { value: 'under', label: 'מתחת' },
];

const EXPLAINERS: Record<DistanceBias, string> = {
  over: 'המסלול יהיה מעט ארוך מהמרחק שנבחר',
  under: 'המסלול יהיה מעט קצר מהמרחק שנבחר',
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
              className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-all text-center ${
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

      <p className="text-[12px] text-text-muted text-start">{EXPLAINERS[distanceBias]}</p>
    </div>
  );
}
