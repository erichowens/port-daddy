/**
 * Services Routes
 *
 * Handles service claiming, releasing, and querying.
 * Extracted from server.js lines 832-1059.
 */

import { Router } from 'express';
import {
  validateIdentity,
  validateMetadata,
  validateStatus,
  validateEnv,
  validateUrl,
  validatePreferredPort,
  validatePid
} from '../shared/validators.js';
import { getSystemPorts } from '../shared/port-utils.js';
import { WebhookEvent } from '../lib/webhooks.js';

/**
 * Create services routes
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.services - Services module instance
 * @param {Object} deps.agents - Agents module instance
 * @param {Object} deps.activityLog - Activity log module instance
 * @param {Object} deps.webhooks - Webhooks module instance
 * @param {Object} deps.config - Configuration object
 * @returns {Router} Express router
 */
export function createServicesRoutes(deps) {
  const { logger, metrics, services, agents, activityLog, webhooks, config } = deps;
  const router = Router();

  // Extract port configuration
  const PORT_RANGE_START = config.ports.range_start;
  const PORT_RANGE_END = config.ports.range_end;
  const RESERVED_PORTS = config.ports.reserved;

  // =========================================================================
  // POST /claim - Claim a port with semantic identity
  // =========================================================================
  router.post('/claim', (req, res) => {
    try {
      const { id, port, range, expires, pair, cmd, cwd, pid, metadata } = req.body;

      const idValidation = validateIdentity(id);
      if (!idValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: idValidation.error });
      }

      const pidValidation = validatePid(req.headers['x-pid'] || pid);
      if (!pidValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: pidValidation.error });
      }

      // Security: Validate metadata size
      const metaValidation = validateMetadata(metadata);
      if (!metaValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: metaValidation.error });
      }

      if (port !== undefined) {
        const portValidation = validatePreferredPort(port, PORT_RANGE_START, PORT_RANGE_END, RESERVED_PORTS);
        if (!portValidation.valid) {
          metrics.validation_failures++;
          return res.status(400).json({ error: portValidation.error });
        }
      }

      const systemPorts = new Set(getSystemPorts().map(p => p.port));

      // Check agent resource limits
      const agentId = req.headers['x-agent-id'];
      if (agentId) {
        const limitCheck = agents.canClaimService(agentId);
        if (!limitCheck.allowed) {
          return res.status(429).json({
            error: limitCheck.error,
            current: limitCheck.current,
            max: limitCheck.max
          });
        }
      }

      const result = services.claim(id, {
        port,
        range: range || [PORT_RANGE_START, PORT_RANGE_END],
        pid: pidValidation.pid || process.pid,
        cmd,
        cwd,
        expires,
        pair,
        metadata: metaValidation.metadata,
        systemPorts
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      metrics.total_assignments++;
      logger.info('v2_claim', { id: result.id, port: result.port, existing: result.existing });

      // Log activity
      const activityAgentId = agentId || `pid-${pidValidation.pid || process.pid}`;
      activityLog.logService.claim(result.id, activityAgentId, result.port);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.SERVICE_CLAIM, {
        serviceId: result.id,
        port: result.port,
        agentId: activityAgentId,
        existing: result.existing
      }, { targetId: result.id });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('v2_claim_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // DELETE /release - Release services by ID or pattern
  // =========================================================================
  router.delete('/release', (req, res) => {
    try {
      const { id, expired } = req.body;

      if (expired) {
        const result = services.release('*', { expired: true });
        metrics.total_releases += result.released;
        return res.json(result);
      }

      if (!id) {
        return res.status(400).json({ error: 'id or expired flag required' });
      }

      const idValidation = validateIdentity(id);
      if (!idValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: idValidation.error });
      }

      const result = services.release(id);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      metrics.total_releases += result.released;
      logger.info('v2_release', { id, released: result.released });

      // Log activity
      const agentId = req.headers['x-agent-id'] || 'unknown';
      activityLog.logService.release(id, agentId, result.releasedPorts?.[0] || null);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.SERVICE_RELEASE, {
        serviceId: id,
        agentId,
        released: result.released,
        releasedPorts: result.releasedPorts
      }, { targetId: id });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('v2_release_failed', { error: error.message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /services - Find/list services
  // =========================================================================
  router.get('/services', (req, res) => {
    try {
      const { pattern, status, port, expired } = req.query;

      // Security: Validate status filter if provided
      const statusValidation = validateStatus(status);
      if (!statusValidation.valid) {
        return res.status(400).json({ error: statusValidation.error });
      }

      // Security: Validate pattern if provided
      if (pattern) {
        const patternValidation = validateIdentity(pattern);
        if (!patternValidation.valid) {
          return res.status(400).json({ error: patternValidation.error });
        }
      }

      const result = services.find(pattern || '*', {
        status: statusValidation.status,
        port: port ? parseInt(port, 10) : undefined,
        expired: expired === 'true' ? true : expired === 'false' ? false : undefined
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /services/:id - Get single service
  // =========================================================================
  router.get('/services/:id', (req, res) => {
    try {
      const idValidation = validateIdentity(req.params.id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      const result = services.get(req.params.id);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // PUT /services/:id/endpoints/:env - Set endpoint URL
  // =========================================================================
  router.put('/services/:id/endpoints/:env', (req, res) => {
    try {
      const { url } = req.body;

      // Security: Validate env parameter
      const envValidation = validateEnv(req.params.env);
      if (!envValidation.valid) {
        return res.status(400).json({ error: envValidation.error });
      }

      // Security: Validate URL (protocol whitelist, length check)
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }

      const idValidation = validateIdentity(req.params.id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      const result = services.setEndpoint(req.params.id, req.params.env, urlValidation.url);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
