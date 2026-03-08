import { MoonStar, SunMedium } from 'lucide-react';
import { useRouteStore } from '@/stores/route-store';

export function ThemeSelector() {
  const theme = useRouteStore((s) => s.theme);
  const setTheme = useRouteStore((s) => s.setTheme);
  const isDark = theme === 'dark';
  const Icon = isDark ? MoonStar : SunMedium;
  const nextTheme = isDark ? 'light' : 'dark';
  const title = isDark ? 'עבור לערכה בהירה' : 'עבור לערכה כהה';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="rounded p-1 text-text-secondary transition-colors hover:text-text-primary"
      aria-label={title}
      title={title}
    >
      <Icon className="size-5" />
    </button>
  );
}
