#!/usr/bin/env node

/**
 * get-port - Get a port assignment from Port Daddy
 * Usage: get-port <project-name> [preferred-port]
 */

const PROJECT_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
const PORT_DADDY_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

async function requestPort(project, preferred) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Check health first
      const healthRes = await fetch(`${PORT_DADDY_URL}/health`);
      if (!healthRes.ok) {
        throw new Error('Health check failed');
      }

      // Build request body
      const body = { project };
      if (preferred !== undefined) {
        body.preferred = preferred;
      }

      // Request port
      const res = await fetch(`${PORT_DADDY_URL}/ports/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PID': String(process.pid)
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(`ERROR: ${data.error || 'Unknown error'}`);
        process.exit(1);
      }

      // Output just the port number (for shell capture)
      console.log(data.port);
      return;

    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('WARNING: Port Daddy not responding after', MAX_RETRIES, 'attempts');
        console.error('Falling back to random port assignment');
        // Fallback: random port in range
        const randomPort = 3100 + Math.floor(Math.random() * 6900);
        console.log(randomPort);
        return;
      }
      console.error(`Port Daddy not responding (attempt ${attempt}/${MAX_RETRIES}), retrying...`);
      await sleep(RETRY_DELAY);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const project = args[0];
  const preferredArg = args[1];

  if (!project) {
    console.error('Usage: get-port <project-name> [preferred-port]');
    console.error('');
    console.error('Examples:');
    console.error('  get-port my-app');
    console.error('  get-port my-app 3456');
    console.error('  PORT=$(get-port my-app)');
    process.exit(1);
  }

  // Validate project name
  const projectValidation = validateProjectName(project);
  if (!projectValidation.valid) {
    console.error(`ERROR: ${projectValidation.error}`);
    process.exit(1);
  }

  // Validate preferred port if provided
  let preferred;
  if (preferredArg !== undefined) {
    const portValidation = validatePort(preferredArg);
    if (!portValidation.valid) {
      console.error(`ERROR: ${portValidation.error}`);
      process.exit(1);
    }
    preferred = portValidation.port;
  }

  await requestPort(project, preferred);
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
