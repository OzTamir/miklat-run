import { useCallback } from 'react';
import { toast } from 'sonner';
import { create } from 'zustand';
import { useRouteStore } from '@/stores/route-store';
import { trackEvent } from '@/lib/analytics';
import { fetchNearbyShelters } from '@/lib/api';
import { generateRoute, buildLogicalSegments } from '@/lib/routing';
import {
  RISK_TOLERANCE_CONSTS,
  ROUTE_PLANNER_CONSTS,
  ROUTING_SHARED_CONSTS,
} from '@/lib/routing/consts';
import type { Shelter } from '@/types';
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
  confirmationShelters: Shelter[] | null;
  setIsGenerating: (value: boolean) => void;
  setIsRetry: (value: boolean) => void;
  setConfirmationData: (value: GenerateRouteResult | null) => void;
  setConfirmationShelters: (value: Shelter[] | null) => void;
}

const SHELTER_LOOKUP_PADDING_KM = 0.4;
const SHELTER_LOOKUP_MIN_KM = 3;
const SHELTER_LOOKUP_MAX_KM = 8;
const NO_SHELTERS_ERROR = 'לא נמצאו מקלטים בקרבת נקודת ההתחלה';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toRiskFactor(allowedAvgShelterTimeSec: number): number {
  const min = RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec;
  const max = RISK_TOLERANCE_CONSTS.maxAllowedAvgShelterTimeSec;
  const clamped = clamp(allowedAvgShelterTimeSec, min, max);
  return (clamped - min) / (max - min);
}

function computeShelterLookupRadiusKm(
  targetKm: number,
  allowedAvgShelterTimeSec: number,
): number {
  const riskFactor = toRiskFactor(allowedAvgShelterTimeSec);
  const loopRadiusM = (targetKm * ROUTING_SHARED_CONSTS.metersPerKilometer) / (
    2 * Math.PI * ROUTE_PLANNER_CONSTS.loopStreetDetourFactor
  );

  const searchRadiusM = Math.max(
    ROUTE_PLANNER_CONSTS.shelterSearchRadiusMinM,
    loopRadiusM * ROUTE_PLANNER_CONSTS.shelterSearchRadiusLoopMultiplier,
  ) * (1 + ROUTE_PLANNER_CONSTS.riskSearchRadiusBoostRatio * riskFactor);

  const radiusKm = searchRadiusM / ROUTING_SHARED_CONSTS.metersPerKilometer + SHELTER_LOOKUP_PADDING_KM;
  return round(clamp(radiusKm, SHELTER_LOOKUP_MIN_KM, SHELTER_LOOKUP_MAX_KM), 2);
}

const useRouteGenerationState = create<RouteGenerationState>((set) => ({
  isGenerating: false,
  isRetry: false,
  confirmationData: null,
  confirmationShelters: null,
  setIsGenerating: (value) => set({ isGenerating: value }),
  setIsRetry: (value) => set({ isRetry: value }),
  setConfirmationData: (value) => set({ confirmationData: value }),
  setConfirmationShelters: (value) => set({ confirmationShelters: value }),
}));

export function useRouteGeneration(): UseRouteGenerationReturn {
  const isGenerating = useRouteGenerationState((s) => s.isGenerating);
  const isRetry = useRouteGenerationState((s) => s.isRetry);
  const confirmationData = useRouteGenerationState((s) => s.confirmationData);
  const confirmationShelters = useRouteGenerationState((s) => s.confirmationShelters);
  const setIsGenerating = useRouteGenerationState((s) => s.setIsGenerating);
  const setIsRetry = useRouteGenerationState((s) => s.setIsRetry);
  const setConfirmationData = useRouteGenerationState((s) => s.setConfirmationData);
  const setConfirmationShelters = useRouteGenerationState((s) => s.setConfirmationShelters);

  const startLatLng = useRouteStore((s) => s.startLatLng);
  const routeMode = useRouteStore((s) => s.routeMode);
  const targetDistanceKm = useRouteStore((s) => s.targetDistanceKm);
  const allowedAvgShelterTimeSec = useRouteStore((s) => s.allowedAvgShelterTimeSec);
  const shelters = useRouteStore((s) => s.shelters);
  const setShelters = useRouteStore((s) => s.setShelters);
  const computedDistanceKm = useRouteStore((s) => s.computedDistanceKm);
  const setLoading = useRouteStore((s) => s.setLoading);
  const setRouteResult = useRouteStore((s) => s.setRouteResult);

  const applyRoute = useCallback(
    (result: GenerateRouteResult, routeShelters: Shelter[]) => {
      const { routeData } = result;
      const coords = routeData.geometry.coordinates as [number, number][];
      const segments = buildLogicalSegments(
        coords,
        routeData.steps,
        routeData.distance,
        routeShelters,
      );
      setRouteResult(routeData, segments);
      trackEvent('Route Generated');
    },
    [setRouteResult],
  );

  const resolveSheltersForRoute = useCallback(
    async (targetKm: number): Promise<Shelter[]> => {
      if (!startLatLng) {
        return shelters;
      }

      const radiusKm = computeShelterLookupRadiusKm(targetKm, allowedAvgShelterTimeSec);
      const nearby = await fetchNearbyShelters({
        lat: startLatLng.lat,
        lng: startLatLng.lng,
        radiusKm,
      });

      if (nearby.length === 0) {
        throw new Error(NO_SHELTERS_ERROR);
      }

      setShelters(nearby);
      return nearby;
    },
    [startLatLng, shelters, allowedAvgShelterTimeSec, setShelters],
  );

  const generate = useCallback(async (isRetryAttempt = false) => {
    if (!startLatLng) return;

    setIsRetry(isRetryAttempt);
    setIsGenerating(true);
    setConfirmationData(null);
    setConfirmationShelters(null);
    setLoading(true, 'מחפש מקלטים בקרבת מקום...');

    try {
      const targetKm =
        routeMode === 'distance' ? targetDistanceKm : computedDistanceKm();

      const routeShelters = await resolveSheltersForRoute(targetKm);

      const result = await generateRoute({
        start: startLatLng,
        targetDistKm: targetKm,
        allowedAvgShelterTimeSec,
        isRetry: isRetryAttempt,
        shelters: routeShelters,
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
        setConfirmationShelters(routeShelters);
        return;
      }

      applyRoute(result, routeShelters);
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
    allowedAvgShelterTimeSec,
    computedDistanceKm,
    setLoading,
    applyRoute,
    resolveSheltersForRoute,
    setConfirmationData,
    setConfirmationShelters,
  ]);

  const handleConfirmation = useCallback(
    (action: 'accept' | 'retry' | 'cancel') => {
      trackEvent('Route Confirmation', { action });
      if (action === 'accept' && confirmationData) {
        applyRoute(confirmationData, confirmationShelters ?? shelters);
        setIsRetry(false);
        setConfirmationData(null);
        setConfirmationShelters(null);
        return;
      }

      if (action === 'retry') {
        setConfirmationData(null);
        setConfirmationShelters(null);
        void generate(true);
        return;
      }

      setIsRetry(false);
      setConfirmationData(null);
      setConfirmationShelters(null);
    },
    [
      confirmationData,
      confirmationShelters,
      applyRoute,
      generate,
      shelters,
      setConfirmationData,
      setConfirmationShelters,
    ],
  );

  return {
    generate: () => generate(false),
    isGenerating,
    isRetry,
    confirmationData,
    handleConfirmation,
  };
}
