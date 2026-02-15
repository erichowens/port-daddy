/**
 * Agent Registry Module
 *
 * Tracks active agents, handles heartbeats, enforces resource limits
 * Pure SQLite operations - no shell commands
 */

const DEFAULT_HEARTBEAT_INTERVAL = 30000;  // 30 seconds
const DEFAULT_AGENT_TTL = 120000;          // 2 minutes without heartbeat = dead
const DEFAULT_MAX_SERVICES_PER_AGENT = 50;
const DEFAULT_MAX_LOCKS_PER_AGENT = 20;

/**
 * Initialize agent registry with database connection
 */
export function createAgents(db) {
  // Ensure agents table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT,
      pid INTEGER,
      type TEXT DEFAULT 'cli',
      registered_at INTEGER NOT NULL,
      last_heartbeat INTEGER NOT NULL,
      metadata TEXT,
      max_services INTEGER DEFAULT ${DEFAULT_MAX_SERVICES_PER_AGENT},
      max_locks INTEGER DEFAULT ${DEFAULT_MAX_LOCKS_PER_AGENT}
    );

    CREATE INDEX IF NOT EXISTS idx_agents_heartbeat ON agents(last_heartbeat);
  `);

  const stmts = {
    get: db.prepare('SELECT * FROM agents WHERE id = ?'),
    register: db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, pid, type, registered_at, last_heartbeat, metadata, max_services, max_locks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    heartbeat: db.prepare('UPDATE agents SET last_heartbeat = ?, pid = ? WHERE id = ?'),
    unregister: db.prepare('DELETE FROM agents WHERE id = ?'),
    list: db.prepare('SELECT * FROM agents ORDER BY last_heartbeat DESC'),
    listActive: db.prepare('SELECT * FROM agents WHERE last_heartbeat > ? ORDER BY last_heartbeat DESC'),
    listStale: db.prepare('SELECT * FROM agents WHERE last_heartbeat < ?'),
    deleteStale: db.prepare('DELETE FROM agents WHERE last_heartbeat < ?'),
    countServices: db.prepare('SELECT COUNT(*) as count FROM services WHERE metadata LIKE ?'),
    countLocks: db.prepare('SELECT COUNT(*) as count FROM locks WHERE owner = ?')
  };

  /**
   * Register an agent
   */
  function register(agentId, options = {}) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    if (!/^[a-zA-Z0-9:_-]+$/.test(agentId)) {
      return { success: false, error: 'agent ID must be alphanumeric with dashes, underscores, or colons' };
    }

    if (agentId.length > 100) {
      return { success: false, error: 'agent ID too long (max 100 characters)' };
    }

    const now = Date.now();
    const {
      name = null,
      pid = process.pid,
      type = 'cli',
      metadata = null,
      maxServices = DEFAULT_MAX_SERVICES_PER_AGENT,
      maxLocks = DEFAULT_MAX_LOCKS_PER_AGENT
    } = options;

    const existing = stmts.get.get(agentId);

    try {
      stmts.register.run(
        agentId,
        name,
        pid,
        type,
        existing?.registered_at || now,
        now,
        metadata ? JSON.stringify(metadata) : null,
        maxServices,
        maxLocks
      );

      return {
        success: true,
        agentId,
        registered: !existing,
        message: existing ? 'agent updated' : 'agent registered'
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Send heartbeat for an agent
   */
  function heartbeat(agentId, options = {}) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const { pid = process.pid } = options;
    const now = Date.now();

    const existing = stmts.get.get(agentId);
    if (!existing) {
      // Auto-register on first heartbeat
      return register(agentId, { pid, ...options });
    }

    stmts.heartbeat.run(now, pid, agentId);

    return {
      success: true,
      agentId,
      lastHeartbeat: now,
      message: 'heartbeat recorded'
    };
  }

  /**
   * Unregister an agent
   */
  function unregister(agentId) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const existing = stmts.get.get(agentId);
    if (!existing) {
      return { success: true, unregistered: false, message: 'agent not found' };
    }

    stmts.unregister.run(agentId);

    return {
      success: true,
      unregistered: true,
      agentId,
      message: 'agent unregistered'
    };
  }

  /**
   * Get agent info
   */
  function get(agentId) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const agent = stmts.get.get(agentId);
    if (!agent) {
      return { success: false, error: 'agent not found' };
    }

    const now = Date.now();
    const isActive = (now - agent.last_heartbeat) < DEFAULT_AGENT_TTL;

    return {
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        pid: agent.pid,
        type: agent.type,
        registeredAt: agent.registered_at,
        lastHeartbeat: agent.last_heartbeat,
        isActive,
        timeSinceHeartbeat: now - agent.last_heartbeat,
        maxServices: agent.max_services,
        maxLocks: agent.max_locks,
        metadata: agent.metadata ? JSON.parse(agent.metadata) : null
      }
    };
  }

  /**
   * List all agents
   */
  function list(options = {}) {
    const { activeOnly = false } = options;
    const now = Date.now();

    const agents = activeOnly
      ? stmts.listActive.all(now - DEFAULT_AGENT_TTL)
      : stmts.list.all();

    return {
      success: true,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        pid: a.pid,
        type: a.type,
        registeredAt: a.registered_at,
        lastHeartbeat: a.last_heartbeat,
        isActive: (now - a.last_heartbeat) < DEFAULT_AGENT_TTL,
        maxServices: a.max_services,
        maxLocks: a.max_locks,
        metadata: a.metadata ? JSON.parse(a.metadata) : null
      })),
      count: agents.length
    };
  }

  /**
   * Escape SQL LIKE pattern wildcards
   * @param {string} str - String to escape
   * @returns {string} Escaped string safe for LIKE pattern
   */
  function escapeLikePattern(str) {
    // Escape SQL LIKE wildcards: % and _
    return str.replace(/[%_]/g, '\\$&');
  }

  /**
   * Check if agent can claim more services
   */
  function canClaimService(agentId) {
    const agent = stmts.get.get(agentId);
    if (!agent) return { allowed: true }; // Unregistered agents get default limits

    // Escape agentId to prevent SQL injection via LIKE wildcards
    const safeAgentId = escapeLikePattern(agentId);
    const countResult = stmts.countServices.get(`%"agent":"${safeAgentId}"%`);
    const currentCount = countResult?.count || 0;

    if (currentCount >= agent.max_services) {
      return {
        allowed: false,
        error: `agent has reached service limit (${agent.max_services})`,
        current: currentCount,
        max: agent.max_services
      };
    }

    return { allowed: true, current: currentCount, max: agent.max_services };
  }

  /**
   * Check if agent can acquire more locks
   */
  function canAcquireLock(agentId) {
    const agent = stmts.get.get(agentId);
    if (!agent) return { allowed: true }; // Unregistered agents get default limits

    const countResult = stmts.countLocks.get(agentId);
    const currentCount = countResult?.count || 0;

    if (currentCount >= agent.max_locks) {
      return {
        allowed: false,
        error: `agent has reached lock limit (${agent.max_locks})`,
        current: currentCount,
        max: agent.max_locks
      };
    }

    return { allowed: true, current: currentCount, max: agent.max_locks };
  }

  /**
   * Cleanup stale agents and release their resources
   */
  function cleanup(services, locks) {
    const now = Date.now();
    const staleAgents = stmts.listStale.all(now - DEFAULT_AGENT_TTL);

    let releasedServices = 0;
    let releasedLocks = 0;

    for (const agent of staleAgents) {
      // Release services owned by this agent
      if (services) {
        const svcResult = services.release(`*`, { agentId: agent.id });
        releasedServices += svcResult.released || 0;
      }

      // Release locks owned by this agent
      if (locks) {
        const lockResult = locks.list({ owner: agent.id });
        for (const lock of lockResult.locks || []) {
          locks.release(lock.name, { force: true });
          releasedLocks++;
        }
      }
    }

    // Delete stale agent records
    const deleteResult = stmts.deleteStale.run(now - DEFAULT_AGENT_TTL);

    return {
      cleaned: deleteResult.changes,
      releasedServices,
      releasedLocks,
      message: `cleaned ${deleteResult.changes} stale agent(s)`
    };
  }

  return {
    register,
    heartbeat,
    unregister,
    get,
    list,
    canClaimService,
    canAcquireLock,
    cleanup,
    DEFAULT_HEARTBEAT_INTERVAL,
    DEFAULT_AGENT_TTL
  };
}
