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

      {/* Mobile: bottom sheet */}
      <div
        dir="rtl"
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[65vh] flex-col rounded-t-2xl border-t border-white/[0.08] bg-bg-surface transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          overviewVisible
            ? 'translate-y-0'
            : 'translate-y-full'
        }`}
      >
        <div className="flex w-full flex-col items-center pt-2">
          <div className="mb-2 h-1 w-9 rounded-full bg-white/20" />
        </div>
        <OverviewHeader
          distKm={distKm}
          timeMin={timeMin}
          safePercent={safePercent}
          onClose={handleClose}
        />
        <ScrollArea className="flex-1 overflow-hidden">
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
          {'\u05E1\u05E7\u05D9\u05E8\u05EA \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC'}
        </h2>
        <div className="flex gap-3 text-[12px] text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{distKm}</span>
            {'\u05E7"\u05DE'}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{timeMin}</span>
            {'\u05D3\u05E7\u05F3'}
          </span>
          <span className="flex items-center gap-1">
            <span className="font-semibold text-accent">{safePercent}%</span>
            {'\u05D1\u05D8\u05D5\u05D7'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        title={'\u05E1\u05D2\u05D5\u05E8'}
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-surface-2 text-[18px] text-text-secondary transition-colors duration-150 hover:bg-bg-surface-3 hover:text-text-primary"
      >
        {'\u2715'}
      </button>
    </div>
  );
}
