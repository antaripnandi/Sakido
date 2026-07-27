import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Monitoring metrics state
interface MetricsState {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  startTime: number;
  routeStats: Record<string, { count: number; totalDurationMs: number }>;
}

const metrics: MetricsState = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  rateLimitedRequests: 0,
  startTime: Date.now(),
  routeStats: {},
};

/**
 * Express middleware for request monitoring and performance tracking
 */
export function monitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  metrics.totalRequests++;

  const routeKey = `${req.method} ${req.path}`;
  if (!metrics.routeStats[routeKey]) {
    metrics.routeStats[routeKey] = { count: 0, totalDurationMs: 0 };
  }

  res.on('finish', () => {
    const duration = performance.now() - start;
    metrics.routeStats[routeKey].count++;
    metrics.routeStats[routeKey].totalDurationMs += duration;

    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.successfulRequests++;
    } else if (res.statusCode === 429) {
      metrics.rateLimitedRequests++;
    } else {
      metrics.failedRequests++;
    }

    console.log(
      `[API MON] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration.toFixed(2)}ms`
    );
  });

  next();
}

/**
 * Standard Rate Limiter: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again after 15 minutes.',
  },
  handler: (req, res, next, options) => {
    metrics.rateLimitedRequests++;
    res.status(options.statusCode).json(options.message);
  },
});

/**
 * Strict Rate Limiter for sensitive endpoints: 20 requests per 15 minutes
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Strict rate limit exceeded. Please slow down your requests.',
  },
});

/**
 * Returns current API metrics summary
 */
export function getApiMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  
  const routesFormatted = Object.entries(metrics.routeStats).reduce(
    (acc, [route, stats]) => {
      acc[route] = {
        requests: stats.count,
        avgResponseTimeMs: stats.count > 0 ? Number((stats.totalDurationMs / stats.count).toFixed(2)) : 0,
      };
      return acc;
    },
    {} as Record<string, { requests: number; avgResponseTimeMs: number }>
  );

  return {
    uptimeSeconds,
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    failedRequests: metrics.failedRequests,
    rateLimitedRequests: metrics.rateLimitedRequests,
    routes: routesFormatted,
  };
}
