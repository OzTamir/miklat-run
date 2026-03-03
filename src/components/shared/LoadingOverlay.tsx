import { useRouteStore } from '@/stores/route-store';

export function LoadingOverlay() {
  const isLoading = useRouteStore((s) => s.isLoading);
  const loadingMessage = useRouteStore((s) => s.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-4 bg-[rgba(20,27,45,0.85)]">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-bg-surface-3 border-t-accent" />
      <p className="text-base text-text-secondary">{loadingMessage}</p>
    </div>
  );
}
