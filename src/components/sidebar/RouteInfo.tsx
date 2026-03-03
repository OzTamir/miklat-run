import { useRouteStore } from '@/stores/route-store';
import { computeSafetyStats } from '@/lib/routing';

export function RouteInfo() {
  const routeData = useRouteStore((s) => s.routeData);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const paceMin = useRouteStore((s) => s.paceMin);
  const paceSec = useRouteStore((s) => s.paceSec);
  const overviewVisible = useRouteStore((s) => s.overviewVisible);
  const setOverviewVisible = useRouteStore((s) => s.setOverviewVisible);

  if (!routeData) return null;

  const distKm = routeData.distance / 1000;
  const pacePerKm = paceMin + paceSec / 60;
  const timeMin = Math.round(distKm * pacePerKm);
  const { safePercent, greenPercent, yellowPercent } =
    computeSafetyStats(computedSegments);

  const safetyColor =
    safePercent >= 80
      ? 'bg-safe'
      : safePercent >= 60
        ? 'bg-caution'
        : 'bg-danger';

  return (
    <div className="space-y-3">
      {!overviewVisible && (
        <button
          type="button"
          onClick={() => setOverviewVisible(true)}
          className="w-full rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5 text-[13px] font-medium text-accent transition-colors hover:bg-accent/20"
        >
          {'סקירת המסלול — הצג קטעים'}
        </button>
      )}

      <div className="text-[14px] font-semibold text-text-primary">
        {'פרטי המסלול'}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-bg-surface-2 px-3 py-3 text-center">
          <div className="text-xl font-bold text-text-primary">
            {distKm.toFixed(1)}
          </div>
          <div className="text-[12px] text-text-muted">
            {'ק"מ'}
          </div>
        </div>
        <div className="rounded-lg bg-bg-surface-2 px-3 py-3 text-center">
          <div className="text-xl font-bold text-text-primary">{timeMin}</div>
          <div className="text-[12px] text-text-muted">
            {`דקות (${paceMin}:${paceSec.toString().padStart(2, '0')} לק"מ)`}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[13px] font-medium text-text-primary">
          {'בטיחות המסלול'}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${safetyColor}`}
            style={{ width: `${safePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-text-muted">
            {'בטוח 3 דקות ממקלט'}
          </span>
          <span className="font-medium text-text-primary">{safePercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-safe-dim px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-safe">{greenPercent}%</div>
          <div className="text-[11px] text-text-muted">
            {"עד 150 מ'"}
          </div>
        </div>
        <div className="rounded-lg bg-caution-dim px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-caution">{yellowPercent}%</div>
          <div className="text-[11px] text-text-muted">
            {"150-250 מ'"}
          </div>
        </div>
      </div>

      {safePercent < 100 && (
        <div className="rounded-lg border border-danger/20 bg-danger-dim px-3 py-2.5 text-[12px] text-text-primary">
          {'⚠️ ישנם קטעים במסלול שאינם קרובים למקלט. נא לשים לב!'}
        </div>
      )}
    </div>
  );
}
