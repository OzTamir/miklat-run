import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouteStore } from '@/stores/route-store';
import { generateRoute, buildLogicalSegments } from '@/lib/routing';
import type { GenerateRouteResult } from '@/lib/routing';

interface UseRouteGenerationReturn {
  generate: () => Promise<void>;
  isGenerating: boolean;
  confirmationData: GenerateRouteResult | null;
  handleConfirmation: (accept: boolean) => void;
}

export function useRouteGeneration(): UseRouteGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmationData, setConfirmationData] =
    useState<GenerateRouteResult | null>(null);

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

  const generate = useCallback(async () => {
    if (!startLatLng) return;

    setIsGenerating(true);
    setLoading(true, '\u05DE\u05D7\u05E4\u05E9 \u05DE\u05E7\u05DC\u05D8\u05D9\u05DD \u05D1\u05E7\u05E8\u05D1\u05EA \u05DE\u05E7\u05D5\u05DD...');

    try {
      const targetKm =
        routeMode === 'distance' ? targetDistanceKm : computedDistanceKm();

      const result = await generateRoute({
        start: startLatLng,
        targetDistKm: targetKm,
        bias: distanceBias,
        isRetry: false,
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
    (accept: boolean) => {
      if (accept && confirmationData) {
        applyRoute(confirmationData);
      }
      setConfirmationData(null);
    },
    [confirmationData, applyRoute],
  );

  return {
    generate,
    isGenerating,
    confirmationData,
    handleConfirmation,
  };
}
