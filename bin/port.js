#!/usr/bin/env node

/**
 * Port Daddy v2 CLI
 *
 * Unified grammar: port <verb> [identity] [--attributes]
 */

const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

const HELP = `
Port Daddy v2 - Semantic Port Management

Usage: port <command> [identity] [options]

Commands:
  claim <id>       Get a port for a service
  release <id>     Free port(s) by identity or pattern
  find [pattern]   Query services (default: list all)
  url <id>         Get URL for any environment
  env <id>         Generate environment variables
  pub <channel>    Publish message to channel
  sub <channel>    Subscribe to channel (SSE)
  ps               List running services
  version          Show version info
  help             Show this help

Identity format:
  project              Just project name
  project:stack        Project + stack (api, frontend, workers)
  project:stack:ctx    Full identity with context (branch, env)
  project:*:main       Wildcards for querying

Options:
  --port <n>       Preferred port
  --range <a>-<b>  Acceptable port range
  --expires <dur>  Auto-release (e.g., 2h, 30m, 1d)
  --pair <id>      Link to another service
  --env <name>     Environment (local, tunnel, dev, staging, prod)
  --json           Output as JSON
  --quiet          Minimal output (just the value)

Examples:
  port claim myapp                    # Get port for myapp
  port claim myapp:api:feature-x      # Full semantic identity
  port claim myapp --port 3000        # Request specific port
  port claim myapp --expires 2h       # Auto-release in 2 hours

  port find                           # List all services
  port find myapp:*                   # All stacks for myapp
  port find *:api:*                   # All API services

  port release myapp                  # Release by name
  port release myapp:*:*              # Release all for project
  port release --expired              # Cleanup stale services

  port url myapp                      # http://localhost:3000
  port url myapp --env prod           # https://myapp.com

  port pub build-done '{"ok":true}'   # Publish message
  port sub build-done                 # Subscribe to channel
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    process.exit(0);
  }

  // Parse options
  const options = {};
  const positional = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
  }

  try {
    switch (command) {
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

      case 'pub':
      case 'publish':
        await handlePub(positional[0], positional.slice(1).join(' ') || options.message, options);
        break;

      case 'sub':
      case 'subscribe':
        await handleSub(positional[0], options);
        break;

      case 'version':
        await handleVersion();
        break;

      default:
        // Try to interpret as identity for claim
        if (command.match(/^[a-zA-Z0-9._:-]+$/)) {
          await handleClaim(command, options);
        } else {
          console.error(`Unknown command: ${command}`);
          console.error('Run "port help" for usage');
          process.exit(1);
        }
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

async function handleClaim(id, options) {
  if (!id) {
    console.error('Usage: port claim <identity> [options]');
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

  const res = await fetch(`${PORT_DADDY_URL}/v2/claim`, {
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
    console.log(JSON.stringify(data, null, 2));
  } else if (options.quiet || options.q) {
    console.log(data.port);
  } else {
    console.log(`${data.id} → port ${data.port}`);
    if (data.existing) console.log('  (reused existing)');
  }
}

async function handleRelease(id, options) {
  const body = {};

  if (options.expired) {
    body.expired = true;
  } else if (!id) {
    console.error('Usage: port release <identity> [options]');
    console.error('       port release --expired');
    process.exit(1);
  } else {
    body.id = id;
  }

  const res = await fetch(`${PORT_DADDY_URL}/v2/release`, {
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

  const url = `${PORT_DADDY_URL}/v2/services${params.toString() ? '?' + params : ''}`;
  const res = await fetch(url);
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
    console.log('No services found');
    return;
  }

  console.log('');
  console.log('ID'.padEnd(35) + 'PORT'.padEnd(8) + 'STATUS'.padEnd(12) + 'URL');
  console.log('-'.repeat(75));

  for (const svc of data.services) {
    const localUrl = svc.urls?.local || '-';
    console.log(
      svc.id.padEnd(35) +
      String(svc.port).padEnd(8) +
      svc.status.padEnd(12) +
      localUrl
    );
  }

  console.log('');
  console.log(`Total: ${data.count} service(s)`);
}

async function handleUrl(id, options) {
  if (!id) {
    console.error('Usage: port url <identity> [--env <environment>]');
    process.exit(1);
  }

  const env = options.env || 'local';
  const res = await fetch(`${PORT_DADDY_URL}/v2/services/${encodeURIComponent(id)}`);
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
    const { spawn } = await import('node:child_process');
    spawn(openCmd, [url], { stdio: 'ignore', detached: true }).unref();
    console.log(`Opening ${url}`);
  } else {
    console.log(url);
  }
}

async function handleEnv(id, options) {
  const params = new URLSearchParams();
  if (id) params.append('pattern', id);

  const res = await fetch(`${PORT_DADDY_URL}/v2/services?${params}`);
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

async function handlePub(channel, message, options) {
  if (!channel) {
    console.error('Usage: port pub <channel> <message>');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(message || '{}');
  } catch {
    payload = message || '';
  }

  const res = await fetch(`${PORT_DADDY_URL}/v2/msg/${encodeURIComponent(channel)}`, {
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
    console.error('Usage: port sub <channel>');
    process.exit(1);
  }

  console.error(`Subscribing to ${channel}... (Ctrl+C to exit)`);

  const res = await fetch(`${PORT_DADDY_URL}/v2/msg/${encodeURIComponent(channel)}/subscribe`);

  if (!res.ok) {
    console.error('Failed to subscribe');
    process.exit(1);
  }

  // Handle SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n');

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
  }
}

async function handleVersion() {
  try {
    const res = await fetch(`${PORT_DADDY_URL}/version`);
    const data = await res.json();
    console.log(`Port Daddy ${data.version}`);
    console.log(`Server PID: ${data.pid}`);
    console.log(`Uptime: ${Math.floor(data.uptime / 60)}m`);
  } catch {
    console.log('Port Daddy v2.0.0 (server not running)');
  }
}

main();
