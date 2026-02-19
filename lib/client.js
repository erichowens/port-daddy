/**
 * Port Daddy JavaScript SDK
 *
 * Programmatic client for the Port Daddy daemon.
 * Works in Node.js 18+ (uses native fetch).
 *
 * @example
 * import { PortDaddy } from 'port-daddy/client';
 *
 * const pd = new PortDaddy();
 * const { port } = await pd.claim('myapp:api');
 * console.log(`Server running on port ${port}`);
 *
 * // When done:
 * await pd.release('myapp:api');
 */

const DEFAULT_URL = 'http://localhost:9876';

class PortDaddyError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'PortDaddyError';
    this.status = status;
    this.body = body;
  }
}

class ConnectionError extends PortDaddyError {
  constructor(url) {
    super(
      `Port Daddy daemon is not running at ${url}. Start it with: port-daddy start`,
      0,
      null
    );
    this.name = 'ConnectionError';
  }
}

/**
 * Port Daddy client SDK.
 *
 * @example
 * const pd = new PortDaddy();
 * const { port } = await pd.claim('myapp:api');
 */
class PortDaddy {
  /**
   * Create a new Port Daddy client.
   *
   * @param {Object} [options]
   * @param {string} [options.url='http://localhost:9876'] - Daemon URL
   * @param {string} [options.agentId] - Agent ID for tracking
   * @param {number} [options.pid] - Process ID for ownership
   * @param {number} [options.timeout=5000] - Request timeout in ms
   */
  constructor(options = {}) {
    this.url = (options.url || process.env.PORT_DADDY_URL || DEFAULT_URL).replace(/\/$/, '');
    this.agentId = options.agentId || process.env.PORT_DADDY_AGENT;
    this.pid = options.pid || process.pid;
    this.timeout = options.timeout || 5000;
  }

  // ===========================================================================
  // Internal helpers
  // ===========================================================================

  /** @private */
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.agentId) h['X-Agent-Id'] = this.agentId;
    if (this.pid) h['X-Pid'] = String(this.pid);
    return h;
  }

  /** @private */
  async _request(method, path, body) {
    const url = `${this.url}${path}`;
    const opts = {
      method,
      headers: this._headers(),
      signal: AbortSignal.timeout(this.timeout),
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        throw new ConnectionError(this.url);
      }
      throw new PortDaddyError(`Request failed: ${err.message}`, 0, null);
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      throw new PortDaddyError(msg, res.status, data);
    }

    return data;
  }

  // ===========================================================================
  // Services — Port claiming and management
  // ===========================================================================

  /**
   * Claim a port for a service.
   *
   * @param {string} id - Semantic identity (e.g. 'myapp:api:main')
   * @param {Object} [options]
   * @param {number} [options.port] - Preferred port number
   * @param {number[]} [options.range] - [min, max] port range
   * @param {number} [options.expires] - TTL in milliseconds
   * @param {string} [options.cmd] - Command that owns the port
   * @param {string} [options.cwd] - Working directory
   * @param {string} [options.pair] - Service to pair with
   * @param {Object} [options.metadata] - Arbitrary metadata
   * @returns {Promise<{port: number, id: string, existing: boolean}>}
   *
   * @example
   * const { port } = await pd.claim('myapp:api');
   * // => { port: 3142, id: 'myapp:api', existing: false }
   *
   * @example
   * // Request a specific port
   * const { port } = await pd.claim('myapp:frontend', { port: 3000 });
   */
  async claim(id, options = {}) {
    return this._request('POST', '/claim', { id, pid: this.pid, ...options });
  }

  /**
   * Release a service and free its port.
   *
   * @param {string} id - Service ID or glob pattern (e.g. 'myapp:*')
   * @returns {Promise<{released: number, releasedPorts: number[]}>}
   *
   * @example
   * await pd.release('myapp:api');
   * // Release all services for a project:
   * await pd.release('myapp:*');
   */
  async release(id) {
    return this._request('DELETE', '/release', { id });
  }

  /**
   * Get a single service by ID.
   *
   * @param {string} id - Service ID
   * @returns {Promise<Object>} Service details including port, status, endpoints
   */
  async getService(id) {
    return this._request('GET', `/services/${encodeURIComponent(id)}`);
  }

  /**
   * Find services matching a pattern.
   *
   * @param {Object} [options]
   * @param {string} [options.pattern='*'] - Glob pattern to match service IDs
   * @param {string} [options.status] - Filter by status ('assigned', 'running', etc.)
   * @param {number} [options.port] - Filter by port number
   * @returns {Promise<{services: Object[], count: number}>}
   *
   * @example
   * const { services } = await pd.listServices({ pattern: 'myapp:*' });
   */
  async listServices(options = {}) {
    const params = new URLSearchParams();
    if (options.pattern) params.set('pattern', options.pattern);
    if (options.status) params.set('status', options.status);
    if (options.port) params.set('port', String(options.port));
    const qs = params.toString();
    return this._request('GET', `/services${qs ? '?' + qs : ''}`);
  }

  /**
   * Set an endpoint URL for a service.
   *
   * @param {string} id - Service ID
   * @param {string} env - Environment name ('local', 'dev', 'staging', 'prod')
   * @param {string} url - Endpoint URL
   * @returns {Promise<Object>}
   *
   * @example
   * await pd.setEndpoint('myapp:api', 'local', 'http://localhost:3142');
   * await pd.setEndpoint('myapp:api', 'prod', 'https://api.myapp.com');
   */
  async setEndpoint(id, env, url) {
    return this._request('PUT', `/services/${encodeURIComponent(id)}/endpoints/${encodeURIComponent(env)}`, { url });
  }

  // ===========================================================================
  // Messaging — Pub/sub for agent coordination
  // ===========================================================================

  /**
   * Publish a message to a channel.
   *
   * @param {string} channel - Channel name
   * @param {Object} payload - Message payload
   * @param {Object} [options]
   * @param {string} [options.sender] - Sender identifier
   * @param {number} [options.expires] - TTL in milliseconds
   * @returns {Promise<{id: number, channel: string}>}
   *
   * @example
   * await pd.publish('builds', { status: 'complete', artifact: 'dist.tar.gz' });
   */
  async publish(channel, payload, options = {}) {
    return this._request('POST', `/msg/${encodeURIComponent(channel)}`, {
      payload,
      ...options,
    });
  }

  /**
   * Get messages from a channel.
   *
   * @param {string} channel - Channel name
   * @param {Object} [options]
   * @param {number} [options.limit=50] - Max messages to return
   * @param {number} [options.after] - Only messages after this ID
   * @returns {Promise<{messages: Object[], count: number}>}
   *
   * @example
   * const { messages } = await pd.getMessages('builds', { limit: 10 });
   */
  async getMessages(channel, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.after) params.set('after', String(options.after));
    const qs = params.toString();
    return this._request('GET', `/msg/${encodeURIComponent(channel)}${qs ? '?' + qs : ''}`);
  }

  /**
   * List all active channels.
   *
   * @returns {Promise<{channels: string[]}>}
   */
  async listChannels() {
    return this._request('GET', '/channels');
  }

  /**
   * Long-poll for the next message on a channel.
   *
   * @param {string} channel - Channel name
   * @param {Object} [options]
   * @param {number} [options.after=0] - Only messages after this ID
   * @param {number} [options.timeout=30000] - Poll timeout in ms
   * @returns {Promise<{message: Object|null}>}
   *
   * @example
   * // Wait for next build notification
   * const { message } = await pd.poll('builds');
   * if (message) console.log('Build update:', message.payload);
   */
  async poll(channel, options = {}) {
    const params = new URLSearchParams();
    if (options.after) params.set('after', String(options.after));
    if (options.timeout) params.set('timeout', String(options.timeout));
    const qs = params.toString();
    const prevTimeout = this.timeout;
    this.timeout = Math.max(this.timeout, (options.timeout || 30000) + 5000);
    try {
      return await this._request('GET', `/msg/${encodeURIComponent(channel)}/poll${qs ? '?' + qs : ''}`);
    } finally {
      this.timeout = prevTimeout;
    }
  }

  /**
   * Subscribe to a channel via Server-Sent Events.
   *
   * Returns an object with an `on()` method and an `unsubscribe()` cleanup function.
   * Requires the `eventsource` package or a browser environment with native EventSource.
   *
   * @param {string} channel - Channel name
   * @returns {{ on: Function, unsubscribe: Function }}
   *
   * @example
   * const sub = pd.subscribe('deployments');
   * sub.on('message', (data) => console.log('Deploy:', data));
   * sub.on('error', (err) => console.error(err));
   *
   * // Later:
   * sub.unsubscribe();
   */
  subscribe(channel) {
    const url = `${this.url}/msg/${encodeURIComponent(channel)}/subscribe`;
    const handlers = { message: [], error: [], connected: [] };

    // Use native EventSource if available (browser), otherwise fall back
    const EventSourceImpl = typeof EventSource !== 'undefined' ? EventSource : null;

    if (!EventSourceImpl) {
      // Node.js fallback using native fetch with streaming
      const controller = new AbortController();
      let active = true;

      (async () => {
        try {
          const res = await fetch(url, {
            headers: this._headers(),
            signal: controller.signal,
          });

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (active) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  handlers.message.forEach(fn => fn(data));
                } catch {
                  // Non-JSON data line, skip
                }
              } else if (line.startsWith('event: connected')) {
                handlers.connected.forEach(fn => fn());
              }
            }
          }
        } catch (err) {
          if (active) {
            handlers.error.forEach(fn => fn(err));
          }
        }
      })();

      return {
        on(event, fn) { (handlers[event] || []).push(fn); return this; },
        unsubscribe() { active = false; controller.abort(); },
      };
    }

    // Browser EventSource path
    const es = new EventSourceImpl(url);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        handlers.message.forEach(fn => fn(data));
      } catch { /* ignore non-JSON */ }
    };
    es.onerror = (e) => handlers.error.forEach(fn => fn(e));
    es.addEventListener('connected', () => handlers.connected.forEach(fn => fn()));

    return {
      on(event, fn) { (handlers[event] || []).push(fn); return this; },
      unsubscribe() { es.close(); },
    };
  }

  /**
   * Clear all messages from a channel.
   *
   * @param {string} channel - Channel name
   * @returns {Promise<Object>}
   */
  async clearChannel(channel) {
    return this._request('DELETE', `/msg/${encodeURIComponent(channel)}`);
  }

  // ===========================================================================
  // Locks — Distributed locking
  // ===========================================================================

  /**
   * Acquire a distributed lock.
   *
   * @param {string} name - Lock name
   * @param {Object} [options]
   * @param {string} [options.owner] - Lock owner (defaults to agentId)
   * @param {number} [options.ttl=300000] - Time-to-live in ms (default 5 min)
   * @param {Object} [options.metadata] - Arbitrary metadata
   * @returns {Promise<{success: boolean, owner: string, expiresAt: number}>}
   * @throws {PortDaddyError} 409 if lock is already held
   *
   * @example
   * await pd.lock('deploy-prod');
   * try {
   *   // ... critical section ...
   * } finally {
   *   await pd.unlock('deploy-prod');
   * }
   */
  async lock(name, options = {}) {
    return this._request('POST', `/locks/${encodeURIComponent(name)}`, {
      owner: options.owner || this.agentId,
      ttl: options.ttl,
      metadata: options.metadata,
    });
  }

  /**
   * Release a distributed lock.
   *
   * @param {string} name - Lock name
   * @param {Object} [options]
   * @param {string} [options.owner] - Must match the lock owner
   * @param {boolean} [options.force=false] - Force release regardless of owner
   * @returns {Promise<{released: boolean}>}
   */
  async unlock(name, options = {}) {
    return this._request('DELETE', `/locks/${encodeURIComponent(name)}`, {
      owner: options.owner || this.agentId,
      force: options.force,
    });
  }

  /**
   * Check if a lock is held.
   *
   * @param {string} name - Lock name
   * @returns {Promise<{locked: boolean, owner?: string, expiresAt?: number}>}
   */
  async checkLock(name) {
    return this._request('GET', `/locks/${encodeURIComponent(name)}`);
  }

  /**
   * Extend a lock's TTL.
   *
   * @param {string} name - Lock name
   * @param {Object} [options]
   * @param {number} [options.ttl] - New TTL in ms
   * @param {string} [options.owner] - Must match lock owner
   * @returns {Promise<Object>}
   */
  async extendLock(name, options = {}) {
    return this._request('PUT', `/locks/${encodeURIComponent(name)}`, {
      owner: options.owner || this.agentId,
      ttl: options.ttl,
    });
  }

  /**
   * List all locks.
   *
   * @param {Object} [options]
   * @param {string} [options.owner] - Filter by owner
   * @returns {Promise<{locks: Object[], count: number}>}
   */
  async listLocks(options = {}) {
    const params = new URLSearchParams();
    if (options.owner) params.set('owner', options.owner);
    const qs = params.toString();
    return this._request('GET', `/locks${qs ? '?' + qs : ''}`);
  }

  /**
   * Execute a function while holding a lock. The lock is automatically
   * released when the function completes (or throws).
   *
   * @param {string} name - Lock name
   * @param {Function} fn - Async function to execute
   * @param {Object} [options] - Lock options (ttl, metadata)
   * @returns {Promise<*>} Return value of fn
   *
   * @example
   * const result = await pd.withLock('deploy-prod', async () => {
   *   await deployToProduction();
   *   return 'deployed';
   * });
   */
  async withLock(name, fn, options = {}) {
    await this.lock(name, options);
    try {
      return await fn();
    } finally {
      await this.unlock(name).catch(() => {}); // Best-effort release
    }
  }

  // ===========================================================================
  // Agents — Registry and heartbeats
  // ===========================================================================

  /**
   * Register this client as an agent.
   *
   * @param {Object} [options]
   * @param {string} [options.name] - Human-readable name
   * @param {string} [options.type='sdk'] - Agent type
   * @param {number} [options.maxServices=10] - Max concurrent services
   * @param {number} [options.maxLocks=5] - Max concurrent locks
   * @param {Object} [options.metadata] - Arbitrary metadata
   * @returns {Promise<Object>}
   *
   * @example
   * await pd.register({ name: 'build-agent', type: 'ci' });
   */
  async register(options = {}) {
    if (!this.agentId) {
      throw new PortDaddyError('agentId required for registration. Set it in constructor options.', 0, null);
    }
    return this._request('POST', '/agents', {
      id: this.agentId,
      name: options.name || this.agentId,
      type: options.type || 'sdk',
      metadata: options.metadata,
      maxServices: options.maxServices,
      maxLocks: options.maxLocks,
    });
  }

  /**
   * Send a heartbeat to keep the agent registration alive.
   *
   * @returns {Promise<Object>}
   */
  async heartbeat() {
    if (!this.agentId) {
      throw new PortDaddyError('agentId required for heartbeat', 0, null);
    }
    return this._request('POST', `/agents/${encodeURIComponent(this.agentId)}/heartbeat`);
  }

  /**
   * Start automatic heartbeats at a regular interval.
   *
   * @param {number} [intervalMs=60000] - Heartbeat interval (default 1 min)
   * @returns {{ stop: Function }} Object with stop() to cancel heartbeats
   *
   * @example
   * const hb = pd.startHeartbeat(30000);
   * // Later:
   * hb.stop();
   */
  startHeartbeat(intervalMs = 60000) {
    const timer = setInterval(() => {
      this.heartbeat().catch(() => {}); // Swallow errors silently
    }, intervalMs);

    // Send one immediately
    this.heartbeat().catch(() => {});

    return {
      stop: () => clearInterval(timer),
    };
  }

  /**
   * Unregister this agent.
   *
   * @returns {Promise<Object>}
   */
  async unregister() {
    if (!this.agentId) {
      throw new PortDaddyError('agentId required for unregister', 0, null);
    }
    return this._request('DELETE', `/agents/${encodeURIComponent(this.agentId)}`);
  }

  /**
   * Get info about an agent.
   *
   * @param {string} [id] - Agent ID (defaults to this client's agentId)
   * @returns {Promise<Object>}
   */
  async getAgent(id) {
    const agentId = id || this.agentId;
    if (!agentId) throw new PortDaddyError('agent id required', 0, null);
    return this._request('GET', `/agents/${encodeURIComponent(agentId)}`);
  }

  /**
   * List all registered agents.
   *
   * @param {Object} [options]
   * @param {boolean} [options.activeOnly=false] - Only show active agents
   * @returns {Promise<{agents: Object[], count: number}>}
   */
  async listAgents(options = {}) {
    const params = new URLSearchParams();
    if (options.activeOnly) params.set('active', 'true');
    const qs = params.toString();
    return this._request('GET', `/agents${qs ? '?' + qs : ''}`);
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  /**
   * Register a webhook.
   *
   * @param {string} url - Webhook URL
   * @param {Object} [options]
   * @param {string[]} [options.events] - Events to subscribe to
   * @param {string} [options.secret] - HMAC signing secret
   * @param {string} [options.filterPattern] - Pattern to filter events
   * @param {Object} [options.metadata] - Arbitrary metadata
   * @returns {Promise<{id: string}>}
   *
   * @example
   * const { id } = await pd.addWebhook('https://example.com/hook', {
   *   events: ['service.claim', 'service.release'],
   *   secret: 'my-signing-secret'
   * });
   */
  async addWebhook(url, options = {}) {
    return this._request('POST', '/webhooks', { url, ...options });
  }

  /**
   * List registered webhooks.
   *
   * @param {Object} [options]
   * @param {boolean} [options.activeOnly=false] - Only active webhooks
   * @returns {Promise<{webhooks: Object[], count: number}>}
   */
  async listWebhooks(options = {}) {
    const params = new URLSearchParams();
    if (options.activeOnly) params.set('active', 'true');
    const qs = params.toString();
    return this._request('GET', `/webhooks${qs ? '?' + qs : ''}`);
  }

  /**
   * Delete a webhook.
   *
   * @param {string} id - Webhook ID
   * @returns {Promise<Object>}
   */
  async removeWebhook(id) {
    return this._request('DELETE', `/webhooks/${encodeURIComponent(id)}`);
  }

  // ===========================================================================
  // System — Health, version, activity
  // ===========================================================================

  /**
   * Check if the daemon is healthy.
   *
   * @returns {Promise<{status: string, version: string, uptime_seconds: number, active_ports: number}>}
   */
  async health() {
    return this._request('GET', '/health');
  }

  /**
   * Get daemon version and info.
   *
   * @returns {Promise<{version: string, codeHash: string, uptime: number}>}
   */
  async version() {
    return this._request('GET', '/version');
  }

  /**
   * Get recent activity log entries.
   *
   * @param {Object} [options]
   * @param {number} [options.limit=100] - Max entries
   * @param {string} [options.type] - Filter by activity type
   * @param {string} [options.agent] - Filter by agent ID
   * @returns {Promise<{activities: Object[], count: number}>}
   */
  async getActivity(options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.type) params.set('type', options.type);
    if (options.agent) params.set('agent', options.agent);
    const qs = params.toString();
    return this._request('GET', `/activity${qs ? '?' + qs : ''}`);
  }

  /**
   * Trigger cleanup of stale services.
   *
   * @returns {Promise<{freed: Object[], count: number}>}
   */
  async cleanup() {
    return this._request('POST', '/ports/cleanup');
  }

  /**
   * Ping the daemon. Returns true if reachable, false otherwise.
   *
   * @returns {Promise<boolean>}
   *
   * @example
   * if (await pd.ping()) {
   *   console.log('Port Daddy is running');
   * }
   */
  async ping() {
    try {
      await this.health();
      return true;
    } catch {
      return false;
    }
  }
}

export { PortDaddy, PortDaddyError, ConnectionError };
export default PortDaddy;
