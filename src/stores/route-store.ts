import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackEvent } from '@/lib/analytics';
import type {
  LatLng,
  RouteMode,
  RouteData,
  RouteSegment,
  Shelter,
} from '@/types';
import { SHELTERS } from '@/data';
import { RISK_TOLERANCE_CONSTS } from '@/lib/routing';

const STORAGE_KEY = 'miklat-run-settings';

/** Settings we persist to localStorage (subset of RouteState) */
interface PersistedSettings {
  startLatLng: LatLng | null;
  startAddress: string;
  endLatLng: LatLng | null;
  endAddress: string;
  hasEndPoint: boolean;
  routeMode: RouteMode;
  targetDistanceKm: number;
  allowedAvgShelterTimeSec: number;
  paceMin: number;
  paceSec: number;
  timeMinutes: number;
}

interface RouteState {
  startLatLng: LatLng | null;
  startAddress: string;
  endLatLng: LatLng | null;
  endAddress: string;
  hasEndPoint: boolean;
  useStartPointAsShelter: boolean;
  useEndPointAsShelter: boolean;

  routeMode: RouteMode;
  targetDistanceKm: number;
  allowedAvgShelterTimeSec: number;
  paceMin: number;
  paceSec: number;
  timeMinutes: number;

  routeData: RouteData | null;
  computedSegments: RouteSegment[];
  highlightedSegmentIdx: number | null;

  isLoading: boolean;
  loadingMessage: string;
  sidebarExpanded: boolean;
  mobileDrawerSize: 'half' | 'full';
  overviewVisible: boolean;

  shelters: Shelter[];

  setStartPoint: (latlng: LatLng, address?: string) => void;
  setEndPoint: (latlng: LatLng, address?: string) => void;
  setHasEndPoint: (value: boolean) => void;
  clearEndPoint: () => void;
  setUseStartPointAsShelter: (value: boolean) => void;
  setUseEndPointAsShelter: (value: boolean) => void;
  setRouteMode: (mode: RouteMode) => void;
  setTargetDistance: (km: number) => void;
  setAllowedAvgShelterTimeSec: (sec: number) => void;
  setPace: (min: number, sec: number) => void;
  setTimeMinutes: (min: number) => void;
  setRouteResult: (data: RouteData, segments: RouteSegment[]) => void;
  clearRoute: () => void;
  highlightSegment: (idx: number | null) => void;
  resetSegmentHighlight: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  toggleSidebar: () => void;
  setMobileDrawer: (expanded: boolean, size: 'half' | 'full') => void;
  setOverviewVisible: (visible: boolean) => void;
  setShelters: (shelters: Shelter[]) => void;

  computedDistanceKm: () => number;
  canGenerate: () => boolean;
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
  startLatLng: null,
  startAddress: '',
  endLatLng: null,
  endAddress: '',
  hasEndPoint: false,
  useStartPointAsShelter: false,
  useEndPointAsShelter: false,

  routeMode: 'distance',
  targetDistanceKm: 5,
  allowedAvgShelterTimeSec: RISK_TOLERANCE_CONSTS.defaultAllowedAvgShelterTimeSec,
  paceMin: 6,
  paceSec: 0,
  timeMinutes: 30,

  routeData: null,
  computedSegments: [],
  highlightedSegmentIdx: null,

  isLoading: false,
  loadingMessage: '',
  sidebarExpanded: true,
  mobileDrawerSize: 'half',
  overviewVisible: false,

  shelters: SHELTERS,

  setStartPoint: (latlng, address) => {
    set({
      startLatLng: latlng,
      startAddress: address ?? '',
      useStartPointAsShelter: false,
    });
    trackEvent('Start Point Set');
  },

  setEndPoint: (latlng, address) => {
    set({
      endLatLng: latlng,
      endAddress: address ?? '',
      hasEndPoint: true,
      useEndPointAsShelter: false,
    });
    trackEvent('End Point Set');
  },

  setHasEndPoint: (value) => {
    set((state) => ({
      hasEndPoint: value,
      endLatLng: value ? state.endLatLng : null,
      endAddress: value ? state.endAddress : '',
      useEndPointAsShelter: value ? state.useEndPointAsShelter : false,
    }));
    trackEvent('End Point Mode Toggle', { enabled: value ? 'true' : 'false' });
  },

  clearEndPoint: () => {
    set({ endLatLng: null, endAddress: '', useEndPointAsShelter: false });
  },

  setUseStartPointAsShelter: (value) => {
    set({ useStartPointAsShelter: value });
    trackEvent('Start Point Shelter Toggle', { enabled: value ? 'true' : 'false' });
  },

  setUseEndPointAsShelter: (value) => {
    set({ useEndPointAsShelter: value });
    trackEvent('End Point Shelter Toggle', { enabled: value ? 'true' : 'false' });
  },

  setRouteMode: (mode) => {
    set({ routeMode: mode });
    trackEvent('Route Mode Changed', { mode });
  },

  setTargetDistance: (km) => set({ targetDistanceKm: km }),

  setAllowedAvgShelterTimeSec: (sec) => {
    const min = RISK_TOLERANCE_CONSTS.minAllowedAvgShelterTimeSec;
    const max = RISK_TOLERANCE_CONSTS.maxAllowedAvgShelterTimeSec;
    const clamped = Math.max(min, Math.min(max, sec));
    set({ allowedAvgShelterTimeSec: clamped });
    trackEvent('Risk Tolerance Changed', { allowedAvgShelterTimeSec: String(clamped) });
  },

  setPace: (min, sec) => set({ paceMin: min, paceSec: sec }),

  setTimeMinutes: (min) => set({ timeMinutes: min }),

  setRouteResult: (data, segments) =>
    set({
      routeData: data,
      computedSegments: segments,
      overviewVisible: true,
      highlightedSegmentIdx: null,
    }),

  clearRoute: () => {
    set({
      routeData: null,
      computedSegments: [],
      highlightedSegmentIdx: null,
      overviewVisible: false,
    });
    trackEvent('Route Cleared');
  },

  highlightSegment: (idx) => {
    set({ highlightedSegmentIdx: idx });
    if (idx !== null) trackEvent('Segment Selected');
  },

  resetSegmentHighlight: () => set({ highlightedSegmentIdx: null }),

  setLoading: (loading, message) =>
    set({ isLoading: loading, loadingMessage: message ?? '' }),

  toggleSidebar: () =>
    set((state) => {
      if (!state.sidebarExpanded) {
        return { sidebarExpanded: true, mobileDrawerSize: 'half' };
      }
      if (state.mobileDrawerSize === 'half') {
        return { mobileDrawerSize: 'full' };
      }
      return { sidebarExpanded: false, mobileDrawerSize: 'half' };
    }),

  setMobileDrawer: (expanded, size) =>
    set({ sidebarExpanded: expanded, mobileDrawerSize: size }),

  setOverviewVisible: (visible) => {
    set({ overviewVisible: visible });
    if (visible) trackEvent('Overview Opened');
  },

  setShelters: (shelters) => {
    set({ shelters });
  },

  computedDistanceKm: () => {
    const { timeMinutes, paceMin, paceSec } = get();
    const pacePerKm = paceMin + paceSec / 60;
    return timeMinutes / pacePerKm;
  },

  canGenerate: () => {
    const { startLatLng, hasEndPoint, endLatLng } = get();
    return startLatLng !== null && (!hasEndPoint || endLatLng !== null);
  },
}),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedSettings => ({
        startLatLng: state.startLatLng,
        startAddress: state.startAddress,
        endLatLng: state.endLatLng,
        endAddress: state.endAddress,
        hasEndPoint: state.hasEndPoint,
        routeMode: state.routeMode,
        targetDistanceKm: state.targetDistanceKm,
        allowedAvgShelterTimeSec: state.allowedAvgShelterTimeSec,
        paceMin: state.paceMin,
        paceSec: state.paceSec,
        timeMinutes: state.timeMinutes,
      }),
    }
  )
);
