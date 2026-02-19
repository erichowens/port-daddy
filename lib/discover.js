/**
 * Service Discovery Module
 *
 * Auto-discovers services in a project directory using framework detection.
 * Handles single projects and monorepos (npm/yarn/pnpm workspaces, lerna).
 * Generates semantic identity suggestions from directory/package metadata.
 *
 * Discovery fills in gaps; .portdaddyrc always wins.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { detectStack } from './detect.js';

/**
 * Read and parse JSON from a file, returning null on failure.
 */
function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Expand simple globs (e.g. "packages/*") to actual directories.
 * Supports trailing /* only — no ** or complex patterns.
 */
function expandWorkspaceGlobs(rootDir, patterns) {
  const dirs = [];
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/?\*$/, '');
    const base = join(rootDir, clean);
    if (!existsSync(base)) continue;

    try {
      const entries = readdirSync(base);
      for (const entry of entries) {
        const full = join(base, entry);
        try {
          if (statSync(full).isDirectory() && existsSync(join(full, 'package.json'))) {
            dirs.push(full);
          }
        } catch { /* skip unreadable entries */ }
      }
    } catch { /* skip unreadable dirs */ }
  }
  return dirs;
}

/**
 * Detect workspace roots for a monorepo.
 * Checks npm/yarn workspaces, pnpm-workspace.yaml, and lerna.json.
 *
 * @param {string} dir - Project root directory
 * @returns {{ type: 'workspaces'|'pnpm'|'lerna'|null, patterns: string[] }}
 */
export function detectWorkspaceConfig(dir) {
  // npm/yarn workspaces in package.json
  const pkg = readJson(join(dir, 'package.json'));
  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages || [];
    return { type: 'workspaces', patterns };
  }

  // pnpm-workspace.yaml
  const pnpmPath = join(dir, 'pnpm-workspace.yaml');
  if (existsSync(pnpmPath)) {
    try {
      const content = readFileSync(pnpmPath, 'utf8');
      // Simple YAML parsing for packages list — avoids a yaml dependency
      const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)*)/);
      if (match) {
        const patterns = match[1]
          .split('\n')
          .map(line => line.replace(/^\s*-\s*['"]?/, '').replace(/['"]?\s*$/, ''))
          .filter(Boolean);
        return { type: 'pnpm', patterns };
      }
    } catch { /* fall through */ }
  }

  // lerna.json
  const lernaPath = join(dir, 'lerna.json');
  if (existsSync(lernaPath)) {
    const lerna = readJson(lernaPath);
    if (lerna?.packages) {
      return { type: 'lerna', patterns: lerna.packages };
    }
  }

  return { type: null, patterns: [] };
}

/**
 * Discover all services in a project directory.
 *
 * @param {string} dir - Project root
 * @returns {{ type: 'single'|'monorepo', services: Object.<string, Object> }}
 */
export function discoverServices(dir) {
  const workspaces = detectWorkspaceConfig(dir);

  if (workspaces.type) {
    // Monorepo: scan each workspace package
    const expanded = expandWorkspaceGlobs(dir, workspaces.patterns);
    const services = {};

    for (const wsDir of expanded) {
      const stack = detectStack(wsDir);
      if (!stack) continue;

      const pkg = readJson(join(wsDir, 'package.json'));
      const name = pkg?.name?.replace(/^@[^/]+\//, '') || basename(wsDir);

      services[name] = {
        dir: wsDir,
        stack,
        dev: buildDevCommand(pkg, stack),
        health: stack.healthPath || '/',
        preferredPort: stack.defaultPort
      };
    }

    return { type: 'monorepo', services };
  }

  // Single project
  const stack = detectStack(dir);
  if (!stack) {
    return { type: 'single', services: {} };
  }

  const pkg = readJson(join(dir, 'package.json'));
  const name = pkg?.name || basename(resolve(dir));
  const shortName = name.replace(/^@[^/]+\//, '');

  const services = {
    [shortName]: {
      dir,
      stack,
      dev: buildDevCommand(pkg, stack),
      health: stack.healthPath || '/',
      preferredPort: stack.defaultPort
    }
  };

  return { type: 'single', services };
}

/**
 * Build the dev command from package.json scripts or stack defaults.
 * Prefers npm script "dev" if it exists, otherwise uses stack detection.
 */
function buildDevCommand(pkg, stack) {
  if (pkg?.scripts?.dev) {
    return `npm run dev`;
  }
  return stack.devCmd || null;
}

/**
 * Get the current git branch name safely.
 * Uses execFileSync (not execSync) to avoid shell injection.
 *
 * @param {string} cwd - Directory to run git from
 * @returns {string|null} Branch name, or null on failure
 */
function getGitBranch(cwd) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Suggest semantic identity names for discovered services.
 *
 * @param {Object.<string, Object>} services - Discovered services
 * @param {string} dir - Project root
 * @param {Object} [options]
 * @param {boolean} [options.useBranch=false] - Use git branch as context
 * @returns {Object.<string, { project: string, stack: string, context: string, full: string }>}
 */
export function suggestNames(services, dir, options = {}) {
  const pkg = readJson(join(dir, 'package.json'));
  const project = (pkg?.name || basename(resolve(dir)))
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase();

  let context = 'main';
  if (options.useBranch) {
    const branch = getGitBranch(dir);
    if (branch && branch !== 'main' && branch !== 'master') {
      context = branch.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    }
  }

  const suggestions = {};
  for (const [name, svc] of Object.entries(services)) {
    const stackType = inferStackType(svc.stack);

    suggestions[name] = {
      project,
      stack: stackType,
      context,
      full: `${project}:${stackType}:${context}`
    };
  }

  return suggestions;
}

/**
 * Infer the stack type name (frontend/api/worker/static) from framework detection.
 */
function inferStackType(stack) {
  if (!stack) return 'app';

  const frontendFrameworks = [
    'Next.js', 'Nuxt', 'SvelteKit', 'Remix', 'Astro', 'Vite',
    'Create React App', 'Angular', 'Vue CLI'
  ];
  const backendFrameworks = [
    'Express', 'Fastify', 'Hono', 'NestJS', 'FastAPI', 'Flask', 'Django', 'Go', 'Rust'
  ];
  const workerFrameworks = ['Cloudflare Workers'];
  const containerFrameworks = ['Docker'];
  const staticFrameworks = ['http-server', 'serve'];

  if (frontendFrameworks.includes(stack.name)) return 'frontend';
  if (backendFrameworks.includes(stack.name)) return 'api';
  if (workerFrameworks.includes(stack.name)) return 'worker';
  if (containerFrameworks.includes(stack.name)) return 'container';
  if (staticFrameworks.includes(stack.name)) return 'static';
  return 'app';
}

/**
 * Merge discovered services with .portdaddyrc config.
 * Config always wins — discovery fills in gaps.
 *
 * @param {Object.<string, Object>} discovered - Auto-discovered services
 * @param {Object} config - Parsed .portdaddyrc contents
 * @returns {Object.<string, Object>} - Merged services
 */
export function mergeWithConfig(discovered, config) {
  if (!config || !config.services) {
    return discovered;
  }

  const merged = { ...discovered };

  for (const [name, svcConfig] of Object.entries(config.services)) {
    if (merged[name]) {
      // Config overrides discovery, but discovery fills gaps
      merged[name] = {
        ...merged[name],
        ...svcConfig
      };
    } else {
      // Config defines a service not found by discovery
      merged[name] = svcConfig;
    }
  }

  return merged;
}
