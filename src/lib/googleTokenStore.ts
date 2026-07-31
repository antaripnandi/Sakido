/**
 * Per-service Google OAuth access token store.
 * sessionStorage survives same-tab reload only (correct — new tab re-validates on load).
 * In-flight Map prevents concurrent refresh calls for the same service from racing.
 */

export type GoogleService = 'googleCalendar' | 'googleDrive' | 'gmail';

const cacheKey = (s: GoogleService) => `sakido_gat_${s}`;

export const getProviderToken = (service: GoogleService): string | null => {
  try {
    const raw = sessionStorage.getItem(cacheKey(service));
    if (!raw) return null;
    const { token, expiry } = JSON.parse(raw);
    // Treat as expired 60s early to avoid using a token that expires mid-request
    return Date.now() < expiry - 60_000 ? token : null;
  } catch { return null; }
};

export const setProviderToken = (service: GoogleService, t: string | null, expiresIn = 3600): void => {
  if (!t) { sessionStorage.removeItem(cacheKey(service)); return; }
  sessionStorage.setItem(cacheKey(service), JSON.stringify({
    token: t,
    expiry: Date.now() + expiresIn * 1000,
  }));
};

export const clearProviderToken = (service?: GoogleService): void => {
  if (service) { sessionStorage.removeItem(cacheKey(service)); return; }
  // No service = clear all (e.g. on sign-out or hard disconnect)
  (['googleCalendar', 'googleDrive', 'gmail'] as GoogleService[])
    .forEach(s => sessionStorage.removeItem(cacheKey(s)));
};

// ponytail: Map-keyed in-flight — one slot per service; a shared slot would hand
// Calendar's token to a Gmail caller when their requests overlap
const _inFlight = new Map<GoogleService, Promise<string | null>>();

// Generation guard: an in-flight refresh may resolve AFTER sign-out, and its
// success handler would repopulate the cache for whoever uses the tab next.
// Capture the generation when a refresh starts; bump it on sign-out; the
// refresh handler must not write if the generation has moved on. Also drop
// in-flight slots so a new caller never joins a stale promise.
let _generation = 0;
export const getGeneration = (): number => _generation;
export const invalidateGeneration = (): void => {
  _generation += 1;
  _inFlight.clear();
};

/**
 * Call this instead of refreshGoogleToken() directly.
 * Returns cached token if still valid, otherwise coalesces concurrent callers
 * for the same service into one network request.
 */
export function getOrRefresh(
  service: GoogleService,
  refreshFn: () => Promise<string | null>
): Promise<string | null> {
  const cached = getProviderToken(service);
  if (cached) return Promise.resolve(cached);
  if (!_inFlight.has(service)) {
    _inFlight.set(service, refreshFn().finally(() => _inFlight.delete(service)));
  }
  return _inFlight.get(service)!;
}
