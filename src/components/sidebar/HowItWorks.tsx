const STEPS = [
  'בחר נקודת התחלה בכתובת או לחיצה על המפה',
  'קבע אורך מסלול רצוי',
  'לחץ "צור מסלול" — האפליקציה תתכנן מסלול מעגלי שעובר ליד מקלטים',
] as const;

export function HowItWorks() {
  return (
    <div className="space-y-3">
      <div className="text-[14px] font-semibold text-text-primary text-start">
        {'איך זה עובד?'}
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
        {'המסלול מתכנן כך שכל נקודה תהיה במרחק הליכה קצר ממקלט ציבורי.'}
      </p>
    </div>
  );
}
