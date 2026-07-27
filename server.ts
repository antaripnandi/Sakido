import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getSupabaseAdmin } from './src/lib/supabaseServer.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Supabase Backend Status & Test Endpoint
  app.get('/api/supabase/status', async (req, res) => {
    try {
      const supabase = getSupabaseAdmin();
      // Execute a light query or RPC to verify connectivity
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

  // Vite development middleware vs production static file serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
