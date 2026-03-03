export function MapLegend() {
  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-[1000] rounded-lg border border-white/10 bg-bg-surface/95 p-3 shadow-default backdrop-blur-sm max-md:p-2 max-md:text-xs text-start"
    >
      <div className="flex flex-col gap-1.5 text-sm max-md:gap-1 max-md:text-[11px]">
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
