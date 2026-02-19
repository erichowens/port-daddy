/**
 * Service Orchestrator
 *
 * Core engine for `port-daddy up` — manages the lifecycle of multiple
 * services with dependency ordering, port claiming, environment injection,
 * health checking, and colored log output.
 *
 * This is CLI-only process management. The daemon stays stateless about
 * processes; the orchestrator owns its children.
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createPrefixer, getServiceColor } from './log-prefix.js';

const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

// =============================================================================
// Pure Functions (exported for unit testing)
// =============================================================================

/**
 * Topological sort using Kahn's algorithm.
 * Returns services in dependency-first order.
 *
 * @param {Object.<string, { needs?: string[] }>} services
 * @returns {{ order: string[], error?: string }}
 */
export function topologicalSort(services) {
  const names = Object.keys(services);
  if (names.length === 0) return { order: [] };

  // Build adjacency list and in-degree map
  const inDegree = new Map();
  const dependents = new Map(); // dep → [services that depend on it]

  for (const name of names) {
    inDegree.set(name, 0);
    dependents.set(name, []);
  }

  for (const [name, svc] of Object.entries(services)) {
    const needs = svc.needs || [];
    for (const dep of needs) {
      if (!inDegree.has(dep)) {
        return { order: [], error: `Unknown dependency: "${name}" needs "${dep}" which is not defined` };
      }
      inDegree.set(name, inDegree.get(name) + 1);
      dependents.get(dep).push(name);
    }
  }

  // Kahn's algorithm: start with nodes that have no dependencies
  const queue = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const order = [];
  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);

    for (const dependent of dependents.get(current)) {
      const newDegree = inDegree.get(dependent) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  // If we haven't visited all nodes, there's a cycle
  if (order.length !== names.length) {
    const cycleMembers = names.filter(n => !order.includes(n));
    // Trace the cycle for a clear error message
    const cyclePath = traceCycle(services, cycleMembers);
    return { order: [], error: `Circular dependency: ${cyclePath}` };
  }

  return { order };
}

/**
 * Trace a dependency cycle for error reporting.
 */
function traceCycle(services, cycleMembers) {
  const start = cycleMembers[0];
  const visited = new Set();
  const path = [start];
  let current = start;

  while (true) {
    visited.add(current);
    const needs = (services[current]?.needs || []).filter(d => cycleMembers.includes(d));
    const next = needs.find(d => d === start) || needs.find(d => !visited.has(d));
    if (!next) break;
    path.push(next);
    if (next === start) break;
    current = next;
  }

  return path.join(' \u2192 ');
}

/**
 * Resolve transitive dependencies for a target service.
 * Used by `--service <name>` to start a service and all its deps.
 *
 * @param {string} target - Service name to resolve deps for
 * @param {Object.<string, { needs?: string[] }>} services
 * @returns {{ deps: Set<string>, error?: string }}
 */
export function resolveDependencies(target, services) {
  if (!services[target]) {
    return { deps: new Set(), error: `Service "${target}" not found` };
  }

  const deps = new Set();
  const stack = [target];

  while (stack.length > 0) {
    const current = stack.pop();
    if (deps.has(current)) continue;
    deps.add(current);

    const needs = services[current]?.needs || [];
    for (const dep of needs) {
      if (!services[dep]) {
        return { deps: new Set(), error: `Service "${current}" depends on "${dep}" which is not defined` };
      }
      if (!deps.has(dep)) {
        stack.push(dep);
      }
    }
  }

  return { deps };
}

/**
 * Normalize service config — handle both old and new field names.
 *
 * Old: { dev, preferredPort, health }
 * New: { cmd, port, healthPath }
 *
 * @param {string} name - Service name
 * @param {Object} svc - Raw service config
 * @returns {Object} Normalized config
 */
export function normalizeServiceConfig(name, svc) {
  return {
    name,
    cmd: svc.cmd || svc.dev || null,
    port: svc.port ?? svc.preferredPort ?? null,
    healthPath: svc.healthPath || svc.health || '/',
    needs: svc.needs || [],
    noPort: svc.noPort || false,
    remote: svc.remote || null,
    dir: svc.dir || null,
    env: svc.env || {},
    stack: svc.stack || null
  };
}

/**
 * Build environment variable maps for all services.
 * Each service gets:
 * - PORT=<its own port>
 * - {SIBLING}_PORT=<port> and {SIBLING}_URL=<url> for every other local service
 * - {SIBLING}_URL=<remote url> for remote services (no PORT var)
 *
 * @param {Object.<string, Object>} services - Normalized service configs
 * @param {Object.<string, number>} portMap - service name → assigned port
 * @returns {Object.<string, Object>} service name → env vars
 */
export function buildEnvMap(services, portMap) {
  const envMaps = {};

  for (const [name, svc] of Object.entries(services)) {
    const env = { ...svc.env };

    // Own port
    if (portMap[name]) {
      env.PORT = String(portMap[name]);
    }

    // Sibling services
    for (const [siblingName, siblingSvc] of Object.entries(services)) {
      if (siblingName === name) continue;

      const varPrefix = siblingName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

      if (siblingSvc.remote) {
        // Remote service — inject URL only
        env[`${varPrefix}_URL`] = siblingSvc.remote;
      } else if (portMap[siblingName]) {
        // Local service — inject both port and URL
        env[`${varPrefix}_PORT`] = String(portMap[siblingName]);
        env[`${varPrefix}_URL`] = `http://localhost:${portMap[siblingName]}`;
      }
    }

    envMaps[name] = env;
  }

  return envMaps;
}

// =============================================================================
// Orchestrator Factory (stateful, manages processes)
// =============================================================================

/**
 * Create an orchestrator instance.
 *
 * @param {Object} options
 * @param {Object.<string, Object>} options.services - Normalized service configs
 * @param {Object.<string, string>} options.identities - service name → semantic ID
 * @param {Object} [options.config] - Additional options
 * @param {boolean} [options.config.noHealth] - Skip health checks
 * @param {number} [options.config.healthTimeout] - Health check timeout (ms)
 * @param {string} [options.config.targetService] - Start only this service + deps
 * @returns {{ start: Function, stop: Function, getStatus: Function, on: Function }}
 */
export function createOrchestrator(options) {
  const {
    services,
    identities,
    config: orchestratorConfig = {}
  } = options;

  const {
    noHealth = false,
    healthTimeout = 30000,
    targetService = null
  } = orchestratorConfig;

  const emitter = new EventEmitter();
  const processes = new Map();       // name → ChildProcess
  const portMap = {};                // name → port number
  const statuses = new Map();        // name → 'starting'|'healthy'|'crashed'|'stopped'
  let stopping = false;

  /**
   * Determine which services to start (respecting --service flag).
   */
  function getServicesToStart() {
    if (targetService) {
      const { deps, error } = resolveDependencies(targetService, services);
      if (error) throw new Error(error);
      return Object.fromEntries(
        [...deps].map(name => [name, services[name]])
      );
    }
    return services;
  }

  /**
   * Claim a port from the daemon for a service.
   */
  async function claimPort(name, identity, preferredPort) {
    const body = { id: identity };
    if (preferredPort) body.port = preferredPort;

    const res = await fetch(`${PORT_DADDY_URL}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PID': String(process.pid)
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(`Failed to claim port for ${name}: ${data.error}`);
    }

    const data = await res.json();
    return data.port;
  }

  /**
   * Release a port back to the daemon.
   */
  async function releasePort(identity) {
    try {
      await fetch(`${PORT_DADDY_URL}/release`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: identity })
      });
    } catch { /* best effort on shutdown */ }
  }

  /**
   * Spawn a service process.
   */
  function spawnService(name, svc, env, prefixer) {
    const cmd = svc.cmd;
    if (!cmd) {
      emitter.emit('error', { name, error: `No command defined for service "${name}"` });
      statuses.set(name, 'crashed');
      return null;
    }

    // Replace ${PORT} in command string
    const resolvedCmd = cmd.replace(/\$\{PORT\}/g, portMap[name] || '');
    const [shell, shellFlag] = process.platform === 'win32'
      ? ['cmd', '/c']
      : ['sh', '-c'];

    const child = spawn(shell, [shellFlag, resolvedCmd], {
      cwd: svc.dir || process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Pipe through prefixer
    const stdoutPrefix = prefixer(name, 'stdout');
    const stderrPrefix = prefixer(name, 'stderr');
    child.stdout.pipe(stdoutPrefix).pipe(process.stdout, { end: false });
    child.stderr.pipe(stderrPrefix).pipe(process.stderr, { end: false });

    // Track early crash: if process exits within 1.5s, it's a crash
    const startTime = Date.now();
    child.on('exit', (code, signal) => {
      if (stopping) return;

      const wasEarly = Date.now() - startTime < 1500;
      statuses.set(name, 'crashed');
      emitter.emit('exit', { name, code, signal, early: wasEarly });
    });

    processes.set(name, child);
    statuses.set(name, 'starting');
    return child;
  }

  /**
   * Poll health endpoint until healthy or timeout.
   */
  async function waitForHealth(name, port, healthPath) {
    if (noHealth || !port) return true;

    const url = `http://localhost:${port}${healthPath}`;
    const deadline = Date.now() + healthTimeout;

    while (Date.now() < deadline) {
      if (statuses.get(name) === 'crashed') return false;

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          statuses.set(name, 'healthy');
          return true;
        }
      } catch { /* not ready yet */ }

      await new Promise(r => setTimeout(r, 500));
    }

    return false;
  }

  /**
   * Start all services in dependency order.
   */
  async function start() {
    const toStart = getServicesToStart();
    const serviceNames = Object.keys(toStart);

    // Filter out remote services (they don't get spawned)
    const localServices = Object.entries(toStart).filter(([, svc]) => !svc.remote);
    const remoteServices = Object.entries(toStart).filter(([, svc]) => svc.remote);

    // Topological sort
    const { order, error } = topologicalSort(toStart);
    if (error) throw new Error(error);

    // Claim ports for local services that need them
    for (const name of order) {
      const svc = toStart[name];
      if (svc.remote || svc.noPort) continue;

      const identity = identities[name] || name;
      const port = await claimPort(name, identity, svc.port);
      portMap[name] = port;
    }

    // Build environment maps
    const envMaps = buildEnvMap(toStart, portMap);

    // Create prefixer for all local services
    const localNames = localServices.map(([name]) => name);
    const prefixer = localNames.length > 0 ? createPrefixer(localNames) : null;

    emitter.emit('portsReady', { portMap: { ...portMap } });

    // Spawn in topological order
    for (const name of order) {
      const svc = toStart[name];
      if (svc.remote || svc.noPort && !svc.cmd) continue;
      if (!svc.cmd) continue;

      spawnService(name, svc, envMaps[name], prefixer);

      // Wait for health before starting dependents
      if (!svc.noPort && portMap[name]) {
        const healthy = await waitForHealth(name, portMap[name], svc.healthPath || '/');
        if (healthy) {
          emitter.emit('healthy', { name, port: portMap[name] });
        } else if (statuses.get(name) === 'crashed') {
          emitter.emit('crash', { name, early: true });
          throw new Error(`Service "${name}" crashed during startup`);
        } else {
          emitter.emit('healthTimeout', { name, port: portMap[name] });
        }
      }
    }

    emitter.emit('allStarted', {
      services: serviceNames,
      ports: { ...portMap }
    });
  }

  /**
   * Stop all services gracefully.
   * SIGTERM in reverse order → 5s grace → SIGKILL survivors.
   */
  async function stop() {
    if (stopping) return;
    stopping = true;

    const names = [...processes.keys()].reverse();

    // SIGTERM all
    for (const name of names) {
      const child = processes.get(name);
      if (child && !child.killed) {
        try {
          child.kill('SIGTERM');
          statuses.set(name, 'stopped');
        } catch { /* already dead */ }
      }
    }

    // Wait up to 5s for graceful exit
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const alive = names.filter(name => {
        const child = processes.get(name);
        return child && !child.killed && child.exitCode === null;
      });
      if (alive.length === 0) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // SIGKILL survivors
    for (const name of names) {
      const child = processes.get(name);
      if (child && child.exitCode === null) {
        try {
          child.kill('SIGKILL');
        } catch { /* already dead */ }
      }
    }

    // Release all ports
    for (const [name] of Object.entries(portMap)) {
      const identity = identities[name] || name;
      await releasePort(identity);
    }

    emitter.emit('stopped', { services: names });
  }

  function getStatus() {
    return {
      services: Object.fromEntries(statuses),
      ports: { ...portMap },
      stopping
    };
  }

  return {
    start,
    stop,
    getStatus,
    on: (event, fn) => emitter.on(event, fn)
  };
}
