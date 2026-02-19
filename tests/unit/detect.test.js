/**
 * Unit Tests for Stack Detection Module (detect.js)
 *
 * Tests framework detection from file patterns and package.json dependencies.
 * Covers detection of Next.js, Express, React, Vue, Angular, Python frameworks, etc.
 * Tests edge cases: missing package.json, empty directories, malformed files.
 *
 * All filesystem operations are mocked - no real file I/O.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Create mock functions at module level
let mockReadFileSync = () => { throw new Error('Not mocked'); };
let mockExistsSync = () => { throw new Error('Not mocked'); };

// Mock fs module BEFORE importing detect.js
jest.unstable_mockModule('fs', () => ({
  readFileSync: (...args) => mockReadFileSync(...args),
  existsSync: (...args) => mockExistsSync(...args),
  default: {
    readFileSync: (...args) => mockReadFileSync(...args),
    existsSync: (...args) => mockExistsSync(...args)
  }
}));

// Dynamic import after mocking
const {
  detectStack,
  getDevCommand,
  getPortRange,
  detectServices,
  suggestIdentity
} = await import('../../lib/detect.js');

describe('Stack Detection Module', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockReadFileSync = () => { throw new Error('Not mocked'); };
    mockExistsSync = () => { throw new Error('Not mocked'); };
  });

  describe('detectStack() - Next.js Detection (6 tests)', () => {
    it('should detect Next.js by next.config.js file', () => {
      mockExistsSync = (path) => path.endsWith('next.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Next.js');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(3000);
      expect(stack.devCmd).toBe('next dev');
    });

    it('should detect Next.js by next.config.mjs file', () => {
      mockExistsSync = (path) => path.endsWith('next.config.mjs');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Next.js');
      expect(stack.detected).toBe('file');
    });

    it('should detect Next.js by next.config.ts file', () => {
      mockExistsSync = (path) => path.endsWith('next.config.ts');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Next.js');
    });

    it('should detect Next.js by next dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { next: '^14.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Next.js');
      expect(stack.detected).toBe('dependency');
    });

    it('should detect Next.js in devDependencies', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        devDependencies: { next: '^14.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Next.js');
      expect(stack.detected).toBe('dependency');
    });

    it('should return healthPath for Next.js', () => {
      mockExistsSync = (path) => path.endsWith('next.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.healthPath).toBe('/');
      expect(stack.portFlag).toBe('--port');
    });
  });

  describe('detectStack() - Express Detection (5 tests)', () => {
    it('should detect Express by dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.18.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Express');
      expect(stack.detected).toBe('dependency');
      expect(stack.defaultPort).toBe(3000);
      expect(stack.healthPath).toBe('/health');
    });

    it('should detect Express in devDependencies', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        devDependencies: { express: '^4.18.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Express');
    });

    it('should have PORT environment variable for Express', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.portEnv).toBe('PORT');
    });

    it('should have node server.js as dev command', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.devCmd).toBe('node server.js');
      expect(stack.startCmd).toBe('node server.js');
    });

    it('should not require files for Express detection', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.files).toEqual([]);
    });
  });

  describe('detectStack() - React/Vue/Angular Detection (8 tests)', () => {
    it('should detect Create React App by react-scripts dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { 'react-scripts': '^5.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Create React App');
      expect(stack.portEnv).toBe('PORT');
    });

    it('should detect Angular by angular.json and @angular/core', () => {
      mockExistsSync = (path) => path.endsWith('angular.json');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Angular');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(4200);
    });

    it('should detect Angular by @angular/core dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { '@angular/core': '^15.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Angular');
    });

    it('should detect Vue CLI by vue.config.js', () => {
      mockExistsSync = (path) => path.endsWith('vue.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Vue CLI');
      expect(stack.defaultPort).toBe(8080);
    });

    it('should detect Vue CLI by @vue/cli-service', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { '@vue/cli-service': '^5.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Vue CLI');
    });

    it('should detect Vite by vite.config.js', () => {
      mockExistsSync = (path) => path.endsWith('vite.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Vite');
      expect(stack.defaultPort).toBe(5173);
    });

    it('should detect Vite by vite dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { vite: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Vite');
    });

    it('should prioritize file signatures over dependencies', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('next.config.js')) return true;
        if (path.endsWith('package.json')) return true;
        return false;
      };
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Next.js');
      expect(stack.detected).toBe('file');
    });
  });

  describe('detectStack() - Meta-Framework Detection (6 tests)', () => {
    it('should detect Nuxt by nuxt.config.js', () => {
      mockExistsSync = (path) => path.endsWith('nuxt.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Nuxt');
      expect(stack.devCmd).toBe('nuxt dev');
    });

    it('should detect SvelteKit by svelte.config.js', () => {
      mockExistsSync = (path) => path.endsWith('svelte.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('SvelteKit');
      expect(stack.defaultPort).toBe(5173);
    });

    it('should detect Remix by remix.config.js', () => {
      mockExistsSync = (path) => path.endsWith('remix.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Remix');
    });

    it('should detect Astro by astro.config.mjs', () => {
      mockExistsSync = (path) => path.endsWith('astro.config.mjs');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Astro');
      expect(stack.defaultPort).toBe(4321);
    });

    it('should detect NestJS by nest-cli.json', () => {
      mockExistsSync = (path) => path.endsWith('nest-cli.json');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('NestJS');
    });

    it('should detect NestJS by @nestjs/core dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { '@nestjs/core': '^9.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('NestJS');
    });
  });

  describe('detectStack() - Backend Framework Detection (5 tests)', () => {
    it('should detect Fastify by dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { fastify: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Fastify');
      expect(stack.healthPath).toBe('/health');
    });

    it('should detect Hono by dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { hono: '^3.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Hono');
    });

    it('should detect http-server by dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { 'http-server': '^14.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('http-server');
      expect(stack.portFlag).toBe('-p');
    });

    it('should detect serve by dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { serve: '^14.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('serve');
      expect(stack.portFlag).toBe('-l');
    });

    it('should have correct port configuration for each backend', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.defaultPort).toBe(3000);
      expect(stack.healthPath).toBe('/health');
      expect(stack.devCmd).toBe('node server.js');
    });
  });

  describe('detectStack() - Python Framework Detection (5 tests)', () => {
    it('should detect FastAPI by main.py file', () => {
      mockExistsSync = (path) => path.endsWith('main.py');
      mockReadFileSync = () => '';

      const stack = detectStack('/myapp');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('FastAPI');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(8000);
      expect(stack.pythonDeps).toContain('fastapi');
    });

    it('should detect Flask by app.py file', () => {
      mockExistsSync = (path) => path.endsWith('app.py');
      mockReadFileSync = () => '';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Flask');
      expect(stack.defaultPort).toBe(5000);
    });

    it('should detect Django by manage.py file', () => {
      mockExistsSync = (path) => path.endsWith('manage.py');
      mockReadFileSync = () => '';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Django');
      expect(stack.healthPath).toBe('/admin/');
      expect(stack.portArg).toBe(true);
    });

    it('should detect FastAPI by requirements.txt', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => 'fastapi==0.104.1\nuvicorn==0.24.0';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('FastAPI');
      expect(stack.detected).toBe('python');
    });

    it('should handle requirements.txt with comments and versions', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => `
        # Dependencies
        flask>=2.0.0
        # Web framework
        flask-cors==4.0.0
      `;

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Flask');
    });
  });

  describe('detectStack() - Cloudflare Workers (3 tests)', () => {
    it('should detect Cloudflare Workers by wrangler.toml', () => {
      mockExistsSync = (path) => path.endsWith('wrangler.toml');
      mockReadFileSync = () => '';

      const stack = detectStack('/worker-app');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Cloudflare Workers');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(8787);
      expect(stack.devCmd).toBe('wrangler dev');
      expect(stack.portFlag).toBe('--port');
    });

    it('should detect Cloudflare Workers by wrangler.json', () => {
      mockExistsSync = (path) => path.endsWith('wrangler.json');
      mockReadFileSync = () => '';

      const stack = detectStack('/worker-app');

      expect(stack.name).toBe('Cloudflare Workers');
    });

    it('should detect Cloudflare Workers by wrangler dependency', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        devDependencies: { wrangler: '^3.0.0' }
      });

      const stack = detectStack('/worker-app');

      expect(stack.name).toBe('Cloudflare Workers');
      expect(stack.detected).toBe('dependency');
    });
  });

  describe('detectStack() - Docker (2 tests)', () => {
    it('should detect Docker by Dockerfile', () => {
      mockExistsSync = (path) => path.endsWith('Dockerfile');
      mockReadFileSync = () => '';

      const stack = detectStack('/docker-app');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Docker');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(3000);
      expect(stack.devCmd).toBe('docker compose up');
    });

    it('should detect Docker by compose.yml', () => {
      mockExistsSync = (path) => path.endsWith('compose.yml');
      mockReadFileSync = () => '';

      const stack = detectStack('/docker-app');

      expect(stack.name).toBe('Docker');
    });
  });

  describe('detectStack() - Go (2 tests)', () => {
    it('should detect Go by go.mod', () => {
      mockExistsSync = (path) => path.endsWith('go.mod');
      mockReadFileSync = () => '';

      const stack = detectStack('/go-app');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Go');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(8080);
      expect(stack.devCmd).toBe('go run .');
      expect(stack.portEnv).toBe('PORT');
    });

    it('should get correct dev command with port for Go', () => {
      const stack = { devCmd: 'go run .', portEnv: 'PORT' };

      const cmd = getDevCommand(stack, 8080);

      expect(cmd).toBe('PORT=8080 go run .');
    });
  });

  describe('detectStack() - Rust (2 tests)', () => {
    it('should detect Rust by Cargo.toml', () => {
      mockExistsSync = (path) => path.endsWith('Cargo.toml');
      mockReadFileSync = () => '';

      const stack = detectStack('/rust-app');

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Rust');
      expect(stack.detected).toBe('file');
      expect(stack.defaultPort).toBe(8080);
      expect(stack.devCmd).toBe('cargo run');
      expect(stack.portEnv).toBe('PORT');
    });

    it('should get correct dev command with port for Rust', () => {
      const stack = { devCmd: 'cargo run', portEnv: 'PORT' };

      const cmd = getDevCommand(stack, 8080);

      expect(cmd).toBe('PORT=8080 cargo run');
    });
  });

  describe('detectStack() - Edge Cases (8 tests)', () => {
    it('should return null when no stack detected', () => {
      mockExistsSync = () => false;

      const stack = detectStack('/empty');

      expect(stack).toBeNull();
    });

    it('should handle missing package.json gracefully', () => {
      mockExistsSync = () => false;

      const stack = detectStack('/nopackage');

      expect(stack).toBeNull();
    });

    it('should handle malformed package.json', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => '{ invalid json';

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle package.json without dependencies', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({ name: 'app' });

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle empty dependencies object', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: {},
        devDependencies: {}
      });

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle requirements.txt with only comments', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => '# Just comments\n# No packages';

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle case-insensitive package names in requirements.txt', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => 'FastAPI==0.104.1\nUVicorn';

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('FastAPI');
    });

    it('should use process.cwd() as default directory', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack();

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Express');
    });
  });

  describe('getDevCommand() - Command Construction (8 tests)', () => {
    it('should inject port with --port flag', () => {
      const stack = {
        devCmd: 'next dev',
        portFlag: '--port'
      };

      const cmd = getDevCommand(stack, 3000);

      expect(cmd).toBe('next dev --port 3000');
    });

    it('should inject port with PORT environment variable', () => {
      const stack = {
        devCmd: 'node server.js',
        portEnv: 'PORT'
      };

      const cmd = getDevCommand(stack, 3000);

      expect(cmd).toBe('PORT=3000 node server.js');
    });

    it('should inject port as positional argument', () => {
      const stack = {
        devCmd: 'python manage.py runserver',
        portArg: true
      };

      const cmd = getDevCommand(stack, 8000);

      expect(cmd).toBe('python manage.py runserver 8000');
    });

    it('should return base command when no port injection configured', () => {
      const stack = {
        devCmd: 'npm start'
      };

      const cmd = getDevCommand(stack, 3000);

      expect(cmd).toBe('npm start');
    });

    it('should handle different port flags', () => {
      const httpStack = { devCmd: 'http-server', portFlag: '-p' };
      const serveStack = { devCmd: 'serve', portFlag: '-l' };

      expect(getDevCommand(httpStack, 8080)).toBe('http-server -p 8080');
      expect(getDevCommand(serveStack, 3000)).toBe('serve -l 3000');
    });

    it('should return null for null stack', () => {
      const cmd = getDevCommand(null, 3000);

      expect(cmd).toBeNull();
    });

    it('should handle high port numbers', () => {
      const stack = { devCmd: 'npm dev', portFlag: '--port' };

      const cmd = getDevCommand(stack, 9999);

      expect(cmd).toBe('npm dev --port 9999');
    });

    it('should preserve original command format', () => {
      const stack = { devCmd: 'vite dev --host', portFlag: '--port' };

      const cmd = getDevCommand(stack, 5173);

      expect(cmd).toBe('vite dev --host --port 5173');
    });
  });

  describe('getPortRange() - Port Range Calculation (6 tests)', () => {
    it('should return default range when stack is null', () => {
      const range = getPortRange(null);

      expect(range).toEqual([3100, 3199]);
    });

    it('should calculate range around Next.js default port', () => {
      const stack = { name: 'Next.js', defaultPort: 3000 };

      const range = getPortRange(stack);

      expect(range).toEqual([3000, 3049]);
    });

    it('should calculate range around Vite default port', () => {
      const stack = { name: 'Vite', defaultPort: 5173 };

      const range = getPortRange(stack);

      expect(range).toEqual([5173, 5222]);
    });

    it('should calculate range around Angular default port', () => {
      const stack = { name: 'Angular', defaultPort: 4200 };

      const range = getPortRange(stack);

      expect(range).toEqual([4200, 4249]);
    });

    it('should calculate range for Vue CLI', () => {
      const stack = { name: 'Vue CLI', defaultPort: 8080 };

      const range = getPortRange(stack);

      expect(range).toEqual([8080, 8129]);
    });

    it('should have consistent 50-port range', () => {
      const stacks = [
        { defaultPort: 3000 },
        { defaultPort: 5173 },
        { defaultPort: 8000 }
      ];

      for (const stack of stacks) {
        const [start, end] = getPortRange(stack);
        expect(end - start).toBe(49);
        expect(start).toBe(stack.defaultPort);
      }
    });
  });

  describe('detectServices() - Monorepo Detection (6 tests)', () => {
    it('should detect single service project', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'myapp',
        dependencies: { express: '^4.0.0' }
      });

      const result = detectServices('/myapp');

      expect(result.type).toBe('single');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].name).toBe('myapp');
      expect(result.services[0].stack.name).toBe('Express');
    });

    it('should detect monorepo with workspaces array', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/api', 'packages/web']
      });

      const result = detectServices('/monorepo');

      expect(result.type).toBe('monorepo');
      expect(result.workspaces).toContain('packages/api');
      expect(result.workspaces).toContain('packages/web');
    });

    it('should detect monorepo with workspaces.packages', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'monorepo',
        workspaces: {
          packages: ['packages/api', 'packages/web', 'packages/shared']
        }
      });

      const result = detectServices('/monorepo');

      expect(result.type).toBe('monorepo');
      expect(result.workspaces).toHaveLength(3);
    });

    it('should use package name for single service', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'custom-app-name',
        dependencies: { express: '^4.0.0' }
      });

      const result = detectServices('/myapp');

      expect(result.services[0].name).toBe('custom-app-name');
    });

    it('should fallback to "app" when no package name', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const result = detectServices('/myapp');

      expect(result.services[0].name).toBe('app');
    });

    it('should include directory in service result', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'myapp',
        dependencies: { express: '^4.0.0' }
      });

      const result = detectServices('/myapp');

      expect(result.services[0].dir).toBe('/myapp');
    });
  });

  describe('suggestIdentity() - Identity Suggestion (10 tests)', () => {
    it('should suggest frontend for Next.js', () => {
      mockExistsSync = (path) => path.endsWith('next.config.js');
      mockReadFileSync = () => '{}';

      const identity = suggestIdentity('/myapp');

      expect(identity.project).toBe('myapp');
      expect(identity.stack).toBe('frontend');
      expect(identity.context).toBe('main');
      expect(identity.full).toBe('myapp:frontend:main');
    });

    it('should suggest api for Express', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/myapp');

      expect(identity.stack).toBe('api');
    });

    it('should suggest static for http-server', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { 'http-server': '^14.0.0' }
      });

      const identity = suggestIdentity('/myapp');

      expect(identity.stack).toBe('static');
    });

    it('should use package name as project', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: '@myorg/myapp',
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/myapp');

      expect(identity.project).toContain('myorg');
      expect(identity.project).toContain('myapp');
    });

    it('should sanitize project name', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'My@App#2024',
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/myapp');

      expect(identity.project).toMatch(/^[a-z0-9-]+$/);
    });

    it('should use directory name fallback', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/path/to/myservice');

      expect(identity.project).toBe('myservice');
    });

    it('should suggest app for unknown stack', () => {
      mockExistsSync = () => false;

      const identity = suggestIdentity('/myapp');

      expect(identity.stack).toBe('app');
    });

    it('should lowercase full identity', () => {
      mockExistsSync = (path) => path.endsWith('next.config.js');
      mockReadFileSync = () => '{}';

      const identity = suggestIdentity('/MyApp');

      expect(identity.full).toBe(identity.full.toLowerCase());
    });

    it('should handle directory with uppercase in path', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/MyProject/MyService');

      expect(identity.project).toBe('myservice');
    });

    it('should include all three segments in full identity', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'my-app',
        dependencies: { express: '^4.0.0' }
      });

      const identity = suggestIdentity('/myapp');

      expect(identity.full).toMatch(/^[^:]+:[^:]+:[^:]+$/);
      expect(identity.full).toBe(`${identity.project}:${identity.stack}:${identity.context}`);
    });
  });

  describe('suggestIdentity() - Framework Type Mapping (7 tests)', () => {
    it('should map all frontend frameworks to frontend', () => {
      const frameworks = ['Next.js', 'Nuxt', 'SvelteKit', 'Remix', 'Astro', 'Vite', 'Create React App', 'Angular', 'Vue CLI'];

      for (const framework of frameworks) {
        if (framework === 'Next.js') {
          mockExistsSync = (p) => p.endsWith('next.config.js');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Nuxt') {
          mockExistsSync = (p) => p.endsWith('nuxt.config.js');
          mockReadFileSync = () => '{}';
        } else if (framework === 'SvelteKit') {
          mockExistsSync = (p) => p.endsWith('svelte.config.js');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Remix') {
          mockExistsSync = (p) => p.endsWith('remix.config.js');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Astro') {
          mockExistsSync = (p) => p.endsWith('astro.config.mjs');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Vite') {
          mockExistsSync = (p) => p.endsWith('vite.config.js');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Angular') {
          mockExistsSync = (p) => p.endsWith('angular.json');
          mockReadFileSync = () => '{}';
        } else if (framework === 'Vue CLI') {
          mockExistsSync = (p) => p.endsWith('vue.config.js');
          mockReadFileSync = () => '{}';
        } else {
          mockExistsSync = (p) => p.endsWith('package.json');
          mockReadFileSync = () => JSON.stringify({
            dependencies: { 'react-scripts': '^5.0.0' }
          });
        }

        const identity = suggestIdentity('/myapp');

        expect(identity.stack).toBe('frontend');
      }
    });

    it('should map all backend frameworks to api', () => {
      const frameworks = ['Express', 'Fastify', 'Hono', 'NestJS', 'FastAPI', 'Flask', 'Django', 'Go', 'Rust'];

      for (const framework of frameworks) {
        if (framework === 'NestJS') {
          mockExistsSync = (p) => p.endsWith('nest-cli.json');
          mockReadFileSync = () => '{}';
        } else if (framework === 'FastAPI') {
          mockExistsSync = (p) => p.endsWith('main.py');
          mockReadFileSync = () => '';
        } else if (framework === 'Flask') {
          mockExistsSync = (p) => p.endsWith('app.py');
          mockReadFileSync = () => '';
        } else if (framework === 'Django') {
          mockExistsSync = (p) => p.endsWith('manage.py');
          mockReadFileSync = () => '';
        } else if (framework === 'Go') {
          mockExistsSync = (p) => p.endsWith('go.mod');
          mockReadFileSync = () => '';
        } else if (framework === 'Rust') {
          mockExistsSync = (p) => p.endsWith('Cargo.toml');
          mockReadFileSync = () => '';
        } else {
          mockExistsSync = (p) => p.endsWith('package.json');
          const deps = {};
          deps[framework.toLowerCase()] = '^1.0.0';
          mockReadFileSync = () => JSON.stringify({ dependencies: deps });
        }

        const identity = suggestIdentity('/myapp');

        expect(identity.stack).toBe('api');
      }
    });

    it('should map static servers to static', () => {
      const frameworks = ['http-server', 'serve'];

      for (const framework of frameworks) {
        mockExistsSync = (p) => p.endsWith('package.json');
        mockReadFileSync = () => JSON.stringify({
          dependencies: { [framework]: '^1.0.0' }
        });

        const identity = suggestIdentity('/myapp');

        expect(identity.stack).toBe('static');
      }
    });

    it('should map Cloudflare Workers to worker', () => {
      mockExistsSync = (p) => p.endsWith('wrangler.toml');
      mockReadFileSync = () => '';

      const identity = suggestIdentity('/worker-app');

      expect(identity.stack).toBe('worker');
    });

    it('should map Docker to container', () => {
      mockExistsSync = (p) => p.endsWith('Dockerfile');
      mockReadFileSync = () => '';

      const identity = suggestIdentity('/docker-app');

      expect(identity.stack).toBe('container');
    });

    it('should handle Python frameworks as api type', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('main.py')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => '';

      const identity = suggestIdentity('/myapp');

      expect(identity.stack).toBe('api');
    });
  });

  describe('Integration Tests - Full Detection Workflows (5 tests)', () => {
    it('should detect Next.js project and suggest complete identity', () => {
      mockExistsSync = (path) => path.endsWith('next.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/myapp');
      const identity = suggestIdentity('/myapp');
      const cmd = getDevCommand(stack, 3000);
      const range = getPortRange(stack);

      expect(stack.name).toBe('Next.js');
      expect(identity.stack).toBe('frontend');
      expect(cmd).toBe('next dev --port 3000');
      expect(range).toEqual([3000, 3049]);
    });

    it('should detect Express API and provide dev command', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'my-api',
        dependencies: { express: '^4.18.0' }
      });

      const stack = detectStack('/myapi');
      const identity = suggestIdentity('/myapi');
      const cmd = getDevCommand(stack, 3100);
      const services = detectServices('/myapi');

      expect(stack.name).toBe('Express');
      expect(identity.stack).toBe('api');
      expect(cmd).toBe('PORT=3100 node server.js');
      expect(services.type).toBe('single');
      expect(services.services[0].name).toBe('my-api');
    });

    it('should detect monorepo with multiple services', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/api', 'packages/web']
      });

      const services = detectServices('/monorepo');
      const identity = suggestIdentity('/monorepo');

      expect(services.type).toBe('monorepo');
      expect(services.workspaces).toHaveLength(2);
      expect(identity.project).toBe('monorepo');
    });

    it('should handle Python Django project', () => {
      mockExistsSync = (path) => path.endsWith('manage.py');
      mockReadFileSync = () => '';

      const stack = detectStack('/mydjango');
      const identity = suggestIdentity('/mydjango');
      const cmd = getDevCommand(stack, 8000);

      expect(stack.name).toBe('Django');
      expect(identity.stack).toBe('api');
      expect(cmd).toBe('python manage.py runserver 8000');
    });

    it('should detect Vite + React frontend', () => {
      mockExistsSync = (path) => path.endsWith('vite.config.js');
      mockReadFileSync = () => '{}';

      const stack = detectStack('/vite-app');
      const identity = suggestIdentity('/vite-app');
      const cmd = getDevCommand(stack, 5173);
      const range = getPortRange(stack);

      expect(stack.name).toBe('Vite');
      expect(identity.stack).toBe('frontend');
      expect(cmd).toBe('vite --port 5173');
      expect(range).toEqual([5173, 5222]);
    });
  });

  describe('detectStack() - Package Parsing Edge Cases (5 tests)', () => {
    it('should handle package.json with null dependencies', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'app',
        dependencies: null,
        devDependencies: null
      });

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle package.json with only devDependencies', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        devDependencies: { express: '^4.0.0' }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Express');
    });

    it('should handle version specifiers in package.json', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: {
          'express': '^4.18.2',
          'next': '~14.0.0',
          'react': '>=18.0.0'
        }
      });

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('Next.js');
    });

    it('should handle requirements.txt with version specifiers', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => `
        fastapi==0.104.1
        uvicorn>=0.24.0
        sqlalchemy~=2.0.0
      `;

      const stack = detectStack('/myapp');

      expect(stack.name).toBe('FastAPI');
    });

    it('should prioritize file signatures before version constraints', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('nest-cli.json')) return true;
        if (path.endsWith('package.json')) return true;
        return false;
      };
      mockReadFileSync = () => JSON.stringify({
        // No express - just base package.json
        name: 'myapp'
      });

      const stack = detectStack('/myapp');

      // nest-cli.json file existence should make NestJS match
      expect(stack.name).toBe('NestJS');
      expect(stack.detected).toBe('file');
    });
  });

  describe('detectStack() - Error Handling (1 test)', () => {
    it('should handle readFileSync errors gracefully', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => {
        throw new Error('File read error');
      };

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });
  });

  describe('Boundary Tests - Extreme Cases (4 tests)', () => {
    it('should handle very long file paths', () => {
      const longPath = '/very/' + 'deep/'.repeat(50) + 'app';
      mockExistsSync = (path) => path.includes('package.json');
      mockReadFileSync = () => JSON.stringify({
        dependencies: { express: '^4.0.0' }
      });

      const stack = detectStack(longPath);

      expect(stack).toBeDefined();
      expect(stack.name).toBe('Express');
    });

    it('should handle empty requirements.txt file', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => '';

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle requirements.txt with only whitespace', () => {
      mockExistsSync = (path) => {
        if (path.endsWith('requirements.txt')) return true;
        if (path.endsWith('package.json')) return false;
        return false;
      };
      mockReadFileSync = () => '\n\n   \n\t\n';

      const stack = detectStack('/myapp');

      expect(stack).toBeNull();
    });

    it('should handle monorepo with empty workspaces array', () => {
      mockExistsSync = (path) => path.endsWith('package.json');
      mockReadFileSync = () => JSON.stringify({
        name: 'monorepo',
        workspaces: []
      });

      const result = detectServices('/monorepo');

      expect(result.type).toBe('monorepo');
      expect(result.workspaces).toEqual([]);
    });
  });
});
