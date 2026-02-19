/**
 * Activity Routes
 *
 * Handles activity log queries and statistics.
 * Extracted from server.js lines 1732-1804.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

interface ActivityRouteDeps {
  logger: { error(msg: string, meta?: Record<string, unknown>): void };
  metrics: { errors: number };
  activityLog: {
    getRecent(opts: { limit: number; type?: string; agentId?: string; targetPattern?: string }): unknown;
    getByTimeRange(start: number, end: number, opts: { limit: number }): unknown;
    getSummary(since: number): unknown;
    getStats(): unknown;
  };
}

/**
 * Create activity routes
 *
 * @param deps - Dependencies
 * @returns Express router
 */
export function createActivityRoutes(deps: ActivityRouteDeps): Router {
  const { logger, metrics, activityLog } = deps;
  const router = Router();

  // =========================================================================
  // GET /activity - Get recent activity
  // =========================================================================
  router.get('/activity', (req: Request, res: Response) => {
    try {
      const { limit, type, agent, target } = req.query;

      const result = activityLog.getRecent({
        limit: limit ? parseInt(limit as string, 10) : 100,
        type: type as string | undefined,
        agentId: agent as string | undefined,
        targetPattern: target as string | undefined
      });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/range - Get activity by time range
  // =========================================================================
  router.get('/activity/range', (req: Request, res: Response) => {
    try {
      const { start, end, limit } = req.query;

      if (!start) {
        return res.status(400).json({ error: 'start timestamp required' });
      }

      const startTime = parseInt(start as string, 10);
      const endTime = end ? parseInt(end as string, 10) : Date.now();

      const result = activityLog.getByTimeRange(startTime, endTime, {
        limit: limit ? parseInt(limit as string, 10) : 1000
      });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_range_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/summary - Get activity summary
  // =========================================================================
  router.get('/activity/summary', (req: Request, res: Response) => {
    try {
      const { since } = req.query;
      const sinceTimestamp = since ? parseInt(since as string, 10) : 0;

      const result = activityLog.getSummary(sinceTimestamp);
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_summary_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/stats - Get activity log stats
  // =========================================================================
  router.get('/activity/stats', (_req: Request, res: Response) => {
    try {
      const result = activityLog.getStats();
      res.json(result);
    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_stats_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
