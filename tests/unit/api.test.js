import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.PORT_DADDY_DB || join(__dirname, '../../port-registry-test.db');

// Create a test server instance
function createTestServer() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS port_assignments (
      port INTEGER PRIMARY KEY,
      project TEXT NOT NULL,
      pid INTEGER NOT NULL,
      started INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_project ON port_assignments(project);
    CREATE INDEX IF NOT EXISTS idx_pid ON port_assignments(pid);
  `);

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Safe process checking using spawnSync (no shell injection risk)
  function isProcessAlive(pid) {
    try {
      const result = spawnSync('ps', ['-p', String(pid)], {
        stdio: 'ignore',
        timeout: 1000
      });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  function findAvailablePort() {
    const used = db.prepare('SELECT port FROM port_assignments').all().map(r => r.port);
    const usedSet = new Set([...used, 8080, 8000, 9876]);

    for (let port = 3100; port <= 9999; port++) {
      if (!usedSet.has(port)) {
        return port;
      }
    }
    throw new Error('No available ports');
  }

  app.post('/ports/request', (req, res) => {
    try {
      const { project, preferred } = req.body;

      if (!project) {
        return res.status(400).json({ error: 'project name required' });
      }

      const now = Date.now();
      const requestingPid = parseInt(req.headers['x-pid']) || process.pid;

      const existing = db.prepare('SELECT * FROM port_assignments WHERE project = ?').get(project);

      if (existing) {
        if (isProcessAlive(existing.pid)) {
          db.prepare('UPDATE port_assignments SET last_seen = ? WHERE port = ?').run(now, existing.port);
          return res.json({
            port: existing.port,
            message: 'reusing existing port',
            existing: true
          });
        } else {
          db.prepare('DELETE FROM port_assignments WHERE port = ?').run(existing.port);
        }
      }

      if (preferred && ![8080, 8000, 9876].includes(preferred)) {
        const conflict = db.prepare('SELECT * FROM port_assignments WHERE port = ?').get(preferred);
        if (!conflict || !isProcessAlive(conflict.pid)) {
          if (conflict) {
            db.prepare('DELETE FROM port_assignments WHERE port = ?').run(preferred);
          }
          db.prepare('INSERT INTO port_assignments (port, project, pid, started, last_seen) VALUES (?, ?, ?, ?, ?)')
            .run(preferred, project, requestingPid, now, now);
          return res.json({ port: preferred, message: 'assigned preferred port' });
        }
      }

      const port = findAvailablePort();
      db.prepare('INSERT INTO port_assignments (port, project, pid, started, last_seen) VALUES (?, ?, ?, ?, ?)')
        .run(port, project, requestingPid, now, now);

      res.json({ port, message: 'assigned new port' });
    } catch (error) {
      console.error('Error requesting port:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/ports/release', (req, res) => {
    try {
      const { port, project } = req.body;

      if (port) {
        db.prepare('DELETE FROM port_assignments WHERE port = ?').run(port);
        res.json({ success: true, message: `released port ${port}` });
      } else if (project) {
        const result = db.prepare('DELETE FROM port_assignments WHERE project = ?').run(project);
        res.json({ success: true, message: `released ${result.changes} port(s) for project ${project}` });
      } else {
        res.status(400).json({ error: 'port or project required' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/ports/active', (req, res) => {
    try {
      const entries = db.prepare('SELECT port, project, pid, started, last_seen FROM port_assignments ORDER BY port').all();

      const enhanced = entries.map(e => ({
        ...e,
        alive: isProcessAlive(e.pid),
        age_minutes: Math.floor((Date.now() - e.started) / 60000)
      }));

      res.json({ ports: enhanced, count: enhanced.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/health', (req, res) => {
    const portCount = db.prepare('SELECT COUNT(*) as count FROM port_assignments').get().count;
    res.json({
      status: 'ok',
      uptime_seconds: Math.floor(process.uptime()),
      active_ports: portCount,
      pid: process.pid
    });
  });

  // Cleanup method for tests
  app.clearDatabase = () => {
    db.prepare('DELETE FROM port_assignments').run();
  };

  app.closeDatabase = () => {
    db.close();
  };

  return app;
}

describe('Port Daddy API', () => {
  let app;

  beforeEach(() => {
    app = createTestServer();
    app.clearDatabase();
  });

  afterEach(() => {
    app.closeDatabase();
  });

  describe('POST /ports/request', () => {
    it('should assign a port to a new project', async () => {
      const res = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-1' });

      expect(res.status).toBe(200);
      expect(res.body.port).toBeGreaterThanOrEqual(3100);
      expect(res.body.port).toBeLessThanOrEqual(9999);
      expect(res.body.message).toBeTruthy();
    });

    it('should return same port for same project', async () => {
      const res1 = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-2' });

      const res2 = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-2' });

      expect(res2.status).toBe(200);
      expect(res2.body.port).toBe(res1.body.port);
      expect(res2.body.existing).toBe(true);
    });

    it('should assign different ports to different projects', async () => {
      const res1 = await request(app)
        .post('/ports/request')
        .send({ project: 'project-a' });

      const res2 = await request(app)
        .post('/ports/request')
        .send({ project: 'project-b' });

      expect(res1.body.port).not.toBe(res2.body.port);
    });

    it('should honor preferred port if available', async () => {
      const res = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-3', preferred: 5555 });

      expect(res.status).toBe(200);
      expect(res.body.port).toBe(5555);
    });

    it('should not assign reserved ports', async () => {
      const res1 = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-4', preferred: 8080 });

      const res2 = await request(app)
        .post('/ports/request')
        .send({ project: 'test-project-5', preferred: 9876 });

      expect(res1.body.port).not.toBe(8080);
      expect(res2.body.port).not.toBe(9876);
    });

    it('should return 400 if project name missing', async () => {
      const res = await request(app)
        .post('/ports/request')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe('DELETE /ports/release', () => {
    it('should release port by project name', async () => {
      await request(app)
        .post('/ports/request')
        .send({ project: 'test-release-1' });

      const res = await request(app)
        .delete('/ports/release')
        .send({ project: 'test-release-1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should release port by port number', async () => {
      const assignRes = await request(app)
        .post('/ports/request')
        .send({ project: 'test-release-2' });

      const res = await request(app)
        .delete('/ports/release')
        .send({ port: assignRes.body.port });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 if neither port nor project provided', async () => {
      const res = await request(app)
        .delete('/ports/release')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /ports/active', () => {
    it('should return empty list initially', async () => {
      const res = await request(app).get('/ports/active');

      expect(res.status).toBe(200);
      expect(res.body.ports).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should list active port assignments', async () => {
      await request(app)
        .post('/ports/request')
        .send({ project: 'project-1' });

      await request(app)
        .post('/ports/request')
        .send({ project: 'project-2' });

      const res = await request(app).get('/ports/active');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.ports.length).toBe(2);
      expect(res.body.ports[0].project).toBeTruthy();
      expect(res.body.ports[0].port).toBeTruthy();
    });

    it('should include alive status for each port', async () => {
      await request(app)
        .post('/ports/request')
        .send({ project: 'project-check' });

      const res = await request(app).get('/ports/active');

      expect(res.body.ports[0]).toHaveProperty('alive');
      expect(typeof res.body.ports[0].alive).toBe('boolean');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('uptime_seconds');
      expect(res.body).toHaveProperty('active_ports');
      expect(res.body).toHaveProperty('pid');
    });
  });
});
