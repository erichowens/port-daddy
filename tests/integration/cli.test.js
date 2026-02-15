/**
 * CLI Integration Tests
 *
 * These tests run the actual CLI against a running daemon.
 * They verify the full stack works end-to-end.
 */

import { spawn, spawnSync, execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../bin/port-daddy-cli.js');
const SERVER_PATH = join(__dirname, '../../server.js');

// Helper to run CLI commands
function runCli(args, options = {}) {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    timeout: 10000,
    ...options
  });
  return {
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
    status: result.status,
    success: result.status === 0
  };
}

// Helper to check if daemon is running
async function isDaemonRunning() {
  try {
    const res = await fetch('http://localhost:9876/health');
    return res.ok;
  } catch {
    return false;
  }
}

// Helper to start daemon for tests
async function ensureDaemonRunning() {
  if (await isDaemonRunning()) {
    return true;
  }

  // Start daemon
  const child = spawn('node', [SERVER_PATH], {
    stdio: 'ignore',
    detached: true
  });
  child.unref();

  // Wait for it to be ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (await isDaemonRunning()) {
      return true;
    }
  }
  throw new Error('Failed to start daemon for tests');
}

// Get daemon code hash
async function getDaemonHash() {
  const res = await fetch('http://localhost:9876/version');
  const data = await res.json();
  return data.codeHash;
}

describe('CLI Integration Tests', () => {
  beforeAll(async () => {
    await ensureDaemonRunning();

    // CI Gate: Fail fast if daemon is running stale code
    const versionRes = await fetch('http://localhost:9876/version');
    const versionData = await versionRes.json();

    // Calculate local hash (same logic as CLI)
    const { createHash } = await import('node:crypto');
    const { readFileSync, existsSync } = await import('node:fs');

    const filesToHash = [
      'server.js', 'lib/services.js', 'lib/messaging.js', 'lib/locks.js',
      'lib/health.js', 'lib/detect.js', 'lib/config.js', 'lib/identity.js', 'lib/utils.js',
      'lib/agents.js', 'lib/activity.js', 'lib/webhooks.js'
    ];

    const hash = createHash('sha256');
    for (const file of filesToHash) {
      const filePath = join(__dirname, '../..', file);
      if (existsSync(filePath)) {
        hash.update(readFileSync(filePath));
      }
    }
    const localHash = hash.digest('hex').slice(0, 12);

    if (versionData.codeHash !== localHash) {
      console.error('');
      console.error('❌ CI GATE FAILED: Daemon is running stale code!');
      console.error(`   Daemon hash: ${versionData.codeHash}`);
      console.error(`   Local hash:  ${localHash}`);
      console.error('');
      console.error('   Run: port-daddy restart');
      console.error('');
      throw new Error('Daemon code hash mismatch - restart required');
    }
  });

  describe('Stale Daemon Detection', () => {
    test('daemon exposes code hash in /version', async () => {
      const res = await fetch('http://localhost:9876/version');
      const data = await res.json();

      expect(data.codeHash).toBeDefined();
      expect(data.codeHash).toMatch(/^[a-f0-9]{12}$/);
      expect(data.startedAt).toBeDefined();
    });

    test('CLI can calculate local hash', () => {
      // The CLI should be able to run without errors
      const result = runCli(['status']);
      expect(result.success).toBe(true);
    });
  });

  describe('Service Commands', () => {
    const testId = `test-cli-${Date.now()}`;

    afterAll(() => {
      // Cleanup test service
      runCli(['release', testId]);
    });

    test('claim returns a port', () => {
      const result = runCli(['claim', testId, '-q']);
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/^\d+$/);

      const port = parseInt(result.stdout, 10);
      expect(port).toBeGreaterThanOrEqual(3100);
      expect(port).toBeLessThanOrEqual(9999);
    });

    test('find shows claimed service', () => {
      const result = runCli(['find', testId, '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.count).toBeGreaterThan(0);
      expect(data.services.some(s => s.id === testId)).toBe(true);
    });

    test('release removes service', () => {
      const result = runCli(['release', testId]);
      expect(result.success).toBe(true);

      // Verify it's gone
      const findResult = runCli(['find', testId, '--json']);
      const data = JSON.parse(findResult.stdout);
      expect(data.services.some(s => s.id === testId)).toBe(false);
    });
  });

  describe('Lock Commands', () => {
    const testLock = `test-lock-${Date.now()}`;

    afterAll(() => {
      // Cleanup
      runCli(['unlock', testLock, '--force']);
    });

    test('lock acquires successfully', () => {
      const result = runCli(['lock', testLock]);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Acquired lock');
    });

    test('second lock fails with conflict', () => {
      const result = runCli(['lock', testLock]);
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('held by');
    });

    test('locks shows active lock', () => {
      const result = runCli(['locks', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.locks.some(l => l.name === testLock)).toBe(true);
    });

    test('unlock releases lock', () => {
      const result = runCli(['unlock', testLock]);
      expect(result.success).toBe(true);

      // Verify we can acquire again
      const lockResult = runCli(['lock', testLock]);
      expect(lockResult.success).toBe(true);

      // Cleanup
      runCli(['unlock', testLock]);
    });
  });

  describe('Detect Command', () => {
    test('detect runs without error', () => {
      const result = runCli(['detect']);
      expect(result.success).toBe(true);
      // Port Daddy itself should be detected as Express
      expect(result.stdout).toContain('Detected');
    });

    test('detect --json returns valid JSON', () => {
      const result = runCli(['detect', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.success).toBe(true);
      expect(data.suggestedIdentity).toBeDefined();
    });
  });

  describe('Pub/Sub Commands', () => {
    const testChannel = `test-channel-${Date.now()}`;

    test('pub publishes message', () => {
      const result = runCli(['pub', testChannel, '{"test":true}']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Published');
    });
  });
});
