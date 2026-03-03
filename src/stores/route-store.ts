import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LatLng,
  RouteMode,
  DistanceBias,
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
  distanceBias: DistanceBias;
  paceMin: number;
  paceSec: number;
  timeMinutes: number;
}

interface RouteState {
  startLatLng: LatLng | null;
  startAddress: string;

  routeMode: RouteMode;
  targetDistanceKm: number;
  distanceBias: DistanceBias;
  paceMin: number;
  paceSec: number;
  timeMinutes: number;

  routeData: RouteData | null;
  computedSegments: RouteSegment[];
  highlightedSegmentIdx: number | null;

  isLoading: boolean;
  loadingMessage: string;
  sidebarExpanded: boolean;
  overviewVisible: boolean;

  shelters: Shelter[];

  setStartPoint: (latlng: LatLng, address?: string) => void;
  setRouteMode: (mode: RouteMode) => void;
  setTargetDistance: (km: number) => void;
  setDistanceBias: (bias: DistanceBias) => void;
  setPace: (min: number, sec: number) => void;
  setTimeMinutes: (min: number) => void;
  setRouteResult: (data: RouteData, segments: RouteSegment[]) => void;
  clearRoute: () => void;
  highlightSegment: (idx: number | null) => void;
  resetSegmentHighlight: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  toggleSidebar: () => void;
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
  distanceBias: 'over',
  paceMin: 6,
  paceSec: 0,
  timeMinutes: 30,

  routeData: null,
  computedSegments: [],
  highlightedSegmentIdx: null,

  isLoading: false,
  loadingMessage: '',
  sidebarExpanded: true,
  overviewVisible: false,

  shelters: SHELTERS,

  setStartPoint: (latlng, address) =>
    set({ startLatLng: latlng, startAddress: address ?? '' }),

  setRouteMode: (mode) => set({ routeMode: mode }),

  setTargetDistance: (km) => set({ targetDistanceKm: km }),

  setDistanceBias: (bias) => set({ distanceBias: bias }),

  setPace: (min, sec) => set({ paceMin: min, paceSec: sec }),

  setTimeMinutes: (min) => set({ timeMinutes: min }),

  setRouteResult: (data, segments) =>
    set({
      routeData: data,
      computedSegments: segments,
      overviewVisible: true,
      highlightedSegmentIdx: null,
    }),

  clearRoute: () =>
    set({
      routeData: null,
      computedSegments: [],
      highlightedSegmentIdx: null,
      overviewVisible: false,
    }),

  highlightSegment: (idx) => set({ highlightedSegmentIdx: idx }),

  resetSegmentHighlight: () => set({ highlightedSegmentIdx: null }),

  setLoading: (loading, message) =>
    set({ isLoading: loading, loadingMessage: message ?? '' }),

  toggleSidebar: () =>
    set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

  setOverviewVisible: (visible) => set({ overviewVisible: visible }),

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
        distanceBias: state.distanceBias,
        paceMin: state.paceMin,
        paceSec: state.paceSec,
        timeMinutes: state.timeMinutes,
      }),
    }
  )
);
