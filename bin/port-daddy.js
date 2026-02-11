#!/usr/bin/env node

/**
 * Port Daddy CLI - Main entry point
 * Usage: port-daddy <command> [options]
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const command = args[0];

function showHelp() {
  console.log(`
Port Daddy - Authoritative Port Assignment Service

Usage: port-daddy <command> [options]

Commands:
  start           Start the Port Daddy server
  install         Install as a system daemon (macOS)
  uninstall       Remove the system daemon
  status          Check daemon status
  get <project>   Get a port for a project
  release <id>    Release a port by project name or port number
  list            List all active port assignments
  system          Show system ports in use

Examples:
  port-daddy start                    # Start server in foreground
  port-daddy install                  # Install as daemon
  port-daddy get my-app               # Get port for my-app
  port-daddy get my-app 3456          # Request specific port
  port-daddy release my-app           # Release by project
  port-daddy release 3456             # Release by port number

For more info: https://github.com/erichowens/port-daddy
`);
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const serverPath = join(__dirname, '..', 'server.js');
  const daemonPath = join(__dirname, '..', 'install-daemon.js');

  switch (command) {
    case 'start':
      spawn('node', [serverPath], { stdio: 'inherit' });
      break;

    case 'install':
      spawn('node', [daemonPath, 'install'], { stdio: 'inherit' });
      break;

    case 'uninstall':
      spawn('node', [daemonPath, 'uninstall'], { stdio: 'inherit' });
      break;

    case 'status':
      spawn('node', [daemonPath, 'status'], { stdio: 'inherit' });
      break;

    case 'get': {
      const getPath = join(__dirname, 'get-port.js');
      spawn('node', [getPath, ...args.slice(1)], { stdio: 'inherit' });
      break;
    }

    case 'release': {
      const releasePath = join(__dirname, 'release-port.js');
      spawn('node', [releasePath, ...args.slice(1)], { stdio: 'inherit' });
      break;
    }

    case 'list': {
      const listPath = join(__dirname, 'list-ports.js');
      spawn('node', [listPath], { stdio: 'inherit' });
      break;
    }

    case 'system': {
      const systemPath = join(__dirname, 'system-ports.js');
      spawn('node', [systemPath, ...args.slice(1)], { stdio: 'inherit' });
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "port-daddy help" for usage information');
      process.exit(1);
  }
}

main();
