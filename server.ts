import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { getSupabaseAdmin } from './src/lib/supabaseServer.js';

dotenv.config();

// Simple sliding window rate limiter map for API security hardening
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || 'unknown-ip';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // 100 requests per window

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  record.count += 1;
  next();
}

/**
 * Server-side BOLA Guard Middleware
 * Extracts JWT token from Authorization header and verifies with Supabase Auth.
 * Never trusts client-supplied user IDs.
 */
async function authenticateUser(req: Request & { user?: any }, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Valid bearer token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // Attach verified user object to request
    req.user = data.user;
    next();
  } catch {
    return res.status(500).json({ error: 'Authentication service unavailable.' });
  }
}

/**
 * Creates and configures the Express application with all middleware and routes.
 * Used both for local development (with Vite middleware) and Vercel serverless.
 */
export async function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // Security Hardening Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Apply Rate Limiting to all /api/ endpoints
  app.use('/api', apiRateLimiter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Supabase Backend Status & Test Endpoint
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
        error: 'Failed to verify Supabase connection',
      });
    }
  });

  // BOLA-Protected User Profile API Endpoint
  // Always derives user ID from authenticated JWT token
  app.get('/api/user/profile', authenticateUser, async (req: Request & { user?: any }, res: Response) => {
    try {
      const userId = req.user.id; // Derived safely server-side
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ profile: data });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Express static middleware for public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // In production (including Vercel), serve the built Vite static files
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler - Prevents Stack Trace / Internal DB Leakage
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  return app;
}

// ============================================================
// Vercel serverless handler — used when deployed on Vercel
// ============================================================
let cachedApp: express.Application | null = null;

export default async function handler(req: Request, res: Response) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
}

// ============================================================
// Local development server — starts Express with Vite middleware
// ============================================================
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  async function startDevServer() {
    const app = await createApp();

    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }

  startDevServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
