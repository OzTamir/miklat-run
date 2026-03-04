import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '@/stores/route-store';
import { computeSafetyStats } from '@/lib/routing';
import { downloadRouteAsGpx } from '@/lib/gpx';
import { trackEvent } from '@/lib/analytics';
import { useRouteGeneration } from '@/hooks/useRouteGeneration';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileBottomDrawer, type DrawerSize } from '@/components/ui/MobileBottomDrawer';
import { SegmentCard } from './SegmentCard';

const MD_BREAKPOINT = 768;

function isMobileViewport(): boolean {
  return window.innerWidth < MD_BREAKPOINT;
}

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
  const { generate, isGenerating } = useRouteGeneration();

  const distKm = routeData ? (routeData.distance / 1000).toFixed(1) : '-';
  const timeMin = routeData
    ? Math.round((routeData.distance / 1000) * (paceMin + paceSec / 60))
    : '-';
  const { safePercent } = computedSegments.length
    ? computeSafetyStats(computedSegments)
    : { safePercent: 0 };
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [mobileSize, setMobileSize] = useState<DrawerSize>('half');

  useEffect(() => {
    if (overviewVisible) {
      setMobileExpanded(true);
      setMobileSize('half');
    }
  }, [overviewVisible]);

  function handleClose() {
    if (isMobileViewport()) {
      setOverviewVisible(false);
      setMobileExpanded(false);
      setMobileSize('half');
      resetSegmentHighlight();
      return;
    }

    setOverviewVisible(false);
    resetSegmentHighlight();
  }

  function handleStartOver() {
    clearRoute();
    setOverviewVisible(false);
    resetSegmentHighlight();
  }

  function handleRegenerate() {
    void generate();
  }

  function handleExportGpx() {
    if (!routeData) return;

    try {
      downloadRouteAsGpx(routeData);
      trackEvent('Route Exported', { format: 'gpx' });
    } catch {
      toast.error('ייצוא המסלול נכשל');
      trackEvent('Route Export Failed', { format: 'gpx' });
    }
  }

  function handleMobileDrawerStateChange(expanded: boolean, size: DrawerSize) {
    if (!expanded) {
      setOverviewVisible(false);
      setMobileExpanded(false);
      setMobileSize('half');
      resetSegmentHighlight();
      return;
    }
    setOverviewVisible(true);
    setMobileExpanded(true);
    setMobileSize(size);
  }

  function handleMobileToggle() {
    if (!overviewVisible || !mobileExpanded) {
      setOverviewVisible(true);
      setMobileExpanded(true);
      setMobileSize('half');
      return;
    }

    setMobileExpanded(true);
    setMobileSize((prev) => (prev === 'half' ? 'full' : 'half'));
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
        <OverviewActions
          includeRouteControls={false}
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
          onStartOver={handleStartOver}
          onExportGpx={handleExportGpx}
        />
      </div>

      {/* Mobile: bottom sheet with drag + hard cap */}
      <MobileBottomDrawer
        shown={Boolean(routeData)}
        expanded={overviewVisible && mobileExpanded}
        size={mobileSize}
        onStateChange={handleMobileDrawerStateChange}
        onHandleTap={handleMobileToggle}
        topGap={64}
        halfRatio={0.5}
        zIndexClassName="z-40"
        asideClassName="border-t border-white/[0.08]"
        handleContainerClassName="flex w-full shrink-0 cursor-pointer flex-col items-stretch px-0 pt-2 touch-none"
        handle={(
          <OverviewHeader
            distKm={distKm}
            timeMin={timeMin}
            safePercent={safePercent}
            onClose={handleClose}
          />
        )}
      >
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
        <OverviewActions
          includeRouteControls
          isGenerating={isGenerating}
          onRegenerate={handleRegenerate}
          onStartOver={handleStartOver}
          onExportGpx={handleExportGpx}
        />
      </MobileBottomDrawer>
    </>
  );
}

function OverviewActions({
  includeRouteControls,
  isGenerating,
  onRegenerate,
  onStartOver,
  onExportGpx,
}: {
  includeRouteControls: boolean;
  isGenerating: boolean;
  onRegenerate: () => void;
  onStartOver: () => void;
  onExportGpx: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-white/[0.06] px-5 py-4">
      {includeRouteControls ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="h-11 rounded-lg bg-accent text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {isGenerating ? 'מחשב מסלול...' : 'חשב אלטרנטיבה'}
          </button>
          <button
            type="button"
            onClick={onStartOver}
            disabled={isGenerating}
            className="h-11 rounded-lg border border-white/10 bg-bg-surface-2 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-surface-3 disabled:opacity-50"
          >
            {'מסלול חדש'}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onExportGpx}
        className={`h-11 w-full rounded-lg border border-accent/40 bg-accent/10 text-[15px] font-semibold text-accent transition-colors hover:bg-accent/20 ${
          includeRouteControls ? 'mt-2' : ''
        }`}
      >
        {'ייצוא GPX'}
      </button>
    </div>
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
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title={'סגור'}
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-bg-surface-2 text-[18px] text-text-secondary transition-colors duration-150 hover:bg-bg-surface-3 hover:text-text-primary"
      >
        {'×'}
      </button>
    </div>
  );
}
