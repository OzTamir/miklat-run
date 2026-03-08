import { useRef, useEffect, type ReactNode } from 'react';
import { Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddressSearch } from '@/hooks/useAddressSearch';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useRouteStore } from '@/stores/route-store';

interface FieldOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
  dimmed?: boolean;
  label: string;
}

function FieldOption({
  checked,
  onChange,
  disabled,
  dimmed = false,
  label,
}: FieldOptionProps) {
  return (
    <label
      className={`flex items-center justify-center gap-3 rounded-md border app-border-soft bg-bg-surface-2 px-3 py-2 text-start transition-opacity ${
        dimmed ? 'opacity-55' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="size-4 cursor-pointer rounded border-[color:var(--app-border-strong)] bg-bg-surface text-accent accent-accent disabled:cursor-not-allowed"
      />
      <span className="text-[12px] leading-relaxed text-text-secondary">{label}</span>
    </label>
  );
}

interface AddressFieldProps {
  target: 'start' | 'end';
  label: string;
  disabled: boolean;
  onUseCurrentLocation?: () => void;
  isLocating?: boolean;
  options?: ReactNode;
}

function AddressField({
  target,
  label,
  disabled,
  onUseCurrentLocation,
  isLocating = false,
  options,
}: AddressFieldProps) {
  const {
    query,
    setQuery,
    results,
    isSearching,
    showResults,
    selectResult,
    clearResults,
  } = useAddressSearch({ target });
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
    <div className="space-y-2.5 rounded-xl border app-border-soft bg-bg-surface-2/70 p-3">
      <div className="text-[13px] font-medium text-text-primary text-start">
        {label}
      </div>

      <div ref={containerRef} className="relative">
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'הקלד כתובת...'}
              dir="rtl"
              disabled={disabled}
              className="h-10 border-[color:var(--app-border-soft)] bg-bg-surface-2 pr-10 pl-10 text-center text-base placeholder:text-text-muted md:text-sm"
              autoComplete="off"
            />
            {!disabled && query.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  clearResults();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                aria-label={`נקה ${label}`}
                title={`נקה ${label}`}
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
                    d="M4 12a8 8 0 0 1 8-8"
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

          {onUseCurrentLocation ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={onUseCurrentLocation}
              disabled={disabled || isLocating}
              className="h-10 w-10 shrink-0 border app-border-soft bg-bg-surface-2 text-text-secondary hover:bg-bg-surface hover:text-text-primary"
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
                    d="M4 12a8 8 0 0 1 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <Navigation className="size-4" />
              )}
            </Button>
          ) : null}
        </div>

        {!disabled && showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-lg border app-border-soft bg-bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
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

      {options ? <div className="space-y-2">{options}</div> : null}
    </div>
  );
}

function getMapHint(hasEndPoint: boolean, startLatLngExists: boolean, endLatLngExists: boolean) {
  if (!hasEndPoint) {
    return 'או לחץ על המפה לבחירת נקודת התחלה';
  }

  if (!startLatLngExists) {
    return 'או לחץ על המפה לבחירת נקודת התחלה';
  }

  if (!endLatLngExists) {
    return 'או לחץ על המפה לבחירת נקודת סיום';
  }

  return 'אפשר לעדכן את נקודת הסיום גם בלחיצה על המפה';
}

export function AddressSearch() {
  const routeData = useRouteStore((s) => s.routeData);
  const startLatLng = useRouteStore((s) => s.startLatLng);
  const endLatLng = useRouteStore((s) => s.endLatLng);
  const hasEndPoint = useRouteStore((s) => s.hasEndPoint);
  const useStartPointAsShelter = useRouteStore((s) => s.useStartPointAsShelter);
  const useEndPointAsShelter = useRouteStore((s) => s.useEndPointAsShelter);
  const setUseStartPointAsShelter = useRouteStore((s) => s.setUseStartPointAsShelter);
  const setUseEndPointAsShelter = useRouteStore((s) => s.setUseEndPointAsShelter);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);
  const setHasEndPoint = useRouteStore((s) => s.setHasEndPoint);
  const isStartPointLocked = routeData !== null;
  const canMarkStartAsShelter = Boolean(startLatLng) && !isStartPointLocked;
  const canMarkEndAsShelter = Boolean(endLatLng) && !isStartPointLocked;
  const { isLocating, requestCurrentLocation } = useCurrentLocation();

  async function handleUseCurrentLocation() {
    if (isStartPointLocked || isLocating) {
      return;
    }

    try {
      const { latlng, address } = await requestCurrentLocation();
      setStartPoint(latlng, address);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'לא הצלחנו לאתר את המיקום הנוכחי';
      toast.error(message);
    }
  }

  return (
    <div className="space-y-3">
      <FieldOption
        checked={!hasEndPoint}
        onChange={(checked) => setHasEndPoint(!checked)}
        disabled={isStartPointLocked}
        dimmed={isStartPointLocked}
        label="מסלול מעגלי"
      />

      <AddressField
        target="start"
        label="נקודת התחלה"
        disabled={isStartPointLocked}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
        options={(
          <FieldOption
            checked={useStartPointAsShelter}
            onChange={setUseStartPointAsShelter}
            disabled={!canMarkStartAsShelter}
            dimmed={!canMarkStartAsShelter}
            label="החשב את נקודת ההתחלה כמרחב מוגן"
          />
        )}
      />

      {hasEndPoint ? (
        <AddressField
          target="end"
          label="נקודת סיום"
          disabled={isStartPointLocked}
          options={(
            <FieldOption
              checked={useEndPointAsShelter}
              onChange={setUseEndPointAsShelter}
              disabled={!canMarkEndAsShelter}
              dimmed={!canMarkEndAsShelter}
              label="החשב את נקודת הסיום כמרחב מוגן"
            />
          )}
        />
      ) : null}

      {isStartPointLocked ? (
        <p className="text-[12px] text-start text-text-muted">
          {'נקודות ההתחלה והסיום נעולות בזמן שמוצג מסלול. למסלול חדש לחץ "מסלול חדש".'}
        </p>
      ) : (
        <p className="text-[12px] text-center text-text-muted">
          {getMapHint(hasEndPoint, Boolean(startLatLng), Boolean(endLatLng))}
        </p>
      )}
    </div>
  );
}
