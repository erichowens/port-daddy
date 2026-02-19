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
          return res.status(400).json({ error: (portValidation as { error: string }).error });
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
        return res.status(400).json({ error: result.error });
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
        return res.status(400).json({ error: statusValidation.error });
      }

      // Security: Validate pattern if provided
      if (pattern) {
        const patternValidation = validateIdentity(pattern as string);
        if (!patternValidation.valid) {
          return res.status(400).json({ error: patternValidation.error });
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
        return res.status(400).json({ error: idValidation.error });
      }

      const result = services.get(req.params.id as string);
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

  return router;
}
