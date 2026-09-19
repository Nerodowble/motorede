/**
 * Geolocation & Route utilities for MotoRede
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}


/**
 * NÃO existe coordenada padrão, de propósito.
 *
 * Antes havia uma — a Av. Paulista — usada sempre que o GPS falhava ou era
 * negado. Num pedido de socorro isso é pior que não ter localização nenhuma:
 * alguém parado numa rodovia de Minas dispararia um alerta apontando para São
 * Paulo, e nem quem pede nem quem atende teria como desconfiar, porque a tela
 * dizia "GPS Ativo" com números plausíveis.
 *
 * Posição desconhecida agora é `null`, e quem consome precisa decidir o que
 * fazer com isso.
 */

/**
 * Calculates distance between two coordinates using the Haversine formula
 * returns distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Generates direct navigation URL for Waze
 */
export function getWazeNavigationUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Generates direct navigation URL for Google Maps
 */
export function getGoogleMapsNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Requests device current position with fallback to default
 */
export function getCurrentPositionAsync(): Promise<GeoPoint | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn('Geolocation error or permission denied:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  });
}

export const geolocationService = {
  getCurrentPositionAsync,
  watchPosition(
    onSuccess: (pt: GeoPoint) => void,
    onError?: (err: GeolocationPositionError) => void
  ): () => void {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return () => {};
    }

    let lastLat = 0;
    let lastLng = 0;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Ignore micro-jitters under ~15 meters (0.00015 deg) to prevent re-renders
        if (Math.abs(lat - lastLat) > 0.00015 || Math.abs(lng - lastLng) > 0.00015) {
          lastLat = lat;
          lastLng = lng;
          onSuccess({
            lat,
            lng,
            accuracy: pos.coords.accuracy,
          });
        }
      },
      onError,
      {
        enableHighAccuracy: false, // Low CPU/battery on desktop & mobile
        maximumAge: 15000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(id);
    };
  },
};

