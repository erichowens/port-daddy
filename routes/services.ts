/**
 * Services Routes
 *
 * Handles service claiming, releasing, and querying.
 * Extracted from server.js lines 832-1059.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
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

interface ServicesRouteDeps {
  logger: {
    info(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };
  metrics: {
    errors: number;
    total_assignments: number;
    total_releases: number;
    validation_failures: number;
  };
  services: {
    claim(id: string, opts: Record<string, unknown>): Record<string, unknown>;
    release(id: string, opts?: Record<string, unknown>): Record<string, unknown>;
    find(pattern: string, opts?: Record<string, unknown>): Record<string, unknown>;
    get(id: string): Record<string, unknown>;
    setEndpoint(id: string, env: string, url: string): Record<string, unknown>;
  };
  agents: {
    canClaimService(agentId: string): { allowed: boolean; error?: string; current?: number; max?: number };
  };
  activityLog: {
    logService: {
      claim(id: string, agentId: string, port: number): void;
      release(id: string, agentId: string, port: number | null): void;
    };
  };
  webhooks: {
    trigger(event: string, payload: Record<string, unknown>, opts: { targetId: string }): void;
  };
  config: {
    ports: {
      range_start: number;
      range_end: number;
      reserved: number[];
    };
  };
}

/**
 * Create services routes
 *
 * @param deps - Dependencies
 * @returns Express router
 */
export function createServicesRoutes(deps: ServicesRouteDeps): Router {
  const { logger, metrics, services, agents, activityLog, webhooks, config } = deps;
  const router = Router();

  // Extract port configuration
  const PORT_RANGE_START: number = config.ports.range_start;
  const PORT_RANGE_END: number = config.ports.range_end;
  const RESERVED_PORTS: number[] = config.ports.reserved;

  // =========================================================================
  // POST /claim - Claim a port with semantic identity
  // =========================================================================
  router.post('/claim', (req: Request, res: Response) => {
    try {
      const { id, port, range, expires, pair, cmd, cwd, pid, metadata } = req.body;

      const idValidation = validateIdentity(id);
      if (!idValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: idValidation.error, code: 'IDENTITY_INVALID' });
      }

      const pidValidation = validatePid(req.headers['x-pid'] || pid);
      if (!pidValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: pidValidation.error, code: 'VALIDATION_ERROR' });
      }

      // Security: Validate metadata size
      const metaValidation = validateMetadata(metadata);
      if (!metaValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: metaValidation.error, code: 'VALIDATION_ERROR' });
      }

      if (port !== undefined) {
        const portValidation = validatePreferredPort(port, PORT_RANGE_START, PORT_RANGE_END, RESERVED_PORTS);
        if (!portValidation.valid) {
          metrics.validation_failures++;
          return res.status(400).json({ error: (portValidation as { error: string }).error, code: 'VALIDATION_ERROR' });
        }
      }

      const systemPorts = new Set(getSystemPorts().map((p: { port: number }) => p.port));

      // Check agent resource limits
      const agentId = req.headers['x-agent-id'] as string | undefined;
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
        const code = (result.error as string)?.includes('port') ? 'PORT_EXHAUSTED' : 'VALIDATION_ERROR';
        return res.status(400).json({ error: result.error, code });
      }

      metrics.total_assignments++;
      logger.info('v2_claim', { id: result.id as string, port: result.port as number, existing: result.existing as boolean });

      // Log activity
      const activityAgentId: string = agentId || `pid-${pidValidation.pid || process.pid}`;
      activityLog.logService.claim(result.id as string, activityAgentId, result.port as number);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.SERVICE_CLAIM, {
        serviceId: result.id as string,
        port: result.port as number,
        agentId: activityAgentId,
        existing: result.existing as boolean
      }, { targetId: result.id as string });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('v2_claim_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // DELETE /release - Release services by ID or pattern
  // =========================================================================
  router.delete('/release', (req: Request, res: Response) => {
    try {
      const { id, expired } = req.body;

      if (expired) {
        const result = services.release('*', { expired: true });
        metrics.total_releases += (result.released as number);
        return res.json(result);
      }

      if (!id) {
        return res.status(400).json({ error: 'id or expired flag required', code: 'VALIDATION_ERROR' });
      }

      const idValidation = validateIdentity(id);
      if (!idValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: idValidation.error, code: 'IDENTITY_INVALID' });
      }

      const result = services.release(id);
      if (!result.success) {
        return res.status(400).json({ error: result.error, code: 'SERVICE_NOT_FOUND' });
      }

      metrics.total_releases += (result.released as number);
      logger.info('v2_release', { id, released: result.released as number });

      // Log activity
      const agentId: string = (req.headers['x-agent-id'] as string) || 'unknown';
      activityLog.logService.release(id, agentId, ((result.releasedPorts as number[]) ?? [])[0] || null);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.SERVICE_RELEASE, {
        serviceId: id,
        agentId,
        released: result.released as number,
        releasedPorts: result.releasedPorts as number[]
      }, { targetId: id });

      res.json(result);

    } catch (error) {
      metrics.errors++;
      logger.error('v2_release_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // GET /services - Find/list services
  // =========================================================================
  router.get('/services', (req: Request, res: Response) => {
    try {
      const { pattern, status, port, expired } = req.query;

      // Security: Validate status filter if provided
      const statusValidation = validateStatus(status as string | undefined);
      if (!statusValidation.valid) {
        return res.status(400).json({ error: statusValidation.error, code: 'VALIDATION_ERROR' });
      }

      // Security: Validate pattern if provided
      if (pattern) {
        const patternValidation = validateIdentity(pattern as string);
        if (!patternValidation.valid) {
          return res.status(400).json({ error: patternValidation.error, code: 'IDENTITY_INVALID' });
        }
      }

      const result = services.find((pattern as string) || '*', {
        status: statusValidation.status,
        port: port ? parseInt(port as string, 10) : undefined,
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
  router.get('/services/:id', (req: Request, res: Response) => {
    try {
      const idValidation = validateIdentity(req.params.id as string);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error, code: 'IDENTITY_INVALID' });
      }

      const result = services.get(req.params.id as string);
      if (!result.success) {
        return res.status(404).json({ error: result.error, code: 'SERVICE_NOT_FOUND' });
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
  router.put('/services/:id/endpoints/:env', (req: Request, res: Response) => {
    try {
      const { url } = req.body;

      // Security: Validate env parameter
      const envValidation = validateEnv(req.params.env as string);
      if (!envValidation.valid) {
        return res.status(400).json({ error: envValidation.error });
      }

      // Security: Validate URL (protocol whitelist, length check)
      const urlValidation = validateUrl(url);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }

      const idValidation = validateIdentity(req.params.id as string);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }

      const result = services.setEndpoint(req.params.id as string, req.params.env as string, urlValidation.url as string);
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
  // GET /wait/:id - Block until a service exists or timeout
  // =========================================================================
  router.get('/wait/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const idValidation = validateIdentity(id);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error, code: 'IDENTITY_INVALID' });
      }

      const timeout = Math.min(
        parseInt(req.query.timeout as string, 10) || 30000,
        120000 // Max 2 minutes
      );
      const pollInterval = 250; // Poll every 250ms
      const deadline = Date.now() + timeout;

      while (Date.now() < deadline) {
        const result = services.get(id);
        if (result.success) {
          const svc = result.service as Record<string, unknown>;
          return res.json({
            success: true,
            services: [svc],
            resolved: 1,
            requested: 1,
            timedOut: false
          });
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // Timeout
      res.status(408).json({
        success: false,
        error: `Timed out waiting for service "${id}" after ${timeout}ms`,
        code: 'TIMEOUT',
        services: [],
        resolved: 0,
        requested: 1,
        timedOut: true
      });

    } catch (error) {
      metrics.errors++;
      logger.error('wait_service_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // POST /wait - Block until multiple services exist or timeout
  // =========================================================================
  router.post('/wait', async (req: Request, res: Response) => {
    try {
      const { ids, timeout: reqTimeout } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          error: 'ids must be a non-empty array of service identities',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate all IDs up front
      for (const id of ids) {
        const idValidation = validateIdentity(id);
        if (!idValidation.valid) {
          return res.status(400).json({
            error: `Invalid identity "${id}": ${idValidation.error}`,
            code: 'IDENTITY_INVALID'
          });
        }
      }

      const timeout = Math.min(reqTimeout || 30000, 120000);
      const pollInterval = 250;
      const deadline = Date.now() + timeout;

      while (Date.now() < deadline) {
        const resolved: Record<string, unknown>[] = [];
        const missing: string[] = [];

        for (const id of ids) {
          const result = services.get(id);
          if (result.success) {
            resolved.push(result.service as Record<string, unknown>);
          } else {
            missing.push(id);
          }
        }

        if (missing.length === 0) {
          return res.json({
            success: true,
            services: resolved,
            resolved: resolved.length,
            requested: ids.length,
            timedOut: false
          });
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }

      // Timeout — return what we found
      const finalResolved: Record<string, unknown>[] = [];
      for (const id of ids) {
        const result = services.get(id);
        if (result.success) {
          finalResolved.push(result.service as Record<string, unknown>);
        }
      }

      res.status(408).json({
        success: false,
        error: `Timed out waiting for ${ids.length - finalResolved.length} service(s) after ${timeout}ms`,
        code: 'TIMEOUT',
        services: finalResolved,
        resolved: finalResolved.length,
        requested: ids.length,
        timedOut: true
      });

    } catch (error) {
      metrics.errors++;
      logger.error('wait_services_failed', { error: (error as Error).message });
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
