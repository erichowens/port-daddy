/**
 * Projects Module
 *
 * Central registry for projects known to Port Daddy.
 * Lightweight — the source of truth is still .portdaddyrc.
 * This table exists so the dashboard can show "all known projects"
 * without scanning the filesystem.
 */

/**
 * Initialize the projects module with a database connection.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {Object} Projects API
 */
export function createProjects(db) {
  // Prepared statements
  const stmts = {
    getById: db.prepare('SELECT * FROM projects WHERE id = ?'),
    getByPath: db.prepare('SELECT * FROM projects WHERE root = ?'),
    getAll: db.prepare('SELECT * FROM projects ORDER BY last_scanned DESC'),
    upsert: db.prepare(`
      INSERT INTO projects (id, root, type, config, services, last_scanned, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        root = excluded.root,
        type = excluded.type,
        config = excluded.config,
        services = excluded.services,
        last_scanned = excluded.last_scanned,
        metadata = excluded.metadata
    `),
    deleteById: db.prepare('DELETE FROM projects WHERE id = ?'),
    count: db.prepare('SELECT COUNT(*) as count FROM projects')
  };

  /**
   * Register or update a project.
   *
   * @param {Object} project
   * @param {string} project.id - Project name (slug)
   * @param {string} project.root - Absolute path to project root
   * @param {string} [project.type='single'] - 'single' | 'monorepo' | 'multi'
   * @param {Object} [project.config] - The .portdaddyrc config
   * @param {Object} [project.services] - Discovered services map
   * @param {Object} [project.metadata] - Extra metadata
   * @returns {Object} The registered project
   */
  function register(project) {
    const now = Date.now();
    const existing = stmts.getById.get(project.id);

    stmts.upsert.run(
      project.id,
      project.root,
      project.type || 'single',
      project.config ? JSON.stringify(project.config) : null,
      project.services ? JSON.stringify(project.services) : null,
      now,
      existing?.created_at || now,
      project.metadata ? JSON.stringify(project.metadata) : null
    );

    return get(project.id);
  }

  /**
   * Get a project by ID.
   *
   * @param {string} id
   * @returns {Object|null}
   */
  function get(id) {
    const row = stmts.getById.get(id);
    return row ? deserialize(row) : null;
  }

  /**
   * Get a project by its root directory path.
   *
   * @param {string} root - Absolute path
   * @returns {Object|null}
   */
  function getByPath(root) {
    const row = stmts.getByPath.get(root);
    return row ? deserialize(row) : null;
  }

  /**
   * List all registered projects.
   *
   * @returns {Object[]}
   */
  function list() {
    return stmts.getAll.all().map(deserialize);
  }

  /**
   * Remove a project by ID.
   *
   * @param {string} id
   * @returns {boolean} Whether a project was actually removed
   */
  function remove(id) {
    const result = stmts.deleteById.run(id);
    return result.changes > 0;
  }

  /**
   * Get the count of registered projects.
   *
   * @returns {number}
   */
  function count() {
    return stmts.count.get().count;
  }

  /**
   * Deserialize JSON fields from a database row.
   */
  function deserialize(row) {
    return {
      ...row,
      config: row.config ? JSON.parse(row.config) : null,
      services: row.services ? JSON.parse(row.services) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  return { register, get, getByPath, list, remove, count };
}
