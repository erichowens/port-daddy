/**
 * Detect & Config Routes
 *
 * V2 Detect & Config Endpoints for stack detection and project configuration.
 * Provides framework detection, config generation, and config loading.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { detectStack, suggestIdentity } from '../lib/detect.js';
import { generateConfig, saveConfig, loadConfig } from '../lib/config.js';

interface DetectConfigRouteDeps {
  metrics: { errors: number };
}

/**
 * Create detect-config routes
 *
 * @param deps - Route dependencies
 * @returns Express router with detect-config routes
 */
export function createDetectConfigRoutes(deps: DetectConfigRouteDeps): Router {
  const { metrics } = deps;
  const router = Router();

  // ==========================================================================
  // POST /detect - Detect stack in a directory
  // ==========================================================================
  router.post('/detect', (req: Request, res: Response) => {
    try {
      const { dir } = req.body;
      const targetDir: string = dir || process.cwd();

      const stack = detectStack(targetDir);
      const identity = suggestIdentity(targetDir);

      res.json({
        success: true,
        stack: stack ? {
          name: stack.name,
          defaultPort: stack.defaultPort,
          devCmd: stack.devCmd,
          healthPath: stack.healthPath,
          detected: stack.detected
        } : null,
        suggestedIdentity: identity,
        message: stack ? `Detected ${stack.name}` : 'No framework detected'
      });

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // POST /init - Generate config for a directory
  // ==========================================================================
  router.post('/init', (req: Request, res: Response) => {
    try {
      const { dir, save } = req.body;
      const targetDir: string = dir || process.cwd();

      const config = generateConfig(targetDir);

      if (save) {
        const configPath = saveConfig(config, targetDir);
        return res.json({
          success: true,
          config,
          saved: true,
          path: configPath,
          message: `Created ${configPath}`
        });
      }

      res.json({
        success: true,
        config,
        saved: false,
        message: 'Config generated (not saved)'
      });

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

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
          suggestion: 'Run port-daddy init to create one'
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
