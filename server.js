#!/usr/bin/env node

/**
 * Port Daddy v2.0 - Semantic Port Management Service
 *
 * Features:
 * - Semantic identities: project:stack:context
 * - Service directory: local/tunnel/dev/staging/prod URLs
 * - Pub/sub messaging for agent coordination
 * - Backwards compatible with v1 API
 */

import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import winston from 'winston';
import rateLimit from 'express-rate-limit';

// V2 modules
import { parseIdentity, patternToSql } from './lib/identity.js';
import { createServices } from './lib/services.js';
import { createMessaging } from './lib/messaging.js';
import { createLocks } from './lib/locks.js';
import { createHealth } from './lib/health.js';
import { detectStack, suggestIdentity, getDevCommand } from './lib/detect.js';
import { loadConfig, generateConfig, saveConfig, getServiceConfig, expandCommand } from './lib/config.js';
import { createAgents } from './lib/agents.js';
import { createActivityLog, ActivityType } from './lib/activity.js';
import { createWebhooks, WebhookEvent } from './lib/webhooks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// CONFIGURATION
// =============================================================================

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

// Read version from package.json
const pkgPath = join(__dirname, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '2.0.0' };
const VERSION = pkg.version;

// Calculate code hash for stale daemon detection
// Hash key source files so CLI can detect when daemon is running old code
function calculateCodeHash() {
  const filesToHash = [
    'server.js',
    'lib/services.js',
    'lib/messaging.js',
    'lib/locks.js',
    'lib/health.js',
    'lib/detect.js',
    'lib/config.js',
    'lib/identity.js',
    'lib/utils.js',
    'lib/agents.js',
    'lib/activity.js',
    'lib/webhooks.js'
  ];

  const hash = createHash('sha256');
  for (const file of filesToHash) {
    const filePath = join(__dirname, file);
    if (existsSync(filePath)) {
      hash.update(readFileSync(filePath));
    }
  }
  return hash.digest('hex').slice(0, 12); // Short hash is sufficient
}

const CODE_HASH = calculateCodeHash();
const STARTED_AT = Date.now();

// =============================================================================
// CONNECTION TRACKING (Security: prevent resource exhaustion)
// =============================================================================

const connectionLimits = {
  maxLongPoll: 50,        // Max concurrent long-poll connections total
  maxSSE: 100,            // Max concurrent SSE connections total
  maxPerIP: 5,            // Max connections per IP (both types)
  pollInterval: 1000,     // Long-poll check interval (reduced from 100ms)
  sseTimeout: 300000      // SSE connection timeout (5 minutes)
};

const activeConnections = {
  longPoll: new Map(),    // ip -> count
  sse: new Map(),         // ip -> Set<res>
  totalLongPoll: 0,
  totalSSE: 0
};

function canOpenConnection(ip, type) {
  const map = type === 'longPoll' ? activeConnections.longPoll : activeConnections.sse;
  const total = type === 'longPoll' ? activeConnections.totalLongPoll : activeConnections.totalSSE;
  const max = type === 'longPoll' ? connectionLimits.maxLongPoll : connectionLimits.maxSSE;

  if (total >= max) return false;
  const ipCount = map.get(ip) || (type === 'sse' ? new Set() : 0);
  const count = type === 'sse' ? ipCount.size : ipCount;
  return count < connectionLimits.maxPerIP;
}

function trackConnection(ip, type, res = null) {
  if (type === 'longPoll') {
    activeConnections.longPoll.set(ip, (activeConnections.longPoll.get(ip) || 0) + 1);
    activeConnections.totalLongPoll++;
  } else {
    if (!activeConnections.sse.has(ip)) {
      activeConnections.sse.set(ip, new Set());
    }
    activeConnections.sse.get(ip).add(res);
    activeConnections.totalSSE++;
  }
}

function untrackConnection(ip, type, res = null) {
  if (type === 'longPoll') {
    const count = activeConnections.longPoll.get(ip) || 0;
    if (count <= 1) {
      activeConnections.longPoll.delete(ip);
    } else {
      activeConnections.longPoll.set(ip, count - 1);
    }
    activeConnections.totalLongPoll = Math.max(0, activeConnections.totalLongPoll - 1);
  } else {
    const set = activeConnections.sse.get(ip);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        activeConnections.sse.delete(ip);
      }
    }
    activeConnections.totalSSE = Math.max(0, activeConnections.totalSSE - 1);
  }
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

const PROJECT_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const IDENTITY_REGEX = /^[a-zA-Z0-9._:*-]+$/;
const PROJECT_NAME_MAX_LENGTH = 255;
const PID_MIN = 1;
const PID_MAX = 99999;

function validateProjectName(project) {
  if (!project || typeof project !== 'string') {
    return { valid: false, error: 'project name must be a non-empty string' };
  }
  if (project.length > PROJECT_NAME_MAX_LENGTH) {
    return { valid: false, error: `project name too long (max ${PROJECT_NAME_MAX_LENGTH} characters)` };
  }
  if (!PROJECT_NAME_REGEX.test(project)) {
    return { valid: false, error: 'project name contains invalid characters (use alphanumeric, dash, underscore, dot)' };
  }
  return { valid: true };
}

function validateIdentity(id) {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'identity must be a non-empty string' };
  }
  if (id.length > 200) {
    return { valid: false, error: 'identity too long (max 200 characters)' };
  }
  if (!IDENTITY_REGEX.test(id)) {
    return { valid: false, error: 'identity contains invalid characters' };
  }
  return parseIdentity(id);
}

function validatePid(pidValue) {
  if (pidValue === undefined || pidValue === null) {
    return { valid: true, pid: null };
  }
  const pid = parseInt(pidValue, 10);
  if (isNaN(pid) || pid < PID_MIN || pid > PID_MAX) {
    return { valid: false, error: `PID must be between ${PID_MIN} and ${PID_MAX}` };
  }
  return { valid: true, pid };
}

function validatePort(portValue) {
  if (portValue === undefined || portValue === null) {
    return { valid: true, port: null };
  }
  const port = parseInt(portValue, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return { valid: false, error: 'port must be between 1 and 65535' };
  }
  return { valid: true, port };
}

function validatePreferredPort(portValue, rangeStart, rangeEnd, reservedPorts) {
  const baseValidation = validatePort(portValue);
  if (!baseValidation.valid) return baseValidation;
  if (baseValidation.port === null) return { valid: true, port: null };

  const port = baseValidation.port;
  if (port < rangeStart || port > rangeEnd) {
    return { valid: false, error: `preferred port must be in range ${rangeStart}-${rangeEnd}` };
  }
  if (reservedPorts.includes(port)) {
    return { valid: false, error: 'preferred port is reserved and cannot be assigned' };
  }
  return { valid: true, port };
}

function validateChannel(channel) {
  if (!channel || typeof channel !== 'string') {
    return { valid: false, error: 'channel must be a non-empty string' };
  }
  if (channel.length > 100) {
    return { valid: false, error: 'channel name too long (max 100 characters)' };
  }
  if (!/^[a-zA-Z0-9._:-]+$/.test(channel)) {
    return { valid: false, error: 'channel contains invalid characters' };
  }
  return { valid: true };
}

function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'url must be a non-empty string' };
  }
  if (url.length > 2048) {
    return { valid: false, error: 'url too long (max 2048 characters)' };
  }
  try {
    const parsed = new URL(url);
    const allowed = ['http:', 'https:', 'ws:', 'wss:'];
    if (!allowed.includes(parsed.protocol)) {
      return { valid: false, error: 'invalid URL protocol (must be http, https, ws, or wss)' };
    }
    return { valid: true, url };
  } catch {
    return { valid: false, error: 'malformed URL' };
  }
}

function validateEnv(env) {
  if (!env || typeof env !== 'string') {
    return { valid: false, error: 'env must be a non-empty string' };
  }
  if (env.length > 50) {
    return { valid: false, error: 'env name too long (max 50 characters)' };
  }
  if (!/^[a-z0-9_-]+$/.test(env)) {
    return { valid: false, error: 'env contains invalid characters (use lowercase alphanumeric, dash, underscore)' };
  }
  return { valid: true };
}

function validateMetadata(metadata) {
  if (metadata === undefined || metadata === null) {
    return { valid: true, metadata: null };
  }
  const str = JSON.stringify(metadata);
  if (str.length > 10000) {
    return { valid: false, error: 'metadata too large (max 10KB)' };
  }
  return { valid: true, metadata };
}

function validateStatus(status) {
  const allowed = ['assigned', 'running', 'stopped', 'crashed'];
  if (!status) {
    return { valid: true, status: undefined };
  }
  if (!allowed.includes(status)) {
    return { valid: false, error: `invalid status (must be one of: ${allowed.join(', ')})` };
  }
  return { valid: true, status };
}

// =============================================================================
// LOGGING
// =============================================================================

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

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// =============================================================================
// DATABASE
// =============================================================================

const DB_PATH = join(__dirname, 'port-registry.db');
const PORT = config.service.port;
const PORT_RANGE_START = config.ports.range_start;
const PORT_RANGE_END = config.ports.range_end;
const RESERVED_PORTS = config.ports.reserved;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// V1 schema (for backwards compatibility)
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

// V2 schema
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    port INTEGER UNIQUE,
    pid INTEGER,
    cmd TEXT,
    cwd TEXT,
    status TEXT DEFAULT 'assigned',
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    expires_at INTEGER,
    restart_policy TEXT DEFAULT 'never',
    health_url TEXT,
    tunnel_provider TEXT,
    tunnel_url TEXT,
    paired_with TEXT,
    metadata TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_services_port ON services(port);
  CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

  CREATE TABLE IF NOT EXISTS endpoints (
    service_id TEXT NOT NULL,
    env TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (service_id, env)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    payload TEXT NOT NULL,
    sender TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, created_at);
`);

// V1 prepared statements
const stmts = {
  getByProject: db.prepare('SELECT * FROM port_assignments WHERE project = ?'),
  getByPort: db.prepare('SELECT * FROM port_assignments WHERE port = ?'),
  insert: db.prepare('INSERT INTO port_assignments (port, project, pid, started, last_seen) VALUES (?, ?, ?, ?, ?)'),
  updateLastSeen: db.prepare('UPDATE port_assignments SET last_seen = ? WHERE port = ?'),
  deleteByPort: db.prepare('DELETE FROM port_assignments WHERE port = ?'),
  deleteByProject: db.prepare('DELETE FROM port_assignments WHERE project = ?'),
  getAllPorts: db.prepare('SELECT port FROM port_assignments'),
  getAll: db.prepare('SELECT port, pid, project FROM port_assignments'),
  getAllFull: db.prepare('SELECT port, project, pid, started, last_seen FROM port_assignments ORDER BY port'),
  getPortProject: db.prepare('SELECT port, project FROM port_assignments'),
  countAll: db.prepare('SELECT COUNT(*) as count FROM port_assignments')
};

// Initialize V2 modules
const services = createServices(db);
const messaging = createMessaging(db);
const locks = createLocks(db);
const health = createHealth(db, services);
const agents = createAgents(db);
const activityLog = createActivityLog(db);
const webhooks = createWebhooks(db);

// =============================================================================
// METRICS
// =============================================================================

const metrics = {
  total_assignments: 0,
  total_releases: 0,
  total_cleanups: 0,
  ports_freed_by_cleanup: 0,
  validation_failures: 0,
  race_condition_retries: 0,
  messages_published: 0,
  errors: 0,
  uptime_start: Date.now()
};

// =============================================================================
// EXPRESS APP
// =============================================================================

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rate_limit.window_ms,
  max: config.security.rate_limit.max_requests,
  keyGenerator: (req) => {
    if (req.body && req.body.project && typeof req.body.project === 'string') {
      return `project:${req.body.project.substring(0, 50)}`;
    }
    if (req.body && req.body.id && typeof req.body.id === 'string') {
      return `id:${req.body.id.substring(0, 50)}`;
    }
    const pid = req.headers['x-pid'] || 'unknown';
    return `pid:${pid}`;
  },
  skip: (req) => req.path === '/health' || req.path === '/version',
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

// CORS - localhost only
app.use(cors({
  origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  credentials: true
}));

app.use(limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.static(join(__dirname, 'public')));

// Request logging
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function isProcessAlive(pid) {
  try {
    const result = spawnSync('ps', ['-p', String(pid)], {
      stdio: 'ignore',
      timeout: 1000
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

let systemPortsCache = { data: null, timestamp: 0 };
const SYSTEM_PORTS_CACHE_TTL = 2000;

function getSystemPorts() {
  const now = Date.now();
  if (systemPortsCache.data && (now - systemPortsCache.timestamp) < SYSTEM_PORTS_CACHE_TTL) {
    return systemPortsCache.data;
  }

  try {
    const result = spawnSync('lsof', ['-i', '-P', '-n', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });

    if (result.status !== 0 || !result.stdout) {
      return systemPortsCache.data || [];
    }

    const lines = result.stdout.trim().split('\n').slice(1);
    const ports = [];
    const maxLines = 1000;

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 9) continue;
      const command = parts[0];
      const pid = parseInt(parts[1], 10);
      const user = parts[2];
      const name = parts[8];
      const portMatch = name.match(/:(\d+)$/);
      if (portMatch) {
        ports.push({ port: parseInt(portMatch[1], 10), pid, command, user });
      }
    }

    const seen = new Set();
    const deduplicated = ports.filter(p => {
      if (seen.has(p.port)) return false;
      seen.add(p.port);
      return true;
    }).sort((a, b) => a.port - b.port);

    systemPortsCache = { data: deduplicated, timestamp: now };
    return deduplicated;
  } catch (err) {
    logger.error('system_port_scan_failed', { error: err.message });
    return systemPortsCache.data || [];
  }
}

function isPortInUseOnSystem(port) {
  try {
    const result = spawnSync('lsof', ['-i', `:${port}`, '-P', '-n', '-sTCP:LISTEN'], {
      encoding: 'utf8',
      timeout: 2000
    });
    return result.status === 0 && result.stdout && result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function cleanupStale() {
  const entries = stmts.getAll.all();
  const freed = [];
  for (const entry of entries) {
    if (!isProcessAlive(entry.pid)) {
      stmts.deleteByPort.run(entry.port);
      freed.push({ port: entry.port, project: entry.project });
    }
  }
  if (freed.length > 0) {
    metrics.total_cleanups++;
    metrics.ports_freed_by_cleanup += freed.length;
    logger.info('cleanup_completed', { freed_count: freed.length, freed_ports: freed });
  }

  // Also cleanup v2 services and expired messages
  services.cleanup();
  messaging.cleanup();

  // Cleanup stale agents and release their resources
  const agentCleanup = agents.cleanup(services, locks);
  if (agentCleanup.cleaned > 0) {
    logger.info('agent_cleanup', agentCleanup);
    activityLog.log(ActivityType.AGENT_CLEANUP, {
      details: `cleaned ${agentCleanup.cleaned} stale agents`,
      metadata: agentCleanup
    });
  }

  // Cleanup old activity log entries
  activityLog.cleanup();

  // Cleanup old webhook deliveries
  webhooks.cleanup();

  return freed;
}

function findAvailablePort() {
  const dbUsed = stmts.getAllPorts.all().map(r => r.port);
  const systemPorts = getSystemPorts().map(p => p.port);
  const usedSet = new Set([...dbUsed, ...systemPorts, ...RESERVED_PORTS]);

  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedSet.has(port) && !isPortInUseOnSystem(port)) {
      return port;
    }
  }
  throw new Error('No available ports in range');
}

const assignPortTransaction = db.transaction((port, project, pid, now) => {
  stmts.insert.run(port, project, pid, now, now);
  return true;
});

function assignPortWithRetry(project, preferredPort, requestingPid, maxRetries = 3) {
  const now = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let port = preferredPort || findAvailablePort();
      const existing = stmts.getByPort.get(port);

      if (existing) {
        if (isProcessAlive(existing.pid)) {
          if (preferredPort) { port = findAvailablePort(); preferredPort = null; }
          continue;
        } else {
          stmts.deleteByPort.run(port);
        }
      }

      if (isPortInUseOnSystem(port)) {
        if (preferredPort) { port = findAvailablePort(); preferredPort = null; }
        continue;
      }

      assignPortTransaction(port, project, requestingPid, now);
      return { port, success: true, retries: attempt };

    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        metrics.race_condition_retries++;
        logger.debug('port_assignment_retry', { project, attempt: attempt + 1 });
        preferredPort = null;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Failed to assign port after retries');
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// =============================================================================
// V1 API ENDPOINTS (backwards compatible)
// =============================================================================

app.get('/version', (req, res) => {
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

app.get('/metrics', (req, res) => {
  const uptime_seconds = Math.floor((Date.now() - metrics.uptime_start) / 1000);
  res.json({
    ...metrics,
    active_ports: stmts.countAll.get().count,
    uptime_seconds,
    uptime_formatted: formatUptime(uptime_seconds)
  });
});

app.post('/ports/request', (req, res) => {
  try {
    const { project, preferred } = req.body;

    const projectValidation = validateProjectName(project);
    if (!projectValidation.valid) {
      metrics.validation_failures++;
      return res.status(400).json({ error: projectValidation.error });
    }

    const pidValidation = validatePid(req.headers['x-pid']);
    if (!pidValidation.valid) {
      metrics.validation_failures++;
      return res.status(400).json({ error: pidValidation.error });
    }
    const requestingPid = pidValidation.pid || process.pid;

    const portValidation = validatePreferredPort(preferred, PORT_RANGE_START, PORT_RANGE_END, RESERVED_PORTS);
    if (!portValidation.valid) {
      metrics.validation_failures++;
      return res.status(400).json({ error: portValidation.error });
    }

    const now = Date.now();
    const existing = stmts.getByProject.get(project);

    if (existing) {
      if (isProcessAlive(existing.pid)) {
        stmts.updateLastSeen.run(now, existing.port);
        return res.json({ port: existing.port, message: 'existing assignment renewed', existing: true });
      } else {
        stmts.deleteByPort.run(existing.port);
      }
    }

    let portToTry = portValidation.port;
    if (portToTry && isPortInUseOnSystem(portToTry)) {
      portToTry = null;
    }

    const result = assignPortWithRetry(project, portToTry, requestingPid);
    metrics.total_assignments++;

    res.json({ port: result.port, message: portValidation.port && result.port === portValidation.port ? 'assigned preferred port' : 'port assigned successfully' });

  } catch (error) {
    metrics.errors++;
    logger.error('port_request_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

app.delete('/ports/release', (req, res) => {
  try {
    const { port, project } = req.body;

    if (port !== undefined) {
      const portValidation = validatePort(port);
      if (!portValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: portValidation.error });
      }
      stmts.deleteByPort.run(portValidation.port);
      metrics.total_releases++;
      res.json({ success: true, message: `released port ${portValidation.port}` });

    } else if (project !== undefined) {
      const projectValidation = validateProjectName(project);
      if (!projectValidation.valid) {
        metrics.validation_failures++;
        return res.status(400).json({ error: projectValidation.error });
      }
      const result = stmts.deleteByProject.run(project);
      metrics.total_releases += result.changes;
      res.json({ success: true, message: `released ${result.changes} port(s) for project ${project}` });

    } else {
      res.status(400).json({ error: 'port or project required' });
    }
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/ports/active', (req, res) => {
  try {
    const entries = stmts.getAllFull.all();
    const enhanced = entries.map(e => ({
      ...e,
      alive: isProcessAlive(e.pid),
      age_minutes: Math.floor((Date.now() - e.started) / 60000)
    }));
    res.json({ ports: enhanced, count: enhanced.length });
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

const systemPortsLimiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'System port scanning rate limited' } });

app.get('/ports/system', systemPortsLimiter, (req, res) => {
  try {
    const systemPorts = getSystemPorts();
    const dbAssignments = stmts.getPortProject.all();
    const dbMap = new Map(dbAssignments.map(a => [a.port, a.project]));

    let filtered = systemPorts.map(p => ({ ...p, managed_by_port_daddy: dbMap.has(p.port), project: dbMap.get(p.port) || null }));

    if (req.query.range_only === 'true') filtered = filtered.filter(p => p.port >= PORT_RANGE_START && p.port <= PORT_RANGE_END);
    if (req.query.unmanaged_only === 'true') filtered = filtered.filter(p => !p.managed_by_port_daddy);

    res.json({ ports: filtered, count: filtered.length, total_system_ports: systemPorts.length });
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

app.post('/ports/cleanup', (req, res) => {
  try {
    const freed = cleanupStale();
    res.json({ freed, count: freed.length });
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION, uptime_seconds: Math.floor(process.uptime()), active_ports: stmts.countAll.get().count, pid: process.pid });
});

// =============================================================================
// V2 API ENDPOINTS
// =============================================================================

// Claim a port with semantic identity
app.post('/claim', (req, res) => {
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
        return res.status(400).json({ error: portValidation.error });
      }
    }

    const systemPorts = new Set(getSystemPorts().map(p => p.port));

    // Check agent resource limits
    const agentId = req.headers['x-agent-id'];
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
    logger.info('v2_claim', { id: result.id, port: result.port, existing: result.existing });

    // Log activity
    const activityAgentId = agentId || `pid-${pidValidation.pid || process.pid}`;
    activityLog.logService.claim(result.id, activityAgentId, result.port);

    // Trigger webhooks
    webhooks.trigger(WebhookEvent.SERVICE_CLAIM, {
      serviceId: result.id,
      port: result.port,
      agentId: activityAgentId,
      existing: result.existing
    }, { targetId: result.id });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    logger.error('v2_claim_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

// Release services by ID or pattern
app.delete('/release', (req, res) => {
  try {
    const { id, expired } = req.body;

    if (expired) {
      const result = services.release('*', { expired: true });
      metrics.total_releases += result.released;
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

    metrics.total_releases += result.released;
    logger.info('v2_release', { id, released: result.released });

    // Log activity
    const agentId = req.headers['x-agent-id'] || 'unknown';
    activityLog.logService.release(id, agentId, result.releasedPorts?.[0] || null);

    // Trigger webhooks
    webhooks.trigger(WebhookEvent.SERVICE_RELEASE, {
      serviceId: id,
      agentId,
      released: result.released,
      releasedPorts: result.releasedPorts
    }, { targetId: id });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    logger.error('v2_release_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

// Find/list services
app.get('/services', (req, res) => {
  try {
    const { pattern, status, port, expired } = req.query;

    // Security: Validate status filter if provided
    const statusValidation = validateStatus(status);
    if (!statusValidation.valid) {
      return res.status(400).json({ error: statusValidation.error });
    }

    // Security: Validate pattern if provided
    if (pattern) {
      const patternValidation = validateIdentity(pattern);
      if (!patternValidation.valid) {
        return res.status(400).json({ error: patternValidation.error });
      }
    }

    const result = services.find(pattern || '*', {
      status: statusValidation.status,
      port: port ? parseInt(port, 10) : undefined,
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

// Get single service
app.get('/services/:id', (req, res) => {
  try {
    const idValidation = validateIdentity(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = services.get(req.params.id);
    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Set endpoint URL
app.put('/services/:id/endpoints/:env', (req, res) => {
  try {
    const { url } = req.body;

    // Security: Validate env parameter
    const envValidation = validateEnv(req.params.env);
    if (!envValidation.valid) {
      return res.status(400).json({ error: envValidation.error });
    }

    // Security: Validate URL (protocol whitelist, length check)
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return res.status(400).json({ error: urlValidation.error });
    }

    const idValidation = validateIdentity(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = services.setEndpoint(req.params.id, req.params.env, urlValidation.url);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 MESSAGING ENDPOINTS
// =============================================================================

// List all channels
app.get('/msg', (req, res) => {
  try {
    const result = messaging.listChannels();
    res.json(result);
  } catch (err) {
    console.error('List channels error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Publish message
app.post('/msg/:channel', (req, res) => {
  try {
    const channelValidation = validateChannel(req.params.channel);
    if (!channelValidation.valid) {
      return res.status(400).json({ error: channelValidation.error });
    }

    const { payload, sender, expires } = req.body;

    const result = messaging.publish(req.params.channel, payload || {}, { sender, expires });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    metrics.messages_published++;
    logger.info('message_published', { channel: req.params.channel, id: result.id });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get messages from channel
app.get('/msg/:channel', (req, res) => {
  try {
    const channelValidation = validateChannel(req.params.channel);
    if (!channelValidation.valid) {
      return res.status(400).json({ error: channelValidation.error });
    }

    const { limit, after } = req.query;

    // Security: Cap limit to prevent resource exhaustion
    const MAX_MESSAGE_LIMIT = 1000;
    const requestedLimit = limit ? parseInt(limit, 10) : 50;
    const safeLimit = Math.min(Math.max(1, requestedLimit), MAX_MESSAGE_LIMIT);

    const result = messaging.getMessages(req.params.channel, {
      limit: safeLimit,
      after: after ? parseInt(after, 10) : null
    });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Long-poll for next message
app.get('/msg/:channel/poll', (req, res) => {
  const clientIp = req.ip || 'unknown';

  try {
    const channelValidation = validateChannel(req.params.channel);
    if (!channelValidation.valid) {
      return res.status(400).json({ error: channelValidation.error });
    }

    // Security: Check connection limits
    if (!canOpenConnection(clientIp, 'longPoll')) {
      return res.status(429).json({ error: 'too many concurrent connections' });
    }

    const afterId = req.query.after ? parseInt(req.query.after, 10) : 0;
    const timeout = Math.min(parseInt(req.query.timeout, 10) || 30000, 60000);

    // Check for immediate message
    const immediate = messaging.poll(req.params.channel, afterId);
    if (immediate.message) {
      return res.json(immediate);
    }

    // Track connection
    trackConnection(clientIp, 'longPoll');

    // Set up long-poll with timeout (1000ms interval to reduce DB load)
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      const result = messaging.poll(req.params.channel, afterId);
      if (result.message || (Date.now() - startTime) >= timeout) {
        clearInterval(checkInterval);
        untrackConnection(clientIp, 'longPoll');
        res.json(result);
      }
    }, connectionLimits.pollInterval);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(checkInterval);
      untrackConnection(clientIp, 'longPoll');
    });

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Subscribe to channel (SSE)
app.get('/msg/:channel/subscribe', (req, res) => {
  const clientIp = req.ip || 'unknown';

  try {
    const channelValidation = validateChannel(req.params.channel);
    if (!channelValidation.valid) {
      return res.status(400).json({ error: channelValidation.error });
    }

    // Security: Check connection limits
    if (!canOpenConnection(clientIp, 'sse')) {
      return res.status(429).json({ error: 'too many concurrent SSE connections' });
    }

    // Track connection
    trackConnection(clientIp, 'sse', res);

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Subscribe to messages (may fail if limits exceeded)
    const unsubscribe = messaging.subscribe(req.params.channel, (message) => {
      res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    if (!unsubscribe) {
      untrackConnection(clientIp, 'sse', res);
      return res.status(503).json({ error: 'subscription limit exceeded' });
    }

    // Send initial ping
    res.write('event: connected\ndata: {"channel":"' + req.params.channel + '"}\n\n');

    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(':heartbeat\n\n');
    }, 30000);

    // Security: Connection timeout (5 minutes max)
    const connectionTimeout = setTimeout(() => {
      clearInterval(heartbeat);
      unsubscribe();
      untrackConnection(clientIp, 'sse', res);
      res.write('event: timeout\ndata: {"reason":"connection timeout"}\n\n');
      res.end();
    }, connectionLimits.sseTimeout);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(connectionTimeout);
      unsubscribe();
      untrackConnection(clientIp, 'sse', res);
      logger.info('sse_disconnected', { channel: req.params.channel, ip: clientIp });
    });

    logger.info('sse_connected', { channel: req.params.channel, ip: clientIp });

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// List channels
app.get('/channels', (req, res) => {
  try {
    const result = messaging.listChannels();
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Clear channel
app.delete('/msg/:channel', (req, res) => {
  try {
    const channelValidation = validateChannel(req.params.channel);
    if (!channelValidation.valid) {
      return res.status(400).json({ error: channelValidation.error });
    }

    const result = messaging.clear(req.params.channel);
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 LOCK ENDPOINTS (Multi-agent coordination)
// =============================================================================

// Acquire a lock
app.post('/locks/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { owner, ttl, metadata } = req.body;

    if (!/^[a-zA-Z0-9:_-]+$/.test(name)) {
      return res.status(400).json({ error: 'lock name must be alphanumeric with dashes, underscores, or colons' });
    }

    // Check agent resource limits
    const agentId = owner || req.headers['x-agent-id'];
    if (agentId) {
      const limitCheck = agents.canAcquireLock(agentId);
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: limitCheck.error,
          current: limitCheck.current,
          max: limitCheck.max
        });
      }
    }

    const result = locks.acquire(name, {
      owner: owner || req.headers['x-agent-id'] || `agent-${process.pid}`,
      pid: parseInt(req.headers['x-pid'], 10) || process.pid,
      ttl: ttl || 300000,
      metadata
    });

    if (!result.success) {
      return res.status(409).json(result); // Conflict - lock is held
    }

    logger.info('lock_acquired', { name, owner: result.owner });

    // Log activity
    activityLog.logLock.acquire(name, result.owner);

    // Trigger webhooks
    webhooks.trigger(WebhookEvent.LOCK_ACQUIRE, {
      lockName: name,
      owner: result.owner,
      expiresAt: result.expiresAt
    }, { targetId: name });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    logger.error('lock_acquire_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

// Release a lock
app.delete('/locks/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { owner, force } = req.body || {};

    const result = locks.release(name, {
      owner: owner || req.headers['x-agent-id'],
      force: force === true
    });

    if (!result.success) {
      return res.status(403).json(result);
    }

    logger.info('lock_released', { name, released: result.released });

    // Log activity
    if (result.released) {
      activityLog.logLock.release(name, owner || 'unknown');

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.LOCK_RELEASE, {
        lockName: name,
        owner: owner || 'unknown'
      }, { targetId: name });
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Check lock status
app.get('/locks/:name', (req, res) => {
  try {
    const result = locks.check(req.params.name);
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// List all locks
app.get('/locks', (req, res) => {
  try {
    const { owner } = req.query;
    const result = locks.list({ owner });
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Extend lock TTL
app.put('/locks/:name', (req, res) => {
  try {
    const { ttl, owner } = req.body || {};
    const result = locks.extend(req.params.name, {
      owner: owner || req.headers['x-agent-id'],
      ttl
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 HEALTH ENDPOINTS (Service health monitoring)
// =============================================================================

// Check health of a service
app.get('/services/health/:id', async (req, res) => {
  try {
    const idValidation = validateIdentity(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const result = await health.check(req.params.id);
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Wait for service(s) to be healthy
app.get('/wait/:id', async (req, res) => {
  try {
    const idValidation = validateIdentity(req.params.id);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const timeout = Math.min(parseInt(req.query.timeout, 10) || 60000, 300000); // Max 5 minutes

    const result = await health.waitFor(req.params.id, { timeout });
    res.json(result);

  } catch (error) {
    if (error.message.includes('Timeout')) {
      return res.status(408).json({ success: false, error: error.message });
    }
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Wait for multiple services
app.post('/wait', async (req, res) => {
  try {
    const { services: serviceIds, timeout } = req.body;

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ error: 'services must be a non-empty array' });
    }

    if (serviceIds.length > 20) {
      return res.status(400).json({ error: 'too many services (max 20)' });
    }

    for (const id of serviceIds) {
      const validation = validateIdentity(id);
      if (!validation.valid) {
        return res.status(400).json({ error: `invalid service id '${id}': ${validation.error}` });
      }
    }

    const safeTimeout = Math.min(timeout || 60000, 300000);

    const result = await health.waitForAll(serviceIds, { timeout: safeTimeout });
    res.json(result);

  } catch (error) {
    if (error.message.includes('Timeout')) {
      return res.status(408).json({ success: false, error: error.message });
    }
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// List all health statuses
app.get('/services/health', (req, res) => {
  try {
    const result = health.listStatus();
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 DETECT & CONFIG ENDPOINTS (Stack detection and project config)
// =============================================================================

// Detect stack in a directory
app.post('/detect', (req, res) => {
  try {
    const { dir } = req.body;
    const targetDir = dir || process.cwd();

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

// Generate config for a directory
app.post('/init', (req, res) => {
  try {
    const { dir, save } = req.body;
    const targetDir = dir || process.cwd();

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

// Load existing config
app.get('/config', (req, res) => {
  try {
    const { dir } = req.query;
    const targetDir = dir || process.cwd();

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
      path: config._path
    });

  } catch (error) {
    if (error.message.includes('Failed to parse')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 AGENT ENDPOINTS (Agent registry and heartbeat)
// =============================================================================

// Register an agent
app.post('/agents', (req, res) => {
  try {
    const { id, name, type, metadata, maxServices, maxLocks } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'agent id required' });
    }

    const result = agents.register(id, {
      name,
      pid: parseInt(req.headers['x-pid'], 10) || process.pid,
      type: type || 'cli',
      metadata,
      maxServices,
      maxLocks
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log activity
    if (result.registered) {
      activityLog.logAgent.register(id);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.AGENT_REGISTER, {
        agentId: id,
        name: name || id,
        type: type || 'cli'
      }, { targetId: id });
    }

    logger.info('agent_registered', { agentId: id, registered: result.registered });
    res.json(result);

  } catch (error) {
    metrics.errors++;
    logger.error('agent_register_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

// Send heartbeat
app.post('/agents/:id/heartbeat', (req, res) => {
  try {
    const { id } = req.params;

    const result = agents.heartbeat(id, {
      pid: parseInt(req.headers['x-pid'], 10) || process.pid
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log activity (with sampling to avoid log spam)
    // Only log every 10th heartbeat or on registration
    if (result.registered || Math.random() < 0.1) {
      activityLog.logAgent.heartbeat(id);
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Unregister an agent
app.delete('/agents/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = agents.unregister(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Log activity
    if (result.unregistered) {
      activityLog.logAgent.unregister(id);

      // Trigger webhooks
      webhooks.trigger(WebhookEvent.AGENT_UNREGISTER, {
        agentId: id
      }, { targetId: id });
    }

    logger.info('agent_unregistered', { agentId: id });
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get agent info
app.get('/agents/:id', (req, res) => {
  try {
    const result = agents.get(req.params.id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// List all agents
app.get('/agents', (req, res) => {
  try {
    const { active } = req.query;
    const result = agents.list({ activeOnly: active === 'true' });
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// V2 ACTIVITY LOG ENDPOINTS (Audit trail)
// =============================================================================

// Get recent activity
app.get('/activity', (req, res) => {
  try {
    const { limit, type, agent, target } = req.query;

    const result = activityLog.getRecent({
      limit: limit ? parseInt(limit, 10) : 100,
      type,
      agentId: agent,
      targetPattern: target
    });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get activity by time range
app.get('/activity/range', (req, res) => {
  try {
    const { start, end, limit } = req.query;

    if (!start) {
      return res.status(400).json({ error: 'start timestamp required' });
    }

    const startTime = parseInt(start, 10);
    const endTime = end ? parseInt(end, 10) : Date.now();

    const result = activityLog.getByTimeRange(startTime, endTime, {
      limit: limit ? parseInt(limit, 10) : 1000
    });

    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get activity summary
app.get('/activity/summary', (req, res) => {
  try {
    const { since } = req.query;
    const sinceTimestamp = since ? parseInt(since, 10) : 0;

    const result = activityLog.getSummary(sinceTimestamp);
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get activity log stats
app.get('/activity/stats', (req, res) => {
  try {
    const result = activityLog.getStats();
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// WEBHOOK ENDPOINTS
// =============================================================================

// Register a webhook
app.post('/webhooks', (req, res) => {
  try {
    const { url, events, secret, filterPattern, metadata } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url required' });
    }

    const result = webhooks.register(url, { events, secret, filterPattern, metadata });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info('webhook_registered', { id: result.id, url, events });
    res.json(result);

  } catch (error) {
    metrics.errors++;
    logger.error('webhook_register_failed', { error: error.message });
    res.status(500).json({ error: 'internal server error' });
  }
});

// List webhooks
app.get('/webhooks', (req, res) => {
  try {
    const { active } = req.query;
    const result = webhooks.list({ activeOnly: active === 'true' });
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get available webhook events (must be before :id route)
app.get('/webhooks/events', (req, res) => {
  res.json({
    success: true,
    events: Object.values(WebhookEvent),
    descriptions: {
      'service.claim': 'Fired when a service claims a port',
      'service.release': 'Fired when a service releases a port',
      'agent.register': 'Fired when an agent registers',
      'agent.unregister': 'Fired when an agent unregisters',
      'agent.stale': 'Fired when an agent is detected as stale',
      'lock.acquire': 'Fired when a lock is acquired',
      'lock.release': 'Fired when a lock is released',
      'message.publish': 'Fired when a message is published to a channel',
      'daemon.start': 'Fired when Port Daddy daemon starts',
      'daemon.stop': 'Fired when Port Daddy daemon stops'
    }
  });
});

// Get webhook by ID
app.get('/webhooks/:id', (req, res) => {
  try {
    const result = webhooks.get(req.params.id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Update webhook
app.put('/webhooks/:id', (req, res) => {
  try {
    const { url, events, filterPattern, active, metadata } = req.body;

    const result = webhooks.update(req.params.id, { url, events, filterPattern, active, metadata });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    logger.info('webhook_updated', { id: req.params.id });
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Delete webhook
app.delete('/webhooks/:id', (req, res) => {
  try {
    const result = webhooks.remove(req.params.id);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    logger.info('webhook_deleted', { id: req.params.id });
    res.json(result);

  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Test a webhook
app.post('/webhooks/:id/test', async (req, res) => {
  try {
    const result = await webhooks.test(req.params.id);
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get webhook deliveries
app.get('/webhooks/:id/deliveries', (req, res) => {
  try {
    const { limit } = req.query;
    const result = webhooks.getDeliveries(req.params.id, {
      limit: limit ? parseInt(limit, 10) : 50
    });
    res.json(result);
  } catch (error) {
    metrics.errors++;
    res.status(500).json({ error: 'internal server error' });
  }
});

// =============================================================================
// LIFECYCLE
// =============================================================================

setInterval(() => cleanupStale(), config.cleanup.interval_ms);

function shutdown(signal) {
  logger.info('shutdown_initiated', { signal });

  // Log daemon stop in activity log and trigger webhooks
  try {
    activityLog.log(ActivityType.DAEMON_STOP, {
      details: `Port Daddy stopped (${signal})`,
      metadata: { signal, uptime: Date.now() - STARTED_AT }
    });

    // Note: Webhook delivery may not complete if shutdown is immediate
    webhooks.trigger(WebhookEvent.DAEMON_STOP, {
      signal,
      uptime: Date.now() - STARTED_AT,
      version: VERSION
    });
  } catch {}

  db.close();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Global error handler - prevents error stack leakage
app.use((err, req, res, next) => {
  // Log the actual error for debugging
  logger.error('unhandled_error', {
    error: err.message,
    type: err.type || err.name,
    path: req.path,
    method: req.method
  });

  // Return generic error to client (don't leak internals)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request payload too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON' });
  }
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, config.service.host, () => {
  logger.info('server_started', { port: PORT, host: config.service.host, version: VERSION });

  // Log daemon start in activity log
  activityLog.log(ActivityType.DAEMON_START, {
    details: `Port Daddy v${VERSION} started`,
    metadata: { port: PORT, pid: process.pid, codeHash: CODE_HASH }
  });

  // Trigger daemon start webhook and retry pending deliveries
  webhooks.trigger(WebhookEvent.DAEMON_START, {
    version: VERSION,
    port: PORT,
    pid: process.pid
  });
  webhooks.retryPending();

  console.log(`
  Port Daddy v${VERSION}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Service:    http://${config.service.host}:${PORT}
  Dashboard:  http://${config.service.host}:${PORT}/
  Database:   ${DB_PATH}
  Port range: ${PORT_RANGE_START}-${PORT_RANGE_END}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  API:
    POST   /claim             Claim port with semantic ID
    DELETE /release           Release by ID/pattern
    GET    /services          List services
    POST   /msg/:channel      Publish message
    GET    /agents            List agents
    GET    /activity          Activity log
    POST   /webhooks          Register webhook

  Ready to assign ports!
  `);
});
