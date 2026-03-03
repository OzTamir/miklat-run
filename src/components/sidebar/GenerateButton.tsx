import { useRouteStore } from '@/stores/route-store';
import { useRouteGeneration } from '@/hooks/useRouteGeneration';
import { Button } from '@/components/ui/button';

export function GenerateButton() {
  const canGenerate = useRouteStore((s) => s.canGenerate);
  const { generate, isGenerating } = useRouteGeneration();

  return (
    <Button
      onClick={generate}
      disabled={!canGenerate() || isGenerating}
      className="h-11 w-full bg-accent text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(232,145,58,0.25)] transition-all hover:bg-accent-hover disabled:opacity-40 disabled:shadow-none"
    >
      {isGenerating ? (
        <svg
          className="size-[18px] animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2.5"
            className="opacity-25"
          />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <>
          {'\u05E6\u05D5\u05E8 \u05DE\u05E1\u05DC\u05D5\u05DC'}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </>
      )}
    </Button>
  );
}
