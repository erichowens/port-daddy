#!/usr/bin/env node

/**
 * Port Daddy v2.0 - Semantic Port Management Service
 *
 * Features:
 * - Semantic identities: project:stack:context
 * - Service directory: local/tunnel/dev/staging/prod URLs
 * - Pub/sub messaging for agent coordination
 * - Agent registry, distributed locks, webhooks
 */

import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, readdirSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import winston from 'winston';
import rateLimit from 'express-rate-limit';

// V2 modules
import { createServices } from './lib/services.js';
import { createMessaging } from './lib/messaging.js';
import { createLocks } from './lib/locks.js';
import { createHealth } from './lib/health.js';
import { createAgents } from './lib/agents.js';
import { createActivityLog, ActivityType } from './lib/activity.js';
import { createWebhooks, WebhookEvent } from './lib/webhooks.js';
import { createProjects } from './lib/projects.js';

// Route aggregator
import { createRoutes } from './routes/index.js';

// Shared utilities
import { getSystemPorts } from './shared/port-utils.js';

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

const pkgPath = join(__dirname, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : { version: '2.0.0' };
const VERSION = pkg.version;

// =============================================================================
// CODE HASH (stale daemon detection)
// =============================================================================

function calculateCodeHash() {
  // Dynamically discover all .js files in lib/ — no more parallel lists to maintain
  const libDir = join(__dirname, 'lib');
  const libFiles = existsSync(libDir)
    ? readdirSync(libDir).filter(f => f.endsWith('.js')).sort().map(f => `lib/${f}`)
    : [];
  const filesToHash = ['server.js', ...libFiles];

  const hash = createHash('sha256');
  for (const file of filesToHash) {
    const filePath = join(__dirname, file);
    if (existsSync(filePath)) {
      hash.update(readFileSync(filePath));
    }
  }
  return hash.digest('hex').slice(0, 12);
}

const CODE_HASH = calculateCodeHash();
const STARTED_AT = Date.now();

// =============================================================================
// LOGGING
// =============================================================================

const isSilent = process.env.PORT_DADDY_SILENT === '1';

const logger = winston.createLogger({
  level: isSilent ? 'error' : config.logging.level,
  silent: isSilent,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'port-daddy', version: VERSION },
  transports: isSilent ? [] : [
    new winston.transports.File({
      filename: join(__dirname, config.logging.error_file),
      level: 'error'
    }),
    new winston.transports.File({
      filename: join(__dirname, config.logging.file)
    })
  ]
});

if (!isSilent && process.env.NODE_ENV !== 'production') {
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

const DB_PATH = process.env.PORT_DADDY_DB || join(__dirname, 'port-registry.db');
const PORT = parseInt(process.env.PORT_DADDY_PORT, 10) || config.service.port;
const SOCK_PATH = process.env.PORT_DADDY_SOCK || '/tmp/port-daddy.sock';
const DISABLE_TCP = process.env.PORT_DADDY_NO_TCP === '1';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    root TEXT NOT NULL,
    type TEXT DEFAULT 'single',
    config TEXT,
    services TEXT,
    last_scanned INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    metadata TEXT
  );
`);

// =============================================================================
// MODULE INITIALIZATION
// =============================================================================

const services = createServices(db);
const messaging = createMessaging(db);
const locks = createLocks(db);
const health = createHealth(db, services);
const agents = createAgents(db);
const activityLog = createActivityLog(db);
const webhooks = createWebhooks(db);
const projects = createProjects(db);

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
// CLEANUP
// =============================================================================

function cleanupStale() {
  // Cleanup V2 services and expired messages
  const serviceResult = services.cleanup();
  messaging.cleanup();

  const agentCleanup = agents.cleanup(services, locks);
  if (agentCleanup.cleaned > 0) {
    logger.info('agent_cleanup', agentCleanup);
    activityLog.log(ActivityType.AGENT_CLEANUP, {
      details: `cleaned ${agentCleanup.cleaned} stale agents`,
      metadata: agentCleanup
    });
  }

  activityLog.cleanup();
  webhooks.cleanup();

  metrics.total_cleanups++;
  return serviceResult;
}

// =============================================================================
// EXPRESS APP + ROUTES
// =============================================================================

const app = express();

app.use(rateLimit({
  windowMs: config.security.rate_limit.window_ms,
  max: config.security.rate_limit.max_requests,
  keyGenerator: (req) => {
    if (req.body?.project && typeof req.body.project === 'string') {
      return `project:${req.body.project.substring(0, 50)}`;
    }
    if (req.body?.id && typeof req.body.id === 'string') {
      return `id:${req.body.id.substring(0, 50)}`;
    }
    return `pid:${req.headers['x-pid'] || 'unknown'}`;
  },
  skip: (req) => req.path === '/health' || req.path === '/version',
  message: { error: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(cors({
  origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(join(__dirname, 'public')));

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

// Mount all routes via aggregator
app.use(createRoutes({
  db, logger, metrics, config,
  services, messaging, locks, health, agents, activityLog, webhooks, projects,
  VERSION, CODE_HASH, STARTED_AT, __dirname,
  cleanupStale, getSystemPorts
}));

// Global error handler
app.use((err, req, res, next) => {
  logger.error('unhandled_error', {
    error: err.message,
    type: err.type || err.name,
    path: req.path,
    method: req.method
  });

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request payload too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON' });
  }
  res.status(500).json({ error: 'internal server error' });
});

// =============================================================================
// LIFECYCLE
// =============================================================================

setInterval(() => cleanupStale(), config.cleanup.interval_ms);

function shutdown(signal) {
  logger.info('shutdown_initiated', { signal });
  try {
    activityLog.log(ActivityType.DAEMON_STOP, {
      details: `Port Daddy stopped (${signal})`,
      metadata: { signal, uptime: Date.now() - STARTED_AT }
    });
    webhooks.trigger(WebhookEvent.DAEMON_STOP, {
      signal, uptime: Date.now() - STARTED_AT, version: VERSION
    });
  } catch {}
  db.close();
  // Clean up socket file
  try { unlinkSync(SOCK_PATH); } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

function onReady() {
  activityLog.log(ActivityType.DAEMON_START, {
    details: `Port Daddy v${VERSION} started`,
    metadata: { port: PORT, pid: process.pid, codeHash: CODE_HASH, socket: SOCK_PATH }
  });

  webhooks.trigger(WebhookEvent.DAEMON_START, {
    version: VERSION, port: PORT, pid: process.pid
  });
  webhooks.retryPending();
}

// Primary listener: Unix domain socket (no port needed)
try { unlinkSync(SOCK_PATH); } catch {}
app.listen(SOCK_PATH, () => {
  logger.info('socket_started', { socket: SOCK_PATH, version: VERSION });

  // Also listen on TCP for dashboard/browser access (unless disabled)
  if (!DISABLE_TCP) {
    app.listen(PORT, config.service.host, () => {
      logger.info('tcp_started', { port: PORT, host: config.service.host, version: VERSION });
      onReady();

      if (!isSilent) {
        console.log(`
  Port Daddy v${VERSION}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Socket:     ${SOCK_PATH}
  Dashboard:  http://${config.service.host}:${PORT}/
  Database:   ${DB_PATH}
  Port range: ${config.ports.range_start}-${config.ports.range_end}
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
      }
    });
  } else {
    // Socket-only mode (used by ephemeral test daemons)
    onReady();
    if (!isSilent) {
      console.log(`Port Daddy v${VERSION} listening on ${SOCK_PATH}`);
    }
  }
});
