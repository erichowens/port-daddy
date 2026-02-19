/**
 * Unit Tests for Orchestrator Module (orchestrator.js)
 *
 * Tests topological sort, dependency resolution, config normalization,
 * and environment map building. These are all pure functions — no I/O.
 */

import { describe, it, expect } from '@jest/globals';
import {
  topologicalSort,
  resolveDependencies,
  normalizeServiceConfig,
  buildEnvMap
} from '../../lib/orchestrator.js';

describe('Orchestrator Module', () => {
  // ===========================================================================
  // topologicalSort()
  // ===========================================================================
  describe('topologicalSort()', () => {
    it('should handle empty services', () => {
      const result = topologicalSort({});
      expect(result.order).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle a single service with no deps', () => {
      const result = topologicalSort({
        api: {}
      });
      expect(result.order).toEqual(['api']);
    });

    it('should order a simple chain: db → api → frontend', () => {
      const result = topologicalSort({
        frontend: { needs: ['api'] },
        api: { needs: ['db'] },
        db: {}
      });

      expect(result.error).toBeUndefined();
      expect(result.order).toEqual(['db', 'api', 'frontend']);
    });

    it('should handle a diamond dependency graph', () => {
      //       app
      //      /   \
      //    api   worker
      //      \   /
      //       db
      const result = topologicalSort({
        app: { needs: ['api', 'worker'] },
        api: { needs: ['db'] },
        worker: { needs: ['db'] },
        db: {}
      });

      expect(result.error).toBeUndefined();
      // db must come before api and worker; both must come before app
      const dbIdx = result.order.indexOf('db');
      const apiIdx = result.order.indexOf('api');
      const workerIdx = result.order.indexOf('worker');
      const appIdx = result.order.indexOf('app');

      expect(dbIdx).toBeLessThan(apiIdx);
      expect(dbIdx).toBeLessThan(workerIdx);
      expect(apiIdx).toBeLessThan(appIdx);
      expect(workerIdx).toBeLessThan(appIdx);
    });

    it('should handle multiple independent services', () => {
      const result = topologicalSort({
        serviceA: {},
        serviceB: {},
        serviceC: {}
      });

      expect(result.error).toBeUndefined();
      expect(result.order).toHaveLength(3);
      expect(new Set(result.order)).toEqual(new Set(['serviceA', 'serviceB', 'serviceC']));
    });

    it('should detect a simple cycle: a → b → a', () => {
      const result = topologicalSort({
        a: { needs: ['b'] },
        b: { needs: ['a'] }
      });

      expect(result.order).toEqual([]);
      expect(result.error).toContain('Circular dependency');
      expect(result.error).toMatch(/a.*→.*b|b.*→.*a/);
    });

    it('should detect a three-node cycle: a → b → c → a', () => {
      const result = topologicalSort({
        a: { needs: ['b'] },
        b: { needs: ['c'] },
        c: { needs: ['a'] }
      });

      expect(result.order).toEqual([]);
      expect(result.error).toContain('Circular dependency');
    });

    it('should error on unknown dependency', () => {
      const result = topologicalSort({
        api: { needs: ['missing-db'] }
      });

      expect(result.order).toEqual([]);
      expect(result.error).toContain('Unknown dependency');
      expect(result.error).toContain('missing-db');
    });

    it('should handle services with needs: [] explicitly', () => {
      const result = topologicalSort({
        api: { needs: [] },
        frontend: { needs: ['api'] }
      });

      expect(result.error).toBeUndefined();
      expect(result.order).toEqual(['api', 'frontend']);
    });

    it('should handle services with no needs property', () => {
      const result = topologicalSort({
        api: {},
        frontend: { needs: ['api'] }
      });

      expect(result.error).toBeUndefined();
      expect(result.order).toEqual(['api', 'frontend']);
    });
  });

  // ===========================================================================
  // resolveDependencies()
  // ===========================================================================
  describe('resolveDependencies()', () => {
    it('should resolve a service with no dependencies', () => {
      const { deps } = resolveDependencies('api', {
        api: {}
      });

      expect(deps).toEqual(new Set(['api']));
    });

    it('should resolve direct dependencies', () => {
      const { deps } = resolveDependencies('frontend', {
        frontend: { needs: ['api'] },
        api: {}
      });

      expect(deps).toEqual(new Set(['frontend', 'api']));
    });

    it('should resolve transitive dependencies', () => {
      const { deps } = resolveDependencies('frontend', {
        frontend: { needs: ['api'] },
        api: { needs: ['db'] },
        db: {}
      });

      expect(deps).toEqual(new Set(['frontend', 'api', 'db']));
    });

    it('should handle diamond dependencies without duplicates', () => {
      const { deps } = resolveDependencies('app', {
        app: { needs: ['api', 'worker'] },
        api: { needs: ['db'] },
        worker: { needs: ['db'] },
        db: {}
      });

      expect(deps).toEqual(new Set(['app', 'api', 'worker', 'db']));
    });

    it('should error for missing target service', () => {
      const { deps, error } = resolveDependencies('ghost', { api: {} });

      expect(error).toContain('not found');
      expect(deps.size).toBe(0);
    });

    it('should error for missing dependency', () => {
      const { error } = resolveDependencies('api', {
        api: { needs: ['missing'] }
      });

      expect(error).toContain('not defined');
      expect(error).toContain('missing');
    });

    it('should not include unrelated services', () => {
      const { deps } = resolveDependencies('frontend', {
        frontend: { needs: ['api'] },
        api: {},
        worker: {},   // not needed by frontend
        scheduler: {} // not needed by frontend
      });

      expect(deps.has('worker')).toBe(false);
      expect(deps.has('scheduler')).toBe(false);
    });
  });

  // ===========================================================================
  // normalizeServiceConfig()
  // ===========================================================================
  describe('normalizeServiceConfig()', () => {
    it('should normalize new-style config', () => {
      const result = normalizeServiceConfig('api', {
        cmd: 'node server.js',
        port: 3001,
        healthPath: '/health'
      });

      expect(result.name).toBe('api');
      expect(result.cmd).toBe('node server.js');
      expect(result.port).toBe(3001);
      expect(result.healthPath).toBe('/health');
    });

    it('should normalize old-style config', () => {
      const result = normalizeServiceConfig('api', {
        dev: 'node server.js',
        preferredPort: 3001,
        health: '/health'
      });

      expect(result.cmd).toBe('node server.js');
      expect(result.port).toBe(3001);
      expect(result.healthPath).toBe('/health');
    });

    it('should prefer new-style fields over old-style', () => {
      const result = normalizeServiceConfig('api', {
        cmd: 'node new.js',
        dev: 'node old.js',
        port: 4000,
        preferredPort: 3000,
        healthPath: '/new-health',
        health: '/old-health'
      });

      expect(result.cmd).toBe('node new.js');
      expect(result.port).toBe(4000);
      expect(result.healthPath).toBe('/new-health');
    });

    it('should set defaults for missing fields', () => {
      const result = normalizeServiceConfig('worker', {});

      expect(result.cmd).toBeNull();
      expect(result.port).toBeNull();
      expect(result.healthPath).toBe('/');
      expect(result.needs).toEqual([]);
      expect(result.noPort).toBe(false);
      expect(result.remote).toBeNull();
      expect(result.dir).toBeNull();
      expect(result.env).toEqual({});
    });

    it('should preserve needs array', () => {
      const result = normalizeServiceConfig('frontend', {
        cmd: 'next dev',
        needs: ['api', 'db']
      });

      expect(result.needs).toEqual(['api', 'db']);
    });

    it('should preserve remote URL', () => {
      const result = normalizeServiceConfig('api', {
        remote: 'https://api.staging.example.com'
      });

      expect(result.remote).toBe('https://api.staging.example.com');
      expect(result.cmd).toBeNull();
    });

    it('should preserve noPort flag', () => {
      const result = normalizeServiceConfig('worker', {
        cmd: 'node worker.js',
        noPort: true
      });

      expect(result.noPort).toBe(true);
    });

    it('should handle port value of 0', () => {
      // port: 0 is falsy but should still be preserved
      const result = normalizeServiceConfig('api', { port: 0 });
      expect(result.port).toBe(0);
    });

    it('should preserve custom env vars', () => {
      const result = normalizeServiceConfig('api', {
        cmd: 'node server.js',
        env: { NODE_ENV: 'development', DEBUG: 'app:*' }
      });

      expect(result.env).toEqual({ NODE_ENV: 'development', DEBUG: 'app:*' });
    });
  });

  // ===========================================================================
  // buildEnvMap()
  // ===========================================================================
  describe('buildEnvMap()', () => {
    it('should inject PORT for each local service', () => {
      const services = {
        api: { env: {} },
        frontend: { env: {} }
      };
      const portMap = { api: 3100, frontend: 3101 };

      const envMaps = buildEnvMap(services, portMap);

      expect(envMaps.api.PORT).toBe('3100');
      expect(envMaps.frontend.PORT).toBe('3101');
    });

    it('should inject sibling PORT and URL for local services', () => {
      const services = {
        api: { env: {} },
        frontend: { env: {} }
      };
      const portMap = { api: 3100, frontend: 3101 };

      const envMaps = buildEnvMap(services, portMap);

      // frontend should know about api
      expect(envMaps.frontend.API_PORT).toBe('3100');
      expect(envMaps.frontend.API_URL).toBe('http://localhost:3100');

      // api should know about frontend
      expect(envMaps.api.FRONTEND_PORT).toBe('3101');
      expect(envMaps.api.FRONTEND_URL).toBe('http://localhost:3101');
    });

    it('should inject URL only for remote services (no PORT)', () => {
      const services = {
        frontend: { env: {} },
        api: { remote: 'https://api.staging.example.com', env: {} }
      };
      const portMap = { frontend: 3100 };

      const envMaps = buildEnvMap(services, portMap);

      // frontend gets api's remote URL
      expect(envMaps.frontend.API_URL).toBe('https://api.staging.example.com');
      expect(envMaps.frontend.API_PORT).toBeUndefined();
    });

    it('should sanitize service names with special chars for env var names', () => {
      const services = {
        'my-api': { env: {} },
        frontend: { env: {} }
      };
      const portMap = { 'my-api': 3100, frontend: 3101 };

      const envMaps = buildEnvMap(services, portMap);

      // Hyphens become underscores
      expect(envMaps.frontend.MY_API_PORT).toBe('3100');
      expect(envMaps.frontend.MY_API_URL).toBe('http://localhost:3100');
    });

    it('should preserve custom env vars from service config', () => {
      const services = {
        api: { env: { NODE_ENV: 'development' } }
      };
      const portMap = { api: 3100 };

      const envMaps = buildEnvMap(services, portMap);

      expect(envMaps.api.NODE_ENV).toBe('development');
      expect(envMaps.api.PORT).toBe('3100');
    });

    it('should handle services with no port (noPort: true)', () => {
      const services = {
        api: { env: {} },
        worker: { env: {} }
      };
      const portMap = { api: 3100 }; // worker has no port

      const envMaps = buildEnvMap(services, portMap);

      // worker gets no PORT
      expect(envMaps.worker.PORT).toBeUndefined();
      // worker still gets sibling info
      expect(envMaps.worker.API_PORT).toBe('3100');
      // api doesn't get worker PORT/URL (no port assigned)
      expect(envMaps.api.WORKER_PORT).toBeUndefined();
      expect(envMaps.api.WORKER_URL).toBeUndefined();
    });

    it('should handle mixed local and remote services', () => {
      const services = {
        frontend: { env: {} },
        api: { env: {} },
        auth: { remote: 'https://auth.example.com', env: {} }
      };
      const portMap = { frontend: 3100, api: 3101 };

      const envMaps = buildEnvMap(services, portMap);

      // frontend sees both api (local) and auth (remote)
      expect(envMaps.frontend.API_URL).toBe('http://localhost:3101');
      expect(envMaps.frontend.AUTH_URL).toBe('https://auth.example.com');
      expect(envMaps.frontend.AUTH_PORT).toBeUndefined();

      // api sees both frontend (local) and auth (remote)
      expect(envMaps.api.FRONTEND_URL).toBe('http://localhost:3100');
      expect(envMaps.api.AUTH_URL).toBe('https://auth.example.com');
    });

    it('should handle empty services', () => {
      const envMaps = buildEnvMap({}, {});
      expect(envMaps).toEqual({});
    });

    it('should handle a single service with no siblings', () => {
      const services = { api: { env: {} } };
      const portMap = { api: 3100 };

      const envMaps = buildEnvMap(services, portMap);

      expect(envMaps.api.PORT).toBe('3100');
      // No sibling vars
      expect(Object.keys(envMaps.api)).toEqual(['PORT']);
    });
  });
});
