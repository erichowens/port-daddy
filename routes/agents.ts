/**
 * Agents Routes
 *
 * V2 Agent Endpoints for agent registry and heartbeat.
 * Provides agent registration, heartbeat, and resource tracking.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { validateAgentId } from '../shared/validators.js';
import { WebhookEvent } from '../lib/webhooks.js';

interface AgentsRouteDeps {
  logger: {
    info(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };
  metrics: { errors: number };
  agents: {
    register(id: string, opts: Record<string, unknown>): Record<string, unknown>;
    heartbeat(id: string, opts: Record<string, unknown>): Record<string, unknown>;
    unregister(id: string): Record<string, unknown>;
    get(id: string): Record<string, unknown>;
    list(opts: { activeOnly: boolean }): unknown;
  };
  activityLog: {
    logAgent: {
      register(id: string): void;
      heartbeat(id: string): void;
      unregister(id: string): void;
    };
  };
  webhooks: {
    trigger(event: string, payload: Record<string, unknown>, opts: { targetId: string }): void;
  };
}

/**
 * Create agents routes
 *
 * @param deps - Route dependencies
 * @returns Express router with agent routes
 */
export function createAgentsRoutes(deps: AgentsRouteDeps): Router {
  const { logger, metrics, agents, activityLog, webhooks } = deps;
  const router = Router();

  // ==========================================================================
  // POST /agents - Register an agent
  // ==========================================================================
  router.post('/agents', (req: Request, res: Response) => {
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
        pid: parseInt(req.headers['x-pid'] as string, 10) || process.pid,
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

      logger.info('agent_registered', { agentId: id, registered: result.registered as boolean });
      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('agent_register_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // POST /agents/:id/heartbeat - Send heartbeat
  // ==========================================================================
  router.post('/agents/:id/heartbeat', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const result = agents.heartbeat(id, {
        pid: parseInt(req.headers['x-pid'] as string, 10) || process.pid
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
  router.delete('/agents/:id', (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

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
  router.get('/agents/:id', (req: Request, res: Response) => {
    try {
      const result = agents.get(req.params.id as string);

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
  router.get('/agents', (req: Request, res: Response) => {
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
