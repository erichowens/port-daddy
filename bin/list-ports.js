#!/usr/bin/env node

/**
 * list-ports - List all active port assignments from Port Daddy
 * Usage: list-ports [--json]
 */

const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

async function listPorts(asJson) {
  try {
    // Check health first
    const healthRes = await fetch(`${PORT_DADDY_URL}/health`);
    if (!healthRes.ok) {
      console.error('ERROR: Port Daddy is not running');
      process.exit(1);
    }

    // Get active ports
    const res = await fetch(`${PORT_DADDY_URL}/ports/active`);
    const data = await res.json();

    if (!res.ok) {
      console.error(`ERROR: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }

    if (asJson) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Pretty print
    console.log('');
    console.log('PORT DADDY - Active Port Assignments');
    console.log('='.repeat(60));
    console.log('');

    if (data.ports.length === 0) {
      console.log('  No active port assignments');
    } else {
      for (const p of data.ports) {
        const status = p.alive ? '\u2705' : '\uD83D\uDC80';
        console.log(`  ${p.port} | ${p.project} | PID:${p.pid} | ${status} | ${p.age_minutes}m ago`);
      }
    }

    console.log('');
    console.log(`Total: ${data.count} port(s)`);

  } catch (err) {
    console.error('ERROR: Failed to connect to Port Daddy');
    console.error(err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json') || args.includes('-j');

  await listPorts(asJson);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
