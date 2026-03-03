import { useRouteStore } from '@/stores/route-store';
import { computeSafetyStats } from '@/lib/routing';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SegmentCard } from './SegmentCard';

export function RouteOverview() {
  const overviewVisible = useRouteStore((s) => s.overviewVisible);
  const computedSegments = useRouteStore((s) => s.computedSegments);
  const highlightedSegmentIdx = useRouteStore((s) => s.highlightedSegmentIdx);
  const highlightSegment = useRouteStore((s) => s.highlightSegment);
  const resetSegmentHighlight = useRouteStore((s) => s.resetSegmentHighlight);
  const setOverviewVisible = useRouteStore((s) => s.setOverviewVisible);
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const routeData = useRouteStore((s) => s.routeData);
  const paceMin = useRouteStore((s) => s.paceMin);
  const paceSec = useRouteStore((s) => s.paceSec);

  const distKm = routeData ? (routeData.distance / 1000).toFixed(1) : '-';
  const timeMin = routeData
    ? Math.round((routeData.distance / 1000) * (paceMin + paceSec / 60))
    : '-';
  const { safePercent } = computedSegments.length
    ? computeSafetyStats(computedSegments)
    : { safePercent: 0 };

  function handleClose() {
    setOverviewVisible(false);
    resetSegmentHighlight();
  }

  function handleStartOver() {
    clearRoute();
    setOverviewVisible(false);
    resetSegmentHighlight();
  }

  return (
    <>
      {/* Desktop: left slide panel */}
      <div
        dir="rtl"
        className={`fixed inset-y-0 left-0 z-20 hidden w-[320px] flex-col border-r border-white/[0.06] bg-bg-surface shadow-[8px_0_32px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex ${
          overviewVisible
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <OverviewHeader
          distKm={distKm}
          timeMin={timeMin}
          safePercent={safePercent}
          onClose={handleClose}
        />
        <ScrollArea className="flex-1">
          <div data-overview-content className="py-2">
            {computedSegments.map((seg) => (
              <SegmentCard
                key={seg.index}
                segment={seg}
                isActive={highlightedSegmentIdx === seg.index}
                onClick={() => highlightSegment(seg.index)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile: bottom sheet (only drawer when route exists) — half screen, scrollable */}
      <div
        dir="rtl"
        className={`fixed inset-x-0 bottom-0 z-40 flex h-[50vh] max-h-[50vh] flex-col rounded-t-2xl border-t border-white/[0.08] bg-bg-surface transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          overviewVisible
            ? 'translate-y-0'
            : 'translate-y-full'
        }`}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex w-full shrink-0 flex-col items-center pt-2">
          <div className="mb-2 h-1 w-9 rounded-full bg-white/20" />
        </div>
        <OverviewHeader
          distKm={distKm}
          timeMin={timeMin}
          safePercent={safePercent}
          onClose={handleClose}
        />
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
        >
          <div data-overview-content className="py-2">
            {computedSegments.map((seg) => (
              <SegmentCard
                key={seg.index}
                segment={seg}
                isActive={highlightedSegmentIdx === seg.index}
                onClick={() => highlightSegment(seg.index)}
              />
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={handleStartOver}
            className="w-full rounded-lg bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:opacity-90"
          >
            {'התחל מחדש'}
          </button>
        </div>
      </div>
    </>
  );
}

function OverviewHeader({
  distKm,
  timeMin,
  safePercent,
  onClose,
}: {
  distKm: string;
  timeMin: string | number;
  safePercent: number;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-bg px-5 py-4">
      <div className="flex flex-col gap-1 text-start">
        <h2 className="text-[16px] font-semibold text-text-primary">
          {'סקירת המסלול'}
        </h2>
        <div className="flex gap-3 text-[12px] text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{distKm}</span>
            {'ק"מ'}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{timeMin}</span>
            {'דק׳'}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{safePercent}%</span>
            {'בטוח'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        title={'סגור'}
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-surface-2 text-[18px] text-text-secondary transition-colors duration-150 hover:bg-bg-surface-3 hover:text-text-primary"
      >
        {'×'}
      </button>
    </div>
  );
}
