import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiting map for Edge fallback + headers protection
const rateMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const limit = 50; // max 50 requests per 15 min window

  const current = rateMap.get(ip);
  if (!current || now > current.resetTime) {
    rateMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  return false;
}

export default async function handler(req, res) {
  // 1. Strict CORS & Security Headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://sakidoapp.vercel.app';
  const reqOrigin = req.headers.origin;

  if (reqOrigin && (reqOrigin === allowedOrigin || reqOrigin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. IP Rate Limiting Check
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: 'Too many refresh requests. Please try again later.' });
  }

  // 3. Supabase Auth Verification Guard
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Active session token required.' });
  }

  const userToken = authHeader.split(' ')[1];
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Authentication service temporarily unconfigured.' });
  }

  let user = null;
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session authorization.' });
    }
    user = userData.user;
  } catch {
    return res.status(401).json({ error: 'Session validation failed.' });
  }

  // 4. Fetch User Refresh Token securely from DB using Admin Client (Server-Side Only)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from('google_tokens')
    .select('refresh_token')
    .eq('user_id', user.id)
    .single();

  if (tokenError || !tokenRow?.refresh_token) {
    return res.status(400).json({ error: 'reconnect_required', message: 'No Google refresh token found for user account.' });
  }

  // 5. Google OAuth Credentials Verification
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Authentication service temporarily unconfigured.' });
  }

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

    // 6. Automatically handle Google Token Rotation if a new refresh_token was issued
    if (data.refresh_token) {
      await supabaseAdmin.from('google_tokens').upsert({
        user_id: user.id,
        refresh_token: data.refresh_token,
        updated_at: new Date().toISOString(),
      });
    }

    // Return fresh short-lived access token strictly to the client (Refresh token NEVER returned)
    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
    });
  } catch {
    // Sanitized Error Response - Never leak internal err.message or stack trace
    return res.status(500).json({ error: 'Internal server error while processing token refresh.' });
  }
}
