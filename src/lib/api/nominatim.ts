import type { NominatimSearchResult, NominatimReverseResult } from '@/types'

const USER_AGENT = 'MasluMugan/1.0'

export async function searchAddress(query: string): Promise<NominatimSearchResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' תל אביב')}&format=json&limit=5&countrycodes=il&accept-language=he`
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  })
  
  if (!response.ok) throw new Error('Nominatim search failed');
  
  return response.json();
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimReverseResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he&zoom=18`
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT
    }
  })
  
  if (!response.ok) throw new Error('Nominatim reverse geocode failed');
  
  const data = await response.json();
  
  return data;
}
