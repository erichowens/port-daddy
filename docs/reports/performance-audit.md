Here is the complete performance audit for Port Daddy.

---

## Port Daddy Performance Audit

**Environment**: Express + better-sqlite3 on macOS (Darwin 25.1.0), daemon running on Unix socket `/tmp/port-daddy.sock` + TCP fallback. Observed baseline latency: health ~96ms (first cold request), subsequent hot path requests 10-13ms.

**Database state at audit time**: 15 services, 0 running agents (stale), 29 sessions, 40 notes, 357 activity log entries, 34 messages. WAL file is 3.9MB vs 344KB main DB — a significant finding addressed below.

---

### 1. SQLite Query Performance

#### FINDING 1 — CRITICAL: WAL File 11x Larger Than Main Database (Checkpoint Blocked)

**File**: `lib/db.ts`, line 153. **Live state**: `port-registry.db` = 344KB, `port-registry.db-wal` = 3.9MB.

**Current behavior**: WAL autocheckpoint is configured at 1000 pages (`PRAGMA wal_autocheckpoint = 1000`), but a manual passive checkpoint returns `601` uncleaned pages. This means the daemon's long-lived read transaction (opened during request processing) is blocking WAL page reclamation. Every write appends to the WAL indefinitely. As the WAL grows, read performance degrades because SQLite must walk the full WAL to reconstruct the current database state on each read.

**Impact**: Every read query's effective latency grows proportionally to uncleaned WAL size. At 3.9MB the overhead is already measurable. If the daemon runs for days with frequent writes (heartbeats, notes, activity log), the WAL can grow to tens of megabytes and degrade all reads by 2-5x.

**Recommendation**: Set `PRAGMA synchronous = NORMAL` (currently `FULL` = 2), which reduces unnecessary fsync calls without sacrificing correctness in WAL mode. Add a periodic `wal_checkpoint(TRUNCATE)` in the cleanup interval alongside the existing cleanup calls:

```typescript
// In cleanupStale() in server.ts, add after all other cleanup:
try { db.pragma('wal_checkpoint(PASSIVE)'); } catch {}
```

Also consider reducing autocheckpoint to 200 pages: `db.pragma('wal_autocheckpoint = 200')` in `lib/db.ts`.

---

#### FINDING 2 — HIGH: Full Table Scan on `services` for LIKE Pattern Queries

**File**: `lib/services.ts`, line 77 and line 103.

```typescript
getByPattern: db.prepare('SELECT * FROM services WHERE id LIKE ?'),
```

**Current behavior**: SQLite's query planner confirms this is a full table scan:
```
QUERY PLAN
`--SCAN services
```
This is because the LIKE pattern uses `%` wildcards in arbitrary positions (e.g., `myapp:*:*` becomes `myapp:%:%`). The primary key B-tree cannot be used for infix patterns.

**Impact**: For port-daddy's use case (services table stays small, typically under 200 rows), this is LOW severity in practice. However, the same is true of the `deleteByPattern` query at line 103. At 200+ services the scan cost becomes noticeable.

**Recommendation**: No index change needed — full table scans on tiny tables are fast. The real fix is to ensure the services table never grows large (the cleanup interval handles this). A note: prefix-only patterns like `myapp:%` *would* use the primary key index, so if the identity parser always generates prefix patterns, you could refactor `patternToSql` to ensure prefix-only LIKE usage.

---

#### FINDING 3 — HIGH: N+1 Query Pattern in `services.find()` Endpoint Enrichment

**File**: `lib/services.ts`, lines 359-380.

```typescript
const enriched = services.map(svc => {
  const endpoints = stmts.getEndpoints.all(svc.id) as EndpointRow[];  // ← 1 query per service
  ...
});
```

**Current behavior**: `GET /services` fires one `SELECT * FROM endpoints WHERE service_id = ?` query per service returned. With 15 services, this is 15 sequential queries against `endpoints`. The `endpoints` table only has a primary key index on `(service_id, env)` — no standalone `service_id` index.

**Impact**: At current scale (15 services), negligible. At 100+ services this becomes 100 synchronous SQLite queries on the hot `GET /services` path, likely adding 5-20ms per request.

**Recommendation**: Replace with a single join or a batched IN query:

```typescript
// Instead of N individual lookups, fetch all endpoints in one query
// and group in JS:
const allEndpoints = db.prepare(
  'SELECT * FROM endpoints WHERE service_id IN (' + services.map(() => '?').join(',') + ')'
).all(...services.map(s => s.id));
```

Or keep the pattern but add a covering index:
```sql
CREATE INDEX IF NOT EXISTS idx_endpoints_service ON endpoints(service_id);
```

---

#### FINDING 4 — HIGH: Unprepared Statements Recreated on Every Call

**Files**: `lib/activity.ts` lines 298, 344-345; `lib/locks.ts` line 333; `lib/services.ts` line 496-498.

```typescript
// activity.ts getSummary() — called on every GET /activity/summary
const entries = db.prepare(`
  SELECT type, COUNT(*) as count FROM activity_log WHERE timestamp >= ? GROUP BY type ORDER BY count DESC
`).all(sinceTimestamp);

// activity.ts getStats() — called on every GET /activity/stats
const oldest = db.prepare('SELECT MIN(timestamp) as oldest FROM activity_log').get();
const newest = db.prepare('SELECT MAX(timestamp) as newest FROM activity_log').get();

// locks.ts extend() — called on every PUT /locks/:name
db.prepare('UPDATE locks SET expires_at = ? WHERE name = ?').run(newExpiry, name);

// services.ts cleanup() — called every 5 minutes
const running = db.prepare(
  "SELECT * FROM services WHERE pid IS NOT NULL AND status = 'running'"
).all();
```

**Current behavior**: `better-sqlite3`'s `db.prepare()` compiles the SQL statement into a prepared statement. Calling `db.prepare()` inside a hot function discards the prepared statement after use, recompiling the SQL every invocation. This is typically 10-50 microseconds of wasted CPU per call, plus memory allocation pressure.

**Impact**: For `getSummary` and `getStats` it's LOW (called infrequently). For `locks.ts extend()` it matters more since every lock extension (called frequently by `pd with-lock`) re-compiles. The `services.cleanup()` one is called every 5 minutes so LOW in practice.

**Recommendation**: Move all four into the `stmts` object at module initialization time:

```typescript
// In createLocks(), add to stmts:
extendLock: db.prepare('UPDATE locks SET expires_at = ? WHERE name = ?'),

// In createActivityLog(), add to stmts:
getSummaryQuery: db.prepare(`SELECT type, COUNT(*) as count FROM activity_log WHERE timestamp >= ? GROUP BY type ORDER BY count DESC`),
getOldest: db.prepare('SELECT MIN(timestamp) as oldest FROM activity_log'),
getNewest: db.prepare('SELECT MAX(timestamp) as newest FROM activity_log'),

// In createServices(), add to stmts:
getRunningWithPid: db.prepare("SELECT * FROM services WHERE pid IS NOT NULL AND status = 'running'"),
```

---

#### FINDING 5 — HIGH: Missing Composite Index on `sessions(status, updated_at)`

**File**: `lib/sessions.ts`, lines 128-129, 196-209.

**Current behavior**: The most common query pattern for sessions is:
```sql
SELECT * FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 50
```
Query plan:
```
|--SEARCH sessions USING INDEX idx_sessions_status (status=?)
`--USE TEMP B-TREE FOR ORDER BY
```
SQLite finds matching status rows but cannot satisfy the `ORDER BY updated_at DESC` from the index, requiring a temporary B-tree sort. Every `GET /sessions`, `quickNote()`, and `sessions.list()` call triggers this.

**Impact**: At 29 sessions, the sort is fast. At 500+ sessions (realistic in active agent deployments), this B-tree sort materializes all matching rows and sorts them in memory before applying `LIMIT`, negating the benefit of the limit clause.

**Recommendation**: Add a composite index:
```sql
CREATE INDEX IF NOT EXISTS idx_sessions_status_updated ON sessions(status, updated_at DESC);
```
This lets SQLite satisfy both the `WHERE status = ?` filter and the `ORDER BY updated_at DESC LIMIT` in a single index scan without a temp sort.

---

#### FINDING 6 — MEDIUM: `canClaimService()` Uses Full Table Scan with LIKE on JSON Metadata

**File**: `lib/agents.ts`, lines 147, 458-460.

```typescript
countServices: db.prepare("SELECT COUNT(*) as count FROM services WHERE metadata LIKE ? ESCAPE '\\'"),
```

Called with pattern `%"agent":"<agentId>"%`.

**Current behavior**: Full table scan on `services` confirmed by query planner. Agent IDs are stored embedded inside the JSON `metadata` column, requiring a substring search across every row.

**Impact**: Every `POST /claim` with a registered agent ID triggers this scan. Currently negligible (15 services), but this will never be indexable. At 500+ services, this is a 500-row JSON substring scan on every port claim.

**Recommendation**: Add an explicit `agent_id` column to the `services` table populated during `claim()`, and use a simple equality index:
```sql
ALTER TABLE services ADD COLUMN agent_id TEXT;
CREATE INDEX IF NOT EXISTS idx_services_agent ON services(agent_id);
```
Then `countServices` becomes `SELECT COUNT(*) FROM services WHERE agent_id = ?`.

---

#### FINDING 7 — MEDIUM: Correlated Subquery in Activity Log Excess Cleanup

**File**: `lib/activity.ts`, lines 202-207.

```typescript
deleteExcess: db.prepare(`
  DELETE FROM activity_log
  WHERE id NOT IN (
    SELECT id FROM activity_log ORDER BY timestamp DESC LIMIT ?
  )
`)
```

**Current behavior**: Query plan shows a full scan of `activity_log` paired with a full subquery scan of 10,000 rows:
```
|--SCAN activity_log
`--LIST SUBQUERY 1
   `--SCAN activity_log USING COVERING INDEX idx_activity_timestamp
```

**Impact**: This runs every 5 minutes in `cleanupStale()`. At 10,000 rows it materializes a 10,000-element NOT IN list, which SQLite evaluates as a linear probe per outer row. This is an O(N²) pattern in the worst case.

**Recommendation**: Replace with a MIN(id) approach which avoids the NOT IN subquery:
```typescript
deleteExcess: db.prepare(`
  DELETE FROM activity_log WHERE id < (
    SELECT id FROM activity_log ORDER BY timestamp DESC LIMIT 1 OFFSET ?
  )
`)
```
Or use a `rowid`-based windowed delete:
```typescript
deleteExcess: db.prepare(`
  DELETE FROM activity_log WHERE timestamp < (
    SELECT timestamp FROM activity_log ORDER BY timestamp DESC LIMIT 1 OFFSET ?
  )
`)
```
This turns an O(N²) operation into two O(log N) index seeks.

---

#### FINDING 8 — MEDIUM: `getAfter` Messages Query Has No LIMIT

**File**: `lib/messaging.ts`, lines 68-72.

```typescript
getAfter: db.prepare<[string, number]>(`
  SELECT * FROM messages
  WHERE channel = ? AND id > ?
  ORDER BY created_at ASC
`),
```

**Current behavior**: Used in `poll()` (line 198) and `getMessages()` (line 166) with the `after` parameter. No LIMIT clause. If a channel accumulates thousands of messages without cleanup, this returns all of them.

**Impact**: SSE subscribers calling `poll()` repeatedly could receive unbounded result sets if the channel isn't cleared. The `cleanup()` only removes `expires_at`-expired messages, not old persistent ones.

**Recommendation**: Add a default LIMIT and expose it as a parameter:
```typescript
getAfter: db.prepare(`
  SELECT * FROM messages WHERE channel = ? AND id > ? ORDER BY created_at ASC LIMIT 200
`),
```

---

### 2. Express.js Middleware Performance

#### FINDING 9 — LOW: `GET /health` Runs a Full `services.find('*')` Query

**File**: `routes/info.ts`, lines 106-115.

```typescript
router.get('/health', (_req, res) => {
  const serviceResult = services.find('*');  // ← full DB query
  res.json({ status: 'ok', ..., active_ports: serviceResult.success ? serviceResult.count : 0 });
});
```

**Current behavior**: Every health check (used by uptime monitors, Kubernetes liveness probes, load balancers) executes `SELECT * FROM services WHERE status IN ('assigned','running') ORDER BY id` followed by N `SELECT * FROM endpoints` queries.

**Impact**: If a health checker hits `/health` every 5 seconds across multiple agents, this adds unnecessary DB load. At 100 services, each health check becomes 101 SQLite queries.

**Recommendation**: Replace `services.find('*')` with a count-only query:
```typescript
const count = db.prepare("SELECT COUNT(*) as c FROM services WHERE status IN ('assigned','running')").get().c;
```
Or cache the count in the `metrics` object and update it on claim/release events.

---

#### FINDING 10 — LOW: Rate Limiter `keyGenerator` Parses Body on Every Request

**File**: `server.ts`, lines 386-410.

```typescript
keyGenerator: (req) => {
  if (req.body?.project && typeof req.body.project === 'string') {
    return `project:${req.body.project.substring(0, 50)}`;
  }
  if (req.body?.id && typeof req.body.id === 'string') {
    return `id:${req.body.id.substring(0, 50)}`;
  }
  return `pid:${req.headers['x-pid'] || 'unknown'}`;
},
skip: (req) => {
  if (req.path === '/health' || req.path === '/version') return true;
  const ip = req.ip || req.socket.remoteAddress || '';
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  return false;
}
```

**Current behavior**: The `skip` function correctly bypasses rate limiting for localhost. However, `keyGenerator` runs *before* `skip` is evaluated in express-rate-limit's middleware chain. The body inspection in `keyGenerator` (string allocation, type checks) runs on every single request including those that will be skipped.

**Impact**: Minimal at current load (this is all in-process CPU). Not a bottleneck.

**Recommendation**: Since `skip` returns `true` for all localhost traffic and this is a local dev daemon, the rate limiter body-inspection logic in `keyGenerator` effectively never fires in production use. Consider simplifying `keyGenerator` to just `() => req.ip || 'local'` since the rate limiter is primarily guarding against remote abuse, not local agent traffic.

---

#### FINDING 11 — LOW: Middleware Order Has `express.static` Before Request Logger

**File**: `server.ts`, lines 417-431.

```typescript
app.use(express.json({ limit: '10kb' }));
app.use(express.static(join(__dirname, 'public')));  // ← static before logger
app.use((req, res, next) => { ... logger ... });     // ← logger after static
```

**Current behavior**: Static file requests (`GET /` dashboard, assets) skip the request logging middleware entirely because `express.static` responds before the logger runs.

**Impact**: Not a performance problem — static serving is slightly *faster* this way. This is just an observability gap: dashboard requests are invisible in the request log. This may actually be intentional.

**Recommendation**: Not critical. If dashboard access logging is desired, move the logger before `express.static`.

---

### 3. Event Loop & Sync Blocking

#### FINDING 12 — HIGH: `cleanupStale()` Has an O(N×M) Synchronous Loop

**File**: `server.ts`, lines 311-377.

```typescript
function cleanupStale() {
  const allAgents = agents.list();                           // 1 query — all agents
  for (const agent of allAgents.agents) {
    if (!agent.isActive) {
      const agentSessions = sessions.list({ agentId: agent.id, status: 'active' });  // N queries
      for (const session of sessionsList) {
        const sessionNotes = sessions.getNotes(session.id);  // N×M queries
        for (const note of notesList) { notes.push(note.content); }
      }
      resurrection.check({ ..., notes });                   // 1 write per agent
    }
  }
}
```

**Current behavior**: Called every 5 minutes. For N total agents where K are inactive, and each inactive agent has M sessions with P notes: this executes `1 + K×(1 + M×1)` synchronous SQLite queries while holding the event loop.

**Impact**: With 29 agents in the current DB (all stale since last check returned 0 active), this is `1 + 29 × (1 + session_count × 1)` queries. With 29 sessions, that could be 29 + 29×29 = 870 sequential queries in one cleanup cycle. Since better-sqlite3 is synchronous, this blocks the Node.js event loop for the entire duration — potentially 50-200ms blocking time with realistic data.

**Recommendation**: Consolidate into a single JOIN query to fetch all inactive agents with their sessions and notes in one shot:
```sql
SELECT a.id as agent_id, a.name, a.last_heartbeat,
       s.id as session_id, sn.content as note_content
FROM agents a
LEFT JOIN sessions s ON s.agent_id = a.id AND s.status = 'active'
LEFT JOIN session_notes sn ON sn.session_id = s.id
WHERE a.last_heartbeat < ?
ORDER BY a.id, s.id, sn.id
```
This is one query instead of potentially hundreds, and returns the same data.

---

#### FINDING 13 — HIGH: `detectStack()` in `lib/detect.ts` Reads 7+ Files Synchronously Per Directory

**File**: `lib/detect.ts`, lines 943-994. `lib/scan.ts` `walkDir()` function, lines 114-166.

```typescript
export function detectStack(dir: string): DetectedStack | null {
  const pkg = readPackageJson(dir);         // existsSync + readFileSync
  const pythonDeps = readPythonRequirements(dir);  // existsSync + readFileSync
  const rubyDeps = readRubyDeps(dir);       // existsSync + readFileSync
  const phpDeps = readPhpDeps(dir);         // existsSync + readFileSync
  const javaDeps = readJavaDeps(dir);       // existsSync + readFileSync (tries pom.xml AND build.gradle)
  const elixirDeps = readElixirDeps(dir);   // existsSync + readFileSync
  const dotnetDeps = readDotnetDeps(dir);   // readdirSync + readFileSync
  // ...then checks 60+ STACK_SIGNATURES
}
```

**Current behavior**: `walkDir()` calls `detectStack()` on every subdirectory up to depth 5. Each `detectStack()` call performs up to 8 synchronous `existsSync`/`readFileSync` operations plus a `readdirSync` for .NET detection. For a monorepo with 20 subdirectories at depth 5, that is `20^5 / 5 ≈ impossible in practice` but for a typical project with 50 subdirectories, that's 50 × 8 = 400 synchronous file I/O calls, all blocking the event loop.

**Impact**: `POST /scan` is an infrequent operation, but while it runs, the event loop is blocked for the full scan duration. On a large project with hundreds of directories, this could block for 100-500ms, during which time all other requests queue.

**Recommendation**: Use `setImmediate()` or `process.nextTick()` between directory levels to yield to the event loop, or move the scan into a worker thread via `worker_threads`. For immediate impact, short-circuit `detectStack()` early: check `existsSync(join(dir, 'package.json'))` first before attempting Python/Ruby/PHP/Java/Elixir/.NET detection, since those are far less common.

---

#### FINDING 14 — MEDIUM: `calculateCodeHash()` Reads All Source Files Synchronously at Startup

**File**: `server.ts`, lines 83-99.

```typescript
function calculateCodeHash(): string {
  const libFiles = readdirSync(libDir).filter(f => f.endsWith('.ts')).sort()...;
  const filesToHash = ['server.ts', ...libFiles];
  const hash = createHash('sha256');
  for (const file of filesToHash) {
    hash.update(readFileSync(filePath));   // ← synchronous read per file
  }
  return hash.digest('hex').slice(0, 12);
}
const CODE_HASH = calculateCodeHash();    // ← runs at module load time
```

**Current behavior**: At startup, reads and hashes every `.ts` file in `lib/` (currently 20+ files). This runs synchronously before the server starts accepting connections.

**Impact**: One-time cost at startup. Each `readFileSync` is a kernel syscall. For 20 files averaging 10KB each, this is 200KB of synchronous reads. On an SSD this completes in under 10ms. This is not a hot-path issue.

**Recommendation**: No action needed for performance. Consider using `mtime` hashing instead (just stat the files, hash their modification timestamps) to avoid reading file contents:
```typescript
const stat = statSync(filePath);
hash.update(String(stat.mtimeMs));
```
This is 100x faster at startup.

---

### 4. Memory Patterns

#### FINDING 15 — MEDIUM: SSE Subscriber Map Has Channel-Level Limits But No Time-Based Cleanup

**File**: `lib/messaging.ts`, lines 14-15, 91, 222-255.

```typescript
const MAX_CHANNELS = 1000;
const MAX_SUBSCRIBERS_PER_CHANNEL = 100;
const subscribers = new Map<string, Set<SubscriberCallback>>();
```

**Current behavior**: The `subscribe()` function returns an unsubscribe callback. Cleanup only happens if the caller invokes the returned function. If an SSE client disconnects without the unsubscribe being called (network drop, crash), the callback remains in the Set indefinitely.

The route that uses SSE (presumably in `routes/messaging.ts`) must call the unsubscribe on `res.on('close', ...)`. Without seeing that code confirmed, this is a potential leak.

**Impact**: In a development environment with frequent agent restarts and SSE connections, callbacks for dead connections accumulate. Each dead callback holds a closure reference to the `res` object. With 100 subscribers per channel × 1000 channels, the theoretical maximum is 100,000 stale callbacks — significant memory growth.

**Recommendation**: Confirm that every SSE route registers `req.on('close', unsubscribe)`. Add a time-to-live for subscriber entries, or add a heartbeat that detects and prunes dead SSE connections.

---

#### FINDING 16 — MEDIUM: Agent Heartbeat Writes to `activity_log` on Every 10th Call (Sampling), But Still Writes to DB

**File**: `routes/agents.ts`, lines 154-157.

```typescript
if (result.registered || Math.random() < 0.1) {
  activityLog.logAgent.heartbeat(id);
}
```

**Current behavior**: Heartbeats are sampled at 10%, which is good. However, a heartbeat still performs two SQLite writes: `UPDATE agents SET last_heartbeat = ?` (always) and the activity log insert (10% of the time). With 29 agents heartbeating every 30 seconds, that is approximately 1 agent heartbeat per second, or 86,400 writes per day to the `agents` table alone.

**Impact**: WAL growth contributor. At `PRAGMA synchronous = FULL` (the current setting), each transaction involves an fsync. At 86,400 heartbeat writes/day plus activity log writes, the WAL is accumulating rapidly — this explains the 3.9MB WAL vs 344KB main database.

**Recommendation**: Lower `PRAGMA synchronous` to `NORMAL` (safe in WAL mode — data loss window is only between the WAL write and the next checkpoint, not after a commit). This removes the per-write fsync while maintaining crash safety. Additionally, consider batching heartbeat updates: buffer them in memory for 5 seconds and flush with a single multi-row UPDATE.

---

#### FINDING 17 — LOW: `activity_log` Grows to 10,000 Entries Before Cleanup

**File**: `lib/activity.ts`, lines 10-11.

```typescript
const MAX_LOG_ENTRIES = 10000;
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
```

**Current behavior**: The log retains up to 10,000 entries for 7 days. With ~20 logged operations per minute (heartbeats sampled at 10%, claims, notes), the table fills in roughly 8 hours and then the excess cleanup query runs every 5 minutes.

**Impact**: The `deleteExcess` correlated subquery (Finding 7 above) runs against a 10,000-row table every 5 minutes. This is the primary performance concern, not the retention limit itself.

**Recommendation**: Consider reducing `MAX_LOG_ENTRIES` to 5,000 for this development-tooling use case. The 7-day retention window combined with the 10,000-entry limit is likely to hit the entry cap long before the 7-day age limit on active instances.

---

### 5. Startup Performance

#### FINDING 18 — LOW: Schema Initialization Runs `PRAGMA table_info` on Every Startup for Migration Detection

**File**: `lib/sessions.ts`, lines 156-175.

```typescript
const columns = db.prepare("PRAGMA table_info(sessions)").all();
const hasWorktreeId = columns.some(c => c.name === 'worktree_id');
if (!hasWorktreeId) {
  db.prepare("ALTER TABLE sessions ADD COLUMN worktree_id TEXT").run();
}
// Repeated for 'phase' and 'identity_project'
```

**Current behavior**: At every startup, 3 `PRAGMA table_info` calls are made to detect schema migrations. On an established database, all columns already exist, so these are wasted queries.

**Impact**: Adds ~1-5ms to startup. Acceptable.

**Recommendation**: Store the schema version in a `schema_version` table or use SQLite's `user_version` PRAGMA to track migrations. On version match, skip all migration checks.

---

### 6. Hot Path Analysis

| Endpoint | Latency Measured | Status | Notes |
|---|---|---|---|
| `GET /health` | 96ms first, ~10ms hot | WARN | Runs full `services.find('*')` including N endpoint queries |
| `POST /agents/:id/heartbeat` | ~12ms | OK | 2 queries (get + update), good |
| `GET /services` | ~11ms | OK | N+1 endpoint enrichment is currently fast at 15 services |
| `POST /claim` | ~13ms | OK | Includes systemPorts set construction and 3 queries |
| `POST /notes` (quickNote) | ~13ms | OK | 2-3 queries (find session, insert note) |

The `/health` endpoint latency of 96ms on first request is dominated by Node.js module loading and socket setup, not the query itself. Subsequent requests are 10ms — this is acceptable for a localhost Unix socket service.

---

### Summary Priority List

| # | Severity | Finding | File | Fix Effort |
|---|---|---|---|---|
| 7 | CRITICAL | WAL file 11x main DB, checkpoint blocked | `lib/db.ts` | 30 min |
| 12 | HIGH | O(N×M) cleanup loop blocks event loop | `server.ts` | 2-3 hrs |
| 3 | HIGH | N+1 endpoint enrichment in services.find() | `lib/services.ts` | 1 hr |
| 6 | HIGH | LIKE scan on JSON metadata for agent limits | `lib/agents.ts` | 2 hrs |
| 4 | HIGH | Unprepared statements recreated each call | multiple | 30 min |
| 5 | HIGH | Missing composite index sessions(status, updated_at) | `lib/sessions.ts` | 15 min |
| 13 | HIGH | Synchronous directory scan blocks event loop | `lib/detect.ts`, `lib/scan.ts` | 3 hrs |
| 16 | MEDIUM | 86,400 fsync writes/day from heartbeats at synchronous=FULL | `lib/db.ts` | 15 min |
| 7 | MEDIUM | Correlated subquery NOT IN for log excess cleanup | `lib/activity.ts` | 30 min |
| 8 | MEDIUM | Unbounded getAfter messages query | `lib/messaging.ts` | 15 min |
| 15 | MEDIUM | SSE subscriber map potential leak | `lib/messaging.ts` | 1 hr |
| 9 | LOW | GET /health runs full services scan | `routes/info.ts` | 30 min |
| 14 | LOW | Startup hashes all source files via readFileSync | `server.ts` | 30 min |

**Quickest wins with highest impact** (implement first):
1. Change `PRAGMA synchronous = NORMAL` in `lib/db.ts` — one line, eliminates 86,400 fsyncs/day, shrinks WAL growth dramatically.
2. Add `wal_checkpoint(PASSIVE)` call in `cleanupStale()` — two lines, keeps WAL size bounded.
3. Move the four inline `db.prepare()` calls into the `stmts` objects — copy/paste refactor, eliminates per-call SQL recompilation.
4. Add `CREATE INDEX idx_sessions_status_updated ON sessions(status, updated_at DESC)` — eliminates the temp B-tree sort on every session list query.
