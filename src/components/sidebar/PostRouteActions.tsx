import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { useRouteGeneration } from '@/hooks/useRouteGeneration';
import { useRouteStore } from '@/stores/route-store';

export function PostRouteActions() {
  const clearRoute = useRouteStore((s) => s.clearRoute);
  const { generate, isGenerating } = useRouteGeneration();

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={() => {
          trackEvent('Regenerate Clicked');
          generate();
        }}
        disabled={isGenerating}
        className="h-10 w-full bg-accent text-[14px] font-semibold text-white hover:bg-accent-hover"
      >
        {isGenerating ? 'מחשב מסלול...' : 'חשב אלטרנטיבה'}
      </Button>
      <Button
        onClick={() => {
          trackEvent('New Route Clicked');
          clearRoute();
        }}
        disabled={isGenerating}
        className="h-10 w-full border border-white/10 bg-bg-surface-2 text-[14px] font-semibold text-text-primary hover:bg-bg-surface-3"
      >
        {'התחל מחדש'}
      </Button>
    </div>
  );
}
