/**
 * Send a custom event to Plausible Analytics.
 * No-op if Plausible is not loaded (e.g. adblocker).
 * @see https://plausible.io/docs/custom-event-goals
 * @see https://plausible.io/docs/custom-props/for-custom-events
 */
type PlausibleFn = (
  name: string,
  options?: { props?: Record<string, string> }
) => void;

export function trackEvent(
  eventName: string,
  props?: Record<string, string>
): void {
  const plausible = (typeof window !== 'undefined' && (window as Window & { plausible?: PlausibleFn }).plausible);
  if (plausible) {
    plausible(eventName, props ? { props } : undefined);
  }
}
