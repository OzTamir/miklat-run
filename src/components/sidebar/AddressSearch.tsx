import { useRef, useEffect } from 'react';
import { Navigation } from 'lucide-react';

import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useRouteStore } from '@/stores/route-store';

export function AddressSearch() {
  const routeData = useRouteStore((s) => s.routeData);
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const useStartPointAsShelter = useRouteStore((s) => s.useStartPointAsShelter);
  const setUseStartPointAsShelter = useRouteStore((s) => s.setUseStartPointAsShelter);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);
  const isStartPointLocked = routeData !== null;
  const canMarkStartAsShelter = Boolean(startLatLng) && !isStartPointLocked;
  const { isLocating, requestCurrentLocation } = useCurrentLocation();

  const {
    query,
    setQuery,
    results,
    isSearching,
    showResults,
    selectResult,
    clearResults,
  } = useAddressSearch();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        clearResults();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearResults]);

  async function handleUseCurrentLocation() {
    if (isStartPointLocked || isLocating) {
      return;
    }

    try {
      const { latlng, address } = await requestCurrentLocation();
      setStartPoint(latlng, address);
      setQuery(address);
      clearResults();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו לאתר את המיקום הנוכחי';
      toast.error(message);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium text-text-primary text-start">
        {'נקודת התחלה'}
      </div>

      <div ref={containerRef} className="relative">
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'הקלד כתובת...'}
              dir="rtl"
              disabled={isStartPointLocked}
              className="h-10 bg-bg-surface-2 border-white/[0.06] pr-10 pl-10 text-center text-base placeholder:text-text-muted md:text-sm"
              autoComplete="off"
            />
            {!isStartPointLocked && query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  clearResults();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                aria-label="נקה כתובת"
                title="נקה כתובת"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12.78 4.28a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22a.75.75 0 1 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72z" />
                </svg>
              </button>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {isSearching ? (
                <svg
                  className="size-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                </svg>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleUseCurrentLocation}
            disabled={isStartPointLocked || isLocating}
            className="h-10 w-10 shrink-0 border border-white/[0.06] bg-bg-surface-2 text-text-secondary hover:bg-bg-surface hover:text-text-primary"
            aria-label="השתמש במיקום הנוכחי"
            title="השתמש במיקום הנוכחי"
          >
            {isLocating ? (
              <svg
                className="size-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <Navigation className="size-4" />
            )}
          </Button>
        </div>

        {!isStartPointLocked && showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-lg border border-white/[0.06] bg-bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            {results.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectResult(result)}
                className="block w-full cursor-pointer px-3 py-2.5 text-right text-[13px] text-text-primary transition-colors hover:bg-bg-surface-2"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <label
        className={`flex items-center justify-center gap-3 rounded-lg border border-white/[0.06] bg-bg-surface-2 px-3 py-2 text-start transition-opacity ${
          canMarkStartAsShelter ? '' : 'opacity-55'
        }`}
      >
        <input
          type="checkbox"
          checked={useStartPointAsShelter}
          onChange={(e) => setUseStartPointAsShelter(e.target.checked)}
          disabled={!canMarkStartAsShelter}
          className="size-4 cursor-pointer rounded border-white/25 bg-bg-surface text-accent accent-accent disabled:cursor-not-allowed"
        />
        <span className="text-[12px] leading-relaxed text-text-secondary">
          {'החשב את נקודת ההתחלה כמרחב מוגן'}
        </span>
      </label>

      {isStartPointLocked ? (
        <p className="text-[12px] text-text-muted text-start">
          {'נקודת התחלה נעולה בזמן שמוצג מסלול. למסלול חדש לחץ "מסלול חדש".'}
        </p>
      ) : (
        <p className="text-[12px] text-text-muted text-start">
          {'או לחץ על המפה לבחירת נקודה'}
        </p>
      )}
    </div>
  );
}
