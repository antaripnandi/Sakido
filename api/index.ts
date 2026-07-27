import express from 'express';
import dotenv from 'dotenv';
import { getSupabaseAdmin } from '../src/lib/supabaseServer.js';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/supabase/status', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getSession();
    res.json({
      connected: true,
      url: process.env.SUPABASE_URL || null,
      hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      hasPublishableKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
      hasJwksUrl: Boolean(process.env.SUPABASE_JWKS_URL),
      authError: error ? error.message : null,
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      error: err.message || 'Failed to connect to Supabase backend',
    });
  }
});

export default app;
