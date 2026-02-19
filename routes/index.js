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
 * @param {Object} deps - Dependencies for route handlers
 * @returns {Router} Express router with all routes mounted
 */
export function createRoutes(deps) {
  const router = Router();

  // Info routes first (health/version are high-frequency, low-latency)
  router.use(createInfoRoutes(deps));

  // V2 API routes
  router.use(createServicesRoutes(deps));
  router.use(createMessagingRoutes(deps));
  router.use(createLocksRoutes(deps));
  router.use(createAgentsRoutes(deps));
  router.use(createHealthRoutes(deps));
  router.use(createActivityRoutes(deps));
  router.use(createWebhooksRoutes(deps));
  router.use(createDetectConfigRoutes(deps));
  router.use(createProjectsRoutes(deps));

  return router;
}
