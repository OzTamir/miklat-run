import { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useRouteStore } from '@/stores/route-store';

export function AddressSearch() {
  const routeData = useRouteStore((s) => s.routeData);
  const isStartPointLocked = routeData !== null;

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

  return (
    <div className="space-y-1.5">
      <div className="text-[13px] font-medium text-text-primary text-start">
        {'נקודת התחלה'}
      </div>

      <div ref={containerRef} className="relative">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={'הקלד כתובת בתל אביב...'}
            dir="rtl"
            disabled={isStartPointLocked}
            className="h-10 bg-bg-surface-2 border-white/[0.06] pr-10 text-center text-base placeholder:text-text-muted md:text-sm"
            autoComplete="off"
          />
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
