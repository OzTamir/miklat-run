import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface RouteConfirmDialogProps {
  open: boolean;
  targetKm: number;
  bestKm: number;
  bestTime: number;
  isRetry: boolean;
  onAction: (action: 'accept' | 'retry' | 'cancel') => void;
}

export function RouteConfirmDialog({
  open,
  targetKm,
  bestKm,
  bestTime,
  isRetry,
  onAction,
}: RouteConfirmDialogProps) {
  const bestKmRounded = Math.floor(bestKm * 10) / 10;
  const bestKmDisplay =
    bestKmRounded % 1 === 0
      ? String(Math.round(bestKmRounded))
      : bestKmRounded.toFixed(1);
  const diffValue = Math.floor((bestKm - targetKm) * 10) / 10;
  const diff =
    diffValue % 1 === 0 ? String(Math.round(diffValue)) : diffValue.toFixed(1);
  const diffSign = bestKm >= targetKm ? '+' : '';

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onAction('cancel');
      }}
    >
      <AlertDialogContent
        className="max-w-[380px] sm:max-w-[380px] border-white/10 bg-bg-surface p-7"
        dir="rtl"
      >
        <AlertDialogHeader className="sm:place-items-center sm:text-center">
          <div className="text-[36px] leading-none mb-3">
            {'\uD83C\uDFC3'}
          </div>
          <AlertDialogTitle className="text-lg font-semibold text-text-primary">
            {'\u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05E9\u05E0\u05DE\u05E6\u05D0 \u05E9\u05D5\u05E0\u05D4 \u05DE\u05D4\u05D1\u05E7\u05E9\u05D4'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-text-secondary leading-relaxed">
            {'\u05D1\u05D9\u05E7\u05E9\u05EA '}
            <strong>
              {targetKm} {'\u05E7"\u05DE'}
            </strong>
            {', \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \u05D4\u05D8\u05D5\u05D1 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05E9\u05E0\u05DE\u05E6\u05D0 \u05D4\u05D5\u05D0 '}
            <strong>
              {bestKmDisplay} {'\u05E7"\u05DE'}
            </strong>
            {` (${diffSign}${diff} ${'\u05E7"\u05DE'})`}
            <br />
            {'\u05D6\u05DE\u05DF \u05DE\u05E9\u05D5\u05E2\u05E8: '}
            {bestTime}
            {' \u05D3\u05E7\u05D5\u05EA'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-col sm:items-stretch">
          <AlertDialogAction
            className="!bg-accent hover:!bg-accent/90 !text-white !font-semibold !h-auto w-full py-3 text-sm"
            onClick={(e) => {
              e.preventDefault();
              onAction('accept');
            }}
          >
            {'\u05D6\u05D4 \u05DE\u05E1\u05E4\u05D9\u05E7 \u05D8\u05D5\u05D1, \u05D4\u05E6\u05D2 \u05DE\u05E1\u05DC\u05D5\u05DC'}
          </AlertDialogAction>

          <div className="flex flex-col items-stretch gap-0.5">
            <AlertDialogAction
              variant="outline"
              className="!bg-bg-surface-2 !text-text-primary !border-white/10 !font-medium !h-auto w-full py-3 text-sm"
              onClick={(e) => {
                e.preventDefault();
                onAction('retry');
              }}
            >
              {isRetry
                ? '\u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 (\u05D7\u05D9\u05E4\u05D5\u05E9 \u05DE\u05D5\u05E8\u05D7\u05D1)'
                : '\u05D7\u05E4\u05E9 \u05D9\u05D5\u05EA\u05E8'}
            </AlertDialogAction>
            <p className="text-[11px] text-text-muted text-center">
              {isRetry
                ? '\u05DB\u05D1\u05E8 \u05D7\u05D9\u05E4\u05E9\u05E0\u05D5 \u05D1\u05D9\u05E1\u05D5\u05D3\u05D9\u05D5\u05EA \u2014 \u05D9\u05D9\u05EA\u05DB\u05DF \u05E9\u05D6\u05D4 \u05D4\u05D8\u05D5\u05D1 \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DC\u05D0\u05D6\u05D5\u05E8 \u05D4\u05D6\u05D4'
                : '\u05E0\u05E0\u05E1\u05D4 \u05D2\u05D9\u05E9\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA \u05DC\u05DE\u05E6\u05D9\u05D0\u05EA \u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05D3\u05D5\u05D9\u05E7 \u05D9\u05D5\u05EA\u05E8'}
            </p>
          </div>

          <AlertDialogCancel
            variant="ghost"
            className="!bg-transparent !text-text-muted !border-0 !h-auto w-full py-2 text-[13px] hover:!bg-transparent hover:!text-text-secondary"
            onClick={(e) => {
              e.preventDefault();
              onAction('cancel');
            }}
          >
            {'\u05D1\u05D9\u05D8\u05D5\u05DC'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
