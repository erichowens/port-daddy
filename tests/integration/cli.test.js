/**
 * CLI Integration Tests
 *
 * These tests run the actual CLI against a running daemon.
 * They verify the full stack works end-to-end.
 */

import { spawn, spawnSync, execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

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

    // Calculate local hash (same logic as server.js — dynamic discovery)
    const { createHash } = await import('node:crypto');
    const { readFileSync, readdirSync, existsSync } = await import('node:fs');

    const projectRoot = join(__dirname, '../..');
    const libDir = join(projectRoot, 'lib');
    const libFiles = existsSync(libDir)
      ? readdirSync(libDir).filter(f => f.endsWith('.js')).sort().map(f => `lib/${f}`)
      : [];
    const filesToHash = ['server.js', ...libFiles];

    const hash = createHash('sha256');
    for (const file of filesToHash) {
      const filePath = join(projectRoot, file);
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

  describe('Scan Command', () => {
    test('scan runs against project directory', () => {
      // Scan port-daddy itself (has Express)
      const result = runCli(['scan', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.success).toBe(true);
      expect(data.serviceCount).toBeGreaterThan(0);
      expect(data.project).toBeDefined();
      expect(data.guidance).toBeDefined();
    });

    test('scan --dry-run does not save config', () => {
      const result = runCli(['scan', '--dry-run', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
    });
  });

  describe('Projects Command', () => {
    test('projects lists registered projects', () => {
      const result = runCli(['projects', '--json']);
      expect(result.success).toBe(true);

      const data = JSON.parse(result.stdout);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.projects)).toBe(true);
    });
  });

  describe('Deprecation Notices', () => {
    test('detect shows deprecation notice on stderr', () => {
      const result = runCli(['detect']);
      expect(result.success).toBe(true);
      expect(result.stderr).toContain('deprecated');
      expect(result.stderr).toContain('scan');
    });

    test('init shows deprecation notice on stderr', () => {
      const result = runCli(['init', '--dry-run']);
      expect(result.success).toBe(true);
      expect(result.stderr).toContain('deprecated');
      expect(result.stderr).toContain('scan');
    });
  });

  describe('Dashboard Terminal Command Parity', () => {
    // The dashboard HTML has its own command parser. This test ensures:
    // 1. Every CLI command is either in COMMANDS (dashboard-supported) or CLI_ONLY
    // 2. CLI_ONLY commands get a helpful "use your terminal" message, not "Unknown command"

    let html, dashboardCommands, cliOnlyCommands;

    const knownCliCommands = [
      'claim', 'release', 'find', 'ps', 'url', 'env',
      'pub', 'sub', 'wait', 'lock', 'unlock', 'locks',
      'up', 'down',
      'scan', 'projects',
      'detect', 'init',
      'agent', 'agents',
      'log', 'activity',
      'start', 'stop', 'restart', 'status',
      'install', 'uninstall', 'dev', 'ci-gate',
      'doctor', 'version', 'help'
    ];

    beforeAll(() => {
      html = readFileSync(join(__dirname, '../../public/index.html'), 'utf8');

      // Extract COMMANDS keys: find "var COMMANDS = {" then match top-level keys
      // The object spans multiple lines with nested braces, so we find the block
      // and extract keys that appear at the start of lines (indented key: pattern)
      const commandsStart = html.indexOf('var COMMANDS = {');
      if (commandsStart !== -1) {
        // Find the closing "};", counting brace depth
        let depth = 0;
        let end = commandsStart;
        for (let i = commandsStart; i < html.length; i++) {
          if (html[i] === '{') depth++;
          if (html[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
        }
        const block = html.slice(commandsStart, end + 1);
        // Keys are "word:" at the start of the line (with indentation)
        const keyMatches = block.match(/^\s+(\w+)\s*:/gm);
        dashboardCommands = keyMatches
          ? keyMatches.map(m => m.trim().replace(/:$/, ''))
          : [];
      }

      // Extract CLI_ONLY array from the dashboard JS
      const cliOnlyMatch = html.match(/var CLI_ONLY\s*=\s*\[([^\]]+)\]/);
      cliOnlyCommands = cliOnlyMatch
        ? cliOnlyMatch[1].match(/'(\w[\w-]*)'/g).map(m => m.replace(/'/g, ''))
        : [];
    });

    test('dashboard COMMANDS object is not empty', () => {
      expect(dashboardCommands.length).toBeGreaterThan(5);
    });

    test('dashboard CLI_ONLY array is not empty', () => {
      expect(cliOnlyCommands.length).toBeGreaterThan(3);
    });

    test('every known CLI command is either in COMMANDS or CLI_ONLY', () => {
      const covered = new Set([...dashboardCommands, ...cliOnlyCommands]);
      // Some commands have special handling or are aliases the dashboard doesn't need
      const exceptions = ['sub', 'wait', 'url', 'env', 'agent', 'version'];
      const missing = knownCliCommands.filter(cmd =>
        !covered.has(cmd) && !exceptions.includes(cmd)
      );
      expect(missing).toEqual([]);
    });

    test('CLI_ONLY and COMMANDS do not overlap', () => {
      const overlap = cliOnlyCommands.filter(cmd => dashboardCommands.includes(cmd));
      expect(overlap).toEqual([]);
    });

    test('CLI-only commands get a helpful message, not "Unknown command"', async () => {
      const res = await fetch('http://localhost:9876/');
      expect(res.ok).toBe(true);
      expect(html).toContain('is a CLI-only command');
      expect(html).toContain('Run it in your terminal');
    });
  });
});
