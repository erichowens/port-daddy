#!/usr/bin/env node

/**
 * release-port - Release a port assignment from Port Daddy
 * Usage: release-port <project-name|port-number>
 */

const PROJECT_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';

function validateProjectName(project) {
  if (!project || typeof project !== 'string') {
    return { valid: false, error: 'project name must be a non-empty string' };
  }
  if (project.length > 255) {
    return { valid: false, error: 'project name too long (max 255 characters)' };
  }
  if (!PROJECT_NAME_REGEX.test(project)) {
    return { valid: false, error: 'project name contains invalid characters (use alphanumeric, dash, underscore, dot)' };
  }
  return { valid: true };
}

function validatePort(port) {
  const parsed = parseInt(port, 10);
  if (isNaN(parsed) || parsed < 1024 || parsed > 65535) {
    return { valid: false, error: 'port must be a number between 1024 and 65535' };
  }
  return { valid: true, port: parsed };
}

async function releasePort(target) {
  try {
    // Check health first
    const healthRes = await fetch(`${PORT_DADDY_URL}/health`);
    if (!healthRes.ok) {
      console.error('ERROR: Port Daddy is not running');
      process.exit(1);
    }

    // Determine if target is port number or project name
    const isPort = /^\d+$/.test(target);
    let body;

    if (isPort) {
      const portValidation = validatePort(target);
      if (!portValidation.valid) {
        console.error(`ERROR: ${portValidation.error}`);
        process.exit(1);
      }
      body = { port: portValidation.port };
    } else {
      const projectValidation = validateProjectName(target);
      if (!projectValidation.valid) {
        console.error(`ERROR: ${projectValidation.error}`);
        process.exit(1);
      }
      body = { project: target };
    }

    // Release port
    const res = await fetch(`${PORT_DADDY_URL}/ports/release`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`ERROR: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }

    console.log(data.message || 'Released');

  } catch (err) {
    console.error('ERROR: Failed to connect to Port Daddy');
    console.error(err.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];

  if (!target) {
    console.error('Usage: release-port <project-name|port-number>');
    console.error('');
    console.error('Examples:');
    console.error('  release-port my-app    # Release by project name');
    console.error('  release-port 3456      # Release by port number');
    process.exit(1);
  }

  await releasePort(target);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
