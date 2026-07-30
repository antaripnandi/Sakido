/**
 * In-memory Google OAuth access token store.
 * Never touches localStorage — lives only in the JS module scope for this tab session.
 * The token is short-lived (1 hour). refreshGoogleToken() re-fetches it automatically.
 */
let _token: string | null = null;

export const getProviderToken = (): string | null => _token;
export const setProviderToken = (t: string | null): void => { _token = t; };
export const clearProviderToken = (): void => { _token = null; };
