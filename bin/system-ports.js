#!/usr/bin/env node

/**
 * system-ports - Show all ports currently in use on the system
 * Usage: system-ports [--range] [--unmanaged] [--json]
 */

const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

function showHelp() {
  console.log(`
Usage: system-ports [options]

Show all ports currently in use on the system.

Options:
  -r, --range      Only show ports in Port Daddy's range (3100-9999)
  -u, --unmanaged  Only show ports NOT managed by Port Daddy
  -j, --json       Output as JSON
  -h, --help       Show this help

Examples:
  system-ports              # Show all system ports
  system-ports --range      # Show ports in 3100-9999 range
  system-ports -r -u        # Show unmanaged dev ports
`);
}

async function getSystemPorts(rangeOnly, unmanagedOnly, asJson) {
  try {
    // Build query string
    const params = new URLSearchParams();
    if (rangeOnly) params.append('range_only', 'true');
    if (unmanagedOnly) params.append('unmanaged_only', 'true');

    const url = `${PORT_DADDY_URL}/ports/system${params.toString() ? '?' + params : ''}`;
    const res = await fetch(url);
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
    console.log(`System Ports (${data.count} shown, ${data.total_system_ports} total)`);
    console.log('\u2501'.repeat(64));
    console.log(
      'PORT'.padEnd(8) +
      'COMMAND'.padEnd(15) +
      'PID'.padEnd(8) +
      'MANAGED'.padEnd(10) +
      'PROJECT'
    );
    console.log('\u2500'.repeat(64));

    for (const p of data.ports) {
      const managed = p.managed_by_port_daddy ? 'yes' : '-';
      const project = p.project || '-';
      console.log(
        String(p.port).padEnd(8) +
        (p.command || '-').substring(0, 14).padEnd(15) +
        String(p.pid).padEnd(8) +
        managed.padEnd(10) +
        project
      );
    }

    console.log('');

  } catch (err) {
    console.error('ERROR: Could not connect to Port Daddy');
    console.error('Is Port Daddy running? Check: curl', PORT_DADDY_URL + '/health');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const rangeOnly = args.includes('--range') || args.includes('-r');
  const unmanagedOnly = args.includes('--unmanaged') || args.includes('-u');
  const asJson = args.includes('--json') || args.includes('-j');

  await getSystemPorts(rangeOnly, unmanagedOnly, asJson);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
