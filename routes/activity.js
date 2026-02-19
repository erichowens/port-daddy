/**
 * Activity Routes
 *
 * Handles activity log queries and statistics.
 * Extracted from server.js lines 1732-1804.
 */

import { Router } from 'express';

/**
 * Create activity routes
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.activityLog - Activity log module instance
 * @returns {Router} Express router
 */
export function createActivityRoutes(deps) {
  const { logger, metrics, activityLog } = deps;
  const router = Router();

  // =========================================================================
  // GET /activity - Get recent activity
  // =========================================================================
  router.get('/activity', (req, res) => {
    try {
      const { limit, type, agent, target } = req.query;

      const result = activityLog.getRecent({
        limit: limit ? parseInt(limit, 10) : 100,
        type,
        agentId: agent,
        targetPattern: target
      });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/range - Get activity by time range
  // =========================================================================
  router.get('/activity/range', (req, res) => {
    try {
      const { start, end, limit } = req.query;

      if (!start) {
        return res.status(400).json({ error: 'start timestamp required' });
      }

      const startTime = parseInt(start, 10);
      const endTime = end ? parseInt(end, 10) : Date.now();

      const result = activityLog.getByTimeRange(startTime, endTime, {
        limit: limit ? parseInt(limit, 10) : 1000
      });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_range_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/summary - Get activity summary
  // =========================================================================
  router.get('/activity/summary', (req, res) => {
    try {
      const { since } = req.query;
      const sinceTimestamp = since ? parseInt(since, 10) : 0;

      const result = activityLog.getSummary(sinceTimestamp);
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_summary_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /activity/stats - Get activity log stats
  // =========================================================================
  router.get('/activity/stats', (req, res) => {
    try {
      const result = activityLog.getStats();
      res.json(result);
    } catch (error) {
      metrics.errors++;
      logger.error('get_activity_stats_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
