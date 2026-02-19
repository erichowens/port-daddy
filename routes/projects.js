/**
 * Projects & Scan Routes
 *
 * POST /scan         - Deep scan directory, register project, return results + guidance
 * GET  /projects     - List all registered projects
 * GET  /projects/:id - Get project details
 * DELETE /projects/:id - Remove a project
 */

import { Router } from 'express';
import { scanProject, buildConfigFromScan } from '../lib/scan.js';
import { saveConfig } from '../lib/config.js';

/**
 * Create projects routes
 *
 * @param {Object} deps - Route dependencies
 * @param {Object} deps.projects - Projects module
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.activityLog - Activity log module
 * @returns {Router} Express router with project routes
 */
export function createProjectsRoutes(deps) {
  const { projects, metrics, logger, activityLog } = deps;
  const router = Router();

  // ==========================================================================
  // POST /scan - Deep scan a directory for services
  // ==========================================================================
  router.post('/scan', (req, res) => {
    try {
      const { dir, save = true, dryRun = false, useBranch = false } = req.body;
      const targetDir = dir || process.cwd();

      // Run the deep scan
      const result = scanProject(targetDir, { useBranch });

      // Build config from scan results
      const config = buildConfigFromScan(result);

      // Register project centrally
      projects.register({
        id: result.project,
        root: result.root,
        type: result.type,
        config,
        services: result.services,
        metadata: {
          workspaceType: result.workspaceType,
          serviceCount: result.serviceCount,
          frameworks: Object.values(result.services).map(s => s.stack.name)
        }
      });

      // Save .portdaddyrc unless dry-run
      let savedPath = null;
      if (save && !dryRun && result.serviceCount > 0) {
        savedPath = saveConfig(config, targetDir);
      }

      logger.info('project_scanned', {
        project: result.project,
        type: result.type,
        serviceCount: result.serviceCount,
        saved: !!savedPath
      });

      if (activityLog?.log) {
        activityLog.log('project_scan', {
          details: `Scanned ${result.project}: ${result.serviceCount} services found`,
          metadata: { project: result.project, type: result.type }
        });
      }

      res.json({
        success: true,
        project: result.project,
        root: result.root,
        type: result.type,
        serviceCount: result.serviceCount,
        services: Object.fromEntries(
          Object.entries(result.services).map(([name, svc]) => [
            name,
            {
              dir: svc.relativePath || svc.dir,
              framework: svc.stack.name,
              dev: svc.dev,
              health: svc.health,
              preferredPort: svc.preferredPort
            }
          ])
        ),
        suggestions: result.suggestions,
        config,
        saved: !!savedPath,
        savedPath,
        dryRun,
        guidance: result.guidance,
        existingConfig: result.existingConfig ? {
          path: result.existingConfig._path,
          serviceCount: Object.keys(result.existingConfig.services || {}).length
        } : null
      });

    } catch (error) {
      metrics.errors++;
      logger.error('scan_error', { error: error.message });
      res.status(500).json({ error: 'scan failed', details: error.message });
    }
  });

  // ==========================================================================
  // GET /projects - List all registered projects
  // ==========================================================================
  router.get('/projects', (req, res) => {
    try {
      const all = projects.list();

      res.json({
        success: true,
        count: all.length,
        projects: all.map(p => ({
          id: p.id,
          root: p.root,
          type: p.type,
          serviceCount: p.services ? Object.keys(p.services).length : 0,
          lastScanned: p.last_scanned,
          createdAt: p.created_at,
          frameworks: p.metadata?.frameworks || []
        }))
      });

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // GET /projects/:id - Get project details
  // ==========================================================================
  router.get('/projects/:id', (req, res) => {
    try {
      const project = projects.get(req.params.id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
          suggestion: 'Run port-daddy scan from the project directory'
        });
      }

      res.json({
        success: true,
        project: {
          id: project.id,
          root: project.root,
          type: project.type,
          config: project.config,
          services: project.services,
          lastScanned: project.last_scanned,
          createdAt: project.created_at,
          metadata: project.metadata
        }
      });

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // ==========================================================================
  // DELETE /projects/:id - Remove a project
  // ==========================================================================
  router.delete('/projects/:id', (req, res) => {
    try {
      const removed = projects.remove(req.params.id);

      if (!removed) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      logger.info('project_removed', { id: req.params.id });

      res.json({
        success: true,
        message: `Project "${req.params.id}" removed`
      });

    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
