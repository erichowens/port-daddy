/**
 * Messaging Routes
 *
 * Handles pub/sub messaging for agent coordination.
 * Includes SSE subscriptions and long-polling.
 * Extracted from server.js lines 1061-1274.
 */

import { Router } from 'express';
import { validateChannel } from '../shared/validators.js';
import {
  canOpenConnection,
  trackConnection,
  untrackConnection,
  connectionLimits
} from '../shared/connection-tracking.js';

/**
 * Create messaging routes
 *
 * @param {Object} deps - Dependencies
 * @param {Object} deps.logger - Winston logger
 * @param {Object} deps.metrics - Metrics tracking object
 * @param {Object} deps.messaging - Messaging module instance
 * @returns {Router} Express router
 */
export function createMessagingRoutes(deps) {
  const { logger, metrics, messaging } = deps;
  const router = Router();

  // =========================================================================
  // GET /msg - List all channels
  // =========================================================================
  router.get('/msg', (req, res) => {
    try {
      const result = messaging.listChannels();
      res.json(result);
    } catch (err) {
      console.error('List channels error:', err);
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // POST /msg/:channel - Publish message
  // =========================================================================
  router.post('/msg/:channel', (req, res) => {
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

  // =========================================================================
  // GET /msg/:channel - Get messages from channel
  // =========================================================================
  router.get('/msg/:channel', (req, res) => {
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

  // =========================================================================
  // GET /msg/:channel/poll - Long-poll for next message
  // =========================================================================
  router.get('/msg/:channel/poll', (req, res) => {
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

  // =========================================================================
  // GET /msg/:channel/subscribe - Subscribe to channel (SSE)
  // =========================================================================
  router.get('/msg/:channel/subscribe', (req, res) => {
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

  // =========================================================================
  // GET /channels - List channels (alias)
  // =========================================================================
  router.get('/channels', (req, res) => {
    try {
      const result = messaging.listChannels();
      res.json(result);
    } catch (error) {
      metrics.errors++;
      res.status(500).json({ error: 'internal server error' });
    }
  });

  // =========================================================================
  // DELETE /msg/:channel - Clear channel
  // =========================================================================
  router.delete('/msg/:channel', (req, res) => {
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

  return router;
}
