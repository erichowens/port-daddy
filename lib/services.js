/**
 * Services Module - Core logic for Port Daddy v2
 *
 * Handles: claim, release, find operations with semantic identities
 */

import { parseIdentity, patternToSql, matchesPattern } from './identity.js';

const DEFAULT_RANGE = [3100, 9999];
const RESERVED_PORTS = new Set([8080, 8000, 9876]);

/**
 * Initialize the services module with a database connection
 */
export function createServices(db) {
  // Prepared statements
  const stmts = {
    getById: db.prepare('SELECT * FROM services WHERE id = ?'),
    getByPort: db.prepare('SELECT * FROM services WHERE port = ?'),
    getByPattern: db.prepare('SELECT * FROM services WHERE id LIKE ?'),
    getAllActive: db.prepare(`
      SELECT * FROM services
      WHERE status IN ('assigned', 'running')
      ORDER BY id
    `),
    getAllPorts: db.prepare('SELECT port FROM services WHERE port IS NOT NULL'),
    insert: db.prepare(`
      INSERT INTO services (id, port, pid, cmd, cwd, status, created_at, last_seen, expires_at, restart_policy, health_url, paired_with, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    update: db.prepare(`
      UPDATE services SET
        port = COALESCE(?, port),
        pid = COALESCE(?, pid),
        cmd = COALESCE(?, cmd),
        status = COALESCE(?, status),
        last_seen = ?,
        expires_at = COALESCE(?, expires_at),
        tunnel_url = COALESCE(?, tunnel_url),
        metadata = COALESCE(?, metadata)
      WHERE id = ?
    `),
    updateLastSeen: db.prepare('UPDATE services SET last_seen = ? WHERE id = ?'),
    updateStatus: db.prepare('UPDATE services SET status = ?, last_seen = ? WHERE id = ?'),
    deleteById: db.prepare('DELETE FROM services WHERE id = ?'),
    deleteByPattern: db.prepare('DELETE FROM services WHERE id LIKE ?'),
    deleteExpired: db.prepare('DELETE FROM services WHERE expires_at IS NOT NULL AND expires_at < ?'),

    // Endpoints
    getEndpoints: db.prepare('SELECT * FROM endpoints WHERE service_id = ?'),
    setEndpoint: db.prepare(`
      INSERT OR REPLACE INTO endpoints (service_id, env, url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    deleteEndpoint: db.prepare('DELETE FROM endpoints WHERE service_id = ? AND env = ?'),
    deleteAllEndpoints: db.prepare('DELETE FROM endpoints WHERE service_id = ?'),
  };

  /**
   * Find an available port in the given range
   */
  function findAvailablePort(range = DEFAULT_RANGE, systemPorts = new Set()) {
    const [min, max] = range;
    const usedPorts = new Set(stmts.getAllPorts.all().map(r => r.port));

    for (let port = min; port <= max; port++) {
      if (!usedPorts.has(port) && !RESERVED_PORTS.has(port) && !systemPorts.has(port)) {
        return port;
      }
    }

    throw new Error(`No available ports in range ${min}-${max}`);
  }

  /**
   * Claim a port for a service
   */
  function claim(id, options = {}) {
    const parsed = parseIdentity(id);
    if (!parsed.valid) {
      return { success: false, error: parsed.error };
    }

    if (parsed.hasWildcard) {
      return { success: false, error: 'cannot claim with wildcard identity' };
    }

    const now = Date.now();
    const {
      port: preferredPort,
      range = DEFAULT_RANGE,
      pid = null,
      cmd = null,
      cwd = null,
      expires = null,
      restart = 'never',
      health = null,
      pair = null,
      metadata = null,
      systemPorts = new Set()
    } = options;

    // Check for existing service
    const existing = stmts.getById.get(parsed.normalized);

    if (existing) {
      // Update last_seen and return existing port
      stmts.updateLastSeen.run(now, parsed.normalized);

      // Update optional fields if provided
      if (cmd || pid || expires || metadata) {
        stmts.update.run(
          null, pid, cmd, null, now, expires, null, metadata ? JSON.stringify(metadata) : null,
          parsed.normalized
        );
      }

      return {
        success: true,
        id: parsed.normalized,
        port: existing.port,
        status: existing.status,
        existing: true,
        message: 'reusing existing service'
      };
    }

    // Find a port
    let port;
    if (preferredPort && !RESERVED_PORTS.has(preferredPort) && !systemPorts.has(preferredPort)) {
      const conflict = stmts.getByPort.get(preferredPort);
      if (!conflict) {
        port = preferredPort;
      }
    }

    if (!port) {
      try {
        port = findAvailablePort(range, systemPorts);
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    // Calculate expiration
    let expiresAt = null;
    if (expires) {
      expiresAt = now + parseExpires(expires);
    }

    // Insert new service
    try {
      stmts.insert.run(
        parsed.normalized,
        port,
        pid,
        cmd,
        cwd,
        'assigned',
        now,
        now,
        expiresAt,
        restart,
        health,
        pair,
        metadata ? JSON.stringify(metadata) : null
      );

      // Create local endpoint
      stmts.setEndpoint.run(
        parsed.normalized,
        'local',
        `http://localhost:${port}`,
        now,
        now
      );

      return {
        success: true,
        id: parsed.normalized,
        port,
        status: 'assigned',
        existing: false,
        message: preferredPort === port ? 'assigned preferred port' : 'assigned new port'
      };
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return { success: false, error: 'port already in use' };
      }
      throw err;
    }
  }

  /**
   * Release service(s) by ID or pattern
   */
  function release(idOrPattern, options = {}) {
    const parsed = parseIdentity(idOrPattern);
    if (!parsed.valid) {
      return { success: false, error: parsed.error };
    }

    const { expired = false } = options;

    if (expired) {
      // Release all expired services
      const result = stmts.deleteExpired.run(Date.now());
      return {
        success: true,
        released: result.changes,
        message: `released ${result.changes} expired service(s)`
      };
    }

    if (parsed.hasWildcard) {
      // Pattern-based release
      const sqlPattern = patternToSql(idOrPattern);
      const services = stmts.getByPattern.all(sqlPattern);

      for (const svc of services) {
        stmts.deleteAllEndpoints.run(svc.id);
      }

      const result = stmts.deleteByPattern.run(sqlPattern);
      return {
        success: true,
        released: result.changes,
        message: `released ${result.changes} service(s) matching ${idOrPattern}`
      };
    }

    // Single service release
    const existing = stmts.getById.get(parsed.normalized);
    if (!existing) {
      return { success: true, released: 0, message: 'service not found' };
    }

    stmts.deleteAllEndpoints.run(parsed.normalized);
    stmts.deleteById.run(parsed.normalized);

    return {
      success: true,
      released: 1,
      port: existing.port,
      message: `released ${parsed.normalized} (port ${existing.port})`
    };
  }

  /**
   * Find services matching criteria
   */
  function find(idOrPattern = '*', options = {}) {
    const { status, port, expired, limit = 100 } = options;

    let services;

    if (idOrPattern === '*' || idOrPattern === '*:*:*') {
      services = stmts.getAllActive.all();
    } else {
      const parsed = parseIdentity(idOrPattern);
      if (!parsed.valid) {
        return { success: false, error: parsed.error };
      }

      const sqlPattern = patternToSql(idOrPattern);
      services = stmts.getByPattern.all(sqlPattern);
    }

    // Apply filters
    const now = Date.now();

    services = services.filter(svc => {
      if (status && svc.status !== status) return false;
      if (port && svc.port !== port) return false;
      if (expired === true && (!svc.expires_at || svc.expires_at > now)) return false;
      if (expired === false && svc.expires_at && svc.expires_at <= now) return false;
      return true;
    });

    // Limit results
    if (services.length > limit) {
      services = services.slice(0, limit);
    }

    // Enrich with endpoints
    const enriched = services.map(svc => {
      const endpoints = stmts.getEndpoints.all(svc.id);
      const urls = {};
      for (const ep of endpoints) {
        urls[ep.env] = ep.url;
      }

      return {
        id: svc.id,
        port: svc.port,
        pid: svc.pid,
        status: svc.status,
        cmd: svc.cmd,
        createdAt: svc.created_at,
        lastSeen: svc.last_seen,
        expiresAt: svc.expires_at,
        tunnelUrl: svc.tunnel_url,
        pairedWith: svc.paired_with,
        urls,
        metadata: svc.metadata ? JSON.parse(svc.metadata) : null
      };
    });

    return {
      success: true,
      services: enriched,
      count: enriched.length
    };
  }

  /**
   * Get a single service by ID
   */
  function get(id) {
    const parsed = parseIdentity(id);
    if (!parsed.valid) {
      return { success: false, error: parsed.error };
    }

    const svc = stmts.getById.get(parsed.normalized);
    if (!svc) {
      return { success: false, error: 'service not found' };
    }

    const endpoints = stmts.getEndpoints.all(svc.id);
    const urls = {};
    for (const ep of endpoints) {
      urls[ep.env] = ep.url;
    }

    return {
      success: true,
      service: {
        id: svc.id,
        port: svc.port,
        pid: svc.pid,
        status: svc.status,
        cmd: svc.cmd,
        cwd: svc.cwd,
        createdAt: svc.created_at,
        lastSeen: svc.last_seen,
        expiresAt: svc.expires_at,
        restartPolicy: svc.restart_policy,
        healthUrl: svc.health_url,
        tunnelProvider: svc.tunnel_provider,
        tunnelUrl: svc.tunnel_url,
        pairedWith: svc.paired_with,
        urls,
        metadata: svc.metadata ? JSON.parse(svc.metadata) : null
      }
    };
  }

  /**
   * Set an endpoint URL for a service
   */
  function setEndpoint(id, env, url) {
    const parsed = parseIdentity(id);
    if (!parsed.valid) {
      return { success: false, error: parsed.error };
    }

    const svc = stmts.getById.get(parsed.normalized);
    if (!svc) {
      return { success: false, error: 'service not found' };
    }

    const now = Date.now();
    stmts.setEndpoint.run(parsed.normalized, env, url, now, now);

    return { success: true, message: `set ${env} URL for ${parsed.normalized}` };
  }

  /**
   * Update service status
   */
  function setStatus(id, status) {
    const parsed = parseIdentity(id);
    if (!parsed.valid) {
      return { success: false, error: parsed.error };
    }

    const now = Date.now();
    const result = stmts.updateStatus.run(status, now, parsed.normalized);

    if (result.changes === 0) {
      return { success: false, error: 'service not found' };
    }

    return { success: true, message: `${parsed.normalized} status set to ${status}` };
  }

  /**
   * Cleanup expired services
   */
  function cleanup() {
    const result = stmts.deleteExpired.run(Date.now());
    return { cleaned: result.changes };
  }

  return {
    claim,
    release,
    find,
    get,
    setEndpoint,
    setStatus,
    cleanup,
    findAvailablePort
  };
}

/**
 * Parse expiration string to milliseconds
 * Examples: "1h", "30m", "2h30m", "1d"
 */
function parseExpires(str) {
  if (typeof str === 'number') return str;

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  let total = 0;
  const regex = /(\d+)([smhd])/g;
  let match;

  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    total += value * units[unit];
  }

  return total || null;
}
