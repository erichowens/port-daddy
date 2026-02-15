/**
 * Stack Detection Module
 *
 * Detects project stack/framework from file patterns and package.json
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Known stack signatures
 * Priority order matters - first match wins
 */
const STACK_SIGNATURES = [
  // Meta-frameworks (check first - they're more specific)
  {
    name: 'Next.js',
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    dependencies: ['next'],
    defaultPort: 3000,
    devCmd: 'next dev',
    startCmd: 'next start',
    healthPath: '/',
    portFlag: '--port'
  },
  {
    name: 'Nuxt',
    files: ['nuxt.config.js', 'nuxt.config.ts'],
    dependencies: ['nuxt'],
    defaultPort: 3000,
    devCmd: 'nuxt dev',
    startCmd: 'nuxt start',
    healthPath: '/',
    portFlag: '--port'
  },
  {
    name: 'SvelteKit',
    files: ['svelte.config.js'],
    dependencies: ['@sveltejs/kit'],
    defaultPort: 5173,
    devCmd: 'vite dev',
    startCmd: 'vite preview',
    healthPath: '/',
    portFlag: '--port'
  },
  {
    name: 'Remix',
    files: ['remix.config.js'],
    dependencies: ['@remix-run/node', '@remix-run/react'],
    defaultPort: 3000,
    devCmd: 'remix dev',
    startCmd: 'remix-serve build',
    healthPath: '/',
    portFlag: '--port'
  },
  {
    name: 'Astro',
    files: ['astro.config.mjs', 'astro.config.js'],
    dependencies: ['astro'],
    defaultPort: 4321,
    devCmd: 'astro dev',
    startCmd: 'astro preview',
    healthPath: '/',
    portFlag: '--port'
  },

  // Build tools / bundlers
  {
    name: 'Vite',
    files: ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'],
    dependencies: ['vite'],
    defaultPort: 5173,
    devCmd: 'vite',
    startCmd: 'vite preview',
    healthPath: '/',
    portFlag: '--port'
  },

  // Frontend frameworks (without meta-framework)
  {
    name: 'Create React App',
    files: [],
    dependencies: ['react-scripts'],
    defaultPort: 3000,
    devCmd: 'react-scripts start',
    startCmd: 'react-scripts start',
    healthPath: '/',
    portEnv: 'PORT'
  },
  {
    name: 'Angular',
    files: ['angular.json'],
    dependencies: ['@angular/core'],
    defaultPort: 4200,
    devCmd: 'ng serve',
    startCmd: 'ng serve',
    healthPath: '/',
    portFlag: '--port'
  },
  {
    name: 'Vue CLI',
    files: ['vue.config.js'],
    dependencies: ['@vue/cli-service'],
    defaultPort: 8080,
    devCmd: 'vue-cli-service serve',
    startCmd: 'vue-cli-service serve',
    healthPath: '/',
    portFlag: '--port'
  },

  // Backend frameworks
  {
    name: 'Express',
    files: [],
    dependencies: ['express'],
    defaultPort: 3000,
    devCmd: 'node server.js',
    startCmd: 'node server.js',
    healthPath: '/health',
    portEnv: 'PORT'
  },
  {
    name: 'Fastify',
    files: [],
    dependencies: ['fastify'],
    defaultPort: 3000,
    devCmd: 'node server.js',
    startCmd: 'node server.js',
    healthPath: '/health',
    portEnv: 'PORT'
  },
  {
    name: 'Hono',
    files: [],
    dependencies: ['hono'],
    defaultPort: 3000,
    devCmd: 'node server.js',
    startCmd: 'node server.js',
    healthPath: '/health',
    portEnv: 'PORT'
  },
  {
    name: 'NestJS',
    files: ['nest-cli.json'],
    dependencies: ['@nestjs/core'],
    defaultPort: 3000,
    devCmd: 'nest start --watch',
    startCmd: 'nest start',
    healthPath: '/health',
    portEnv: 'PORT'
  },

  // Python
  {
    name: 'FastAPI',
    files: ['main.py'],
    dependencies: [], // Check requirements.txt separately
    pythonDeps: ['fastapi', 'uvicorn'],
    defaultPort: 8000,
    devCmd: 'uvicorn main:app --reload',
    startCmd: 'uvicorn main:app',
    healthPath: '/health',
    portFlag: '--port'
  },
  {
    name: 'Flask',
    files: ['app.py'],
    dependencies: [],
    pythonDeps: ['flask'],
    defaultPort: 5000,
    devCmd: 'flask run',
    startCmd: 'flask run',
    healthPath: '/health',
    portFlag: '--port'
  },
  {
    name: 'Django',
    files: ['manage.py'],
    dependencies: [],
    pythonDeps: ['django'],
    defaultPort: 8000,
    devCmd: 'python manage.py runserver',
    startCmd: 'python manage.py runserver',
    healthPath: '/admin/',
    portArg: true // port is positional: runserver 8000
  },

  // Static / simple
  {
    name: 'http-server',
    files: [],
    dependencies: ['http-server'],
    defaultPort: 8080,
    devCmd: 'http-server',
    startCmd: 'http-server',
    healthPath: '/',
    portFlag: '-p'
  },
  {
    name: 'serve',
    files: [],
    dependencies: ['serve'],
    defaultPort: 3000,
    devCmd: 'serve',
    startCmd: 'serve',
    healthPath: '/',
    portFlag: '-l'
  }
];

/**
 * Read and parse package.json from a directory
 */
function readPackageJson(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Read Python requirements
 */
function readPythonRequirements(dir) {
  const reqPath = join(dir, 'requirements.txt');
  if (!existsSync(reqPath)) return [];

  try {
    const content = readFileSync(reqPath, 'utf-8');
    return content.split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split(/[=<>]/)[0].trim());
  } catch {
    return [];
  }
}

/**
 * Check if any of the signature files exist
 */
function hasFiles(dir, files) {
  return files.some(f => existsSync(join(dir, f)));
}

/**
 * Check if package.json has any of the dependencies
 */
function hasDependencies(pkg, deps) {
  if (!pkg || !deps.length) return false;

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  return deps.some(d => d in allDeps);
}

/**
 * Detect the stack for a directory
 */
export function detectStack(dir = process.cwd()) {
  const pkg = readPackageJson(dir);
  const pythonDeps = readPythonRequirements(dir);

  for (const sig of STACK_SIGNATURES) {
    // Check file signatures
    if (sig.files.length && hasFiles(dir, sig.files)) {
      return { ...sig, detected: 'file' };
    }

    // Check npm dependencies
    if (sig.dependencies.length && hasDependencies(pkg, sig.dependencies)) {
      return { ...sig, detected: 'dependency' };
    }

    // Check Python dependencies
    if (sig.pythonDeps && sig.pythonDeps.some(d => pythonDeps.includes(d))) {
      return { ...sig, detected: 'python' };
    }
  }

  return null;
}

/**
 * Get the dev command for a stack, with port injection
 */
export function getDevCommand(stack, port) {
  if (!stack) return null;

  let cmd = stack.devCmd;

  if (stack.portFlag) {
    cmd = `${cmd} ${stack.portFlag} ${port}`;
  } else if (stack.portEnv) {
    cmd = `${stack.portEnv}=${port} ${cmd}`;
  } else if (stack.portArg) {
    cmd = `${cmd} ${port}`;
  }

  return cmd;
}

/**
 * Get recommended port range for a stack
 */
export function getPortRange(stack) {
  if (!stack) return [3100, 3199];

  const base = stack.defaultPort;
  // Reserve a range around the default port
  return [base, base + 49];
}

/**
 * Detect multiple services in a monorepo
 */
export function detectServices(dir = process.cwd()) {
  const services = [];
  const pkg = readPackageJson(dir);

  // Check for workspaces (npm/yarn/pnpm)
  if (pkg?.workspaces) {
    const workspaces = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages || [];

    // TODO: Expand globs and detect each workspace
    // For now, just note that it's a monorepo
    return { type: 'monorepo', workspaces };
  }

  // Single project
  const stack = detectStack(dir);
  if (stack) {
    services.push({
      name: pkg?.name || 'app',
      stack,
      dir
    });
  }

  return { type: 'single', services };
}

/**
 * Suggest a service identity based on detection
 */
export function suggestIdentity(dir = process.cwd()) {
  const pkg = readPackageJson(dir);
  const stack = detectStack(dir);

  const project = pkg?.name || dir.split('/').pop() || 'app';

  let stackName = 'app';
  if (stack) {
    // Infer stack type from framework
    if (['Next.js', 'Nuxt', 'SvelteKit', 'Remix', 'Astro', 'Vite', 'Create React App', 'Angular', 'Vue CLI'].includes(stack.name)) {
      stackName = 'frontend';
    } else if (['Express', 'Fastify', 'Hono', 'NestJS', 'FastAPI', 'Flask', 'Django'].includes(stack.name)) {
      stackName = 'api';
    } else if (['http-server', 'serve'].includes(stack.name)) {
      stackName = 'static';
    }
  }

  return {
    project: project.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
    stack: stackName,
    context: 'main',
    full: `${project}:${stackName}:main`.replace(/[^a-z0-9:-]/gi, '-').toLowerCase()
  };
}
