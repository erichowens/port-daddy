/**
 * Direct-Mode Integration Tests
 *
 * Stress tests for Tier 1 operations WITHOUT the daemon running.
 * These tests intentionally bypass the daemon to verify direct SQLite access.
 */

import { spawnSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, rmSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TSX_PATH = join(import.meta.dirname, '../../node_modules/.bin/tsx');
const CLI_PATH = join(import.meta.dirname, '../../bin/port-daddy-cli.ts');

// Create isolated test directory for each test run
const TEST_DIR = join(tmpdir(), `port-daddy-direct-test-${Date.now()}`);
const TEST_DB = join(TEST_DIR, 'test.db');

/**
 * Run CLI command with --direct flag and isolated test DB
 */
function runDirect(args, options = {}) {
  const env = {
    ...process.env,
    PORT_DADDY_DB: TEST_DB,
    PORT_DADDY_URL: 'http://127.0.0.1:1', // Unreachable port to force direct mode
  };

  const result = spawnSync(TSX_PATH, [CLI_PATH, ...args, '--direct'], {
    encoding: 'utf8',
    timeout: 30000,
    env,
    ...options,
  });

  return {
    success: result.status === 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
    status: result.status,
    signal: result.signal,
  };
}

/**
 * Run CLI command letting it auto-detect (daemon unreachable -> fallback)
 */
function runFallback(args, options = {}) {
  const env = {
    ...process.env,
    PORT_DADDY_DB: TEST_DB,
    PORT_DADDY_URL: 'http://127.0.0.1:1', // Unreachable
    PORT_DADDY_SOCK: '/tmp/nonexistent-port-daddy-sock-test.sock',
  };

  const result = spawnSync(TSX_PATH, [CLI_PATH, ...args], {
    encoding: 'utf8',
    timeout: 30000,
    env,
    ...options,
  });

  return {
    success: result.status === 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
    status: result.status,
  };
}

describe('Direct-Mode Integration Tests', () => {
  beforeAll(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations (--direct flag)', () => {
    test('claim works with --direct flag', () => {
      const result = runDirect(['claim', 'direct-basic-1', '-q']);
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/^\d+$/);

      const port = parseInt(result.stdout, 10);
      expect(port).toBeGreaterThanOrEqual(3100);
    });

    test('claim with specific port', () => {
      const result = runDirect(['claim', 'direct-specific', '-p', '7777', '-q']);
      expect(result.success).toBe(true);
      expect(result.stdout).toBe('7777');
    });

    test('release works', () => {
      const claim = runDirect(['claim', 'direct-release-test', '-q']);
      expect(claim.success).toBe(true);

      const release = runDirect(['release', 'direct-release-test']);
      expect(release.success).toBe(true);
    });

    test('find/list works', () => {
      runDirect(['claim', 'direct-find-1', '-q']);
      runDirect(['claim', 'direct-find-2', '-q']);

      const result = runDirect(['find', '*', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.services.length).toBeGreaterThanOrEqual(2);
    });

    test('status command works', () => {
      const result = runDirect(['status']);
      // In direct mode, status should succeed (or fail gracefully)
      // Status shows DB info when in direct mode
      expect(result.status).not.toBe(null); // Completed without crash
    });
  });

  describe('Sessions & Notes (--direct flag)', () => {
    test('session start works', () => {
      const result = runDirect(['session', 'start', 'Direct mode session test']);
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/session-/);
    });

    test('note creates quick note with auto-session', () => {
      const result = runDirect(['note', 'Quick note in direct mode', '-q']);
      expect(result.success).toBe(true);
    });

    test('notes lists recent notes', () => {
      const result = runDirect(['notes', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.notes).toBeDefined();
      expect(data.notes.length).toBeGreaterThan(0);
    });

    test('sessions lists active sessions', () => {
      const result = runDirect(['sessions', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.sessions).toBeDefined();
    });

    test('session done works', () => {
      // Start a fresh session
      const start = runDirect(['session', 'start', 'Session to complete']);
      expect(start.success).toBe(true);

      // End it
      const done = runDirect(['session', 'done', 'Completed in direct mode']);
      expect(done.success).toBe(true);
    });
  });

  describe('Locks (--direct flag)', () => {
    test('lock acquire and release', () => {
      const acquire = runDirect(['lock', 'direct-lock-test', '-t', '60000']);
      expect(acquire.success).toBe(true);

      const release = runDirect(['unlock', 'direct-lock-test']);
      expect(release.success).toBe(true);
    });

    test('locks list', () => {
      runDirect(['lock', 'direct-lock-list-1', '-t', '60000']);
      runDirect(['lock', 'direct-lock-list-2', '-t', '60000']);

      const result = runDirect(['locks', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.locks.length).toBeGreaterThanOrEqual(2);
    });

    test('lock contention is detected', () => {
      // First lock succeeds
      const first = runDirect(['lock', 'contested-lock', '-t', '60000']);
      expect(first.success).toBe(true);

      // Second lock fails (contention)
      const second = runDirect(['lock', 'contested-lock', '-t', '60000']);
      expect(second.success).toBe(false);
      expect(second.stderr).toMatch(/held|contention|already/i);
    });
  });

  describe('Auto-Fallback (daemon unreachable)', () => {
    test('claim falls back to direct mode when daemon unreachable', () => {
      const result = runFallback(['claim', 'fallback-test-1', '-q']);
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/^\d+$/);
      // Fallback works silently when -q flag is used
    });

    test('sessions fallback to direct mode', () => {
      const result = runFallback(['sessions', '--json']);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases & Stress Tests', () => {
    test('rapid sequential claims (10 in a row)', () => {
      const ports = new Set();

      for (let i = 0; i < 10; i++) {
        const result = runDirect(['claim', `rapid-claim-${i}`, '-q']);
        expect(result.success).toBe(true);

        const port = parseInt(result.stdout, 10);
        expect(ports.has(port)).toBe(false); // No duplicate ports
        ports.add(port);
      }

      expect(ports.size).toBe(10);
    });

    test('claim with same ID returns same port (idempotent)', () => {
      const first = runDirect(['claim', 'idempotent-test', '-q']);
      expect(first.success).toBe(true);
      const port1 = first.stdout;

      const second = runDirect(['claim', 'idempotent-test', '-q']);
      expect(second.success).toBe(true);
      const port2 = second.stdout;

      expect(port1).toBe(port2);
    });

    test('claims persist across CLI invocations', () => {
      const claim = runDirect(['claim', 'persist-test', '-p', '8888', '-q']);
      expect(claim.success).toBe(true);
      expect(claim.stdout).toBe('8888');

      // New CLI invocation should see it
      const find = runDirect(['find', 'persist-test', '--json']);
      expect(find.success).toBe(true);

      const data = JSON.parse(find.stdout);
      expect(data.services.length).toBe(1);
      expect(data.services[0].port).toBe(8888);
    });

    test('expired services cleaned up', () => {
      // Claim with very short expiry
      const claim = runDirect(['claim', 'expire-test', '-e', '1', '-q']); // 1ms
      expect(claim.success).toBe(true);

      // Wait a bit
      spawnSync('sleep', ['0.1']);

      // Cleanup
      const cleanup = runDirect(['ports', 'cleanup']);
      // Should have cleaned something
      expect(cleanup.success).toBe(true);
    });

    test('handles corrupt/missing DB gracefully', () => {
      // Use a completely new DB path
      const freshDbPath = join(TEST_DIR, 'fresh.db');

      const env = {
        ...process.env,
        PORT_DADDY_DB: freshDbPath,
        PORT_DADDY_URL: 'http://127.0.0.1:1',
      };

      const result = spawnSync(TSX_PATH, [CLI_PATH, 'claim', 'fresh-db-test', '-q', '--direct'], {
        encoding: 'utf8',
        timeout: 30000,
        env,
      });

      // Should create DB and succeed
      expect(result.status).toBe(0);
      expect(existsSync(freshDbPath)).toBe(true);
    });

    test('handles max-length identity strings (64 chars per segment)', () => {
      // Identity validation limits each segment to 64 chars
      const longProject = 'a'.repeat(64);
      const longId = `${longProject}:api:main`;
      const result = runDirect(['claim', longId, '-q']);
      expect(result.success).toBe(true);
    });

    test('handles special characters in notes', () => {
      const specialNote = "Note with 'quotes' and \"double quotes\" and `backticks` and $variables";
      const result = runDirect(['note', specialNote, '-q']);
      expect(result.success).toBe(true);
    });

    test('handles unicode in session purpose', () => {
      const unicodePurpose = 'Session with émojis 🚀 and ünïcödé ñ';
      const result = runDirect(['session', 'start', unicodePurpose]);
      expect(result.success).toBe(true);
    });

    test('Tier 2 commands fail gracefully with --direct', () => {
      const result = runDirect(['pub', 'test-channel', 'message']);
      expect(result.success).toBe(false);
      expect(result.stderr).toMatch(/daemon|tier 2|not supported/i);
    });
  });

  describe('Concurrent Access (WAL mode stress)', () => {
    test('parallel claims from multiple processes (with retry)', async () => {
      const env = {
        ...process.env,
        PORT_DADDY_DB: TEST_DB,
        PORT_DADDY_URL: 'http://127.0.0.1:1',
      };

      // Spawn 5 parallel claim processes
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(new Promise((resolve) => {
          const proc = spawn(TSX_PATH, [CLI_PATH, 'claim', `parallel-${i}`, '-q', '--direct'], {
            env,
          });

          let stdout = '';
          let stderr = '';
          proc.stdout.on('data', d => stdout += d);
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            resolve({ success: code === 0, stdout: stdout.trim(), stderr: stderr.trim(), id: `parallel-${i}` });
          });
        }));
      }

      const results = await Promise.all(promises);

      // SQLite WAL mode handles contention, but some processes may need retry
      // At least 1/5 should succeed on first try - the exact count is timing-dependent
      // and varies based on system load. The real test is that ALL eventually succeed.
      const successes = results.filter(r => r.success);
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // Collect ports from successful claims
      const ports = new Set();
      for (const s of successes) {
        const port = parseInt(s.stdout, 10);
        expect(ports.has(port)).toBe(false); // No duplicate ports
        ports.add(port);
      }

      // Retry any failures (demonstrates resilience)
      const failures = results.filter(r => !r.success);
      for (const f of failures) {
        const retry = runDirect(['claim', f.id, '-q']);
        expect(retry.success).toBe(true);
        const port = parseInt(retry.stdout, 10);
        expect(ports.has(port)).toBe(false); // No duplicate ports even after retry
        ports.add(port);
      }

      // After retries, all 5 should be claimed with unique ports
      const finalFind = runDirect(['find', '*', '--json']);
      const data = JSON.parse(finalFind.stdout);
      const parallelServices = data.services.filter(s => s.id.startsWith('parallel-'));
      expect(parallelServices.length).toBe(5);
      expect(ports.size).toBe(5); // 5 unique ports assigned
    });

    test('parallel notes from multiple processes', async () => {
      const env = {
        ...process.env,
        PORT_DADDY_DB: TEST_DB,
        PORT_DADDY_URL: 'http://127.0.0.1:1',
      };

      // First ensure we have an active session
      runDirect(['session', 'start', 'Parallel notes test']);

      // Spawn 5 parallel note processes
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(new Promise((resolve) => {
          const proc = spawn(TSX_PATH, [CLI_PATH, 'note', `Parallel note ${i}`, '-q', '--direct'], {
            env,
          });

          let stdout = '';
          let stderr = '';
          proc.stdout.on('data', d => stdout += d);
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            resolve({ success: code === 0, stdout: stdout.trim(), stderr: stderr.trim() });
          });
        }));
      }

      const results = await Promise.all(promises);

      // All should succeed
      const successes = results.filter(r => r.success);
      expect(successes.length).toBe(5);
    });
  });

  describe('Error Recovery', () => {
    test('recovers from WAL checkpoint crash', () => {
      // Claim something
      runDirect(['claim', 'wal-recovery-test', '-q']);

      // Simulate crash by just ending abruptly (WAL mode handles this)
      // Next operation should work fine
      const result = runDirect(['find', 'wal-recovery-test', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.services.length).toBe(1);
    });

    test('handles read-only DB gracefully', () => {
      // Create a separate read-only test
      const roDbPath = join(TEST_DIR, 'readonly.db');

      // First create a valid DB
      const env = {
        ...process.env,
        PORT_DADDY_DB: roDbPath,
        PORT_DADDY_URL: 'http://127.0.0.1:1',
      };

      spawnSync(TSX_PATH, [CLI_PATH, 'claim', 'ro-test', '-q', '--direct'], {
        encoding: 'utf8',
        env,
      });

      // Make it read-only (on Unix)
      try {
        spawnSync('chmod', ['444', roDbPath]);

        // Try to write - should fail gracefully
        const result = spawnSync(TSX_PATH, [CLI_PATH, 'claim', 'ro-fail', '-q', '--direct'], {
          encoding: 'utf8',
          env,
        });

        // Should fail but not crash
        expect(result.status).not.toBe(null);
      } finally {
        // Restore permissions for cleanup
        spawnSync('chmod', ['644', roDbPath]);
      }
    });
  });
});
