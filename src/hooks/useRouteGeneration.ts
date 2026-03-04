import { useCallback } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { useRouteStore } from '@/stores/route-store';
import { trackEvent } from '@/lib/analytics';
import { generateRoute, buildLogicalSegments } from '@/lib/routing';
import type { GenerateRouteResult } from '@/lib/routing';

interface UseRouteGenerationReturn {
  generate: () => Promise<void>;
  isGenerating: boolean;
  isRetry: boolean;
  confirmationData: GenerateRouteResult | null;
  handleConfirmation: (action: 'accept' | 'retry' | 'cancel') => void;
}

interface RouteGenerationState {
  isGenerating: boolean;
  isRetry: boolean;
  confirmationData: GenerateRouteResult | null;
  setIsGenerating: (value: boolean) => void;
  setIsRetry: (value: boolean) => void;
  setConfirmationData: (value: GenerateRouteResult | null) => void;
}

const useRouteGenerationState = create<RouteGenerationState>((set) => ({
  isGenerating: false,
  isRetry: false,
  confirmationData: null,
  setIsGenerating: (value) => set({ isGenerating: value }),
  setIsRetry: (value) => set({ isRetry: value }),
  setConfirmationData: (value) => set({ confirmationData: value }),
}));

export function useRouteGeneration(): UseRouteGenerationReturn {
  const isGenerating = useRouteGenerationState((s) => s.isGenerating);
  const isRetry = useRouteGenerationState((s) => s.isRetry);
  const confirmationData = useRouteGenerationState((s) => s.confirmationData);
  const setIsGenerating = useRouteGenerationState((s) => s.setIsGenerating);
  const setIsRetry = useRouteGenerationState((s) => s.setIsRetry);
  const setConfirmationData = useRouteGenerationState((s) => s.setConfirmationData);

  const startLatLng = useRouteStore((s) => s.startLatLng);
  const routeMode = useRouteStore((s) => s.routeMode);
  const targetDistanceKm = useRouteStore((s) => s.targetDistanceKm);
  const shelters = useRouteStore((s) => s.shelters);
  const computedDistanceKm = useRouteStore((s) => s.computedDistanceKm);
  const setLoading = useRouteStore((s) => s.setLoading);
  const setRouteResult = useRouteStore((s) => s.setRouteResult);

  const applyRoute = useCallback(
    (result: GenerateRouteResult) => {
      const { routeData } = result;
      const coords = routeData.geometry.coordinates as [number, number][];
      const segments = buildLogicalSegments(
        coords,
        routeData.steps,
        routeData.distance,
        shelters,
      );
      setRouteResult(routeData, segments);
      trackEvent('Route Generated');
    },
    [shelters, setRouteResult],
  );

  const generate = useCallback(async (isRetryAttempt = false) => {
    if (!startLatLng) return;

    setIsRetry(isRetryAttempt);
    setIsGenerating(true);
    setLoading(true, 'מחפש מקלטים בקרבת מקום...');

    try {
      const targetKm =
        routeMode === 'distance' ? targetDistanceKm : computedDistanceKm();

      const result = await generateRoute({
        start: startLatLng,
        targetDistKm: targetKm,
        isRetry: isRetryAttempt,
        shelters,
        onProgress: (msg) => setLoading(true, msg),
      });

      if (!result) {
        toast.error(
          'לא נתן לחשב מסלול. נסה נקודת התחלה אחרת.',
        );
        return;
      }

      if (result.needsConfirmation) {
        trackEvent('Route Confirmation Shown');
        setConfirmationData(result);
        return;
      }

      applyRoute(result);
      setIsRetry(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'שגיאה בחישוב המסלול';
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  }, [
    startLatLng,
    routeMode,
    targetDistanceKm,
    computedDistanceKm,
    shelters,
    setLoading,
    applyRoute,
  ]);

  const handleConfirmation = useCallback(
    (action: 'accept' | 'retry' | 'cancel') => {
      trackEvent('Route Confirmation', { action });
      if (action === 'accept' && confirmationData) {
        applyRoute(confirmationData);
        setIsRetry(false);
        setConfirmationData(null);
        return;
      }

      if (action === 'retry') {
        setConfirmationData(null);
        void generate(true);
        return;
      }

      setIsRetry(false);
      setConfirmationData(null);
    },
    [confirmationData, applyRoute, generate],
  );

  return {
    generate: () => generate(false),
    isGenerating,
    isRetry,
    confirmationData,
    handleConfirmation,
  };
}
