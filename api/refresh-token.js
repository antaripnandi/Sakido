import { createClient } from '@supabase/supabase-js';

// --- Rate limiting (in-memory, best-effort on warm instances) ---
const rateMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const limit = 50;
  const current = rateMap.get(ip);
  if (!current || now > current.resetTime) {
    rateMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  if (current.count >= limit) return true;
  current.count += 1;
  return false;
}

// --- CORS: only production + this project's own preview deployments ---
const PROD_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://sakidoapp.vercel.app';
// Matches sakido-<hash>-antaripnandi.vercel.app style preview URLs only
const PREVIEW_RE = /^https:\/\/sakido[a-z0-9-]*\.vercel\.app$/;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return origin === PROD_ORIGIN || PREVIEW_RE.test(origin);
}

// --- Input validation (lightweight, no Zod dep needed) ---
function validateToken(token) {
  // Supabase JWTs are base64url segments separated by dots, typically 300–1500 chars
  return typeof token === 'string' && token.length >= 20 && token.length <= 2000;
}

export default async function handler(req, res) {
  // 1. CORS
  const reqOrigin = req.headers.origin;
  const originToSet = isAllowedOrigin(reqOrigin) ? reqOrigin : PROD_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', originToSet);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 2. Rate limit
  const clientIp =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many refresh requests. Please try again later.' });
  }

  // 3. Auth header — validate shape before touching Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Active session token required.' });
  }
  const userToken = authHeader.slice(7);
  if (!validateToken(userToken)) {
    return res.status(401).json({ error: 'Malformed authorization token.' });
  }

  // 4. Env vars
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!supabaseUrl || !supabaseServiceKey || !clientId || !clientSecret) {
    return res.status(500).json({ error: 'Authentication service temporarily unconfigured.' });
  }

  // 5. Verify Supabase session & fetch refresh token from DB (admin client, never exposed to client)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let user = null;
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(userToken);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session authorization.' });
    }
    user = userData.user;
  } catch {
    return res.status(401).json({ error: 'Session validation failed.' });
  }

  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('google_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .single();

  if (tokenError || !tokenRow?.refresh_token) {
    return res.status(400).json({ error: 'reconnect_required', message: 'No Google refresh token on file.' });
  }

  // 6. Exchange refresh token for a new access token with Google
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenRow.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error || 'google_token_refresh_failed',
      });
    }

    // Handle token rotation — Google may issue a new refresh token
    if (data.refresh_token) {
      await supabaseAdmin.from('google_tokens').upsert({
        user_id: user.id,
        refresh_token: data.refresh_token,
        updated_at: new Date().toISOString(),
      });
    }

    // Return only the short-lived access token — refresh token never leaves the server
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
    });
  } catch {
    return res.status(500).json({ error: 'Internal server error while processing token refresh.' });
  }
}
