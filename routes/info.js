/**
 * Info Routes
 *
 * Version, metrics, health, and system port information.
 * Also provides /ports/* endpoints that delegate to V2 services.
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { formatUptime } from '../shared/port-utils.js';

/**
 * Create info routes
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.services - Services module
 * @param {Object} deps.config - Configuration object
 * @param {string} deps.VERSION - Version string
 * @param {string} deps.CODE_HASH - Code hash string
 * @param {number} deps.STARTED_AT - Startup timestamp
 * @param {string} deps.__dirname - Base directory path
 * @param {Function} deps.cleanupStale - Cleanup function
 * @returns {Router} Express router
 */
export function createInfoRoutes(deps) {
  const { metrics, services, config, VERSION, CODE_HASH, STARTED_AT, __dirname, cleanupStale } = deps;
  const router = Router();

  // =========================================================================
  // GET /version
  // =========================================================================
  router.get('/version', (req, res) => {
    res.json({
      version: VERSION,
      codeHash: CODE_HASH,
      startedAt: STARTED_AT,
      service: 'port-daddy',
      api: 'semantic',
      node_version: process.version,
      pid: process.pid,
      uptime: Math.floor(process.uptime()),
      installDir: __dirname
    });
  });

  // =========================================================================
  // GET /metrics
  // =========================================================================
  router.get('/metrics', (req, res) => {
    const uptime_seconds = Math.floor((Date.now() - metrics.uptime_start) / 1000);
    const serviceResult = services.find('*');
    res.json({
      ...metrics,
      active_ports: serviceResult.success ? serviceResult.count : 0,
      uptime_seconds,
      uptime_formatted: formatUptime(uptime_seconds)
    });
  });

  // =========================================================================
  // GET /health
  // =========================================================================
  router.get('/health', (req, res) => {
    const serviceResult = services.find('*');
    res.json({
      status: 'ok',
      version: VERSION,
      uptime_seconds: Math.floor(process.uptime()),
      active_ports: serviceResult.success ? serviceResult.count : 0,
      pid: process.pid
    });
  });

  // =========================================================================
  // /ports/* - Thin wrappers delegating to V2 services
  // These exist for CLI compatibility (get-port, release-port, list-ports)
  // =========================================================================

  // POST /ports/request -> delegates to services.claim()
  router.post('/ports/request', (req, res) => {
    try {
      const { project, preferred } = req.body;
      if (!project) {
        return res.status(400).json({ error: 'project name required' });
      }

      const PORT_RANGE_START = config.ports.range_start;
      const PORT_RANGE_END = config.ports.range_end;

      const result = services.claim(project, {
        port: preferred,
        range: [PORT_RANGE_START, PORT_RANGE_END],
        pid: parseInt(req.headers['x-pid'], 10) || process.pid,
        systemPorts: new Set()
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      metrics.total_assignments++;
      res.json({
        port: result.port,
        message: result.existing ? 'existing assignment renewed' : 'port assigned successfully',
        existing: result.existing || false
      });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // DELETE /ports/release -> delegates to services.release()
  router.delete('/ports/release', (req, res) => {
    try {
      const { port, project } = req.body;
      const id = project || (port ? `*` : null);

      if (!id && port === undefined) {
        return res.status(400).json({ error: 'port or project required' });
      }

      // If releasing by project name, use it directly as identity
      if (project) {
        const result = services.release(project);
        metrics.total_releases += result.released || 0;
        return res.json({ success: true, message: `released ${result.released || 0} port(s) for project ${project}` });
      }

      // If releasing by port, find the service on that port first
      if (port !== undefined) {
        const found = services.find('*', { port: parseInt(port, 10) });
        if (found.success && found.services.length > 0) {
          const result = services.release(found.services[0].id);
          metrics.total_releases++;
          return res.json({ success: true, message: `released port ${port}` });
        }
        return res.json({ success: true, message: `no service on port ${port}` });
      }
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // GET /ports/active -> delegates to services.find('*')
  router.get('/ports/active', (req, res) => {
    try {
      const result = services.find('*');
      if (!result.success) {
        return res.status(500).json({ error: 'internal server error' });
      }

      const ports = result.services.map(s => ({
        port: s.port,
        project: s.id,
        pid: s.pid,
        started: s.createdAt,
        last_seen: s.lastSeen,
        alive: true, // Services are active if in the list
        age_minutes: Math.floor((Date.now() - s.createdAt) / 60000)
      }));

      res.json({ ports, count: ports.length });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // GET /ports/system - System ports (rate limited)
  const systemPortsLimiter = rateLimit({
    windowMs: 60000, max: 30,
    message: { error: 'System port scanning rate limited' }
  });

  router.get('/ports/system', systemPortsLimiter, (req, res) => {
    try {
      const { getSystemPorts } = deps;
      const systemPorts = getSystemPorts();
      const serviceResult = services.find('*');
      const serviceMap = new Map(
        (serviceResult.success ? serviceResult.services : [])
          .map(s => [s.port, s.id])
      );

      let filtered = systemPorts.map(p => ({
        ...p,
        managed_by_port_daddy: serviceMap.has(p.port),
        project: serviceMap.get(p.port) || null
      }));

      const PORT_RANGE_START = config.ports.range_start;
      const PORT_RANGE_END = config.ports.range_end;

      if (req.query.range_only === 'true') {
        filtered = filtered.filter(p => p.port >= PORT_RANGE_START && p.port <= PORT_RANGE_END);
      }
      if (req.query.unmanaged_only === 'true') {
        filtered = filtered.filter(p => !p.managed_by_port_daddy);
      }

      res.json({ ports: filtered, count: filtered.length, total_system_ports: systemPorts.length });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // POST /ports/cleanup
  router.post('/ports/cleanup', (req, res) => {
    try {
      const freed = cleanupStale();
      res.json({ freed, count: freed.length });
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  return router;
}
