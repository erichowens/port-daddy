#!/usr/bin/env node

/**
 * Port Daddy v2 CLI
 *
 * The authoritative port management tool for multi-agent development.
 * Grammar: port-daddy <verb> [identity] [--options]
 */

import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { readFileSync, readdirSync, writeFileSync as fsWriteFileSync, existsSync, unlinkSync, watch } from 'node:fs';
import { discoverServices, suggestNames, mergeWithConfig } from '../lib/discover.js';
import { loadConfig } from '../lib/config.js';
import {
  topologicalSort,
  normalizeServiceConfig,
  buildEnvMap,
  createOrchestrator
} from '../lib/orchestrator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

// Default Unix socket path — the primary transport for CLI→daemon communication.
// Falls back to TCP (PORT_DADDY_URL) if socket doesn't exist.
const DEFAULT_SOCK = '/tmp/port-daddy.sock';
const SOCK_PATH = process.env.PORT_DADDY_SOCK || DEFAULT_SOCK;

/**
 * Resolve connection target: Unix socket or TCP.
 */
function resolveTarget() {
  // Explicit TCP URL overrides socket
  if (process.env.PORT_DADDY_URL) {
    const url = new URL(process.env.PORT_DADDY_URL);
    return { host: url.hostname, port: parseInt(url.port, 10) || 9876 };
  }
  // Use socket if it exists
  if (existsSync(SOCK_PATH)) {
    return { socketPath: SOCK_PATH };
  }
  // Fallback to TCP
  return { host: 'localhost', port: 9876 };
}

/**
 * Drop-in replacement for fetch() that routes through Unix socket when available.
 * Returns an object matching the subset of the fetch Response API that the CLI uses:
 *   .ok, .status, .json(), .text(), .headers
 */
function pdFetch(urlOrPath, options = {}) {
  // Extract just the path from a full URL or use as-is if already a path
  let path;
  if (urlOrPath.startsWith('/')) {
    path = urlOrPath;
  } else {
    try { path = new URL(urlOrPath).pathname + (new URL(urlOrPath).search || ''); }
    catch { path = urlOrPath; }
  }

  const target = resolveTarget();
  const { method = 'GET', headers = {}, body = null } = options;

  const reqHeaders = { ...headers };
  if (body && !reqHeaders['Content-Length']) {
    reqHeaders['Content-Length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const reqOpts = {
      method,
      path,
      headers: reqHeaders,
      timeout: 10000,
      ...(target.socketPath ? { socketPath: target.socketPath } : { host: target.host, port: target.port })
    };

    const req = http.request(reqOpts, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          json: async () => JSON.parse(text),
          text: async () => text
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });

    if (body) req.write(body);
    req.end();
  });
}

// Calculate local code hash to compare with daemon
function getLocalCodeHash() {
  const libDir = join(__dirname, '..');
  // Dynamically discover all .js files in lib/ — must match server.js logic exactly
  const libDirPath = join(libDir, 'lib');
  const libFiles = existsSync(libDirPath)
    ? readdirSync(libDirPath).filter(f => f.endsWith('.js')).sort().map(f => `lib/${f}`)
    : [];
  const filesToHash = ['server.js', ...libFiles];

  const hash = createHash('sha256');
  for (const file of filesToHash) {
    const filePath = join(libDir, file);
    if (existsSync(filePath)) {
      hash.update(readFileSync(filePath));
    }
  }
  return hash.digest('hex').slice(0, 12);
}

// Check if daemon is running stale code
// Returns true if daemon was restarted
async function checkDaemonFreshness(autoRestart = true) {
  try {
    const res = await pdFetch(`${PORT_DADDY_URL}/version`);
    if (!res.ok) return false;

    const data = await res.json();
    const localHash = getLocalCodeHash();

    if (data.codeHash && data.codeHash !== localHash) {
      console.error('');
      console.error('⚠️  Daemon is running stale code');
      console.error(`   Daemon: ${data.codeHash}  Local: ${localHash}`);

      if (autoRestart) {
        console.error('   Auto-restarting...');
        console.error('');

        // Kill the old daemon
        try {
          process.kill(data.pid, 'SIGTERM');
        } catch {}

        // Wait for it to die
        await new Promise(r => setTimeout(r, 500));

        // Start fresh daemon
        const serverScript = join(__dirname, '..', 'server.js');
        const child = spawn('node', [serverScript], {
          stdio: 'ignore',
          detached: true
        });
        child.unref();

        // Wait for it to be ready
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100));
          try {
            const healthRes = await pdFetch(`${PORT_DADDY_URL}/health`);
            if (healthRes.ok) {
              console.error('   ✓ Daemon restarted with fresh code');
              console.error('');
              return true;
            }
          } catch {}
        }
        console.error('   ✗ Failed to restart daemon');
        process.exit(1);
      } else {
        // No auto-restart (CI mode)
        console.error('   Run: port-daddy restart');
        console.error('');
        return false;
      }
    }
  } catch {
    // Daemon not running or can't connect - other code will handle this
  }
  return false;
}

// CI mode: fail hard if daemon is stale
async function ciGateCheck() {
  try {
    const res = await pdFetch(`${PORT_DADDY_URL}/version`);
    if (!res.ok) {
      console.error('CI GATE FAILED: Daemon not running');
      process.exit(1);
    }

    const data = await res.json();
    const localHash = getLocalCodeHash();

    if (data.codeHash !== localHash) {
      console.error('');
      console.error('❌ CI GATE FAILED: Daemon is running stale code!');
      console.error(`   Daemon hash: ${data.codeHash}`);
      console.error(`   Local hash:  ${localHash}`);
      console.error('');
      console.error('   The test daemon must match the code being tested.');
      console.error('   Run: port-daddy restart');
      console.error('');
      process.exit(1);
    }

    console.log('✓ CI gate passed: daemon code hash matches');
  } catch (err) {
    console.error('CI GATE FAILED: Cannot connect to daemon');
    process.exit(1);
  }
}

const HELP = `
Port Daddy — Semantic Port Management for Multi-Agent Development

Usage: port-daddy <command> [identity] [options]

Orchestration:
  up [options]      Start all services (auto-detect or from .portdaddyrc)
  down              Stop all services started by 'up'

Service Commands:
  claim <id>        Claim a port for your service
  release <id>      Release port(s) by identity or pattern
  find [pattern]    List services (default: all running)
  url <id>          Get URL for a service
  env [pattern]     Export environment variables
  ps                Alias for 'find' — list running services

Agent Coordination:
  pub <channel>     Publish a message to a channel
  sub <channel>     Subscribe to a channel (real-time stream)
  wait <id> [ids]   Wait for service(s) to become healthy
  lock <name>       Acquire a distributed lock
  unlock <name>     Release a distributed lock
  locks             List all active locks

Agent Registry:
  agent register    Register as an agent (enables heartbeat)
  agent heartbeat   Send heartbeat (auto-registered if not exists)
  agent unregister  Unregister agent (release resources)
  agent <id>        Get info about an agent
  agents            List all registered agents

Activity Log:
  log [options]     View recent activity (audit trail)
  log summary       View activity summary by type

Project Setup:
  scan [dir]        Deep scan project, detect all services, save config
  projects          List all registered projects
  projects rm <id>  Remove a registered project
  detect            (deprecated — use scan)
  init              (deprecated — use scan)

Daemon Management:
  start             Start the Port Daddy daemon
  stop              Stop the daemon
  restart           Restart the daemon
  status            Check if daemon is running
  doctor            Run diagnostic checks on Port Daddy setup
  install           Install as system service (auto-start on login)
  uninstall         Remove system service
  dev               Dev mode: watch files, auto-restart on change
  ci-gate           CI mode: fail if daemon is stale (no auto-restart)

Identity Format:
  myapp                     Just the project name
  myapp:api                 Project + stack (api, frontend, worker)
  myapp:api:feature-x       Project + stack + context (branch, env)
  myapp:*:main              Wildcards for querying/releasing

Options:
  -p, --port <n>      Request a specific port
  --range <a>-<b>     Acceptable port range
  --expires <dur>     Auto-release after duration (2h, 30m, 1d)
  -e, --env <name>    Environment: local, tunnel, dev, staging, prod
  -j, --json          Output as JSON
  -q, --quiet         Minimal output (just the value)
  --timeout <ms>      Wait timeout (default: 60000)
  --ttl <ms>          Lock time-to-live (default: 300000)
  --owner <id>        Lock owner identifier
  --agent <id>        Agent ID for registration/heartbeat
  --type <type>       Agent type (cli, sdk, mcp)
  --limit <n>         Limit results (log command)
  --active            Show only active agents
  --service <name>    Start only this service + its dependencies (up)
  --no-health         Skip health checks (up)
  --branch            Use git branch as context in identity (up/scan)
  --dry-run           Preview scan results without saving config (scan)
  --dir <path>        Target directory (scan, detect, init)

Note: Quote wildcards to prevent shell expansion:
  port-daddy find 'myapp:*'      # Correct
  port-daddy find myapp:*        # May fail in zsh

Examples:
  port-daddy claim myapp                    # Get a port for myapp
  port-daddy claim myapp:api:feature-x      # Full semantic identity
  port-daddy claim myapp --port 3000        # Request specific port
  port-daddy claim myapp --expires 2h       # Auto-release in 2 hours

  port-daddy find                           # List all services
  port-daddy find myapp:*                   # All stacks for myapp

  port-daddy release myapp                  # Release by name
  port-daddy release myapp:*:*              # Release all for project

  port-daddy pub build:done '{"status":"success"}'
  port-daddy sub build:done

  # Multi-agent coordination:
  port-daddy wait myapp:api                         # Block until healthy
  port-daddy wait myapp:api myapp:frontend          # Wait for multiple
  port-daddy lock db-migrations && npm run migrate  # Exclusive access
  port-daddy unlock db-migrations                   # Release lock

  # Project setup:
  port-daddy scan                           # Deep scan & auto-configure
  port-daddy scan --dry-run                 # Preview without saving
  port-daddy projects                       # List registered projects

  # Orchestration:
  port-daddy up                             # Auto-detect and start all services
  port-daddy up --service frontend          # Start frontend + its dependencies
  port-daddy up --no-health                 # Skip health checks
  port-daddy up --branch                    # Use git branch in identity
  port-daddy down                           # Stop all running services

  port-daddy status                         # Is daemon running?
  port-daddy install                        # Install as system service
`;

let autoStartAttempted = false;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  if (command === '--version' || command === '-V') {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    console.log(pkg.version);
    process.exit(0);
  }

  // Check for stale daemon before running commands (skip for daemon management)
  const skipFreshnessCheck = ['start', 'stop', 'restart', 'install', 'uninstall', 'status', 'version', 'dev', 'ci-gate', 'doctor', 'diagnose', 'up', 'down'].includes(command);
  if (!skipFreshnessCheck) {
    await checkDaemonFreshness();
  }

  // Parse options
  const options = {};
  const positional = [];

  // Short flag mappings
  const shortFlags = {
    p: 'port',
    e: 'env',
    j: 'json',
    q: 'quiet',
    h: 'help'
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Handle --flag=value syntax
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        options[key] = value;
      } else {
        const key = arg.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          options[key] = next;
          i++;
        } else {
          options[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Handle short flags: -q, -p 3000, -p=3000
      const flagPart = arg.slice(1);
      const eqIndex = flagPart.indexOf('=');

      if (eqIndex !== -1) {
        // -p=3000 style
        const shortKey = flagPart.slice(0, eqIndex);
        const value = flagPart.slice(eqIndex + 1);
        const longKey = shortFlags[shortKey] || shortKey;
        options[longKey] = value;
      } else if (flagPart.length === 1) {
        // Single short flag: -q, -j, or -p 3000
        const longKey = shortFlags[flagPart] || flagPart;
        const next = args[i + 1];
        // Check if this flag expects a value
        const expectsValue = ['p', 'e'].includes(flagPart);
        if (expectsValue && next && !next.startsWith('-')) {
          options[longKey] = next;
          i++;
        } else {
          options[longKey] = true;
        }
      } else {
        // Multiple short flags combined: -qj (quiet + json)
        for (const char of flagPart) {
          const longKey = shortFlags[char] || char;
          options[longKey] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }

  try {
    switch (command) {
      // Service commands
      case 'claim':
        await handleClaim(positional[0], options);
        break;

      case 'release':
        await handleRelease(positional[0], options);
        break;

      case 'find':
      case 'list':
      case 'ps':
        await handleFind(positional[0], options);
        break;

      case 'url':
        await handleUrl(positional[0], options);
        break;

      case 'env':
        await handleEnv(positional[0], options);
        break;

      // Agent coordination
      case 'pub':
      case 'publish':
        await handlePub(positional[0], positional.slice(1).join(' ') || options.message, options);
        break;

      case 'sub':
      case 'subscribe':
        await handleSub(positional[0], options);
        break;

      case 'wait':
        await handleWait(positional, options);
        break;

      case 'lock':
        await handleLock(positional[0], options);
        break;

      case 'unlock':
        await handleUnlock(positional[0], options);
        break;

      case 'locks':
        await handleLocks(options);
        break;

      // Orchestration
      case 'up':
        await handleUp(positional, options);
        break;

      case 'down':
        await handleDown(options);
        break;

      // Project setup
      case 'scan':
        await handleScan(positional[0], options);
        break;

      case 'projects':
        await handleProjects(positional[0], positional.slice(1), options);
        break;

      case 'detect':
        console.error('Note: "detect" is deprecated. Use "port-daddy scan" instead.\n');
        await handleDetect(options);
        break;

      case 'init':
        console.error('Note: "init" is deprecated. Use "port-daddy scan" instead.\n');
        await handleInit(options);
        break;

      // Agent registry
      case 'agent':
        await handleAgent(positional[0], positional.slice(1), options);
        break;

      case 'agents':
        await handleAgents(options);
        break;

      // Activity log
      case 'log':
      case 'activity':
        await handleLog(positional[0], options);
        break;

      // Daemon management
      case 'start':
        await handleDaemon('start');
        break;

      case 'stop':
        await handleDaemon('stop');
        break;

      case 'restart':
        await handleDaemon('restart');
        break;

      case 'status':
        await handleStatus();
        break;

      case 'install':
        await handleDaemon('install');
        break;

      case 'uninstall':
        await handleDaemon('uninstall');
        break;

      case 'dev':
        await handleDev();
        break;

      case 'ci-gate':
        await ciGateCheck();
        break;

      case 'doctor':
      case 'diagnose':
        await handleDoctor();
        break;

      case 'version':
        await handleVersion();
        break;

      default:
        // If it looks like an identity, treat as claim
        if (command.match(/^[a-zA-Z0-9._:-]+$/)) {
          await handleClaim(command, options);
        } else {
          console.error(`Unknown command: ${command}`);
          console.error('Run "port-daddy help" for usage');
          process.exit(1);
        }
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      if (!autoStartAttempted) {
        // Auto-start daemon on first use
        autoStartAttempted = true;
        console.error('Port Daddy daemon is not running. Starting it...');
        try {
          await handleDaemon('start');
          console.error('');
          // Retry the original command
          return main();
        } catch {
          console.error('Failed to auto-start daemon.');
          console.error('Start it manually: port-daddy start');
          console.error('Or install as service: port-daddy install');
          process.exit(1);
        }
      } else {
        console.error('Port Daddy daemon is not running.');
        console.error('Start it with: port-daddy start');
        console.error('Or install as service: port-daddy install');
        process.exit(1);
      }
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

// =============================================================================
// Service Commands
// =============================================================================

async function handleClaim(id, options) {
  if (!id) {
    console.error('Usage: port-daddy claim <identity> [options]');
    process.exit(1);
  }

  const body = { id };
  if (options.port) body.port = parseInt(options.port, 10);
  if (options.range) {
    const [min, max] = options.range.split('-').map(n => parseInt(n, 10));
    body.range = [min, max];
  }
  if (options.expires) body.expires = options.expires;
  if (options.pair) body.pair = options.pair;
  if (options.cmd) body.cmd = options.cmd;

  const res = await pdFetch(`${PORT_DADDY_URL}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PID': String(process.pid)
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to claim port');
    process.exit(1);
  }

  if (options.json) {
    // JSON mode: full data to stdout
    console.log(JSON.stringify(data, null, 2));
  } else if (options.quiet) {
    // Quiet mode: just the port to stdout
    console.log(data.port);
  } else {
    // Normal mode: friendly message to stderr, port to stdout
    // This allows: PORT=$(port-daddy claim myapp) to work
    // while still showing the user what happened
    console.error(`${data.id} → port ${data.port}`);
    if (data.existing) console.error('  (reused existing)');
    console.log(data.port);
  }
}

async function handleRelease(id, options) {
  const body = {};

  if (options.expired) {
    body.expired = true;
  } else if (!id) {
    console.error('Usage: port-daddy release <identity> [options]');
    console.error('       port-daddy release --expired');
    process.exit(1);
  } else {
    body.id = id;
  }

  const res = await pdFetch(`${PORT_DADDY_URL}/release`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to release');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (options.quiet || options.q) {
    console.log(data.released);
  } else {
    console.log(data.message);
  }
}

async function handleFind(pattern, options) {
  const params = new URLSearchParams();
  if (pattern) params.append('pattern', pattern);
  if (options.status) params.append('status', options.status);
  if (options.port) params.append('port', options.port);
  if (options.expired) params.append('expired', 'true');

  const url = `${PORT_DADDY_URL}/services${params.toString() ? '?' + params : ''}`;
  const res = await pdFetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to find services');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.count === 0) {
    console.error('No services found');

    // Helpful hint about wildcards
    if (pattern && !pattern.includes('*')) {
      console.error('');
      console.error(`Hint: To find all services for "${pattern}", try:`);
      console.error(`  port-daddy find '${pattern}:*'`);
      console.error('');
      console.error('Remember to quote wildcards to prevent shell expansion.');
    }
    return;
  }

  // Table output goes to stderr (human-readable)
  // This keeps stdout clean for piping/scripting
  console.error('');
  console.error('ID'.padEnd(35) + 'PORT'.padEnd(8) + 'STATUS'.padEnd(12) + 'URL');
  console.error('─'.repeat(75));

  for (const svc of data.services) {
    const localUrl = svc.urls?.local || '-';
    console.error(
      svc.id.padEnd(35) +
      String(svc.port).padEnd(8) +
      svc.status.padEnd(12) +
      localUrl
    );
  }

  console.error('');
  console.log(`Total: ${data.count} service(s)`);
}

async function handleUrl(id, options) {
  if (!id) {
    console.error('Usage: port-daddy url <identity> [--env <environment>]');
    process.exit(1);
  }

  const env = options.env || 'local';
  const res = await pdFetch(`${PORT_DADDY_URL}/services/${encodeURIComponent(id)}`);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Service not found');
    process.exit(1);
  }

  const url = data.service.urls?.[env];
  if (!url) {
    console.error(`No ${env} URL for ${id}`);
    process.exit(1);
  }

  if (options.open) {
    const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(openCmd, [url], { stdio: 'ignore', detached: true }).unref();
    console.log(`Opening ${url}`);
  } else {
    console.log(url);
  }
}

async function handleEnv(id, options) {
  const params = new URLSearchParams();
  if (id) params.append('pattern', id);

  const res = await pdFetch(`${PORT_DADDY_URL}/services?${params}`);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to get services');
    process.exit(1);
  }

  const lines = [];
  for (const svc of data.services) {
    const varName = svc.id.toUpperCase().replace(/[:.]/g, '_') + '_PORT';
    lines.push(`${varName}=${svc.port}`);

    const urlVarName = svc.id.toUpperCase().replace(/[:.]/g, '_') + '_URL';
    if (svc.urls?.local) {
      lines.push(`${urlVarName}=${svc.urls.local}`);
    }
  }

  const output = lines.join('\n');

  if (options.file) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(options.file, output + '\n');
    console.log(`Wrote ${lines.length} variables to ${options.file}`);
  } else {
    console.log(output);
  }
}

// =============================================================================
// Agent Coordination
// =============================================================================

async function handlePub(channel, message, options) {
  if (!channel) {
    console.error('Usage: port-daddy pub <channel> <message>');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(message || '{}');
  } catch {
    payload = message || '';
  }

  const res = await pdFetch(`${PORT_DADDY_URL}/msg/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload, sender: options.sender })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to publish');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!options.quiet && !options.q) {
    console.log(`Published to ${channel} (id: ${data.id})`);
  }
}

async function handleSub(channel, options) {
  if (!channel) {
    console.error('Usage: port-daddy sub <channel>');
    process.exit(1);
  }

  console.error(`Subscribing to ${channel}... (Ctrl+C to exit)`);

  // SSE requires raw streaming — can't use pdFetch which buffers the full response
  const target = resolveTarget();
  const path = `/msg/${encodeURIComponent(channel)}/subscribe`;

  const reqOpts = {
    method: 'GET',
    path,
    headers: { 'Accept': 'text/event-stream' },
    ...(target.socketPath ? { socketPath: target.socketPath } : { host: target.host, port: target.port })
  };

  const req = http.request(reqOpts, (res) => {
    if (res.statusCode !== 200) {
      console.error('Failed to subscribe');
      process.exit(1);
    }

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (options.json) {
            console.log(data);
          } else {
            try {
              const msg = JSON.parse(data);
              console.log(`[${new Date(msg.createdAt).toISOString()}] ${JSON.stringify(msg.payload)}`);
            } catch {
              console.log(data);
            }
          }
        }
      }
    });

    res.on('end', () => {
      console.error('Subscription ended');
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error(`Connection error: ${err.message}`);
    process.exit(1);
  });

  req.end();

  // Keep process alive until Ctrl+C
  await new Promise(() => {});
}

// =============================================================================
// Multi-Agent Coordination
// =============================================================================

async function handleWait(serviceIds, options) {
  if (!serviceIds || serviceIds.length === 0) {
    console.error('Usage: port-daddy wait <service> [service2] [...]');
    console.error('       port-daddy wait myapp:api myapp:frontend');
    process.exit(1);
  }

  const timeout = options.timeout ? parseInt(options.timeout, 10) : 60000;

  console.error(`Waiting for ${serviceIds.length} service(s) to become healthy...`);

  if (serviceIds.length === 1) {
    // Single service wait
    const url = `${PORT_DADDY_URL}/wait/${encodeURIComponent(serviceIds[0])}?timeout=${timeout}`;
    const res = await pdFetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Wait failed');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`✓ ${serviceIds[0]} is healthy (${data.latency}ms)`);
    }
  } else {
    // Multiple services wait
    const res = await pdFetch(`${PORT_DADDY_URL}/wait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: serviceIds, timeout })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Wait failed');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      for (const svc of data.services) {
        const icon = svc.healthy ? '✓' : '✗';
        console.log(`${icon} ${svc.serviceId} ${svc.healthy ? `(${svc.latency}ms)` : svc.error || 'unhealthy'}`);
      }
      console.log(`\nAll services healthy: ${data.allHealthy}`);
    }
  }
}

async function handleLock(name, options) {
  if (!name) {
    console.error('Usage: port-daddy lock <name> [--ttl <ms>] [--owner <id>]');
    console.error('       port-daddy lock db-migrations');
    process.exit(1);
  }

  const body = {
    owner: options.owner,
    ttl: options.ttl ? parseInt(options.ttl, 10) : 300000
  };

  const res = await pdFetch(`${PORT_DADDY_URL}/locks/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PID': String(process.pid)
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.error === 'lock is held') {
      console.error(`Lock '${name}' is held by ${data.holder}`);
      console.error(`  Held since: ${new Date(data.heldSince).toISOString()}`);
      if (data.expiresAt) {
        const remaining = Math.max(0, data.expiresAt - Date.now());
        console.error(`  Expires in: ${Math.ceil(remaining / 1000)}s`);
      }
      process.exit(1);
    }
    console.error(data.error || 'Failed to acquire lock');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (options.quiet) {
    // Silent success for scripting: port-daddy lock foo && do_stuff
  } else {
    console.log(`Acquired lock: ${name}`);
    if (data.expiresAt) {
      const ttlSeconds = Math.ceil((data.expiresAt - data.acquiredAt) / 1000);
      console.log(`  TTL: ${ttlSeconds}s`);
    }
  }
}

async function handleUnlock(name, options) {
  if (!name) {
    console.error('Usage: port-daddy unlock <name> [--force]');
    process.exit(1);
  }

  const body = {
    owner: options.owner,
    force: options.force === true
  };

  const res = await pdFetch(`${PORT_DADDY_URL}/locks/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to release lock');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (!options.quiet) {
    if (data.released) {
      console.log(`Released lock: ${name}`);
    } else {
      console.log(`Lock '${name}' was not held`);
    }
  }
}

async function handleLocks(options) {
  const params = new URLSearchParams();
  if (options.owner) params.append('owner', options.owner);

  const url = `${PORT_DADDY_URL}/locks${params.toString() ? '?' + params : ''}`;
  const res = await pdFetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to list locks');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.count === 0) {
    console.log('No active locks');
    return;
  }

  console.log('');
  console.log('NAME'.padEnd(30) + 'OWNER'.padEnd(25) + 'EXPIRES');
  console.log('─'.repeat(70));

  for (const lock of data.locks) {
    const expires = lock.expiresAt
      ? new Date(lock.expiresAt).toISOString().replace('T', ' ').slice(0, 19)
      : 'never';
    console.log(
      lock.name.padEnd(30) +
      lock.owner.slice(0, 24).padEnd(25) +
      expires
    );
  }

  console.log('');
  console.log(`Total: ${data.count} lock(s)`);
}

// =============================================================================
// Orchestration (up/down)
// =============================================================================

const UP_PID_FILE = join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  '.port-daddy-up.pid'
);

async function handleUp(positional, options) {
  const dir = options.dir || process.cwd();

  // Ensure daemon is running
  try {
    const healthRes = await pdFetch(`${PORT_DADDY_URL}/health`);
    if (!healthRes.ok) throw new Error('unhealthy');
  } catch {
    console.error('Port Daddy daemon is not running.');
    console.error('Start it with: port-daddy start');
    process.exit(1);
  }

  // 1. Load config (if exists)
  let config = null;
  try {
    config = loadConfig(dir);
  } catch (err) {
    console.error(`Config error: ${err.message}`);
    process.exit(1);
  }

  // 2. Discover services
  const discovered = discoverServices(dir);
  const mergedServices = mergeWithConfig(discovered.services, config);

  if (Object.keys(mergedServices).length === 0) {
    // Auto-scan: try deep scan before giving up
    console.error('  No config found. Scanning...');
    console.error('');
    try {
      const scanRes = await pdFetch(`${PORT_DADDY_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dir, save: true, useBranch: options.branch === true })
      });
      const scanData = await scanRes.json();

      if (scanRes.ok && scanData.serviceCount > 0) {
        // Scan found services — reload config and continue
        console.error(`  Scan found ${scanData.serviceCount} service(s). Config saved.`);
        console.error('');
        config = loadConfig(dir);
        const rediscovered = discoverServices(dir);
        Object.assign(mergedServices, mergeWithConfig(rediscovered.services, config));
      }
    } catch {
      // Scan failed silently, fall through to error below
    }

    if (Object.keys(mergedServices).length === 0) {
      console.error('  No services found.');
      console.error('');
      console.error('  Port Daddy looked for known frameworks (Next.js, Express,');
      console.error('  FastAPI, Docker, Go, Rust, etc.) but found nothing.');
      console.error('');
      console.error('  Try: port-daddy scan --dry-run    (see what would be detected)');
      console.error('       port-daddy scan              (scan & save config)');
      process.exit(1);
    }
  }

  // 3. Suggest semantic identities
  const useGitBranch = options.branch === true;
  const nameOpts = useGitBranch ? { useGitBranch: true } : {};
  const identitySuggestions = suggestNames(mergedServices, dir, nameOpts);

  // Build identity map: service name → full semantic ID
  // Deduplicate: if two services get the same identity, append service name
  const identities = {};
  const seenIds = new Map(); // full id → service name
  for (const [name, suggestion] of Object.entries(identitySuggestions)) {
    let id = suggestion.full;
    if (seenIds.has(id)) {
      // Conflict: rename the earlier one too (if not already renamed)
      const prevName = seenIds.get(id);
      if (prevName && identities[prevName] === id) {
        identities[prevName] = `${suggestion.project}:${prevName}:${suggestion.context}`;
      }
      // Use service name as the stack component for this one
      id = `${suggestion.project}:${name}:${suggestion.context}`;
      seenIds.set(id, null); // mark as resolved
    } else {
      seenIds.set(id, name);
    }
    identities[name] = id;
  }

  // 4. Normalize all service configs
  const normalizedServices = {};
  for (const [name, svc] of Object.entries(mergedServices)) {
    normalizedServices[name] = normalizeServiceConfig(name, svc);
  }

  // 5. Print preview
  const serviceEntries = Object.entries(normalizedServices);

  console.log('');
  if (config) {
    console.log(`  Config: ${config._path}`);
  } else {
    console.log(`  Config: auto-detected (${discovered.type})`);
  }
  console.log(`  Detected ${serviceEntries.length} service(s):`);
  console.log('');

  const maxNameLen = Math.max(...serviceEntries.map(([n]) => n.length));
  for (const [name, svc] of serviceEntries) {
    const padded = name.padEnd(maxNameLen);
    const stackLabel = svc.stack?.name || (svc.remote ? 'remote' : 'local');
    const identity = identities[name] || name;
    const marker = svc.remote ? '  (remote)' : '';
    console.log(`    ${padded}  ${stackLabel.padEnd(12)} → ${identity}${marker}`);
  }
  console.log('');

  // 6. Topological sort to validate dependency graph
  const { order, error: sortError } = topologicalSort(normalizedServices);
  if (sortError) {
    console.error(`  Error: ${sortError}`);
    process.exit(1);
  }

  // 7. Create orchestrator
  const orchestrator = createOrchestrator({
    services: normalizedServices,
    identities,
    config: {
      noHealth: options['no-health'] === true,
      healthTimeout: options.timeout ? parseInt(options.timeout, 10) : 30000,
      targetService: options.service || null
    }
  });

  // 8. Wire events
  orchestrator.on('portsReady', ({ portMap }) => {
    console.log('  Claiming ports...');
    for (const [name, port] of Object.entries(portMap)) {
      console.log(`    ${name.padEnd(maxNameLen)}  → ${port}`);
    }
    console.log('');
  });

  orchestrator.on('healthy', ({ name, port }) => {
    console.log(`  ✓ ${name} healthy (port ${port})`);
  });

  orchestrator.on('healthTimeout', ({ name, port }) => {
    console.error(`  ⚠ ${name} did not become healthy (port ${port})`);
  });

  orchestrator.on('crash', ({ name }) => {
    console.error(`  ✗ ${name} crashed during startup`);
  });

  orchestrator.on('exit', ({ name, code, signal, early }) => {
    if (early) {
      console.error(`  ✗ ${name} exited immediately (code ${code})`);
    } else {
      console.error(`  ${name} exited (code ${code}, signal ${signal})`);
    }
  });

  orchestrator.on('allStarted', ({ services }) => {
    console.log('');
    console.log(`  All ${services.length} service(s) running. Press Ctrl+C to stop.`);
    console.log(`  Dashboard: ${PORT_DADDY_URL}/`);
    console.log('');
  });

  orchestrator.on('stopped', () => {
    console.log('');
    console.log('  All services stopped.');
    removePidFile();
  });

  orchestrator.on('error', ({ name, error }) => {
    console.error(`  Error in ${name}: ${error}`);
  });

  // 9. Handle Ctrl+C
  let shuttingDown = false;
  const gracefulShutdown = async () => {
    if (shuttingDown) {
      // Double Ctrl+C: force kill
      console.error('\n  Force killing...');
      process.exit(1);
    }
    shuttingDown = true;
    console.log('\n  Shutting down...');
    await orchestrator.stop();
    process.exit(0);
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);

  // 10. Write PID file for `down` command
  writePidFile();

  // 11. Start
  console.log(`  Starting in dependency order: ${order.join(' → ')}`);
  console.log('');

  try {
    await orchestrator.start();
  } catch (err) {
    console.error(`  Failed to start: ${err.message}`);
    removePidFile();
    process.exit(1);
  }

  // Keep alive
  await new Promise(() => {});
}

async function handleDown(options) {
  // Read PID file
  try {
    if (!existsSync(UP_PID_FILE)) {
      console.error('No port-daddy up session found.');
      console.error('(No PID file at ' + UP_PID_FILE + ')');
      process.exit(1);
    }

    const pidStr = readFileSync(UP_PID_FILE, 'utf-8').trim();
    const pid = parseInt(pidStr, 10);

    if (isNaN(pid)) {
      console.error('Invalid PID file. Removing it.');
      removePidFile();
      process.exit(1);
    }

    // Check if process is alive
    try {
      process.kill(pid, 0); // Signal 0 = just check if alive
    } catch {
      console.error(`Process ${pid} is not running. Cleaning up PID file.`);
      removePidFile();
      process.exit(1);
    }

    // Send SIGTERM to trigger graceful shutdown
    console.log(`Sending shutdown signal to port-daddy up (PID ${pid})...`);
    process.kill(pid, 'SIGTERM');
    console.log('Shutdown initiated.');
  } catch (err) {
    if (err.code !== undefined) throw err; // Re-throw non-handled errors
    console.error(`Failed to stop: ${err.message}`);
    process.exit(1);
  }
}

function writePidFile() {
  try {
    fsWriteFileSync(UP_PID_FILE, String(process.pid));
  } catch { /* best effort */ }
}

function removePidFile() {
  try {
    if (existsSync(UP_PID_FILE)) unlinkSync(UP_PID_FILE);
  } catch { /* best effort */ }
}

// =============================================================================
// Project Setup
// =============================================================================

async function handleDetect(options) {
  const res = await pdFetch(`${PORT_DADDY_URL}/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: options.dir || process.cwd() })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Detection failed');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.stack) {
    console.log(`Detected: ${data.stack.name}`);
    console.log(`  Default port: ${data.stack.defaultPort}`);
    console.log(`  Dev command: ${data.stack.devCmd}`);
    console.log(`  Health path: ${data.stack.healthPath || '/'}`);
  } else {
    console.log('No framework detected');
  }

  console.log('');
  console.log('Suggested identity:');
  console.log(`  ${data.suggestedIdentity.full}`);
}

async function handleInit(options) {
  const save = !options.dry;

  const res = await pdFetch(`${PORT_DADDY_URL}/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: options.dir || process.cwd(), save })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Init failed');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.saved) {
    console.log(`Created: ${data.path}`);
    console.log('');
    console.log('Config:');
    console.log(JSON.stringify(data.config, null, 2));
  } else {
    console.log('Generated config (use without --dry to save):');
    console.log('');
    console.log(JSON.stringify(data.config, null, 2));
  }
}

// =============================================================================
// Scan & Projects
// =============================================================================

async function handleScan(dir, options) {
  const targetDir = dir || options.dir || process.cwd();
  const dryRun = options['dry-run'] === true;
  const useBranch = options.branch === true;

  const res = await pdFetch(`${PORT_DADDY_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dir: targetDir, save: !dryRun, dryRun, useBranch })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Scan failed');
    if (data.details) console.error(`  ${data.details}`);
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Header
  console.log('');
  console.log(`  Project: ${data.project}`);
  console.log(`  Root:    ${data.root}`);
  console.log(`  Type:    ${data.type}`);
  console.log('');

  if (data.serviceCount === 0) {
    console.log('  No services detected.');
    console.log('');
    if (data.guidance) {
      for (const line of data.guidance) {
        console.log(`  ${line}`);
      }
    }
    return;
  }

  // Service tree
  console.log(`  Services (${data.serviceCount}):`);
  console.log('');

  const entries = Object.entries(data.services);
  const maxName = Math.max(...entries.map(([n]) => n.length));

  for (const [name, svc] of entries) {
    const padded = name.padEnd(maxName);
    const framework = svc.framework || 'unknown';
    const port = svc.preferredPort ? `:${svc.preferredPort}` : '';
    const dir = svc.dir || '.';
    console.log(`    ${padded}  ${framework.padEnd(20)} ${dir}${port}`);
  }
  console.log('');

  // Config status
  if (dryRun) {
    console.log('  Dry run — config not saved.');
    console.log('  Run without --dry-run to save .portdaddyrc');
  } else if (data.saved) {
    console.log(`  Config saved: ${data.savedPath}`);
  }

  if (data.existingConfig) {
    console.log(`  Existing config: ${data.existingConfig.path} (${data.existingConfig.serviceCount} services)`);
  }

  // Guidance
  console.log('');
  if (data.guidance) {
    for (const line of data.guidance) {
      console.log(`  ${line}`);
    }
  }
  console.log('');
}

async function handleProjects(subcommand, args, options) {
  // Handle "projects rm <id>"
  if (subcommand === 'rm' || subcommand === 'remove' || subcommand === 'delete') {
    const projectId = args[0];
    if (!projectId) {
      console.error('Usage: port-daddy projects rm <project-id>');
      process.exit(1);
    }

    const res = await pdFetch(`${PORT_DADDY_URL}/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE'
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Failed to remove project');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`  Removed project: ${projectId}`);
    }
    return;
  }

  // Handle "projects <id>" — get specific project
  if (subcommand && subcommand !== 'list') {
    const res = await pdFetch(`${PORT_DADDY_URL}/projects/${encodeURIComponent(subcommand)}`);
    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Project not found');
      if (data.suggestion) console.error(`  ${data.suggestion}`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const p = data.project;
    console.log('');
    console.log(`  Project: ${p.id}`);
    console.log(`  Root:    ${p.root}`);
    console.log(`  Type:    ${p.type}`);
    console.log(`  Scanned: ${new Date(p.lastScanned).toLocaleString()}`);
    console.log('');

    if (p.services) {
      const entries = Object.entries(p.services);
      console.log(`  Services (${entries.length}):`);
      for (const [name, svc] of entries) {
        const framework = svc?.stack?.name || 'unknown';
        console.log(`    ${name}  ${framework}`);
      }
    }
    console.log('');
    return;
  }

  // Default: list all projects
  const res = await pdFetch(`${PORT_DADDY_URL}/projects`);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to list projects');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.count === 0) {
    console.log('');
    console.log('  No projects registered.');
    console.log('');
    console.log('  Run "port-daddy scan" from a project directory to register it.');
    console.log('');
    return;
  }

  console.log('');
  console.log(`  Registered projects (${data.count}):`);
  console.log('');

  const maxId = Math.max(...data.projects.map(p => p.id.length));
  for (const p of data.projects) {
    const padded = p.id.padEnd(maxId);
    const type = p.type.padEnd(9);
    const svcCount = `${p.serviceCount} svc`;
    const scanned = p.lastScanned ? new Date(p.lastScanned).toLocaleDateString() : 'never';
    const frameworks = p.frameworks?.length ? p.frameworks.join(', ') : '';
    console.log(`    ${padded}  ${type} ${svcCount.padEnd(6)}  scanned ${scanned}  ${frameworks}`);
  }

  console.log('');
}

// =============================================================================
// Agent Registry
// =============================================================================

async function handleAgent(subcommand, args, options) {
  if (!subcommand || subcommand === 'help') {
    console.error('Usage: port-daddy agent <subcommand> [options]');
    console.error('');
    console.error('Subcommands:');
    console.error('  register [--agent <id>] [--type <type>]   Register as an agent');
    console.error('  heartbeat [--agent <id>]                  Send heartbeat');
    console.error('  unregister [--agent <id>]                 Unregister agent');
    console.error('  <agent-id>                                Get agent info');
    process.exit(1);
  }

  const agentId = options.agent || `cli-${process.pid}`;

  switch (subcommand) {
    case 'register': {
      const body = {
        id: agentId,
        name: options.name,
        type: options.type || 'cli',
        maxServices: options.maxServices ? parseInt(options.maxServices, 10) : undefined,
        maxLocks: options.maxLocks ? parseInt(options.maxLocks, 10) : undefined
      };

      const res = await pdFetch(`${PORT_DADDY_URL}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PID': String(process.pid)
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.error || 'Failed to register agent');
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data.registered ? `Registered agent: ${agentId}` : `Updated agent: ${agentId}`);
      }
      break;
    }

    case 'heartbeat': {
      const res = await pdFetch(`${PORT_DADDY_URL}/agents/${encodeURIComponent(agentId)}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PID': String(process.pid)
        }
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.error || 'Failed to send heartbeat');
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else if (!options.quiet) {
        console.log(`Heartbeat sent for ${agentId}`);
      }
      break;
    }

    case 'unregister': {
      const res = await pdFetch(`${PORT_DADDY_URL}/agents/${encodeURIComponent(agentId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.error || 'Failed to unregister agent');
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(data.unregistered ? `Unregistered agent: ${agentId}` : `Agent not found: ${agentId}`);
      }
      break;
    }

    default: {
      // Treat as agent ID lookup
      const res = await pdFetch(`${PORT_DADDY_URL}/agents/${encodeURIComponent(subcommand)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error(data.error || 'Agent not found');
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        const agent = data.agent;
        console.log(`Agent: ${agent.id}`);
        console.log(`  Name: ${agent.name || '-'}`);
        console.log(`  Type: ${agent.type}`);
        console.log(`  PID: ${agent.pid}`);
        console.log(`  Active: ${agent.isActive ? 'yes' : 'no'}`);
        console.log(`  Last heartbeat: ${new Date(agent.lastHeartbeat).toISOString()}`);
        console.log(`  Registered: ${new Date(agent.registeredAt).toISOString()}`);
        console.log(`  Limits: ${agent.maxServices} services, ${agent.maxLocks} locks`);
      }
    }
  }
}

async function handleAgents(options) {
  const params = new URLSearchParams();
  if (options.active) params.append('active', 'true');

  const url = `${PORT_DADDY_URL}/agents${params.toString() ? '?' + params : ''}`;
  const res = await pdFetch(url);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to list agents');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.count === 0) {
    console.log('No agents registered');
    return;
  }

  console.log('');
  console.log('ID'.padEnd(25) + 'TYPE'.padEnd(10) + 'PID'.padEnd(10) + 'ACTIVE'.padEnd(10) + 'LAST HEARTBEAT');
  console.log('─'.repeat(75));

  for (const agent of data.agents) {
    const lastHb = new Date(agent.lastHeartbeat).toISOString().replace('T', ' ').slice(0, 19);
    console.log(
      agent.id.slice(0, 24).padEnd(25) +
      agent.type.padEnd(10) +
      String(agent.pid).padEnd(10) +
      (agent.isActive ? 'yes' : 'no').padEnd(10) +
      lastHb
    );
  }

  console.log('');
  console.log(`Total: ${data.count} agent(s)`);
}

// =============================================================================
// Activity Log
// =============================================================================

async function handleLog(subcommand, options) {
  if (subcommand === 'summary') {
    const params = new URLSearchParams();
    if (options.since) params.append('since', options.since);

    const res = await pdFetch(`${PORT_DADDY_URL}/activity/summary${params.toString() ? '?' + params : ''}`);
    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Failed to get summary');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log('');
    console.log('Activity Summary');
    console.log('─'.repeat(40));

    for (const [type, count] of Object.entries(data.summary)) {
      console.log(`  ${type.padEnd(25)} ${count}`);
    }

    console.log('─'.repeat(40));
    console.log(`  Total: ${data.total}`);
    if (data.since > 0) {
      console.log(`  Since: ${new Date(data.since).toISOString()}`);
    }
    console.log('');
    return;
  }

  if (subcommand === 'stats') {
    const res = await pdFetch(`${PORT_DADDY_URL}/activity/stats`);
    const data = await res.json();

    if (!res.ok) {
      console.error(data.error || 'Failed to get stats');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    const stats = data.stats;
    console.log('');
    console.log('Activity Log Stats');
    console.log('─'.repeat(40));
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  Max entries: ${stats.maxEntries}`);
    console.log(`  Retention: ${Math.floor(stats.retentionMs / 86400000)} days`);
    if (stats.oldestEntry) {
      console.log(`  Oldest: ${new Date(stats.oldestEntry).toISOString()}`);
    }
    if (stats.newestEntry) {
      console.log(`  Newest: ${new Date(stats.newestEntry).toISOString()}`);
    }
    console.log('');
    return;
  }

  // Default: show recent activity
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit);
  if (options.type) params.append('type', options.type);
  if (options.agent) params.append('agent', options.agent);
  if (options.target) params.append('target', options.target);
  if (subcommand && subcommand !== 'recent') params.append('type', subcommand);

  const res = await pdFetch(`${PORT_DADDY_URL}/activity${params.toString() ? '?' + params : ''}`);
  const data = await res.json();

  if (!res.ok) {
    console.error(data.error || 'Failed to get activity');
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.count === 0) {
    console.log('No activity found');
    return;
  }

  console.log('');
  console.log('TIMESTAMP'.padEnd(22) + 'TYPE'.padEnd(20) + 'AGENT'.padEnd(18) + 'DETAILS');
  console.log('─'.repeat(85));

  for (const entry of data.entries) {
    const time = new Date(entry.timestamp).toISOString().replace('T', ' ').slice(0, 19);
    console.log(
      time.padEnd(22) +
      entry.type.slice(0, 19).padEnd(20) +
      (entry.agentId || '-').slice(0, 17).padEnd(18) +
      (entry.details || '-')
    );
  }

  console.log('');
  console.log(`Showing ${data.count} entries`);
}

// =============================================================================
// Daemon Management
// =============================================================================

async function handleDaemon(action) {
  const installScript = join(__dirname, '..', 'install-daemon.js');
  const serverScript = join(__dirname, '..', 'server.js');

  switch (action) {
    case 'start': {
      // Check if already running
      try {
        const res = await pdFetch(`${PORT_DADDY_URL}/health`);
        if (res.ok) {
          console.log('Port Daddy is already running');
          return;
        }
      } catch {}

      console.log('Starting Port Daddy daemon...');
      const child = spawn('node', [serverScript], {
        stdio: 'ignore',
        detached: true
      });
      child.unref();

      // Wait for it to be ready
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        try {
          const res = await pdFetch(`${PORT_DADDY_URL}/health`);
          if (res.ok) {
            console.log('Port Daddy daemon started');
            return;
          }
        } catch {}
      }
      console.error('Failed to start daemon');
      process.exit(1);
      break;
    }

    case 'stop': {
      try {
        const res = await pdFetch(`${PORT_DADDY_URL}/health`);
        const data = await res.json();
        process.kill(data.pid, 'SIGTERM');
        console.log('Port Daddy daemon stopped');
      } catch {
        console.log('Port Daddy is not running');
      }
      break;
    }

    case 'restart': {
      await handleDaemon('stop');
      await new Promise(r => setTimeout(r, 1000));
      await handleDaemon('start');
      break;
    }

    case 'install': {
      const result = spawnSync('node', [installScript, 'install'], { stdio: 'inherit' });
      process.exit(result.status);
      break;
    }

    case 'uninstall': {
      const result = spawnSync('node', [installScript, 'uninstall'], { stdio: 'inherit' });
      process.exit(result.status);
      break;
    }
  }
}

async function handleStatus() {
  try {
    const res = await pdFetch(`${PORT_DADDY_URL}/health`);
    const data = await res.json();

    console.log(`Port Daddy is running`);
    console.log(`  Version: ${data.version}`);
    console.log(`  PID: ${data.pid}`);
    console.log(`  Uptime: ${Math.floor(data.uptime_seconds / 60)}m ${data.uptime_seconds % 60}s`);
    console.log(`  Active ports: ${data.active_ports}`);
  } catch {
    console.log('Port Daddy is not running');
    console.log('  Start with: port-daddy start');
    console.log('  Or install: port-daddy install');
    process.exit(1);
  }
}

async function handleVersion() {
  try {
    const res = await pdFetch(`${PORT_DADDY_URL}/version`);
    const data = await res.json();
    console.log(`Port Daddy ${data.version}`);
    console.log(`Code hash: ${data.codeHash}`);
    console.log(`Server PID: ${data.pid}`);
    console.log(`Uptime: ${Math.floor(data.uptime / 60)}m`);
  } catch {
    console.log('Port Daddy v2.0.0 (server not running)');
  }
}

async function handleDoctor() {
  const results = [];
  let passed = 0;
  let total = 0;
  let hasCriticalFailure = false;

  function check(name, ok, detail, hint) {
    total++;
    if (ok) {
      passed++;
      results.push({ ok: true, name, detail });
    } else {
      results.push({ ok: false, name, detail, hint });
    }
  }

  function criticalFail(name, detail, hint) {
    total++;
    hasCriticalFailure = true;
    results.push({ ok: false, name, detail, hint, critical: true });
  }

  // -------------------------------------------------------------------------
  // 1. Node.js version
  // -------------------------------------------------------------------------
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    if (major >= 18) {
      check('Node.js version', true, `${nodeVersion} (>= 18 required)`);
    } else {
      criticalFail('Node.js version', `${nodeVersion} (>= 18 required)`, 'Upgrade Node.js to version 18 or later');
    }
  } catch (err) {
    criticalFail('Node.js version', `Error: ${err.message}`, 'Ensure Node.js is installed');
  }

  // -------------------------------------------------------------------------
  // 2. Dependencies installed
  // -------------------------------------------------------------------------
  try {
    const nodeModulesPath = join(__dirname, '..', 'node_modules');
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = Object.keys(pkg.dependencies || {});
    const missing = [];

    for (const dep of deps) {
      const depPath = join(nodeModulesPath, dep);
      if (!existsSync(depPath)) {
        missing.push(dep);
      }
    }

    if (missing.length === 0) {
      check('Dependencies', true, `All ${deps.length} dependencies installed`);
    } else {
      criticalFail('Dependencies', `Missing: ${missing.join(', ')}`, 'Run: npm install');
    }
  } catch (err) {
    criticalFail('Dependencies', `Error: ${err.message}`, 'Run: npm install');
  }

  // -------------------------------------------------------------------------
  // 3. Database exists and is writable
  // -------------------------------------------------------------------------
  try {
    const dbPath = join(__dirname, '..', 'port-registry.db');
    if (existsSync(dbPath)) {
      // Check if writable by trying to open for writing
      const { accessSync, constants } = await import('node:fs');
      try {
        accessSync(dbPath, constants.R_OK | constants.W_OK);
        check('Database', true, 'port-registry.db exists and is writable');
      } catch {
        criticalFail('Database', 'port-registry.db exists but is not writable', 'Check file permissions on port-registry.db');
      }
    } else {
      // Database not existing is fine if daemon hasn't started yet
      check('Database', true, 'port-registry.db will be created on first start');
    }
  } catch (err) {
    check('Database', false, `Error: ${err.message}`, 'Check port-registry.db permissions');
  }

  // -------------------------------------------------------------------------
  // 4. Network: Can we reach localhost:9876
  // -------------------------------------------------------------------------
  let daemonData = null;
  let daemonRunning = false;

  try {
    const res = await pdFetch(`${PORT_DADDY_URL}/health`);
    if (res.ok) {
      daemonData = await res.json();
      daemonRunning = true;
      check('Network', true, `localhost:9876 is reachable`);
    } else {
      check('Network', false, `localhost:9876 returned status ${res.status}`, 'Run: port-daddy start');
    }
  } catch {
    check('Network', false, 'Cannot connect to localhost:9876', 'Run: port-daddy start');
  }

  // -------------------------------------------------------------------------
  // 5. Daemon status
  // -------------------------------------------------------------------------
  if (daemonRunning && daemonData) {
    check('Daemon running', true, `PID ${daemonData.pid}, v${daemonData.version}`);
  } else {
    check('Daemon running', false, 'Daemon is not running', 'Run: port-daddy start');
  }

  // -------------------------------------------------------------------------
  // 6. Code hash freshness
  // -------------------------------------------------------------------------
  try {
    if (daemonRunning) {
      const versionRes = await pdFetch(`${PORT_DADDY_URL}/version`);
      if (versionRes.ok) {
        const versionData = await versionRes.json();
        const localHash = getLocalCodeHash();

        if (versionData.codeHash === localHash) {
          check('Code hash', true, `Matches (${localHash})`);
        } else {
          check('Code hash', false,
            `Mismatch: daemon=${versionData.codeHash} local=${localHash}`,
            'Run: port-daddy restart');
        }
      } else {
        check('Code hash', false, 'Could not query daemon version', 'Run: port-daddy restart');
      }
    } else {
      check('Code hash', false, 'Daemon not running, cannot verify', 'Run: port-daddy start');
    }
  } catch (err) {
    check('Code hash', false, `Error: ${err.message}`, 'Run: port-daddy restart');
  }

  // -------------------------------------------------------------------------
  // 7. Port 9876 availability
  // -------------------------------------------------------------------------
  try {
    if (daemonRunning) {
      check('Port 9876', true, 'Bound to Port Daddy daemon');
    } else {
      // Check if something else is using 9876
      const net = await import('node:net');
      const portInUse = await new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(true));
        server.once('listening', () => {
          server.close();
          resolve(false);
        });
        server.listen(9876, '127.0.0.1');
      });

      if (portInUse) {
        check('Port 9876', false, 'In use by another process', 'Run: lsof -i :9876 to investigate');
      } else {
        check('Port 9876', true, 'Available (daemon not running)');
      }
    }
  } catch (err) {
    check('Port 9876', false, `Error: ${err.message}`, 'Run: lsof -i :9876 to investigate');
  }

  // -------------------------------------------------------------------------
  // 8. System service (LaunchAgent on macOS, systemd on Linux)
  // -------------------------------------------------------------------------
  try {
    if (process.platform === 'darwin') {
      const homedir = (await import('node:os')).homedir();
      const plistPath = join(homedir, 'Library', 'LaunchAgents', 'com.portdaddy.daemon.plist');

      if (existsSync(plistPath)) {
        const result = spawnSync('launchctl', ['list', 'com.portdaddy.daemon'], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.status === 0) {
          check('System service', true, 'LaunchAgent installed and loaded');
        } else {
          check('System service', false,
            'LaunchAgent plist exists but is not loaded',
            'Run: port-daddy install');
        }
      } else {
        // Check for legacy plist
        const legacyPath = join(homedir, 'Library', 'LaunchAgents', 'com.erichowens.port-daddy.plist');
        if (existsSync(legacyPath)) {
          check('System service', false,
            'Legacy LaunchAgent found (com.erichowens.port-daddy)',
            'Run: port-daddy install (will upgrade automatically)');
        } else {
          check('System service', false,
            'LaunchAgent not installed',
            'Run: port-daddy install');
        }
      }
    } else if (process.platform === 'linux') {
      const homedir = (await import('node:os')).homedir();
      const unitPath = join(homedir, '.config', 'systemd', 'user', 'port-daddy.service');

      if (existsSync(unitPath)) {
        const result = spawnSync('systemctl', ['--user', 'is-active', 'port-daddy.service'], {
          encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
        });
        const state = (result.stdout || '').trim();

        if (state === 'active') {
          check('System service', true, 'systemd user service active');
        } else if (state === 'failed') {
          check('System service', false,
            'systemd service failed',
            'Check: journalctl --user -u port-daddy.service');
        } else {
          check('System service', false,
            `systemd service installed but ${state}`,
            'Run: systemctl --user start port-daddy.service');
        }
      } else {
        check('System service', false,
          'systemd user service not installed',
          'Run: port-daddy install');
      }
    } else {
      check('System service', true, `N/A (${process.platform} — use: port-daddy start)`);
    }
  } catch (err) {
    check('System service', false, `Error: ${err.message}`, 'Run: port-daddy install');
  }

  // -------------------------------------------------------------------------
  // 9. Stale services (services with dead PIDs)
  // -------------------------------------------------------------------------
  try {
    if (daemonRunning) {
      const servicesRes = await pdFetch(`${PORT_DADDY_URL}/services`);
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        let staleCount = 0;

        for (const svc of servicesData.services || []) {
          if (svc.pid) {
            try {
              process.kill(svc.pid, 0);
            } catch {
              staleCount++;
            }
          }
        }

        if (staleCount === 0) {
          check('Stale services', true, 'No stale services found');
        } else {
          check('Stale services', false,
            `${staleCount} service(s) with dead PIDs`,
            'Run: port-daddy release --expired');
        }
      } else {
        check('Stale services', false, 'Could not query services', 'Run: port-daddy find');
      }
    } else {
      check('Stale services', true, 'Daemon not running (no services to check)');
    }
  } catch (err) {
    check('Stale services', false, `Error: ${err.message}`, null);
  }

  // -------------------------------------------------------------------------
  // Output
  // -------------------------------------------------------------------------
  console.log('');
  console.log('Port Daddy Doctor');
  console.log('\u2501'.repeat(38));

  for (const r of results) {
    if (r.ok) {
      console.log(`\u2713 ${r.name}: ${r.detail}`);
    } else {
      console.log(`\u2717 ${r.name}: ${r.detail}`);
      if (r.hint) {
        console.log(`  \u2192 ${r.hint}`);
      }
    }
  }

  console.log('\u2501'.repeat(38));
  console.log(`${passed}/${total} checks passed`);
  console.log('');

  if (hasCriticalFailure) {
    process.exit(1);
  }
  if (passed < total) {
    process.exit(1);
  }
}

async function handleDev() {
  const libDir = join(__dirname, '..');
  const filesToWatch = [
    'server.js',
    'lib/services.js',
    'lib/messaging.js',
    'lib/locks.js',
    'lib/health.js',
    'lib/detect.js',
    'lib/config.js',
    'lib/identity.js',
    'lib/utils.js',
    'lib/agents.js',
    'lib/activity.js'
  ];

  console.log('');
  console.log('Port Daddy Dev Mode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Watching source files for changes...');
  console.log('Press Ctrl+C to exit');
  console.log('');

  // Start daemon first
  await handleDaemon('start');

  let restartTimeout = null;
  let lastHash = getLocalCodeHash();

  // Debounced restart
  const scheduleRestart = () => {
    if (restartTimeout) clearTimeout(restartTimeout);
    restartTimeout = setTimeout(async () => {
      const newHash = getLocalCodeHash();
      if (newHash !== lastHash) {
        lastHash = newHash;
        console.log('');
        console.log(`[${new Date().toLocaleTimeString()}] File changed, restarting daemon...`);

        // Kill current daemon
        try {
          const res = await pdFetch(`${PORT_DADDY_URL}/health`);
          const data = await res.json();
          process.kill(data.pid, 'SIGTERM');
        } catch {}

        await new Promise(r => setTimeout(r, 500));

        // Start new daemon
        const serverScript = join(__dirname, '..', 'server.js');
        const child = spawn('node', [serverScript], {
          stdio: 'ignore',
          detached: true
        });
        child.unref();

        // Wait for ready
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 100));
          try {
            const healthRes = await pdFetch(`${PORT_DADDY_URL}/health`);
            if (healthRes.ok) {
              console.log(`[${new Date().toLocaleTimeString()}] ✓ Daemon restarted (hash: ${newHash})`);
              return;
            }
          } catch {}
        }
        console.log(`[${new Date().toLocaleTimeString()}] ✗ Failed to restart daemon`);
      }
    }, 300); // 300ms debounce
  };

  // Watch each file
  const watchers = [];
  for (const file of filesToWatch) {
    const filePath = join(libDir, file);
    if (existsSync(filePath)) {
      try {
        const watcher = watch(filePath, (eventType) => {
          if (eventType === 'change') {
            scheduleRestart();
          }
        });
        watchers.push(watcher);
        console.log(`  Watching: ${file}`);
      } catch (err) {
        console.error(`  Failed to watch ${file}: ${err.message}`);
      }
    }
  }

  // Also watch the lib directory for new files
  const libPath = join(libDir, 'lib');
  if (existsSync(libPath)) {
    try {
      const libWatcher = watch(libPath, (eventType, filename) => {
        if (filename && filename.endsWith('.js')) {
          scheduleRestart();
        }
      });
      watchers.push(libWatcher);
      console.log(`  Watching: lib/`);
    } catch {}
  }

  console.log('');
  console.log(`Current hash: ${lastHash}`);
  console.log('');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\nStopping dev mode...');
    watchers.forEach(w => w.close());
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main();
