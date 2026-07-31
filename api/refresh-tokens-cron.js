// api/refresh-tokens-cron.js
// Vercel Cron keepalive: exchanges every stored Google refresh token once a
// day so tokens used < once per 6 months are not revoked by Google.
// Triggered by vercel.json -> "crons" -> /api/refresh-tokens-cron.
//
// Security: Vercel sends `Authorization: Bearer $CRON_SECRET` on cron
// invocations. We require that exact header; any other caller gets 401.

import { createClient } from '@supabase/supabase-js';
import { SERVICE_COLUMNS, exchangeGoogleToken } from './lib/googleToken.js';

const SERVICE_KEYS = Object.keys(SERVICE_COLUMNS);

export default async function handler(req, res) {
  // 1. Cron auth — only Vercel cron (Bearer $CRON_SECRET) may call this.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Env vars
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
    return res.status(500).json({ error: 'Keepalive service temporarily unconfigured.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Fetch every row that has at least one stored refresh token.
  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('google_tokens')
    .select('user_id, calendar_refresh_token, drive_refresh_token, gmail_refresh_token, google_calendar_connected, google_drive_connected, gmail_connected');

  if (rowsError) {
    return res.status(500).json({ error: 'Failed to fetch token rows.', detail: rowsError.message });
  }

  const summary = { checked: 0, refreshed: 0, rotated: 0, invalidated: 0, errors: 0 };

  // 4. Exchange each stored token. An exchange itself counts as "use", so a
  //    daily refresh is sufficient to keep tokens alive indefinitely.
  for (const row of rows || []) {
    for (const service of SERVICE_KEYS) {
      const { tokenCol, flagCol } = SERVICE_COLUMNS[service];
      const storedToken = row[tokenCol];
      if (!storedToken) continue;

      summary.checked += 1;

      try {
        const { ok, data } = await exchangeGoogleToken({
          clientId,
          clientSecret,
          refreshToken: storedToken,
        });

        if (!ok) {
          if (data.error === 'invalid_grant') {
            // Dead token — clear it and its flag so the user is prompted to
            // reconnect instead of silently keeping a broken connection.
            await supabaseAdmin.from('google_tokens')
              .update({
                [tokenCol]: null,
                [flagCol]: false,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', row.user_id);
            summary.invalidated += 1;
          } else {
            summary.errors += 1;
            console.error('[keepalive] non-invalid_grant failure', service, row.user_id, data.error);
          }
          continue;
        }

        summary.refreshed += 1;

        // Handle token rotation — Google may issue a new refresh token.
        if (data.refresh_token) {
          await supabaseAdmin.from('google_tokens')
            .update({
              [tokenCol]: data.refresh_token,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', row.user_id);
          summary.rotated += 1;
        }
      } catch (err) {
        summary.errors += 1;
        console.error('[keepalive] exchange threw', service, row.user_id, err);
      }
    }
  }

  return res.status(200).json({ ok: true, ...summary });
}
