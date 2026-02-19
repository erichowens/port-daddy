/**
 * Health Check Module
 *
 * Monitor service health for multi-agent coordination
 */

import http from 'http';
import https from 'https';

/**
 * Initialize health monitoring with a database connection
 */
export function createHealth(db, services) {
  // Track health check intervals
  const intervals = new Map();

  // In-memory health status cache
  const healthCache = new Map();

  // Callbacks waiting for services to be healthy
  const waiters = new Map(); // serviceId -> Set<{resolve, reject, timeout}>

  /**
   * Perform a health check on a URL
   */
  function checkUrl(url, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      try {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;

        const req = client.get(url, { timeout }, (res) => {
          const latency = Date.now() - startTime;
          const healthy = res.statusCode >= 200 && res.statusCode < 400;

          // Consume response body to free socket
          res.resume();

          resolve({
            healthy,
            statusCode: res.statusCode,
            latency,
            checkedAt: Date.now()
          });
        });

        req.on('error', (err) => {
          resolve({
            healthy: false,
            error: err.message,
            latency: Date.now() - startTime,
            checkedAt: Date.now()
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            healthy: false,
            error: 'timeout',
            latency: Date.now() - startTime,
            checkedAt: Date.now()
          });
        });
      } catch (err) {
        resolve({
          healthy: false,
          error: err.message,
          checkedAt: Date.now()
        });
      }
    });
  }

  /**
   * Check health of a service
   */
  async function check(serviceId) {
    const svc = services.get(serviceId);
    if (!svc.success) {
      return { success: false, error: svc.error };
    }

    const service = svc.service;
    const healthUrl = service.healthUrl;

    if (!healthUrl) {
      // No explicit health URL configured - assume healthy if service exists
      return {
        success: true,
        serviceId,
        healthy: true,
        reason: 'no health endpoint configured',
        checkedAt: Date.now()
      };
    }

    // Build full health URL
    let fullUrl = healthUrl;
    if (!healthUrl.startsWith('http')) {
      const baseUrl = service.urls?.local || `http://localhost:${service.port}`;
      fullUrl = `${baseUrl}${healthUrl.startsWith('/') ? '' : '/'}${healthUrl}`;
    }

    const result = await checkUrl(fullUrl);

    // Update cache
    healthCache.set(serviceId, {
      ...result,
      serviceId,
      url: fullUrl
    });

    // Notify waiters if healthy
    if (result.healthy) {
      notifyWaiters(serviceId, result);
    }

    return {
      success: true,
      serviceId,
      ...result,
      url: fullUrl
    };
  }

  /**
   * Get cached health status
   */
  function getStatus(serviceId) {
    const cached = healthCache.get(serviceId);
    if (!cached) {
      return { success: true, serviceId, healthy: null, reason: 'not checked' };
    }
    return { success: true, ...cached };
  }

  /**
   * Start periodic health checking for a service
   */
  function startMonitoring(serviceId, intervalMs = 10000) {
    // Stop existing monitoring
    stopMonitoring(serviceId);

    // Initial check
    check(serviceId);

    // Set up interval
    const interval = setInterval(() => {
      check(serviceId);
    }, intervalMs);

    intervals.set(serviceId, interval);

    return { success: true, serviceId, interval: intervalMs };
  }

  /**
   * Stop health monitoring for a service
   */
  function stopMonitoring(serviceId) {
    const interval = intervals.get(serviceId);
    if (interval) {
      clearInterval(interval);
      intervals.delete(serviceId);
      return { success: true, serviceId, stopped: true };
    }
    return { success: true, serviceId, stopped: false };
  }

  /**
   * Wait for a service to become healthy
   */
  function waitFor(serviceId, options = {}) {
    const { timeout = 60000, checkInterval = 1000 } = options;

    return new Promise(async (resolve, reject) => {
      // Check immediately
      const initial = await check(serviceId);
      if (initial.success && initial.healthy) {
        resolve(initial);
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        removeWaiter(serviceId, waiter);
        reject(new Error(`Timeout waiting for ${serviceId} to become healthy`));
      }, timeout);

      // Set up waiter
      const waiter = {
        resolve: (result) => {
          clearTimeout(timeoutId);
          clearInterval(checkId);
          resolve(result);
        },
        reject,
        timeoutId
      };

      if (!waiters.has(serviceId)) {
        waiters.set(serviceId, new Set());
      }
      waiters.get(serviceId).add(waiter);

      // Poll until healthy
      const checkId = setInterval(async () => {
        const result = await check(serviceId);
        if (result.success && result.healthy) {
          removeWaiter(serviceId, waiter);
          clearTimeout(timeoutId);
          clearInterval(checkId);
          resolve(result);
        }
      }, checkInterval);
    });
  }

  /**
   * Wait for multiple services to become healthy
   */
  async function waitForAll(serviceIds, options = {}) {
    const { timeout = 60000 } = options;

    const results = await Promise.all(
      serviceIds.map(id => waitFor(id, { ...options, timeout }))
    );

    return {
      success: true,
      services: results,
      allHealthy: results.every(r => r.healthy)
    };
  }

  /**
   * Notify waiters that a service is healthy
   */
  function notifyWaiters(serviceId, result) {
    const waiting = waiters.get(serviceId);
    if (waiting) {
      for (const waiter of waiting) {
        waiter.resolve({ success: true, serviceId, ...result });
      }
      waiters.delete(serviceId);
    }
  }

  /**
   * Remove a waiter
   */
  function removeWaiter(serviceId, waiter) {
    const waiting = waiters.get(serviceId);
    if (waiting) {
      waiting.delete(waiter);
      if (waiting.size === 0) {
        waiters.delete(serviceId);
      }
    }
  }

  /**
   * Get all health statuses
   */
  function listStatus() {
    const statuses = [];
    for (const [serviceId, status] of healthCache) {
      statuses.push({ serviceId, ...status });
    }
    return { success: true, statuses };
  }

  /**
   * Clear health cache
   */
  function clearCache() {
    healthCache.clear();
    return { success: true, message: 'health cache cleared' };
  }

  /**
   * Stop all monitoring
   */
  function stopAll() {
    for (const [serviceId, interval] of intervals) {
      clearInterval(interval);
    }
    intervals.clear();
    return { success: true, message: 'all monitoring stopped' };
  }

  return {
    check,
    checkUrl,
    getStatus,
    startMonitoring,
    stopMonitoring,
    waitFor,
    waitForAll,
    listStatus,
    clearCache,
    stopAll
  };
}
