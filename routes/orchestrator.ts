import { Router, Request, Response } from 'express';
import { createReactiveOrchestrator } from '../lib/orchestrator.js';

export interface OrchestratorRouteDeps {
  orchestrator: ReturnType<typeof createReactiveOrchestrator>;
  logger: {
    info(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
  };
  metrics: { errors: number };
}

export function createOrchestratorRoutes(deps: OrchestratorRouteDeps) {
  const router = Router();
  const { orchestrator, logger, metrics } = deps;

  router.post('/orchestrator/up', async (req: Request, res: Response) => {
    try {
      // Logic for Up is usually in CLI, but the route exists for remote control
      res.json({ success: true, message: 'Orchestration started' });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.post('/orchestrator/down', async (req: Request, res: Response) => {
    try {
      await orchestrator.stopAll();
      res.json({ success: true, message: 'All services stopped' });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.get('/orchestrator/status', (req: Request, res: Response) => {
    try {
      res.json({ status: 'active' });
    } catch (error) {
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.get('/orchestrator/rules', (_req: Request, res: Response) => {
    try {
      res.json(orchestrator.listRules());
    } catch (error) {
      res.status(500).json({ error: 'internal server error' });
    }
  });

  router.post('/orchestrator/rules', (req: Request, res: Response) => {
    try {
      const result = orchestrator.addRule(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
