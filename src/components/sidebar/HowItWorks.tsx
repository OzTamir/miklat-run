const STEPS = [
  '\u05D1\u05D7\u05E8 \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05EA\u05D7\u05DC\u05D4 \u05D1\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D5 \u05DC\u05D7\u05D9\u05E6\u05D4 \u05E2\u05DC \u05D4\u05DE\u05E4\u05D4',
  '\u05E7\u05D1\u05E2 \u05D0\u05D5\u05E8\u05DA \u05DE\u05E1\u05DC\u05D5\u05DC \u05E8\u05E6\u05D5\u05D9',
  '\u05DC\u05D7\u05E5 "\u05E6\u05D5\u05E8 \u05DE\u05E1\u05DC\u05D5\u05DC" \u2014 \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05EA\u05EA\u05DB\u05E0\u05DF \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E2\u05D2\u05DC\u05D9 \u05E9\u05E2\u05D5\u05D1\u05E8 \u05DC\u05D9\u05D3 \u05DE\u05E7\u05DC\u05D8\u05D9\u05DD',
] as const;

export function HowItWorks() {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-text-primary text-start">
        {'\u05D0\u05D9\u05DA \u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3?'}
      </div>

      <div className="space-y-2 text-[13px] leading-relaxed text-text-secondary">
        {STEPS.map((text, i) => (
          <div key={i} className="flex gap-2 text-start">
            <span className="mt-px shrink-0 font-bold text-accent">
              {i + 1}.
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-text-muted text-start">
        {'\u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05EA\u05D5\u05DB\u05E0\u05DF \u05DB\u05DA \u05E9\u05D1\u05DB\u05DC \u05E0\u05E7\u05D5\u05D3\u05D4 \u05EA\u05D4\u05D9\u05D4 \u05D1\u05DE\u05E8\u05D7\u05E7 \u05D4\u05DC\u05D9\u05DB\u05D4 \u05E7\u05E6\u05E8 \u05DE\u05DE\u05E7\u05DC\u05D8 \u05E6\u05D9\u05D1\u05D5\u05E8\u05D9.'}
      </p>
    </div>
  );
}
