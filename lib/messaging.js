/**
 * Messaging Module - Pub/Sub for agent coordination
 *
 * Simple local message broker for multi-agent communication
 */

/**
 * Initialize the messaging module with a database connection
 */
export function createMessaging(db) {
  // Prepared statements
  const stmts = {
    insert: db.prepare(`
      INSERT INTO messages (channel, payload, sender, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `),
    getLatest: db.prepare(`
      SELECT * FROM messages
      WHERE channel = ?
      ORDER BY created_at DESC
      LIMIT ?
    `),
    getAfter: db.prepare(`
      SELECT * FROM messages
      WHERE channel = ? AND id > ?
      ORDER BY created_at ASC
    `),
    getOne: db.prepare(`
      SELECT * FROM messages
      WHERE channel = ?
      ORDER BY created_at ASC
      LIMIT 1
    `),
    deleteById: db.prepare('DELETE FROM messages WHERE id = ?'),
    deleteByChannel: db.prepare('DELETE FROM messages WHERE channel = ?'),
    deleteExpired: db.prepare('DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < ?'),
    getChannels: db.prepare(`
      SELECT channel, COUNT(*) as count, MAX(created_at) as last_message
      FROM messages
      GROUP BY channel
      ORDER BY last_message DESC
    `),
  };

  // In-memory subscribers (for SSE)
  const subscribers = new Map(); // channel -> Set<callback>

  /**
   * Publish a message to a channel
   */
  function publish(channel, payload, options = {}) {
    if (!channel || typeof channel !== 'string') {
      return { success: false, error: 'channel must be a non-empty string' };
    }

    const now = Date.now();
    const { sender = null, expires = null } = options;

    let expiresAt = null;
    if (expires) {
      expiresAt = now + parseExpires(expires);
    }

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    try {
      const result = stmts.insert.run(channel, payloadStr, sender, now, expiresAt);

      const message = {
        id: result.lastInsertRowid,
        channel,
        payload: payloadStr,
        sender,
        createdAt: now
      };

      // Notify subscribers
      notifySubscribers(channel, message);

      return {
        success: true,
        id: result.lastInsertRowid,
        message: `published to ${channel}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Get recent messages from a channel
   */
  function getMessages(channel, options = {}) {
    if (!channel || typeof channel !== 'string') {
      return { success: false, error: 'channel must be a non-empty string' };
    }

    const { limit = 50, after = null } = options;

    let messages;
    if (after !== null) {
      messages = stmts.getAfter.all(channel, after);
    } else {
      messages = stmts.getLatest.all(channel, limit);
      messages.reverse(); // Return in chronological order
    }

    return {
      success: true,
      channel,
      messages: messages.map(m => ({
        id: m.id,
        payload: tryParseJson(m.payload),
        sender: m.sender,
        createdAt: m.created_at
      })),
      count: messages.length
    };
  }

  /**
   * Poll for the next message (blocking-style, but returns immediately)
   * Use with long-polling HTTP or SSE
   */
  function poll(channel, afterId = 0) {
    if (!channel || typeof channel !== 'string') {
      return { success: false, error: 'channel must be a non-empty string' };
    }

    const messages = stmts.getAfter.all(channel, afterId);

    if (messages.length === 0) {
      return { success: true, channel, message: null, lastId: afterId };
    }

    const first = messages[0];
    return {
      success: true,
      channel,
      message: {
        id: first.id,
        payload: tryParseJson(first.payload),
        sender: first.sender,
        createdAt: first.created_at
      },
      lastId: first.id
    };
  }

  /**
   * Subscribe to a channel (in-memory, for SSE)
   * Returns an unsubscribe function
   */
  function subscribe(channel, callback) {
    if (!subscribers.has(channel)) {
      subscribers.set(channel, new Set());
    }

    subscribers.get(channel).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = subscribers.get(channel);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          subscribers.delete(channel);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a channel
   */
  function notifySubscribers(channel, message) {
    const subs = subscribers.get(channel);
    if (subs) {
      for (const callback of subs) {
        try {
          callback(message);
        } catch (err) {
          console.error(`Error notifying subscriber on ${channel}:`, err);
        }
      }
    }

    // Also notify wildcard subscribers
    const wildcardSubs = subscribers.get('*');
    if (wildcardSubs) {
      for (const callback of wildcardSubs) {
        try {
          callback({ ...message, channel });
        } catch (err) {
          console.error('Error notifying wildcard subscriber:', err);
        }
      }
    }
  }

  /**
   * Clear all messages from a channel
   */
  function clear(channel) {
    if (!channel || typeof channel !== 'string') {
      return { success: false, error: 'channel must be a non-empty string' };
    }

    const result = stmts.deleteByChannel.run(channel);
    return {
      success: true,
      deleted: result.changes,
      message: `cleared ${result.changes} message(s) from ${channel}`
    };
  }

  /**
   * List all channels with message counts
   */
  function listChannels() {
    const channels = stmts.getChannels.all();
    return {
      success: true,
      channels: channels.map(c => ({
        channel: c.channel,
        count: c.count,
        lastMessage: c.last_message
      }))
    };
  }

  /**
   * Cleanup expired messages
   */
  function cleanup() {
    const result = stmts.deleteExpired.run(Date.now());
    return { cleaned: result.changes };
  }

  /**
   * Get subscriber count for a channel (for monitoring)
   */
  function subscriberCount(channel) {
    const subs = subscribers.get(channel);
    return subs ? subs.size : 0;
  }

  return {
    publish,
    getMessages,
    poll,
    subscribe,
    clear,
    listChannels,
    cleanup,
    subscriberCount
  };
}

/**
 * Try to parse JSON, return original string if not JSON
 */
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Parse expiration string to milliseconds
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
