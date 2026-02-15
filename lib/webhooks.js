/**
 * Webhooks Module
 *
 * Provides webhook subscriptions for Port Daddy events.
 * External systems can register webhooks to be notified when:
 * - Services are claimed/released
 * - Agents register/unregister
 * - Locks are acquired/released
 * - Messages are published to channels
 *
 * Features:
 * - HMAC-SHA256 signed payloads for verification
 * - Retry with exponential backoff
 * - Event filtering by type and pattern
 * - Delivery status tracking
 */

import { createHmac, randomUUID } from 'crypto';

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_WEBHOOKS = 100;                    // Maximum webhooks total
const MAX_QUEUE_SIZE = 10000;                // Maximum pending deliveries in memory
const MAX_RETRY_ATTEMPTS = 5;                // Maximum delivery retry attempts
const DELIVERY_TIMEOUT_MS = 10000;           // 10 second timeout per delivery
const CLEANUP_RETENTION_DAYS = 7;            // Keep delivery history for 7 days
const RESPONSE_BODY_MAX_LENGTH = 1000;       // Truncate response bodies

// Private/internal IP patterns to block (SSRF prevention)
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,                                  // Loopback
  /^10\./,                                   // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./,          // Private Class B
  /^192\.168\./,                             // Private Class C
  /^169\.254\./,                             // Link-local
  /^0\./,                                    // Current network
  /^::1$/,                                   // IPv6 loopback
  /^fc00:/i,                                 // IPv6 unique local
  /^fe80:/i,                                 // IPv6 link-local
  /^fd[0-9a-f]{2}:/i,                        // IPv6 unique local
  /^\[::1\]$/,                               // IPv6 loopback bracketed
  /^metadata\.google\.internal$/i,           // GCP metadata
  /^169\.254\.169\.254$/,                    // AWS/GCP/Azure metadata
];

// Event types that can trigger webhooks
export const WebhookEvent = {
  SERVICE_CLAIM: 'service.claim',
  SERVICE_RELEASE: 'service.release',
  AGENT_REGISTER: 'agent.register',
  AGENT_UNREGISTER: 'agent.unregister',
  AGENT_STALE: 'agent.stale',
  LOCK_ACQUIRE: 'lock.acquire',
  LOCK_RELEASE: 'lock.release',
  MESSAGE_PUBLISH: 'message.publish',
  DAEMON_START: 'daemon.start',
  DAEMON_STOP: 'daemon.stop'
};

export function createWebhooks(db) {
  // Initialize schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      secret TEXT,
      events TEXT NOT NULL,
      filter_pattern TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      last_triggered INTEGER,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt INTEGER,
      response_status INTEGER,
      response_body TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON webhook_deliveries(webhook_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON webhook_deliveries(status);
  `);

  // Prepared statements
  const stmts = {
    insert: db.prepare(`
      INSERT INTO webhooks (id, url, secret, events, filter_pattern, active, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),
    update: db.prepare(`
      UPDATE webhooks SET url = ?, events = ?, filter_pattern = ?, active = ?, metadata = ?
      WHERE id = ?
    `),
    delete: db.prepare('DELETE FROM webhooks WHERE id = ?'),
    getById: db.prepare('SELECT * FROM webhooks WHERE id = ?'),
    getActive: db.prepare('SELECT * FROM webhooks WHERE active = 1'),
    getByEvent: db.prepare(`
      SELECT * FROM webhooks WHERE active = 1 AND events LIKE ?
    `),
    getAll: db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC'),
    updateStats: db.prepare(`
      UPDATE webhooks SET last_triggered = ?, success_count = success_count + ?, failure_count = failure_count + ?
      WHERE id = ?
    `),
    insertDelivery: db.prepare(`
      INSERT INTO webhook_deliveries (id, webhook_id, event, payload, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    updateDelivery: db.prepare(`
      UPDATE webhook_deliveries
      SET status = ?, attempts = attempts + 1, last_attempt = ?, response_status = ?, response_body = ?
      WHERE id = ?
    `),
    getDeliveries: db.prepare(`
      SELECT * FROM webhook_deliveries WHERE webhook_id = ? ORDER BY created_at DESC LIMIT ?
    `),
    getPendingDeliveries: db.prepare(`
      SELECT * FROM webhook_deliveries WHERE status IN ('pending', 'retrying') AND attempts < 5
    `),
    cleanupDeliveries: db.prepare(`
      DELETE FROM webhook_deliveries WHERE created_at < ?
    `)
  };

  // In-memory queue for pending deliveries
  const deliveryQueue = [];
  let processingQueue = false;

  /**
   * Check if a hostname is a private/internal address (SSRF prevention)
   * @param {string} hostname - The hostname to check
   * @returns {boolean} True if the hostname is private/internal
   */
  function isPrivateHost(hostname) {
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Register a new webhook
   */
  function register(url, options = {}) {
    const { events = ['*'], secret, filterPattern, metadata } = options;

    // Enforce maximum webhook limit
    const currentCount = stmts.getAll.all().length;
    if (currentCount >= MAX_WEBHOOKS) {
      return {
        success: false,
        error: `Maximum webhook limit reached (${MAX_WEBHOOKS})`
      };
    }

    // Validate URL
    let parsed;
    try {
      parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { success: false, error: 'URL must use http or https protocol' };
      }
    } catch {
      return { success: false, error: 'Invalid URL' };
    }

    // SSRF Prevention: Block private/internal hosts
    if (isPrivateHost(parsed.hostname)) {
      return {
        success: false,
        error: 'Webhook URLs cannot target private or internal addresses'
      };
    }

    // Validate events
    const validEvents = Object.values(WebhookEvent);
    for (const event of events) {
      if (event !== '*' && !validEvents.includes(event)) {
        return { success: false, error: `Invalid event type: ${event}` };
      }
    }

    // Validate filter pattern (prevent ReDoS by limiting complexity)
    if (filterPattern) {
      if (filterPattern.length > 100) {
        return { success: false, error: 'Filter pattern too long (max 100 chars)' };
      }
      // Only allow simple glob patterns: alphanumeric, dashes, underscores, colons, and single *
      if (!/^[a-zA-Z0-9:_*-]+$/.test(filterPattern)) {
        return { success: false, error: 'Filter pattern contains invalid characters' };
      }
    }

    const id = randomUUID();
    const now = Date.now();

    stmts.insert.run(
      id,
      url,
      secret || null,
      JSON.stringify(events),
      filterPattern || null,
      1,
      now,
      metadata ? JSON.stringify(metadata) : null
    );

    return {
      success: true,
      id,
      url,
      events,
      message: 'Webhook registered'
    };
  }

  /**
   * Update a webhook
   */
  function update(id, updates) {
    const existing = stmts.getById.get(id);
    if (!existing) {
      return { success: false, error: 'Webhook not found' };
    }

    const { url, events, filterPattern, active, metadata } = updates;

    stmts.update.run(
      url || existing.url,
      events ? JSON.stringify(events) : existing.events,
      filterPattern !== undefined ? filterPattern : existing.filter_pattern,
      active !== undefined ? (active ? 1 : 0) : existing.active,
      metadata ? JSON.stringify(metadata) : existing.metadata,
      id
    );

    return { success: true, message: 'Webhook updated' };
  }

  /**
   * Delete a webhook
   */
  function remove(id) {
    const result = stmts.delete.run(id);
    return {
      success: result.changes > 0,
      deleted: result.changes > 0,
      error: result.changes === 0 ? 'Webhook not found' : undefined
    };
  }

  /**
   * Get a webhook by ID
   */
  function get(id) {
    const webhook = stmts.getById.get(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    return {
      success: true,
      webhook: parseWebhook(webhook)
    };
  }

  /**
   * List all webhooks
   */
  function list(options = {}) {
    const { activeOnly } = options;
    const webhooks = activeOnly ? stmts.getActive.all() : stmts.getAll.all();

    return {
      success: true,
      webhooks: webhooks.map(parseWebhook),
      count: webhooks.length
    };
  }

  /**
   * Parse webhook row from database
   */
  function parseWebhook(row) {
    return {
      id: row.id,
      url: row.url,
      hasSecret: !!row.secret,
      events: JSON.parse(row.events),
      filterPattern: row.filter_pattern,
      active: !!row.active,
      createdAt: row.created_at,
      lastTriggered: row.last_triggered,
      successCount: row.success_count,
      failureCount: row.failure_count,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  /**
   * Sign a payload with HMAC-SHA256
   */
  function signPayload(payload, secret) {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  /**
   * Safe glob matching without regex (ReDoS-safe)
   * Supports simple * wildcards only
   * @param {string} pattern - Pattern with optional * wildcards
   * @param {string} str - String to match
   * @returns {boolean} True if pattern matches string
   */
  function safeGlobMatch(pattern, str) {
    if (!pattern || !str) return false;
    if (pattern === '*') return true;
    if (!pattern.includes('*')) return pattern === str;

    // Split pattern by * and match segments
    const segments = pattern.split('*');
    let pos = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (segment === '') continue;

      const idx = str.indexOf(segment, pos);
      if (idx === -1) return false;

      // First segment must be at start if pattern doesn't start with *
      if (i === 0 && !pattern.startsWith('*') && idx !== 0) return false;

      pos = idx + segment.length;
    }

    // Last segment must be at end if pattern doesn't end with *
    if (!pattern.endsWith('*') && segments[segments.length - 1]) {
      return str.endsWith(segments[segments.length - 1]);
    }

    return true;
  }

  /**
   * Trigger webhooks for an event
   */
  function trigger(event, data, options = {}) {
    const { targetId } = options;

    // Enforce queue size limit to prevent memory exhaustion
    if (deliveryQueue.length >= MAX_QUEUE_SIZE) {
      return {
        triggered: 0,
        error: 'Delivery queue full, try again later'
      };
    }

    // Find matching webhooks
    const webhooks = stmts.getActive.all().filter(webhook => {
      const events = JSON.parse(webhook.events);

      // Check event match
      const eventMatches = events.includes('*') || events.includes(event);
      if (!eventMatches) return false;

      // Check filter pattern if specified (using safe glob matching)
      if (webhook.filter_pattern && targetId) {
        if (!safeGlobMatch(webhook.filter_pattern, targetId)) {
          return false;
        }
      }

      return true;
    });

    if (webhooks.length === 0) {
      return { triggered: 0 };
    }

    const payload = {
      event,
      timestamp: Date.now(),
      data
    };

    // Queue deliveries (with queue size check per webhook)
    let queued = 0;
    for (const webhook of webhooks) {
      if (deliveryQueue.length >= MAX_QUEUE_SIZE) break;

      const deliveryId = randomUUID();

      stmts.insertDelivery.run(
        deliveryId,
        webhook.id,
        event,
        JSON.stringify(payload),
        'pending',
        Date.now()
      );

      deliveryQueue.push({
        deliveryId,
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        payload
      });
      queued++;
    }

    // Process queue asynchronously
    processQueue();

    return { triggered: queued };
  }

  /**
   * Process delivery queue
   */
  async function processQueue() {
    if (processingQueue || deliveryQueue.length === 0) {
      return;
    }

    processingQueue = true;

    while (deliveryQueue.length > 0) {
      const delivery = deliveryQueue.shift();
      await deliverWebhook(delivery);
    }

    processingQueue = false;
  }

  /**
   * Deliver a single webhook
   */
  async function deliverWebhook(delivery, attempt = 1) {
    const { deliveryId, webhookId, url, secret, payload } = delivery;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-PortDaddy-Event': payload.event,
        'X-PortDaddy-Delivery': deliveryId,
        'X-PortDaddy-Timestamp': String(payload.timestamp)
      };

      // Add signature if secret is configured
      if (secret) {
        headers['X-PortDaddy-Signature'] = `sha256=${signPayload(payload, secret)}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS)
      });

      const responseBody = await response.text().catch(() => '');

      if (response.ok) {
        // Success
        stmts.updateDelivery.run(
          'delivered',
          Date.now(),
          response.status,
          responseBody.slice(0, RESPONSE_BODY_MAX_LENGTH),
          deliveryId
        );
        stmts.updateStats.run(Date.now(), 1, 0, webhookId);
      } else {
        // HTTP error - retry if attempts remain
        stmts.updateDelivery.run(
          attempt < MAX_RETRY_ATTEMPTS ? 'retrying' : 'failed',
          Date.now(),
          response.status,
          responseBody.slice(0, RESPONSE_BODY_MAX_LENGTH),
          deliveryId
        );

        if (attempt < MAX_RETRY_ATTEMPTS) {
          // Exponential backoff: 1s, 2s, 4s, 8s
          const delay = Math.pow(2, attempt - 1) * 1000;
          setTimeout(() => deliverWebhook(delivery, attempt + 1), delay);
        } else {
          stmts.updateStats.run(Date.now(), 0, 1, webhookId);
        }
      }
    } catch (error) {
      // Network error - retry if attempts remain
      stmts.updateDelivery.run(
        attempt < MAX_RETRY_ATTEMPTS ? 'retrying' : 'failed',
        Date.now(),
        null,
        error.message.slice(0, RESPONSE_BODY_MAX_LENGTH),
        deliveryId
      );

      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        setTimeout(() => deliverWebhook(delivery, attempt + 1), delay);
      } else {
        stmts.updateStats.run(Date.now(), 0, 1, webhookId);
      }
    }
  }

  /**
   * Get delivery history for a webhook
   */
  function getDeliveries(webhookId, options = {}) {
    // Validate and cap limit to prevent abuse
    let { limit = 50 } = options;
    if (typeof limit !== 'number' || limit < 1) {
      limit = 50;
    }
    limit = Math.min(limit, 500); // Hard cap at 500

    const deliveries = stmts.getDeliveries.all(webhookId, limit);

    return {
      success: true,
      deliveries: deliveries.map(d => ({
        id: d.id,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        lastAttempt: d.last_attempt,
        responseStatus: d.response_status,
        createdAt: d.created_at
      })),
      count: deliveries.length
    };
  }

  /**
   * Retry pending deliveries (called on startup)
   */
  function retryPending() {
    const pending = stmts.getPendingDeliveries.all();

    for (const delivery of pending) {
      const webhook = stmts.getById.get(delivery.webhook_id);
      if (!webhook || !webhook.active) continue;

      deliveryQueue.push({
        deliveryId: delivery.id,
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        payload: JSON.parse(delivery.payload)
      });
    }

    if (pending.length > 0) {
      processQueue();
    }

    return { retrying: pending.length };
  }

  /**
   * Clean up old deliveries
   */
  function cleanup() {
    const cutoff = Date.now() - (CLEANUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = stmts.cleanupDeliveries.run(cutoff);
    return { cleaned: result.changes };
  }

  /**
   * Test a webhook by sending a test payload
   */
  async function test(id) {
    const webhook = stmts.getById.get(id);
    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const payload = {
      event: 'webhook.test',
      timestamp: Date.now(),
      data: {
        message: 'This is a test webhook delivery from Port Daddy',
        webhookId: id
      }
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        'X-PortDaddy-Event': 'webhook.test',
        'X-PortDaddy-Delivery': `test-${randomUUID()}`,
        'X-PortDaddy-Timestamp': String(payload.timestamp)
      };

      if (webhook.secret) {
        headers['X-PortDaddy-Signature'] = `sha256=${signPayload(payload, webhook.secret)}`;
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS)
      });

      const responseBody = await response.text().catch(() => '');

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: responseBody.slice(0, RESPONSE_BODY_MAX_LENGTH)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  return {
    register,
    update,
    remove,
    get,
    list,
    trigger,
    getDeliveries,
    retryPending,
    cleanup,
    test,
    WebhookEvent
  };
}
