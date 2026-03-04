import { useEffect, useState } from 'react';
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
  const [paceMinDraft, setPaceMinDraft] = useState(paceMin.toString());
  const [paceSecDraft, setPaceSecDraft] = useState(
    paceSec.toString().padStart(2, '0')
  );

  useEffect(() => {
    setPaceMinDraft(paceMin.toString());
  }, [paceMin]);

  useEffect(() => {
    setPaceSecDraft(paceSec.toString().padStart(2, '0'));
  }, [paceSec]);

  const commitMin = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 3 && n <= 12) {
      setPace(n, paceSec);
      return true;
    }
    return false;
  };

  const commitSec = (value: string) => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n >= 0 && n <= 59) {
      setPace(paceMin, n);
      return true;
    }
    return false;
  };

  if (routeMode !== 'pace') return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-2">
        <div className="text-[12px] font-medium text-text-secondary">
          {"קצב (דק'/ק\"מ)"}
        </div>
        <div className="flex items-center justify-center gap-1 flex-row-reverse">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={3}
            max={12}
            value={paceMinDraft}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setPaceMinDraft(value);
              commitMin(value);
            }}
            onBlur={() => {
              const n = parseInt(paceMinDraft, 10);
              if (isNaN(n) || n < 3 || n > 12) {
                setPaceMinDraft(paceMin.toString());
                return;
              }
              setPace(n, paceSec);
              setPaceMinDraft(n.toString());
            }}
            className="h-10 w-14 rounded-md border border-white/[0.06] bg-bg-surface-2 text-center text-lg font-medium text-text-primary outline-none focus:border-accent"
          />
          <span className="text-xl font-bold text-text-muted">:</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            max={59}
            step={15}
            value={paceSecDraft}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setPaceSecDraft(value);
              commitSec(value);
            }}
            onBlur={() => {
              const n = parseInt(paceSecDraft, 10);
              if (isNaN(n) || n < 0 || n > 59) {
                setPaceSecDraft(paceSec.toString().padStart(2, '0'));
                return;
              }
              setPace(paceMin, n);
              setPaceSecDraft(n.toString().padStart(2, '0'));
            }}
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
          <span>{"10 דק'"}</span>
          <span>{"90 דק'"}</span>
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
