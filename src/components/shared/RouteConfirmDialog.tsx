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
        className="max-w-[380px] sm:max-w-[380px] border-[color:var(--app-border-strong)] bg-bg-surface p-7"
        dir="rtl"
      >
        <AlertDialogHeader className="place-items-center text-center">
          <div className="flex w-full flex-col items-center text-center">
            <div className="mb-3 text-[36px] leading-none">{'🏃'}</div>
            <AlertDialogTitle className="text-center text-lg font-semibold text-text-primary">
              {'המסלול שנמצא שונה מהבקשה'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="w-full text-center text-sm leading-relaxed text-text-secondary">
            {'בקשות '}
            <strong>
              {targetKm} {'ק"מ'}
            </strong>
            {', המסלול הטוב ביותר שנמצא הוא '}
            <strong>
              {bestKmDisplay} {'ק"מ'}
            </strong>
            {` (${diffSign}${diff} ${'ק"מ'})`}
            <br />
            {'זמן משוער: '}
            {bestTime}
            {' דקות'}
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
            {'זה מספיק טוב, הצג מסלול'}
          </AlertDialogAction>

          <div className="flex flex-col items-stretch gap-0.5">
            <AlertDialogAction
              variant="outline"
              className="!bg-bg-surface-2 !text-text-primary !border-[color:var(--app-border-soft)] !font-medium !h-auto w-full py-3 text-sm"
              onClick={(e) => {
                e.preventDefault();
                onAction('retry');
              }}
            >
              {isRetry
                ? 'נסה שוב (חיפוש מורחב)'
                : 'חפש יתר'}
            </AlertDialogAction>
            <p className="text-[11px] text-text-muted text-center">
              {isRetry
                ? 'כבר חיפשנו ביסודיות — ייתכן שזה הטוב ביותר לאזור הזה'
                : 'ננסה גישה נוספת למציאת מסלול מדויק יותר'}
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
            {'ביטול'}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
