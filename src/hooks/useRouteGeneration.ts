import { useCallback } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { useRouteStore } from '@/stores/route-store';
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
  const distanceBias = useRouteStore((s) => s.distanceBias);
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
    },
    [shelters, setRouteResult],
  );

  const generate = useCallback(async (isRetryAttempt = false) => {
    if (!startLatLng) return;

    setIsRetry(isRetryAttempt);
    setIsGenerating(true);
    setLoading(true, '\u05DE\u05D7\u05E4\u05E9 \u05DE\u05E7\u05DC\u05D8\u05D9\u05DD \u05D1\u05E7\u05E8\u05D1\u05EA \u05DE\u05E7\u05D5\u05DD...');

    try {
      const targetKm =
        routeMode === 'distance' ? targetDistanceKm : computedDistanceKm();

      const result = await generateRoute({
        start: startLatLng,
        targetDistKm: targetKm,
        bias: distanceBias,
        isRetry: isRetryAttempt,
        shelters,
        onProgress: (msg) => setLoading(true, msg),
      });

      if (!result) {
        toast.error(
          '\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D7\u05E9\u05D1 \u05DE\u05E1\u05DC\u05D5\u05DC. \u05E0\u05E1\u05D4 \u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05EA\u05D7\u05DC\u05D4 \u05D0\u05D7\u05E8\u05EA.',
        );
        return;
      }

      if (result.needsConfirmation) {
        setConfirmationData(result);
        return;
      }

      applyRoute(result);
      setIsRetry(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D7\u05D9\u05E9\u05D5\u05D1 \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC';
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
    distanceBias,
    shelters,
    setLoading,
    applyRoute,
  ]);

  const handleConfirmation = useCallback(
    (action: 'accept' | 'retry' | 'cancel') => {
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
