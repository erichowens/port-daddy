#!/usr/bin/env node

/**
 * Port Daddy - Authoritative port assignment service
 *
 * Runs on localhost:9876 and manages port assignments for all dev servers
 * across multiple AI agent sessions. Prevents port conflicts through atomic
 * SQLite transactions and automatic cleanup of stale processes.
 */

import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import winston from 'winston';
import rateLimit from 'express-rate-limit';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load configuration
const configPath = join(__dirname, 'config.json');
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, 'utf8'))
  : {
      service: { port: 9876, host: 'localhost' },
      ports: { range_start: 3100, range_end: 9999, reserved: [8080, 8000, 9876] },
      cleanup: { interval_ms: 300000 },
      logging: { level: 'info', file: 'port-daddy.log', error_file: 'port-daddy-error.log' },
      security: { rate_limit: { window_ms: 60000, max_requests: 100 } }
    };

// Load version
const versionPath = join(__dirname, 'VERSION');
const VERSION = existsSync(versionPath)
  ? readFileSync(versionPath, 'utf8').trim()
  : '0.0.0-dev';

// Configure Winston logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'port-daddy', version: VERSION },
  transports: [
    new winston.transports.File({
      filename: join(__dirname, config.logging.error_file),
      level: 'error'
    }),
    new winston.transports.File({
      filename: join(__dirname, config.logging.file)
    })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Database configuration
const DB_PATH = join(__dirname, 'port-registry.db');
const PORT = config.service.port;
const PORT_RANGE_START = config.ports.range_start;
const PORT_RANGE_END = config.ports.range_end;
const RESERVED_PORTS = config.ports.reserved;

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better concurrency

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS port_assignments (
    port INTEGER PRIMARY KEY,
    project TEXT NOT NULL,
    pid INTEGER NOT NULL,
    started INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_project ON port_assignments(project);
  CREATE INDEX IF NOT EXISTS idx_pid ON port_assignments(pid);
`);

// Metrics tracking
const metrics = {
  total_assignments: 0,
  total_releases: 0,
  total_cleanups: 0,
  ports_freed_by_cleanup: 0,
  errors: 0,
  uptime_start: Date.now()
};

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rate_limit.window_ms,
  max: config.security.rate_limit.max_requests,
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// Serve static dashboard
app.use(express.static(join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });
  next();
});

// Utility: Check if process is alive (secure, no shell injection)
function isProcessAlive(pid) {
  try {
    // Use spawnSync with direct args (no shell) - prevents injection
    const result = spawnSync('ps', ['-p', String(pid)], {
      stdio: 'ignore',
      timeout: 1000
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

// Utility: Get all ports currently listening on the system
function getSystemPorts() {
  try {
    const result = spawnSync('lsof', ['-i', '-P', '-n', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      timeout: 5000
    });

    if (result.status !== 0 || !result.stdout) {
      return [];
    }

    const lines = result.stdout.trim().split('\n').slice(1); // Skip header
    const ports = [];

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length < 9) continue;

      const command = parts[0];
      const pid = parseInt(parts[1], 10);
      const user = parts[2];
      const name = parts[8]; // e.g., "*:3000" or "localhost:9876"

      // Extract port from name field
      const portMatch = name.match(/:(\d+)$/);
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        ports.push({ port, pid, command, user });
      }
    }

    // Deduplicate by port (keep first occurrence)
    const seen = new Set();
    return ports.filter(p => {
      if (seen.has(p.port)) return false;
      seen.add(p.port);
      return true;
    }).sort((a, b) => a.port - b.port);
  } catch (err) {
    logger.error('system_port_scan_failed', { error: err.message });
    return [];
  }
}

// Utility: Check if a specific port is in use on the system
function isPortInUseOnSystem(port) {
  try {
    const result = spawnSync('lsof', ['-i', `:${port}`, '-P', '-n', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      timeout: 2000
    });
    return result.status === 0 && result.stdout && result.stdout.trim().length > 0;
  } catch {
    return false; // Assume not in use if check fails
  }
}

// Utility: Clean up stale entries
function cleanupStale() {
  const stmt = db.prepare('SELECT port, pid, project FROM port_assignments');
  const entries = stmt.all();
  const freed = [];

  for (const entry of entries) {
    if (!isProcessAlive(entry.pid)) {
      db.prepare('DELETE FROM port_assignments WHERE port = ?').run(entry.port);
      freed.push({ port: entry.port, project: entry.project });
    }
  }

  if (freed.length > 0) {
    metrics.total_cleanups++;
    metrics.ports_freed_by_cleanup += freed.length;
    logger.info('cleanup_completed', { freed_count: freed.length, freed_ports: freed });
  }

  return freed;
}

// Utility: Find next available port
function findAvailablePort() {
  const dbUsed = db.prepare('SELECT port FROM port_assignments').all().map(r => r.port);
  const systemPorts = getSystemPorts().map(p => p.port);
  const usedSet = new Set([...dbUsed, ...systemPorts, ...RESERVED_PORTS]);

  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedSet.has(port)) {
      // Double-check this specific port isn't in use (race condition protection)
      if (!isPortInUseOnSystem(port)) {
        return port;
      }
    }
  }

  throw new Error('No available ports in range');
}

// GET /version - Version information
app.get('/version', (req, res) => {
  res.json({
    version: VERSION,
    service: 'port-daddy',
    node_version: process.version
  });
});

// GET /metrics - Service metrics
app.get('/metrics', (req, res) => {
  const uptime_seconds = Math.floor((Date.now() - metrics.uptime_start) / 1000);
  const portCount = db.prepare('SELECT COUNT(*) as count FROM port_assignments').get().count;

  res.json({
    ...metrics,
    active_ports: portCount,
    uptime_seconds,
    uptime_formatted: formatUptime(uptime_seconds)
  });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// POST /ports/request - Request a port for a project
app.post('/ports/request', (req, res) => {
  try {
    const { project, preferred } = req.body;

    if (!project) {
      return res.status(400).json({ error: 'project name required' });
    }

    const now = Date.now();
    const requestingPid = parseInt(req.headers['x-pid']) || process.pid;

    // Check for existing assignment (and verify process is alive)
    const existing = db.prepare('SELECT * FROM port_assignments WHERE project = ?').get(project);

    if (existing) {
      if (isProcessAlive(existing.pid)) {
        // Update last_seen
        db.prepare('UPDATE port_assignments SET last_seen = ? WHERE port = ?').run(now, existing.port);
        logger.info('port_renewed', { port: existing.port, project, pid: existing.pid });
        return res.json({
          port: existing.port,
          message: 'existing assignment renewed',
          existing: true
        });
      } else {
        // Clean up stale entry
        db.prepare('DELETE FROM port_assignments WHERE port = ?').run(existing.port);
        logger.info('stale_assignment_cleared', { port: existing.port, project, old_pid: existing.pid });
      }
    }

    // Try preferred port if specified
    if (preferred && !RESERVED_PORTS.includes(preferred)) {
      const conflict = db.prepare('SELECT * FROM port_assignments WHERE port = ?').get(preferred);
      const systemInUse = isPortInUseOnSystem(preferred);

      if (systemInUse && !conflict) {
        // Port is in use by something outside Port Daddy - can't assign it
        logger.info('preferred_port_system_conflict', { port: preferred, project });
      } else if (!conflict || !isProcessAlive(conflict.pid)) {
        if (conflict) {
          db.prepare('DELETE FROM port_assignments WHERE port = ?').run(preferred);
        }
        // Final check before assignment
        if (!isPortInUseOnSystem(preferred)) {
          db.prepare('INSERT INTO port_assignments (port, project, pid, started, last_seen) VALUES (?, ?, ?, ?, ?)')
            .run(preferred, project, requestingPid, now, now);

          metrics.total_assignments++;
          logger.info('port_assigned', { port: preferred, project, pid: requestingPid, preferred: true });
          return res.json({ port: preferred, message: 'assigned preferred port' });
        }
      }
    }

    // Assign next available port
    const port = findAvailablePort();
    db.prepare('INSERT INTO port_assignments (port, project, pid, started, last_seen) VALUES (?, ?, ?, ?, ?)')
      .run(port, project, requestingPid, now, now);

    metrics.total_assignments++;
    logger.info('port_assigned', { port, project, pid: requestingPid, preferred: false });

    res.json({
      port,
      message: 'port assigned successfully'
    });
  } catch (error) {
    metrics.errors++;
    logger.error('port_request_failed', { error: error.message, body: req.body });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /ports/release - Release a port
app.delete('/ports/release', (req, res) => {
  try {
    const { port, project } = req.body;

    if (port) {
      const existing = db.prepare('SELECT project FROM port_assignments WHERE port = ?').get(port);
      db.prepare('DELETE FROM port_assignments WHERE port = ?').run(port);
      metrics.total_releases++;
      logger.info('port_released', { port, project: existing?.project });
      res.json({ success: true, message: `released port ${port}` });
    } else if (project) {
      const result = db.prepare('DELETE FROM port_assignments WHERE project = ?').run(project);
      metrics.total_releases += result.changes;
      logger.info('ports_released_by_project', { project, count: result.changes });
      res.json({ success: true, message: `released ${result.changes} port(s) for project ${project}` });
    } else {
      res.status(400).json({ error: 'port or project required' });
    }
  } catch (error) {
    metrics.errors++;
    logger.error('port_release_failed', { error: error.message, body: req.body });
    res.status(500).json({ error: error.message });
  }
});

// GET /ports/active - List all active port assignments
app.get('/ports/active', (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT port, project, pid, started, last_seen
      FROM port_assignments
      ORDER BY port
    `).all();

    const enhanced = entries.map(e => ({
      ...e,
      alive: isProcessAlive(e.pid),
      age_minutes: Math.floor((Date.now() - e.started) / 60000),
      started_at: new Date(e.started).toISOString(),
      last_seen_at: new Date(e.last_seen).toISOString()
    }));

    res.json({ ports: enhanced, count: enhanced.length });
  } catch (error) {
    metrics.errors++;
    logger.error('list_ports_failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /ports/system - Show all ports currently in use on the system
app.get('/ports/system', (req, res) => {
  try {
    const systemPorts = getSystemPorts();
    const dbAssignments = db.prepare('SELECT port, project FROM port_assignments').all();
    const dbMap = new Map(dbAssignments.map(a => [a.port, a.project]));

    // Enhance with Port Daddy info
    const enhanced = systemPorts.map(p => ({
      ...p,
      managed_by_port_daddy: dbMap.has(p.port),
      project: dbMap.get(p.port) || null
    }));

    // Filter options
    const { range_only, unmanaged_only } = req.query;

    let filtered = enhanced;
    if (range_only === 'true') {
      filtered = filtered.filter(p => p.port >= PORT_RANGE_START && p.port <= PORT_RANGE_END);
    }
    if (unmanaged_only === 'true') {
      filtered = filtered.filter(p => !p.managed_by_port_daddy);
    }

    res.json({
      ports: filtered,
      count: filtered.length,
      total_system_ports: systemPorts.length
    });
  } catch (error) {
    metrics.errors++;
    logger.error('system_ports_failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /ports/cleanup - Clean up stale assignments
app.post('/ports/cleanup', (req, res) => {
  try {
    const freed = cleanupStale();
    res.json({ freed, count: freed.length });
  } catch (error) {
    metrics.errors++;
    logger.error('cleanup_failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// GET /health - Health check
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const portCount = db.prepare('SELECT COUNT(*) as count FROM port_assignments').get().count;

  res.json({
    status: 'ok',
    version: VERSION,
    uptime_seconds: Math.floor(uptime),
    active_ports: portCount,
    pid: process.pid
  });
});

// Periodic cleanup (configurable interval)
setInterval(() => {
  cleanupStale();
}, config.cleanup.interval_ms);

// Graceful shutdown
function shutdown(signal) {
  logger.info('shutdown_initiated', { signal });
  db.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
app.listen(PORT, config.service.host, () => {
  logger.info('server_started', {
    port: PORT,
    host: config.service.host,
    db_path: DB_PATH,
    port_range: `${PORT_RANGE_START}-${PORT_RANGE_END}`
  });

  console.log(`
  Port Daddy v${VERSION}
  ────────────────────────────────────
  Service:    http://${config.service.host}:${PORT}
  Dashboard:  http://${config.service.host}:${PORT}/
  Database:   ${DB_PATH}
  Port range: ${PORT_RANGE_START}-${PORT_RANGE_END}
  ────────────────────────────────────
  Ready to assign ports!
  `);
});
