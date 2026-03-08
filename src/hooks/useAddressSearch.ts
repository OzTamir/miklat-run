import { useState, useRef, useCallback, useEffect } from 'react';
import type { NominatimSearchResult } from '@/types';
import { searchAddress } from '@/lib/api';
import { useRouteStore } from '@/stores/route-store';

const DEBOUNCE_MS = 1000;

interface UseAddressSearchReturn {
  query: string;
  setQuery: (value: string) => void;
  results: NominatimSearchResult[];
  isSearching: boolean;
  showResults: boolean;
  selectResult: (result: NominatimSearchResult) => void;
  clearResults: () => void;
}

interface UseAddressSearchOptions {
  target: 'start' | 'end';
}

export function useAddressSearch({
  target,
}: UseAddressSearchOptions): UseAddressSearchReturn {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);
  const setEndPoint = useRouteStore((s) => s.setEndPoint);
  const startAddress = useRouteStore((s) => s.startAddress);
  const endAddress = useRouteStore((s) => s.endAddress);
  const routeData = useRouteStore((s) => s.routeData);
  const selectedAddress = target === 'start' ? startAddress : endAddress;
  const setPoint = target === 'start' ? setStartPoint : setEndPoint;

  // Sync external address changes (e.g., from map click) to local query state
  useEffect(() => {
    setQueryState(selectedAddress);
  }, [selectedAddress]);

  const setQuery = useCallback((value: string) => {
    if (routeData) {
      return;
    }

    setQueryState(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (value.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchAddress(value);
        setResults(data);
        setShowResults(data.length > 0);
      } catch {
        setResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [routeData]);

  const selectResult = useCallback(
    (result: NominatimSearchResult) => {
      if (routeData) {
        return;
      }

      setPoint(
        { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
        result.display_name,
      );
      setQueryState(result.display_name);
      setResults([]);
      setShowResults(false);
    },
    [routeData, setPoint],
  );

  const clearResults = useCallback(() => {
    setShowResults(false);
  }, []);

  useEffect(() => {
    if (!routeData) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setResults([]);
    setShowResults(false);
    setIsSearching(false);
  }, [routeData]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    showResults,
    selectResult,
    clearResults,
  };
}
