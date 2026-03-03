import { useRouteStore } from '@/stores/route-store';
import { computeSafetyStats } from '@/lib/routing';

export function RouteInfo() {
  const routeData = useRouteStore((s) => s.routeData);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const paceMin = useRouteStore((s) => s.paceMin);
  const paceSec = useRouteStore((s) => s.paceSec);

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
      <div className="text-[14px] font-semibold text-text-primary">
        {'\u05E4\u05E8\u05D8\u05D9 \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC'}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-bg-surface-2 px-3 py-3 text-center">
          <div className="text-xl font-bold text-text-primary">
            {distKm.toFixed(1)}
          </div>
          <div className="text-[12px] text-text-muted">
            {'\u05E7"\u05DE'}
          </div>
        </div>
        <div className="rounded-lg bg-bg-surface-2 px-3 py-3 text-center">
          <div className="text-xl font-bold text-text-primary">{timeMin}</div>
          <div className="text-[12px] text-text-muted">
            {`\u05D3\u05E7\u05D5\u05EA (\u05E7\u05E6\u05D1 ${paceMin}:${paceSec.toString().padStart(2, '0')})`}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[13px] font-medium text-text-primary">
          {'\u05D1\u05D8\u05D9\u05D7\u05D5\u05EA \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC'}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${safetyColor}`}
            style={{ width: `${safePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-text-muted">
            {'\u05D1\u05D8\u05D5\u05D5\u05D7 3 \u05D3\u05E7\u05D5\u05EA \u05DE\u05DE\u05E7\u05DC\u05D8'}
          </span>
          <span className="font-medium text-text-primary">{safePercent}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-safe-dim px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-safe">{greenPercent}%</div>
          <div className="text-[11px] text-text-muted">
            {"\u05E2\u05D3 150 \u05DE'"}
          </div>
        </div>
        <div className="rounded-lg bg-caution-dim px-3 py-2.5 text-center">
          <div className="text-lg font-bold text-caution">{yellowPercent}%</div>
          <div className="text-[11px] text-text-muted">
            {"150-250 \u05DE'"}
          </div>
        </div>
      </div>

      {safePercent < 100 && (
        <div className="rounded-lg border border-danger/20 bg-danger-dim px-3 py-2.5 text-[12px] text-text-primary">
          {'\u26A0\uFE0F \u05D9\u05E9\u05E0\u05DD \u05E7\u05D8\u05E2\u05D9\u05DD \u05D1\u05DE\u05E1\u05DC\u05D5\u05DC \u05E9\u05D0\u05D9\u05E0\u05DD \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD \u05DC\u05DE\u05E7\u05DC\u05D8. \u05E0\u05D0 \u05DC\u05E9\u05D9\u05DD \u05DC\u05D1!'}
        </div>
      )}
    </div>
  );
}
