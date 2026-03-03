import { MapView, MapLegend } from '@/components/map';
import { Sidebar } from '@/components/sidebar';
import { RouteOverview } from '@/components/overview';
import {
  LoadingOverlay,
  ClickHint,
  RouteConfirmDialog,
} from '@/components/shared';
import { Toaster } from '@/components/ui/sonner';
import { useRouteGeneration } from '@/hooks/useRouteGeneration';
import { useRouteStore } from '@/stores/route-store';

function RouteConfirmDialogWrapper() {
  const { confirmationData, isRetry, handleConfirmation } =
    useRouteGeneration();
  const routeMode = useRouteStore((s) => s.routeMode);
  const targetDistanceKm = useRouteStore((s) => s.targetDistanceKm);
  const computedDistanceKm = useRouteStore((s) => s.computedDistanceKm);
  const paceMin = useRouteStore((s) => s.paceMin);
  const paceSec = useRouteStore((s) => s.paceSec);

  const targetKm =
    routeMode === 'distance' ? targetDistanceKm : computedDistanceKm();
  const bestKm = confirmationData?.bestDistKm ?? 0;
  const bestTime = Math.round(bestKm * (paceMin + paceSec / 60));

  return (
    <RouteConfirmDialog
      open={confirmationData !== null}
      targetKm={targetKm}
      bestKm={bestKm}
      bestTime={bestTime}
      isRetry={isRetry}
      onAction={handleConfirmation}
    />
  );
}

function App() {
  return (
    <div
      dir="rtl"
      className="relative h-screen w-screen overflow-hidden bg-bg font-sans text-text-primary"
    >
      <RouteOverview />

      <main className="absolute inset-0 z-0 md:right-[340px]">
        <MapView />
      </main>

      <Sidebar />
      <MapLegend />
      <ClickHint />
      <LoadingOverlay />
      <RouteConfirmDialogWrapper />
      <Toaster position="top-center" dir="rtl" richColors />
    </div>
  );
}

export default App;
