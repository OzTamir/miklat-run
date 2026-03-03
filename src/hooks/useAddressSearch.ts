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

export function useAddressSearch(): UseAddressSearchReturn {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setStartPoint = useRouteStore((s) => s.setStartPoint);

  const setQuery = useCallback((value: string) => {
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
  }, []);

  const selectResult = useCallback(
    (result: NominatimSearchResult) => {
      setStartPoint(
        { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
        result.display_name,
      );
      setQueryState(result.display_name);
      setResults([]);
      setShowResults(false);
    },
    [setStartPoint],
  );

  const clearResults = useCallback(() => {
    setShowResults(false);
  }, []);

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
