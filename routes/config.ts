/**
 * Config Routes
 *
 * Configuration loading endpoint.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from '../lib/config.js';

interface ConfigRouteDeps {
  metrics: { errors: number };
}

/**
 * Create config routes
 *
 * @param deps - Route dependencies
 * @returns Express router with config routes
 */
export function createConfigRoutes(deps: ConfigRouteDeps): Router {
  const { metrics } = deps;
  const router = Router();

  // ==========================================================================
  // GET /config - Load existing config
  // ==========================================================================
  router.get('/config', (req: Request, res: Response) => {
    try {
      const { dir } = req.query;
      const targetDir: string = (dir as string) || process.cwd();

      const config = loadConfig(targetDir);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'No .portdaddyrc found',
          suggestion: 'Run port-daddy scan to create one'
        });
      }

      res.json({
        success: true,
        config,
        path: (config as Record<string, unknown>)._path
      });

    } catch (error) {
      if ((error as Error).message.includes('Failed to parse')) {
        return res.status(400).json({ success: false, error: (error as Error).message });
      }
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
