/**
 * Routes Aggregator
 *
 * Collects all route modules and mounts them on the Express app.
 * Each route module exports a factory function that accepts dependencies.
 */

import { Router } from 'express';

import { createServicesRoutes } from './services.js';
import { createMessagingRoutes } from './messaging.js';
import { createLocksRoutes } from './locks.js';
import { createAgentsRoutes } from './agents.js';
import { createHealthRoutes } from './health.js';
import { createActivityRoutes } from './activity.js';
import { createWebhooksRoutes } from './webhooks.js';
import { createDetectConfigRoutes } from './detect-config.js';
import { createProjectsRoutes } from './projects.js';
import { createInfoRoutes } from './info.js';

/**
 * Create and configure all routes
 *
 * @param deps - Dependencies for route handlers
 * @returns Express router with all routes mounted
 */
export function createRoutes(deps: Record<string, unknown>): Router {
  const router = Router();

  // Info routes first (health/version are high-frequency, low-latency)
  router.use(createInfoRoutes(deps as any));

  // V2 API routes
  router.use(createServicesRoutes(deps as any));
  router.use(createMessagingRoutes(deps as any));
  router.use(createLocksRoutes(deps as any));
  router.use(createAgentsRoutes(deps as any));
  router.use(createHealthRoutes(deps as any));
  router.use(createActivityRoutes(deps as any));
  router.use(createWebhooksRoutes(deps as any));
  router.use(createDetectConfigRoutes(deps as any));
  router.use(createProjectsRoutes(deps as any));

  return router;
}
