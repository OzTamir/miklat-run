import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STEPS = [
  'בחר נקודת התחלה בכתובת או לחיצה על המפה',
  'בחר אם ליצור מסלול מעגלי או מסלול עם נקודת סיום נפרדת',
  'קבע אורך מסלול רצוי',
  'לחץ "צור מסלול" — האפליקציה תתכנן מסלול שעובר ליד מקלטים',
] as const;

export function HowItWorks() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full text-[12px] font-semibold text-text-secondary text-center underline underline-offset-4 transition-colors hover:text-accent"
        >
          {'איך זה עובד?'}
        </button>
      </DialogTrigger>

      <DialogContent
        dir="rtl"
        className="max-w-[380px] border-[color:var(--app-border-strong)] bg-bg-surface p-6 sm:max-w-[420px] [&_[data-slot=dialog-close]]:left-4 [&_[data-slot=dialog-close]]:right-auto"
      >
        <DialogHeader className="text-start sm:text-start pt-2">
          <DialogTitle className="text-[18px] font-semibold text-text-primary">
            {'איך זה עובד?'}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-text-secondary">
            {'בכמה צעדים פשוטים אפשר ליצור מסלול ריצה מעגלי או מסלול עם יעד סיום, שנשאר קרוב למקלטים.'}
          </DialogDescription>
        </DialogHeader>

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

        <p className="text-[12px] leading-relaxed text-text-muted text-start">
          {'המסלול מתוכנן כך שכל נקודה תהיה במרחק הליכה קצר ממקלט ציבורי.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
