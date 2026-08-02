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

// BroadcastChannel for cross-tab token updates (modern browsers)
// Safari 15.4+, Chrome 54+, Firefox 38+
let _tokenChannel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    _tokenChannel = new BroadcastChannel('sakido_token_updates');
  }
} catch {
  // BroadcastChannel not supported, fall back to no cross-tab sync
}

/**
 * Broadcast token update to other tabs so they can refresh their cache.
 * Called after successful OAuth callback or token refresh.
 */
export const broadcastTokenUpdate = (service: GoogleService): void => {
  _tokenChannel?.postMessage({ type: 'token_updated', service, timestamp: Date.now() });
};

/**
 * Listen for token updates from other tabs and invalidate local cache.
 * Returns cleanup function to call on component unmount.
 */
export const listenForTokenUpdates = (callback: (service: GoogleService) => void): (() => void) => {
  if (!_tokenChannel) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'token_updated' && event.data?.service) {
      // Clear cached token for this service so next request fetches fresh one
      clearProviderToken(event.data.service);
      callback(event.data.service);
    }
  };

  _tokenChannel.addEventListener('message', handler);
  return () => _tokenChannel?.removeEventListener('message', handler);
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

// Cross-tab token refresh lock using Web Locks API (Safari 15.4+) with
// sessionStorage fallback for older browsers. Prevents concurrent refresh
// from multiple tabs hitting the server simultaneously.
const LOCK_TIMEOUT_MS = 10_000; // 10s max lock hold time

/**
 * Acquire cross-tab lock for token refresh. Uses Web Locks API if available,
 * falls back to sessionStorage + timestamp for Safari <15.4.
 */
async function withRefreshLock<T>(
  service: GoogleService,
  fn: () => Promise<T>
): Promise<T> {
  const lockName = `sakido_token_lock_${service}`;

  // Try Web Locks API first (Chrome, Firefox, Safari 15.4+)
  if ('locks' in navigator && navigator.locks) {
    return navigator.locks.request(
      lockName,
      { mode: 'exclusive', ifAvailable: false },
      async (lock) => {
        if (!lock) {
          // Lock unavailable (shouldn't happen with ifAvailable: false, but safety check)
          await new Promise(resolve => setTimeout(resolve, 100));
          return withRefreshLock(service, fn);
        }
        return fn();
      }
    );
  }

  // Fallback: sessionStorage + timestamp for Safari <15.4, older iOS
  const lockKey = `sakido_lock_${service}`;
  const lockValue = sessionStorage.getItem(lockKey);
  const now = Date.now();

  if (lockValue) {
    const lockTime = parseInt(lockValue, 10);
    // If lock is fresh (<10s old), wait and retry
    if (now - lockTime < LOCK_TIMEOUT_MS) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return withRefreshLock(service, fn);
    }
    // Stale lock (crashed tab) — proceed and take over
  }

  // Acquire lock
  sessionStorage.setItem(lockKey, now.toString());
  try {
    return await fn();
  } finally {
    // Release lock only if we still own it (check timestamp to avoid releasing another tab's lock)
    const currentLock = sessionStorage.getItem(lockKey);
    if (currentLock === now.toString()) {
      sessionStorage.removeItem(lockKey);
    }
  }
}

/**
 * Call this instead of refreshGoogleToken() directly.
 * Returns cached token if still valid, otherwise coalesces concurrent callers
 * for the same service into one network request. Uses cross-tab locking to
 * prevent concurrent refresh races.
 */
export function getOrRefresh(
  service: GoogleService,
  refreshFn: () => Promise<string | null>
): Promise<string | null> {
  const cached = getProviderToken(service);
  if (cached) return Promise.resolve(cached);
  if (!_inFlight.has(service)) {
    // Wrap refresh in cross-tab lock to prevent multiple tabs refreshing simultaneously
    _inFlight.set(
      service,
      withRefreshLock(service, refreshFn).finally(() => _inFlight.delete(service))
    );
  }
  return _inFlight.get(service)!;
}
