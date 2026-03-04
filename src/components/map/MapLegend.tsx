import { useState } from 'react';

export function MapLegend() {
  const [isMobileLegendOpen, setIsMobileLegendOpen] = useState(false);

  return (
    <>
      <div
        dir="rtl"
        className="fixed bottom-4 left-4 z-[1000] hidden rounded-lg border border-white/10 bg-bg-surface/95 p-3 text-start shadow-default backdrop-blur-sm md:block"
      >
        <LegendContent />
      </div>

      <button
        type="button"
        onClick={() => setIsMobileLegendOpen(true)}
        aria-label="פתח מקרא"
        className="fixed right-4 top-4 z-[1000] flex size-9 items-center justify-center rounded-full border border-white/15 bg-bg-surface/95 text-base font-semibold text-text-primary shadow-default backdrop-blur-sm md:hidden"
      >
        i
      </button>

      {isMobileLegendOpen ? (
        <div
          dir="rtl"
          className="fixed inset-0 z-[1005] bg-black/55 p-4 md:hidden"
          onClick={() => setIsMobileLegendOpen(false)}
        >
          <div
            className="mx-auto mt-14 w-full max-w-xs rounded-lg border border-white/10 bg-bg-surface p-3 shadow-default"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">מקרא</h2>
              <button
                type="button"
                onClick={() => setIsMobileLegendOpen(false)}
                aria-label="סגור מקרא"
                className="flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <LegendContent />
          </div>
        </div>
      ) : null}
    </>
  );
}

function LegendContent() {
  return (
    <div className="flex flex-col gap-1.5 text-sm max-md:gap-1 max-md:text-[11px]">
      <LegendItem>
        <span className="inline-block size-3 shrink-0 rounded-full border-2 border-white bg-green-500" />
        <span>נקודת התחלה</span>
      </LegendItem>

      <LegendItem>
        <span className="inline-block size-3 shrink-0 rounded-full bg-accent" />
        <span>מקלט ציבורי</span>
      </LegendItem>

      <LegendItem>
        <span className="inline-block size-3 shrink-0 rounded-full border-2 border-white bg-accent" />
        <span>מקלט לאורך המסלול</span>
      </LegendItem>

      <LegendItem>
        <span className="inline-block h-1 w-5 shrink-0 rounded-full bg-safe" />
        <span>עד 150 מ׳ ממקלט</span>
      </LegendItem>

      <LegendItem>
        <span className="inline-block h-1 w-5 shrink-0 rounded-full bg-caution" />
        <span>150–250 מ׳ ממקלט</span>
      </LegendItem>

      <LegendItem>
        <span className="inline-block h-1 w-5 shrink-0 rounded-full bg-danger" />
        <span>מעל 250 מ׳ ממקלט</span>
      </LegendItem>
    </div>
  );
}

function LegendItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      {children}
    </div>
  );
}
