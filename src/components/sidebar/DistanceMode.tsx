import { useRouteStore } from '@/stores/route-store';
import { Slider } from '@/components/ui/slider';

export function DistanceMode() {
  const routeMode = useRouteStore((s) => s.routeMode);
  const targetDistanceKm = useRouteStore((s) => s.targetDistanceKm);
  const setTargetDistance = useRouteStore((s) => s.setTargetDistance);

  if (routeMode !== 'distance') return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="text-center">
        <span className="text-2xl font-bold text-accent">
          {targetDistanceKm}
        </span>
        <span className="mr-1 text-lg text-text-secondary">
          {'ק"מ'}
        </span>
      </div>

      <Slider
        value={[targetDistanceKm]}
        onValueChange={(val) => setTargetDistance(val[0])}
        min={1}
        max={15}
        step={0.5}
        dir="rtl"
        className="[&_[data-slot=slider-range]]:bg-accent [&_[data-slot=slider-thumb]]:border-accent"
      />

      <div className="flex justify-between text-[12px] text-text-muted">
        <span>{'1 ק"מ'}</span>
        <span>{'15 ק"מ'}</span>
      </div>
    </div>
  );
}
