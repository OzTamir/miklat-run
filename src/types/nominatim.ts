export interface NominatimSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    city?: string;
  };
}

export interface NominatimReverseResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    city?: string;
  };
}
