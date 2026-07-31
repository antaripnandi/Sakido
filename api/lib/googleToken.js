// api/lib/googleToken.js
// Shared Google OAuth token helpers for serverless endpoints (service-role only).
// Single source of truth for the service -> column mapping so the refresh
// endpoint and the keepalive cron never drift apart.

export const SERVICE_COLUMNS = {
  googleCalendar: { tokenCol: 'calendar_refresh_token', flagCol: 'google_calendar_connected' },
  googleDrive:    { tokenCol: 'drive_refresh_token',    flagCol: 'google_drive_connected' },
  gmail:          { tokenCol: 'gmail_refresh_token',    flagCol: 'gmail_connected' },
};

export function getTokenCol(service) {
  return SERVICE_COLUMNS[service]?.tokenCol || 'calendar_refresh_token';
}

export function getFlagCol(service) {
  // Fallback preserved from the original refresh-token.js inline ternary
  return SERVICE_COLUMNS[service]?.flagCol || 'gmail_connected';
}

// Exchange a refresh token for a fresh access token (and possibly a rotated
// refresh token). Returns { ok, status, data } — never throws on HTTP errors.
export async function exchangeGoogleToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}
