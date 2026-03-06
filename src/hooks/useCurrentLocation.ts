import { useCallback, useState } from 'react';
import { reverseGeocode } from '@/lib/api';
import type { LatLng } from '@/types';

const LOCATION_REQUEST_TIMEOUT_MS = 60000;

interface CurrentLocationResult {
  latlng: LatLng;
  address: string;
}

interface UseCurrentLocationReturn {
  isLocating: boolean;
  requestCurrentLocation: () => Promise<CurrentLocationResult>;
}

function getLocationErrorMessage(error: unknown): string {
  const geoError = error as GeolocationPositionError | undefined;

  if (geoError?.code === geoError?.PERMISSION_DENIED) {
    return 'צריך לאשר גישה למיקום כדי להשתמש במיקום הנוכחי';
  }

  if (geoError?.code === geoError?.TIMEOUT) {
    return 'פג הזמן לאיתור המיקום. נסה שוב';
  }

  return 'לא הצלחנו לאתר את המיקום הנוכחי';
}

export function useCurrentLocation(): UseCurrentLocationReturn {
  const [isLocating, setIsLocating] = useState(false);

  const requestCurrentLocation = useCallback(async (): Promise<CurrentLocationResult> => {
    if (!('geolocation' in navigator)) {
      throw new Error('הדפדפן לא תומך באיתור מיקום');
    }

    setIsLocating(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          // The first macOS flow may show both browser and system dialogs.
          timeout: LOCATION_REQUEST_TIMEOUT_MS,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const latlng = { lat: latitude, lng: longitude };

      let address = 'המיקום הנוכחי שלי';
      try {
        const result = await reverseGeocode(latitude, longitude);
        address = result.display_name || address;
      } catch {
        // Keep the fallback label if reverse geocoding fails.
      }

      return { latlng, address };
    } catch (error) {
      throw new Error(getLocationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }, []);

  return {
    isLocating,
    requestCurrentLocation,
  };
}
