/**
 * Agents Routes
 *
 * V2 Agent Endpoints for agent registry and heartbeat.
 * Provides agent registration, heartbeat, and resource tracking.
 */

import { Router } from 'express';
import { validateAgentId } from '../shared/validators.js';
import { WebhookEvent } from '../lib/webhooks.js';

/**
 * Create agents routes
 *
 * @param {Object} deps - Route dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.agents - Agents module instance
 * @param {Object} deps.activityLog - Activity log module instance
 * @param {Object} deps.webhooks - Webhooks module instance
 * @returns {Router} Express router with agent routes
 */
export function createAgentsRoutes(deps) {
  const { logger, metrics, agents, activityLog, webhooks } = deps;
  const router = Router();

  // ==========================================================================
  // POST /agents - Register an agent
  // ==========================================================================
  router.post('/agents', (req, res) => {
    try {
      const { id, name, type, metadata, maxServices, maxLocks } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'agent id required' });
      }

      // Validate agent ID format
      const idValidation = validateAgentId(id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      const result = agents.register(id, {
        name,
        pid: parseInt(req.headers['x-pid'], 10) || process.pid,
        type: type || 'cli',
        metadata,
        maxServices,
        maxLocks
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Log activity
      if (result.registered) {
        activityLog.logAgent.register(id);

        // Trigger webhooks
        webhooks.trigger(WebhookEvent.AGENT_REGISTER, {
          agentId: id,
          name: name || id,
          type: type || 'cli'
        }, { targetId: id });
      }

      logger.info('agent_registered', { agentId: id, registered: result.registered });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('agent_register_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // POST /agents/:id/heartbeat - Send heartbeat
  // ==========================================================================
  router.post('/agents/:id/heartbeat', (req, res) => {
    try {
      const { id } = req.params;

      const result = agents.heartbeat(id, {
        pid: parseInt(req.headers['x-pid'], 10) || process.pid
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Log activity (with sampling to avoid log spam)
      // Only log every 10th heartbeat or on registration
      if (result.registered || Math.random() < 0.1) {
        activityLog.logAgent.heartbeat(id);
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // DELETE /agents/:id - Unregister an agent
  // ==========================================================================
  router.delete('/agents/:id', (req, res) => {
    try {
      const { id } = req.params;

      const result = agents.unregister(id);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Log activity
      if (result.unregistered) {
        activityLog.logAgent.unregister(id);

        // Trigger webhooks
        webhooks.trigger(WebhookEvent.AGENT_UNREGISTER, {
          agentId: id
        }, { targetId: id });
      }

      logger.info('agent_unregistered', { agentId: id });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /agents/:id - Get agent info
  // ==========================================================================
  router.get('/agents/:id', (req, res) => {
    try {
      const result = agents.get(req.params.id);

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
  // GET /agents - List all agents
  // ==========================================================================
  router.get('/agents', (req, res) => {
    try {
      const { active } = req.query;
      const result = agents.list({ activeOnly: active === 'true' });
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
