#!/usr/bin/env npx tsx
/**
 * Example Worker Service
 *
 * A background worker that polls the API server and logs activity.
 * Demonstrates services that depend on other services.
 *
 * Usage:
 *   API_URL=http://localhost:3001 npx tsx worker.ts
 *   # Or with Port Daddy:
 *   pd up demo-worker
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000', 10);

let running = true;
let lastItemCount = 0;

async function poll() {
  try {
    const response = await fetch(`${API_URL}/items`);
    if (!response.ok) {
      console.log(`[worker] API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    const count = data.count;

    if (count !== lastItemCount) {
      if (count > lastItemCount) {
        console.log(`[worker] ${count - lastItemCount} new item(s) added (total: ${count})`);
      } else {
        console.log(`[worker] ${lastItemCount - count} item(s) removed (total: ${count})`);
      }
      lastItemCount = count;
    } else {
      // Quiet heartbeat every 30 seconds
      if (Date.now() % 30000 < POLL_INTERVAL) {
        console.log(`[worker] Heartbeat - ${count} items`);
      }
    }
  } catch (error) {
    console.log(`[worker] API unreachable: ${(error as Error).message}`);
  }
}

async function main() {
  console.log(`[worker] Starting...`);
  console.log(`[worker] Polling ${API_URL} every ${POLL_INTERVAL}ms`);

  // Initial poll
  await poll();

  // Poll loop
  while (running) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    if (running) await poll();
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[worker] SIGTERM received, stopping...');
  running = false;
});

process.on('SIGINT', () => {
  console.log('[worker] SIGINT received, stopping...');
  running = false;
});

main().catch(console.error);
