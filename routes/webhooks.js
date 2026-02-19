/**
 * Webhooks Routes
 *
 * Webhook subscription management endpoints.
 * Provides registration, listing, updating, and testing of webhooks.
 */

import { Router } from 'express';
import { WebhookEvent } from '../lib/webhooks.js';

/**
 * Create webhooks routes
 *
 * @param {Object} deps - Route dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.webhooks - Webhooks module instance
 * @returns {Router} Express router with webhook routes
 */
export function createWebhooksRoutes(deps) {
  const { logger, metrics, webhooks } = deps;
  const router = Router();

  // ==========================================================================
  // POST /webhooks - Register a webhook
  // ==========================================================================
  router.post('/webhooks', (req, res) => {
    try {
      const { url, events, secret, filterPattern, metadata } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'url required' });
      }

      const result = webhooks.register(url, { events, secret, filterPattern, metadata });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('webhook_registered', { id: result.id, url, events });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('webhook_register_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /webhooks - List webhooks
  // ==========================================================================
  router.get('/webhooks', (req, res) => {
    try {
      const { active } = req.query;
      const result = webhooks.list({ activeOnly: active === 'true' });
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /webhooks/events - Get available webhook events
  // IMPORTANT: This route MUST come before /webhooks/:id to avoid matching
  // ==========================================================================
  router.get('/webhooks/events', (req, res) => {
    res.json({
      success: true,
      events: Object.values(WebhookEvent),
      descriptions: {
        'service.claim': 'Fired when a service claims a port',
        'service.release': 'Fired when a service releases a port',
        'agent.register': 'Fired when an agent registers',
        'agent.unregister': 'Fired when an agent unregisters',
        'agent.stale': 'Fired when an agent is detected as stale',
        'lock.acquire': 'Fired when a lock is acquired',
        'lock.release': 'Fired when a lock is released',
        'message.publish': 'Fired when a message is published to a channel',
        'daemon.start': 'Fired when Port Daddy daemon starts',
        'daemon.stop': 'Fired when Port Daddy daemon stops'
      }
    });
  });

  // ==========================================================================
  // GET /webhooks/:id - Get webhook by ID
  // ==========================================================================
  router.get('/webhooks/:id', (req, res) => {
    try {
      const result = webhooks.get(req.params.id);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // PUT /webhooks/:id - Update webhook
  // ==========================================================================
  router.put('/webhooks/:id', (req, res) => {
    try {
      const { url, events, filterPattern, active, metadata } = req.body;

      const result = webhooks.update(req.params.id, { url, events, filterPattern, active, metadata });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      logger.info('webhook_updated', { id: req.params.id });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // DELETE /webhooks/:id - Delete webhook
  // ==========================================================================
  router.delete('/webhooks/:id', (req, res) => {
    try {
      const result = webhooks.remove(req.params.id);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      logger.info('webhook_deleted', { id: req.params.id });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // POST /webhooks/:id/test - Test a webhook
  // ==========================================================================
  router.post('/webhooks/:id/test', async (req, res) => {
    try {
      const result = await webhooks.test(req.params.id);
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /webhooks/:id/deliveries - Get webhook deliveries
  // ==========================================================================
  router.get('/webhooks/:id/deliveries', (req, res) => {
    try {
      const { limit } = req.query;
      const result = webhooks.getDeliveries(req.params.id, {
        limit: limit ? parseInt(limit, 10) : 50
      });
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
