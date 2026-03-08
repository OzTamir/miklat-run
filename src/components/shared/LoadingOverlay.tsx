import { useRouteStore } from '@/stores/route-store';

export function LoadingOverlay() {
  const isLoading = useRouteStore((s) => s.isLoading);
  const loadingMessage = useRouteStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl border app-border-soft app-overlay-surface px-7 py-6 shadow-[0_12px_48px_rgba(0,0,0,0.35)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-bg-surface-3 border-t-accent" />
        <p className="text-base text-text-primary">{loadingMessage}</p>
      </div>
    </div>
  );
}
