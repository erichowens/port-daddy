/**
 * Locks Routes
 *
 * V2 Lock Endpoints for multi-agent coordination.
 * Provides distributed locking with TTL, ownership, and extension.
 */

import { Router } from 'express';
import { validateLockName } from '../shared/validators.js';
import { WebhookEvent } from '../lib/webhooks.js';

/**
 * Create locks routes
 *
 * @param {Object} deps - Route dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.locks - Locks module instance
 * @param {Object} deps.agents - Agents module instance
 * @param {Object} deps.activityLog - Activity log module instance
 * @param {Object} deps.webhooks - Webhooks module instance
 * @returns {Router} Express router with lock routes
 */
export function createLocksRoutes(deps) {
  const { logger, metrics, locks, agents, activityLog, webhooks } = deps;
  const router = Router();

  // ==========================================================================
  // POST /locks/:name - Acquire a lock
  // ==========================================================================
  router.post('/locks/:name', (req, res) => {
    try {
      const { name } = req.params;
      const { owner, ttl, metadata } = req.body;

      // Validate lock name
      const nameValidation = validateLockName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
      }

      // Check agent resource limits
      const agentId = owner || req.headers['x-agent-id'];
      if (agentId) {
        const limitCheck = agents.canAcquireLock(agentId);
        if (!limitCheck.allowed) {
          return res.status(429).json({
            error: limitCheck.error,
            current: limitCheck.current,
            max: limitCheck.max
          });
        }
      }

      const result = locks.acquire(name, {
        owner: owner || req.headers['x-agent-id'] || `agent-${process.pid}`,
        pid: parseInt(req.headers['x-pid'], 10) || process.pid,
        ttl: ttl || 300000,
        metadata
      });

      if (!result.success) {
        return res.status(409).json(result); // Conflict - lock is held
      }

      logger.info('lock_acquired', { name, owner: result.owner });

      // Log activity
      activityLog.logLock.acquire(name, result.owner);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.LOCK_ACQUIRE, {
        lockName: name,
        owner: result.owner,
        expiresAt: result.expiresAt
      }, { targetId: name });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('lock_acquire_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // DELETE /locks/:name - Release a lock
  // ==========================================================================
  router.delete('/locks/:name', (req, res) => {
    try {
      const { name } = req.params;
      const { owner, force } = req.body || {};

      const result = locks.release(name, {
        owner: owner || req.headers['x-agent-id'],
        force: force === true
      });

      if (!result.success) {
        return res.status(403).json(result);
      }

      logger.info('lock_released', { name, released: result.released });

      // Log activity
      if (result.released) {
        activityLog.logLock.release(name, owner || 'unknown');

        // Trigger webhooks
        webhooks.trigger(WebhookEvent.LOCK_RELEASE, {
          lockName: name,
          owner: owner || 'unknown'
        }, { targetId: name });
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /locks/:name - Check lock status
  // ==========================================================================
  router.get('/locks/:name', (req, res) => {
    try {
      const result = locks.check(req.params.name);
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /locks - List all locks
  // ==========================================================================
  router.get('/locks', (req, res) => {
    try {
      const { owner } = req.query;
      const result = locks.list({ owner });
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // PUT /locks/:name - Extend lock TTL
  // ==========================================================================
  router.put('/locks/:name', (req, res) => {
    try {
      const { ttl, owner } = req.body || {};
      const result = locks.extend(req.params.name, {
        owner: owner || req.headers['x-agent-id'],
        ttl
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
