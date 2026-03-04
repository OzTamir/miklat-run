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

const STORAGE_KEY = 'miklat-run-settings';

/** Settings we persist to localStorage (subset of RouteState) */
interface PersistedSettings {
  startLatLng: LatLng | null;
  startAddress: string;
  routeMode: RouteMode;
  targetDistanceKm: number;
  paceMin: number;
  paceSec: number;
  timeMinutes: number;
}

interface RouteState {
  startLatLng: LatLng | null;
  startAddress: string;

  routeMode: RouteMode;
  targetDistanceKm: number;
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
  setRouteMode: (mode: RouteMode) => void;
  setTargetDistance: (km: number) => void;
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

  computedDistanceKm: () => number;
  canGenerate: () => boolean;
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
  startLatLng: null,
  startAddress: '',

  routeMode: 'distance',
  targetDistanceKm: 5,
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
    set({ startLatLng: latlng, startAddress: address ?? '' });
    trackEvent('Start Point Set');
  },

  setRouteMode: (mode) => {
    set({ routeMode: mode });
    trackEvent('Route Mode Changed', { mode });
  },

  setTargetDistance: (km) => set({ targetDistanceKm: km }),

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

  computedDistanceKm: () => {
    const { timeMinutes, paceMin, paceSec } = get();
    const pacePerKm = paceMin + paceSec / 60;
    return timeMinutes / pacePerKm;
  },

  canGenerate: () => get().startLatLng !== null,
}),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedSettings => ({
        startLatLng: state.startLatLng,
        startAddress: state.startAddress,
        routeMode: state.routeMode,
        targetDistanceKm: state.targetDistanceKm,
        paceMin: state.paceMin,
        paceSec: state.paceSec,
        timeMinutes: state.timeMinutes,
      }),
    }
  )
);
