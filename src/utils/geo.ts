import type { GeoSnapshot } from '../types/erp';

let cachedGeo: GeoSnapshot | null = null;

/**
 * Capture la position GPS réelle du livreur (précision haute).
 * Met en cache la dernière position récente (< 2 min) pour ne jamais ralentir
 * le déclenchement de la caméra arrière sur le terrain à Maroua.
 */
export function captureCurrentGeo(timeoutMs = 7000): Promise<GeoSnapshot | undefined> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.resolve(cachedGeo || undefined);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (val?: GeoSnapshot) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timer = window.setTimeout(() => {
      finish(cachedGeo || undefined);
    }, timeoutMs + 500);

    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer);
          const snap: GeoSnapshot = {
            lat: Math.round(pos.coords.latitude * 1_000_000) / 1_000_000,
            lng: Math.round(pos.coords.longitude * 1_000_000) / 1_000_000,
            accuracy: Math.round(pos.coords.accuracy || 0),
            capturedAt: new Date().toISOString(),
          };
          cachedGeo = snap;
          finish(snap);
        },
        () => {
          window.clearTimeout(timer);
          // Fallback sur la dernière position récente (< 2 min) si le signal GPS vient de sauter
          if (cachedGeo) {
            const ageMs = Date.now() - new Date(cachedGeo.capturedAt).getTime();
            if (ageMs < 120_000) {
              finish(cachedGeo);
              return;
            }
          }
          finish(undefined);
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 45_000,
        }
      );
    } catch {
      window.clearTimeout(timer);
      finish(cachedGeo || undefined);
    }
  });
}

/**
 * Retourne immédiatement le dernier fix GPS en mémoire s'il date de moins de 2 minutes.
 */
export function getFreshCachedGeo(): GeoSnapshot | undefined {
  if (!cachedGeo) return undefined;
  const ageMs = Date.now() - new Date(cachedGeo.capturedAt).getTime();
  return ageMs < 120_000 ? cachedGeo : undefined;
}

/**
 * Formate les coordonnées GPS pour le bandeau filigrane incrusté sur la photo.
 */
export function formatGeoWatermark(geo?: GeoSnapshot): string {
  if (!geo) return 'GPS non capté (localisation désactivée ou indisponible)';
  const latDir = geo.lat >= 0 ? 'N' : 'S';
  const lngDir = geo.lng >= 0 ? 'E' : 'O';
  const acc = geo.accuracy > 0 ? ` (±${geo.accuracy} m)` : '';
  return `GPS ${Math.abs(geo.lat).toFixed(5)}°${latDir}, ${Math.abs(geo.lng).toFixed(5)}°${lngDir}${acc}`;
}

/**
 * Construit le lien Google Maps exact du point de remise pour vérification manager.
 */
export function buildGoogleMapsPinUrl(geo: GeoSnapshot): string {
  return `https://www.google.com/maps?q=${geo.lat},${geo.lng}`;
}
