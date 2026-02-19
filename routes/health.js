/**
 * Health Routes
 *
 * Handles service health monitoring and wait operations.
 * Extracted from server.js lines 1415-1501.
 */

import { Router } from 'express';
import { validateIdentity } from '../shared/validators.js';

/**
 * Create health routes
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.health - Health module instance
 * @returns {Router} Express router
 */
export function createHealthRoutes(deps) {
  const { logger, metrics, health } = deps;
  const router = Router();

  // =========================================================================
  // GET /services/health/:id - Check health of a service
  // =========================================================================
  router.get('/services/health/:id', async (req, res) => {
    try {
      const idValidation = validateIdentity(req.params.id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      const result = await health.check(req.params.id);
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('health_check_failed', { id: req.params.id, error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /wait/:id - Wait for a single service to be healthy
  // =========================================================================
  router.get('/wait/:id', async (req, res) => {
    try {
      const idValidation = validateIdentity(req.params.id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      // Max 5 minutes timeout, default 60 seconds
      const timeout = Math.min(parseInt(req.query.timeout, 10) || 60000, 300000);

      const result = await health.waitFor(req.params.id, { timeout });
      res.json(result);

    } catch (error) {
      if (error.message.includes('Timeout')) {
        return res.status(408).json({ success: false, error: error.message });
      }
      metrics.errors++;
      logger.error('wait_for_failed', { id: req.params.id, error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // POST /wait - Wait for multiple services to be healthy
  // =========================================================================
  router.post('/wait', async (req, res) => {
    try {
      const { services: serviceIds, timeout } = req.body;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({ error: 'services must be a non-empty array' });
      }

      if (serviceIds.length > 20) {
        return res.status(400).json({ error: 'too many services (max 20)' });
      }

      for (const id of serviceIds) {
        const validation = validateIdentity(id);
        if (!validation.valid) {
          return res.status(400).json({ error: `invalid service id '${id}': ${validation.error}` });
        }
      }

      // Max 5 minutes timeout, default 60 seconds
      const safeTimeout = Math.min(timeout || 60000, 300000);

      const result = await health.waitForAll(serviceIds, { timeout: safeTimeout });
      res.json(result);

    } catch (error) {
      if (error.message.includes('Timeout')) {
        return res.status(408).json({ success: false, error: error.message });
      }
      metrics.errors++;
      logger.error('wait_for_all_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /services/health - List all health statuses
  // =========================================================================
  router.get('/services/health', (req, res) => {
    try {
      const result = health.listStatus();
      res.json(result);
    } catch (error) {
      metrics.errors++;
      logger.error('list_health_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
