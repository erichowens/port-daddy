/**
 * Agent Registry Module
 *
 * Tracks active agents, handles heartbeats, enforces resource limits
 * Pure SQLite operations - no shell commands
 */

import type Database from 'better-sqlite3';
import { parseIdentity } from './identity.js';

const DEFAULT_HEARTBEAT_INTERVAL = 30000;  // 30 seconds
const DEFAULT_AGENT_TTL = 120000;          // 2 minutes without heartbeat = dead
const DEFAULT_MAX_SERVICES_PER_AGENT = 50;
const DEFAULT_MAX_LOCKS_PER_AGENT = 20;

interface AgentRow {
  id: string;
  name: string | null;
  pid: number;
  type: string;
  registered_at: number;
  last_heartbeat: number;
  metadata: string | null;
  max_services: number;
  max_locks: number;
  worktree_id: string | null;
  // Semantic identity: project:stack:context (stored as components for prefix matching)
  identity_project: string | null;
  identity_stack: string | null;
  identity_context: string | null;
  purpose: string | null;
}

interface RegisterOptions {
  name?: string | null;
  pid?: number;
  type?: string;
  metadata?: Record<string, unknown> | null;
  maxServices?: number;
  maxLocks?: number;
  worktreeId?: string | null;
  identity?: string | null;   // Semantic identity: project:stack:context (parsed into components)
  purpose?: string | null;    // What this agent is doing
}

interface ListOptions {
  activeOnly?: boolean;
  worktreeId?: string | null;   // Filter by worktree
  identityPrefix?: string | null;  // Filter by identity prefix (project or project:stack)
}

interface HeartbeatOptions {
  pid?: number;
  [key: string]: unknown;
}

interface AgentFormatted {
  id: string;
  name: string | null;
  pid: number;
  type: string;
  registeredAt: number;
  lastHeartbeat: number;
  isActive: boolean;
  maxServices: number;
  maxLocks: number;
  metadata: Record<string, unknown> | null;
  worktreeId: string | null;
  // Semantic identity components
  identity: string | null;  // Full identity string (computed from components)
  identityProject: string | null;
  identityStack: string | null;
  identityContext: string | null;
  purpose: string | null;
}

interface ResourceCheck {
  allowed: boolean;
  error?: string;
  current?: number;
  max?: number;
}

interface LocksLike {
  list(options: { owner: string }): { locks?: Array<{ name: string }> };
  release(name: string, options: { force: boolean }): void;
}

/**
 * Initialize agent registry with database connection
 */
export function createAgents(db: Database.Database) {
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
      max_locks INTEGER DEFAULT ${DEFAULT_MAX_LOCKS_PER_AGENT},
      worktree_id TEXT,
      identity_project TEXT,
      identity_stack TEXT,
      identity_context TEXT,
      purpose TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_agents_heartbeat ON agents(last_heartbeat);
    CREATE INDEX IF NOT EXISTS idx_agents_worktree ON agents(worktree_id);
    CREATE INDEX IF NOT EXISTS idx_agents_project ON agents(identity_project);
  `);

  // Migrations: add columns if missing
  const migrations = [
    'ALTER TABLE agents ADD COLUMN worktree_id TEXT',
    'ALTER TABLE agents ADD COLUMN identity_project TEXT',
    'ALTER TABLE agents ADD COLUMN identity_stack TEXT',
    'ALTER TABLE agents ADD COLUMN identity_context TEXT',
    'ALTER TABLE agents ADD COLUMN purpose TEXT',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* already exists */ }
  }

  const stmts = {
    get: db.prepare('SELECT * FROM agents WHERE id = ?'),
    register: db.prepare(`
      INSERT OR REPLACE INTO agents (id, name, pid, type, registered_at, last_heartbeat, metadata, max_services, max_locks, worktree_id, identity_project, identity_stack, identity_context, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    heartbeat: db.prepare('UPDATE agents SET last_heartbeat = ?, pid = ? WHERE id = ?'),
    unregister: db.prepare('DELETE FROM agents WHERE id = ?'),
    list: db.prepare('SELECT * FROM agents ORDER BY last_heartbeat DESC'),
    listByWorktree: db.prepare('SELECT * FROM agents WHERE worktree_id = ? ORDER BY last_heartbeat DESC'),
    listByProject: db.prepare('SELECT * FROM agents WHERE identity_project = ? ORDER BY last_heartbeat DESC'),
    listByProjectStack: db.prepare('SELECT * FROM agents WHERE identity_project = ? AND identity_stack = ? ORDER BY last_heartbeat DESC'),
    listActive: db.prepare('SELECT * FROM agents WHERE last_heartbeat > ? ORDER BY last_heartbeat DESC'),
    listActiveByWorktree: db.prepare('SELECT * FROM agents WHERE last_heartbeat > ? AND worktree_id = ? ORDER BY last_heartbeat DESC'),
    listStale: db.prepare('SELECT * FROM agents WHERE last_heartbeat < ?'),
    listStaleByWorktree: db.prepare('SELECT * FROM agents WHERE last_heartbeat < ? AND worktree_id = ?'),
    listStaleByProject: db.prepare('SELECT * FROM agents WHERE last_heartbeat < ? AND identity_project = ?'),
    deleteStale: db.prepare('DELETE FROM agents WHERE last_heartbeat < ?'),
    countServices: db.prepare("SELECT COUNT(*) as count FROM services WHERE metadata LIKE ? ESCAPE '\\'"),
    countLocks: db.prepare('SELECT COUNT(*) as count FROM locks WHERE owner = ?')
  };

  /**
   * Register an agent
   */
  function register(agentId: string, options: RegisterOptions = {}) {
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
      maxLocks = DEFAULT_MAX_LOCKS_PER_AGENT,
      worktreeId = null,
      identity = null,
      purpose = null
    } = options;

    // Parse semantic identity into components
    let identityProject: string | null = null;
    let identityStack: string | null = null;
    let identityContext: string | null = null;

    if (identity) {
      const parsed = parseIdentity(identity);
      if (parsed.valid) {
        identityProject = parsed.project;
        identityStack = parsed.stack;
        identityContext = parsed.context;
      } else {
        return { success: false, error: `Invalid identity: ${parsed.error}`, code: 'VALIDATION_ERROR' };
      }
    }

    // Validate maxServices if provided
    if (options.maxServices !== undefined) {
      if (typeof maxServices !== 'number' || !Number.isInteger(maxServices) || maxServices < 1) {
        return { success: false, error: 'maxServices must be a positive integer', code: 'VALIDATION_ERROR' };
      }
    }

    // Validate maxLocks if provided
    if (options.maxLocks !== undefined) {
      if (typeof maxLocks !== 'number' || !Number.isInteger(maxLocks) || maxLocks < 1) {
        return { success: false, error: 'maxLocks must be a positive integer', code: 'VALIDATION_ERROR' };
      }
    }

    const existing = stmts.get.get(agentId) as AgentRow | undefined;

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
        maxLocks,
        worktreeId,
        identityProject,
        identityStack,
        identityContext,
        purpose
      );

      // Check for dead agents in the same project to alert the user
      let deadAgentsInProject = 0;
      if (identityProject) {
        const staleThreshold = now - DEFAULT_AGENT_TTL;
        const staleAgents = stmts.listStaleByProject.all(staleThreshold, identityProject) as AgentRow[];
        deadAgentsInProject = staleAgents.filter(a => a.id !== agentId).length;
      }

      return {
        success: true,
        agentId,
        registered: !existing,
        message: existing ? 'agent updated' : 'agent registered',
        // Include dead agent count so CLI can show a notice
        deadAgentsInProject,
        salvageHint: deadAgentsInProject > 0 ? `${deadAgentsInProject} dead agent(s) in ${identityProject}:*. Run: pd salvage --project ${identityProject}` : null
      };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Send heartbeat for an agent
   */
  function heartbeat(agentId: string, options: HeartbeatOptions = {}) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const { pid = process.pid } = options;
    const now = Date.now();

    const existing = stmts.get.get(agentId) as AgentRow | undefined;
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
  function unregister(agentId: string) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const existing = stmts.get.get(agentId) as AgentRow | undefined;
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
   * Format agent row for API response
   */
  function formatAgent(agent: AgentRow, now: number): AgentFormatted {
    const identity = [agent.identity_project, agent.identity_stack, agent.identity_context]
      .filter(Boolean).join(':') || null;

    return {
      id: agent.id,
      name: agent.name,
      pid: agent.pid,
      type: agent.type,
      registeredAt: agent.registered_at,
      lastHeartbeat: agent.last_heartbeat,
      isActive: (now - agent.last_heartbeat) < DEFAULT_AGENT_TTL,
      maxServices: agent.max_services,
      maxLocks: agent.max_locks,
      metadata: safeJsonParse(agent.metadata),
      worktreeId: agent.worktree_id,
      identity,
      identityProject: agent.identity_project,
      identityStack: agent.identity_stack,
      identityContext: agent.identity_context,
      purpose: agent.purpose
    };
  }

  /**
   * Get agent info
   */
  function get(agentId: string) {
    if (!agentId || typeof agentId !== 'string') {
      return { success: false, error: 'agent ID must be a non-empty string' };
    }

    const agent = stmts.get.get(agentId) as AgentRow | undefined;
    if (!agent) {
      return { success: false, error: 'agent not found' };
    }

    const now = Date.now();
    return {
      success: true,
      agent: {
        ...formatAgent(agent, now),
        timeSinceHeartbeat: now - agent.last_heartbeat
      }
    };
  }

  /**
   * Safely parse JSON, returning null on failure
   */
  function safeJsonParse(value: string | null): Record<string, unknown> | null {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * List all agents
   */
  function list(options: ListOptions = {}) {
    const { activeOnly = false, worktreeId = null, identityPrefix = null } = options;
    const now = Date.now();

    let agents: AgentRow[];

    // Choose query based on filters
    if (identityPrefix) {
      // Parse identity to get project (and optionally stack)
      const parsed = parseIdentity(identityPrefix);
      if (parsed.valid) {
        if (parsed.stack) {
          agents = stmts.listByProjectStack.all(parsed.project, parsed.stack) as AgentRow[];
        } else {
          agents = stmts.listByProject.all(parsed.project) as AgentRow[];
        }
      } else {
        agents = [];
      }
    } else if (worktreeId) {
      agents = (activeOnly
        ? stmts.listActiveByWorktree.all(now - DEFAULT_AGENT_TTL, worktreeId)
        : stmts.listByWorktree.all(worktreeId)) as AgentRow[];
    } else {
      agents = (activeOnly
        ? stmts.listActive.all(now - DEFAULT_AGENT_TTL)
        : stmts.list.all()) as AgentRow[];
    }

    // Apply active filter if needed and using identity/worktree filter
    if (activeOnly && (identityPrefix || worktreeId)) {
      const threshold = now - DEFAULT_AGENT_TTL;
      agents = agents.filter(a => a.last_heartbeat > threshold);
    }

    return {
      success: true,
      agents: agents.map(a => formatAgent(a, now)),
      count: agents.length
    };
  }

  /**
   * List stale/dead agents (for resurrection) with optional filters
   */
  function listStale(options: { worktreeId?: string; identityPrefix?: string } = {}) {
    const now = Date.now();
    const threshold = now - DEFAULT_AGENT_TTL;

    let agents: AgentRow[];

    if (options.identityPrefix) {
      const parsed = parseIdentity(options.identityPrefix);
      if (parsed.valid) {
        agents = stmts.listStaleByProject.all(threshold, parsed.project) as AgentRow[];
        // Further filter by stack if provided
        if (parsed.stack) {
          agents = agents.filter(a => a.identity_stack === parsed.stack);
        }
      } else {
        agents = [];
      }
    } else if (options.worktreeId) {
      agents = stmts.listStaleByWorktree.all(threshold, options.worktreeId) as AgentRow[];
    } else {
      agents = stmts.listStale.all(threshold) as AgentRow[];
    }

    return {
      success: true,
      agents: agents.map(a => formatAgent(a, now)),
      count: agents.length
    };
  }

  /**
   * Escape SQL LIKE pattern wildcards
   */
  function escapeLikePattern(str: string): string {
    // Escape SQL LIKE wildcards: % and _
    return str.replace(/[%_]/g, '\\$&');
  }

  /**
   * Check if agent can claim more services
   */
  function canClaimService(agentId: string): ResourceCheck {
    const agent = stmts.get.get(agentId) as AgentRow | undefined;
    if (!agent) return { allowed: true }; // Unregistered agents get default limits

    // Escape agentId to prevent SQL injection via LIKE wildcards
    const safeAgentId = escapeLikePattern(agentId);
    const countResult = stmts.countServices.get(`%"agent":"${safeAgentId}"%`) as { count: number };
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
  function canAcquireLock(agentId: string): ResourceCheck {
    const agent = stmts.get.get(agentId) as AgentRow | undefined;
    if (!agent) return { allowed: true }; // Unregistered agents get default limits

    const countResult = stmts.countLocks.get(agentId) as { count: number };
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
  function cleanup(locks?: LocksLike) {
    const now = Date.now();
    const staleAgents = stmts.listStale.all(now - DEFAULT_AGENT_TTL) as AgentRow[];

    let releasedLocks = 0;

    for (const agent of staleAgents) {
      // Release locks owned by this agent.
      // Note: services don't track agent ownership (no agent_id column),
      // so service cleanup relies on expires_at TTL and PID liveness checks
      // in services.cleanup() instead.
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
    listStale,
    canClaimService,
    canAcquireLock,
    cleanup,
    DEFAULT_HEARTBEAT_INTERVAL,
    DEFAULT_AGENT_TTL
  };
}
