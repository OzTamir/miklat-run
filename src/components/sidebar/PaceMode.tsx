import { useRouteStore } from '@/stores/route-store';
import { Slider } from '@/components/ui/slider';

export function PaceMode() {
  const routeMode = useRouteStore((s) => s.routeMode);
  const paceMin = useRouteStore((s) => s.paceMin);
  const paceSec = useRouteStore((s) => s.paceSec);
  const timeMinutes = useRouteStore((s) => s.timeMinutes);
  const setPace = useRouteStore((s) => s.setPace);
  const setTimeMinutes = useRouteStore((s) => s.setTimeMinutes);
  const computedDistanceKm = useRouteStore((s) => s.computedDistanceKm);

  if (routeMode !== 'pace') return null;

  const handleMinChange = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 3 && n <= 12) {
      setPace(n, paceSec);
    }
  };

  const handleSecChange = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) {
      setPace(paceMin, n);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-text-secondary">
          {"קצב (דק'/ק\"מ)"}
        </div>
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min={3}
            max={12}
            value={paceMin}
            onChange={(e) => handleMinChange(e.target.value)}
            className="h-10 w-14 rounded-md border border-white/[0.06] bg-bg-surface-2 text-center text-lg font-medium text-text-primary outline-none focus:border-accent"
          />
          <span className="text-xl font-bold text-text-muted">:</span>
          <input
            type="number"
            min={0}
            max={59}
            step={15}
            value={paceSec.toString().padStart(2, '0')}
            onChange={(e) => handleSecChange(e.target.value)}
            className="h-10 w-14 rounded-md border border-white/[0.06] bg-bg-surface-2 text-center text-lg font-medium text-text-primary outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[12px] font-medium text-text-secondary">
          {'זמן ריצה (דקות)'}
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold text-accent">{timeMinutes}</span>
          <span className="mr-1 text-lg text-text-secondary">
            {'דק\''}
          </span>
        </div>

        <Slider
          value={[timeMinutes]}
          onValueChange={(val) => setTimeMinutes(val[0])}
          min={10}
          max={90}
          step={5}
          dir="rtl"
          className="[&_[data-slot=slider-range]]:bg-accent [&_[data-slot=slider-thumb]]:border-accent"
        />

        <div className="flex justify-between text-[12px] text-text-muted">
          <span>{"דק' 10"}</span>
          <span>{"דק' 90"}</span>
        </div>
      </div>

      <div className="rounded-lg bg-accent-dim px-3 py-2.5 text-center text-[13px] text-text-primary">
        {'מרחק משוער: '}
        <strong className="text-accent">
          {computedDistanceKm().toFixed(1)} {'ק"מ'}
        </strong>
      </div>
    </div>
  );
}
