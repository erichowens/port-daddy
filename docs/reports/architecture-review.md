I now have everything I need for a thorough and specific review. Here is the complete architectural assessment.

---

# Port Daddy — Architectural Review

**Codebase at a glance:** 30 lib modules, 18 route files, 582-line server.ts, 33 unit test suites, 6 integration suites. A single-process Express daemon with a SQLite backing store, accessed by CLI, SDK, MCP, and dashboard simultaneously. The scope is significant for a "local dev tool."

---

## 1. Current Architecture Assessment

**Rating: GOOD**

### What the pattern actually is

The codebase uses a consistent **Module Factory** pattern: `createFoo(db)` returns a plain object of functions with the database connection captured in closure scope. Routes follow the same pattern: `createFooRoutes(deps)` returns an Express Router. This is a coherent, intentional design — not accidental.

```
server.ts
  └─ initDatabase()               → db
  └─ createFoo(db)                → module objects
  └─ createRoutes({...all deps})  → Express Router
       └─ createFooRoutes(deps)   → sub-Router
```

**Strengths of this pattern:**
- Each module owns its schema initialization (idempotent `CREATE TABLE IF NOT EXISTS`). This means adding a module cannot break the rest of the system.
- Route files define narrow `*RouteDeps` interfaces at the top, making their actual dependencies explicit — `routes/sessions.ts` never touches the database directly; it only receives the `sessions` module interface.
- The `cleanupStale()` function in `server.ts` (lines 311-377) is properly orchestrated at the server layer, not embedded in individual modules.

**Where it diverges from Clean Architecture:**
- There is no explicit layering by name (Domain / Application / Infrastructure). The `lib/` directory is a flat namespace. `lib/services.ts` (business logic), `lib/db.ts` (infrastructure), `lib/sugar.ts` (application use-case composition), and `lib/client.ts` (SDK/delivery) all live side by side. Navigating the intent of a module requires reading its internals.
- `server.ts` is a 582-line composition root that additionally handles: daemon detection (lines 155-178), sleep detection (lines 188-198, 468-481), cleanup orchestration (lines 311-377), HTTP middleware, TCP retry logic (lines 529-574), and startup/shutdown hooks. This is too much for a composition root.

---

## 2. Dependency Direction Analysis

**Rating: ADEQUATE**

### What is correct

The dependency arrows flow in the right direction almost everywhere:

```
Routes → lib modules → db (better-sqlite3)
```

Routes never touch `db` directly. This is verified: grepping `db.` in `routes/sessions.ts` returns zero matches. The database is injected downward from `server.ts` through module factories, never imported directly by route handlers. This is the core requirement of dependency inversion at the infrastructure boundary, and it is satisfied.

### The database coupling problem

The database is **not abstracted**. Every module factory accepts `Database.Database` (the concrete `better-sqlite3` type) directly:

```typescript
// lib/sessions.ts line 112
export function createSessions(db: Database.Database) {
```

```typescript
// lib/agents.ts line 92
export function createAgents(db: Database.Database) {
```

The consequence: you cannot swap SQLite for any other storage backend (Postgres, Redis, in-memory Map) without rewriting every module. For a single-node local dev tool this is probably acceptable, but it forecloses the most obvious scaling path (see Section 5).

The test infrastructure in `tests/setup-unit.js` partially compensates for this by using `:memory:` SQLite. Tests can run fast without file I/O. But they are still testing against SQLite specifically — SQL dialect, index behavior, foreign key enforcement — not against a storage abstraction. This is pragmatic but worth naming explicitly.

### The `setActivityLog` mutation anti-pattern

Two modules use post-construction injection via a setter method:

```typescript
// server.ts lines 216, 222
sessions.setActivityLog(activityLog);
dns.setActivityLog(activityLog);
```

This means `sessions` and `dns` exist in a partially-initialized state between `createSessions(db)` and `sessions.setActivityLog(activityLog)`. Any code that calls `sessions.start()` during that window will silently skip activity logging — no error, just silent omission. This is a latent correctness hazard. The circular dependency that forces this pattern (sessions needs activityLog, activityLog might need sessions) should be resolved structurally rather than with a mutable setter.

### `briefing.ts` uses `any`

```typescript
// lib/briefing.ts lines 22-28
interface BriefingDeps {
  sessions: any;
  agents: any;
  resurrection: any;
  activityLog: any;
  services: any;
  messaging: any;
}
```

Six `any` typed dependencies in one interface is a red flag. `Briefing` is a complex cross-cutting module that aggregates state from the entire system. The `any` types here mean TypeScript cannot catch mismatches between what `briefing` expects and what those modules actually return. This is the exact point where type safety most matters.

---

## 3. Domain Model Quality

**Rating: ADEQUATE**

### What constitutes the domain

Port Daddy's core domain concepts are: Service Identity, Port Assignment, Session, Note, Agent, Lock, and Resurrection. These are clearly recognizable. The question is how richly they are modeled.

### Anemic data model — mostly unavoidable but worth naming

The data flows through the system as plain `Record<string, unknown>` objects. `lib/sugar.ts` uses `Record<string, unknown>` 22 times as the return type for AgentsModule and SessionsModule methods. This means:

```typescript
// lib/sugar.ts line 18
interface AgentsModule {
  register(id: string, options?: Record<string, unknown>): Record<string, unknown>;
  ...
}
```

A call to `agents.register()` returns `Record<string, unknown>` — the caller cannot know statically what fields are present. The `begin()` function in `sugar.ts` then does:

```typescript
if (!agentResult.success) { ... }
if (agentResult.salvageHint) { ... }
```

Both of these field accesses are untyped. If `agents.register()` ever renames `salvageHint`, the TypeScript compiler will not catch the breakage in `sugar.ts`. The internal module types (`AgentFormatted` in `agents.ts`, `SessionRow` in `sessions.ts`) are well-defined — but they are erased when results leave the module boundary.

### Value objects: identity is well-done

`lib/identity.ts` is the standout value-object implementation in this codebase. `ParsedIdentity` is a proper discriminated union:

```typescript
export type ParsedIdentity = ParsedIdentityValid | ParsedIdentityInvalid;
```

The parser validates, normalizes, and exposes `hasWildcard`, `normalized`, and component segments. `parseIdentity()` is called at every entry point in `services.ts` and `agents.ts` before touching the database. This is correct domain enforcement at the boundary. Every other domain concept should aspire to this standard.

### Session aggregate boundary — partially realized

The `Session` aggregate (Session + Notes + FileClaims) has the right shape in the database: foreign keys with `ON DELETE CASCADE`. The `sessions.ts` module (`createSessions`) correctly owns all three entities. But aggregate consistency is leaky:

- `server.ts` (lines 323-356) reaches directly into `agents.list()` and `sessions.list()` inside `cleanupStale()`, doing aggregate-level coordination in the composition root rather than in a domain service.
- The resurrection process is orchestrated across `server.ts`, `lib/resurrection.ts`, and `lib/agents.ts` with event emissions, but the coordination logic — "if agent is dead, check its sessions, collect notes, queue for resurrection" — lives in `server.ts` lines 335-356, not in a `ResurrectionService` or `AgentLifecycleService`.

### Domain invariants — enforcement is scattered

- Port range validation happens in `services.ts` `findAvailablePort()` — correct.
- Session phase validation (`VALID_PHASES`) lives in `sessions.ts` — correct.
- Agent TTL constants (`DEFAULT_AGENT_TTL`) are defined in `agents.ts` but the resurrection thresholds (`STALE_THRESHOLD`, `DEAD_THRESHOLD`) are defined separately in `resurrection.ts`. These are related domain concepts with no shared authority. If someone changes `DEFAULT_AGENT_TTL` in `agents.ts` from 120000ms to 300000ms, `resurrection.ts` does not notice.

---

## 4. Module Cohesion and Coupling

**Rating: GOOD for most modules, NEEDS IMPROVEMENT for server.ts**

### `lib/sugar.ts` — well-bounded

`createSugar({ agents, sessions, activityLog })` is a clean application-layer use-case module. It receives typed interfaces (albeit weakly typed with `Record<string, unknown>`), does not touch the database, and implements exactly two workflows: `begin` and `done`. The rollback logic in `begin()` (lines 104-113) — unregistering the agent if session start fails — is correct saga-style compensating action. This is the best-structured module in the codebase.

The weakness is the same `Record<string, unknown>` interface typing mentioned above.

### `lib/sessions.ts` — appropriate scope, verbose

`createSessions` at 1031 lines handles Session, SessionNote, and SessionFile. These are the three parts of a single aggregate, so their co-location is architecturally correct. The proliferation of prepared statements (34 distinct `stmts` entries) reflects the filtering combinatorial explosion from `{status, agentId, worktreeId, allWorktrees}` combinations. This is a query-model problem that CQRS could solve — see Section 5.

The inline migration code (lines 157-178) is pragmatic but architecturally awkward:

```typescript
// lib/sessions.ts lines 157-174
try {
  const columns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  const hasWorktreeId = columns.some(c => c.name === 'worktree_id');
  if (!hasWorktreeId) {
    db.prepare("ALTER TABLE sessions ADD COLUMN worktree_id TEXT").run();
  }
  ...
} catch { }
```

This pattern appears in at least three modules (`sessions.ts`, `agents.ts`, `resurrection.ts`). Each module migrates its own schema at runtime on every startup. There is no migration history, no rollback capability, and no ordering guarantees between migrations in different modules. For a v1 product this is tolerable. For any multi-instance deployment or team setting, it will become a source of subtle failures.

### `lib/services.ts` — clean and well-scoped

`createServices` is 521 lines, handles one aggregate cleanly, and has no surprising dependencies. The `find()` function's post-query filtering (lines 344-351) is acceptable at this scale but would benefit from being pushed into SQL as the service count grows.

The `cleanup()` function (lines 486-509) has a subtle architectural issue: it queries `services WHERE pid IS NOT NULL AND status = 'running'` and then calls `process.kill(pid, 0)` to test liveness. This means the services module has a dependency on the operating system process table — a side effect that is invisible from the module's interface and untestable in unit tests. The mock-ability of this is poor.

### `routes/index.ts` — structural type evasion

```typescript
// routes/index.ts line 38
type AnyDeps = Record<string, unknown>;
```

The aggregator uses `unknown` casts 16 times (one per route factory). The comment explains the rationale: server.ts provides everything, each route factory destructures what it needs. This is pragmatically sound. However, it means a typo in any route factory's expected dependency name produces a runtime `undefined`, not a compile-time error. A union type of all route dep interfaces, or a single `ServerDeps` interface in a shared types file, would recover type safety here without duplication.

### `server.ts` — doing too much

The 582-line `server.ts` is the composition root, and composition roots should be thin wiring code. Instead it contains:

- Daemon detection logic (lines 155-178) — deserves its own module
- Sleep detection state machine (lines 188-198, 468-481) — deserves its own module
- Resurrection event wiring (lines 227-274) — application-layer logic, not wiring
- `cleanupStale()` (lines 311-377) — a substantive function that coordinates across 8 modules and contains inline type assertions

The `cleanupStale` function specifically should not live in `server.ts`. It orchestrates: `services.cleanup()`, `messaging.cleanup()`, sleeping-state checking, `agents.list()`, per-agent session iteration, `resurrection.check()`, `agents.cleanup(locks)`, `activityLog.cleanup()`, `webhooks.cleanup()`, `sessions.cleanup()`, `agentInbox.cleanup()`, `resurrection.cleanup()`. This is an application service, not infrastructure wiring.

---

## 5. Scalability and Extensibility Assessment

**Rating: ADEQUATE — single-node ceiling is near, extension mechanism is manual**

### Adding a new feature — the process is explicit

The CLAUDE.md "Adding New Features" section lists a 12-step process. This is good documentation, but the process itself is the problem: it requires touching 10+ files for every new feature (lib module, route file, `routes/index.ts`, `server.ts` module instantiation, CLI, SDK, three completion files, README, CLAUDE.md, CHANGELOG). The `features.manifest.json` parity enforcement system (`tests/unit/manifest-enforcement.test.js`) is an excellent compensating control that catches omissions in CI, but it is a symptom of the underlying extensibility gap.

A plugin or capability registration mechanism — where a new feature declares itself rather than being wired in 10 places — would reduce the surface area dramatically. The module factory pattern is already close to a plugin interface; the missing piece is an auto-discovery or registration step.

### Multi-instance deployment — not currently possible

The entire system assumes a single daemon process. The reasons:

1. **SQLite is the coordination layer.** SQLite's WAL mode supports concurrent readers but has no network access. Two daemons on different machines cannot share state.
2. **Unix socket** `/tmp/port-daddy.sock` is process-local by definition.
3. **Port allocation** (`findAvailablePort` in `services.ts`) scans all assigned ports from the local database. Two daemons would independently assign the same port numbers.
4. **Agent resurrection events** are in-process `EventEmitter` (in `resurrection.ts`). They cannot propagate across process boundaries.
5. **Sleep detection** is wall-clock local to the daemon process.

What would need to change for multi-instance deployment:
- Replace SQLite with a network-accessible store (PostgreSQL, Redis) or a distributed SQLite layer (Turso/LibSQL, Litestream with leader election)
- Replace `EventEmitter` with a distributed message bus (the pub/sub system already exists in `lib/messaging.ts` — it could be self-referential if backed by a shared store)
- Replace Unix socket with TCP + service discovery
- Make port allocation atomic at the database level (an `INSERT ... RETURNING` with a conflict-retry loop, which `services.ts` partially implements)

For Port Daddy's stated purpose — a local dev tool — this ceiling is acceptable. But it should be a documented decision, not a surprise.

### Schema migration — needs improvement for growth

The current inline migration pattern (catch-and-ignore `ALTER TABLE` attempts) will not survive:
- Schema downgrades (none possible currently)
- Schema conflicts when two agents start simultaneously and both try to `ALTER TABLE`
- Multi-column migrations that must be atomic
- Any future need to know which version of the schema is installed

A numbered migration table (`schema_versions`) with a migration runner in `lib/db.ts` would be a small investment with compounding returns.

---

## 6. Testing Architecture

**Rating: EXCELLENT**

This is the architectural highlight of the codebase.

### Test isolation is first-class

`tests/setup-unit.js` creates fresh `:memory:` SQLite databases for every test:

```javascript
// tests/setup-unit.js line 14
export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  ...
}
```

The `beforeEach` / `afterEach` pattern in `tests/unit/sessions.test.js` (lines 18-27) gives every test a completely clean database. There is no test pollution risk. This is correctly structured.

### Tests test behavior, not implementation

The session tests assert on externally observable behavior:

```javascript
// sessions.test.js line 35-40
it('should create a new session with generated ID', () => {
  const result = sessions.start('Build feature X');
  expect(result.id).toMatch(/^session-[0-9a-f]{8}$/);
  expect(result.purpose).toBe('Build feature X');
  expect(result.status).toBe('active');
});
```

They do not assert on SQL query counts, internal state, or prepared statement names. The module's public interface is what is tested.

### Test architecture mirrors production architecture

The test modules import `createSessions(db)`, `createAgents(db)`, `createLocks(db)` — the exact same factory functions that `server.ts` uses. There is no test-only stub of the module itself. This is correct: the unit tests exercise real module behavior, not mocks of it. This is the opposite of the fragile test-doubles pattern that often dominates express-based services.

### Mock utilities are appropriately minimal

`createMockLogger()` and `createMockFetch()` in `setup-unit.js` are focused on their purpose. The mock logger captures calls for assertion. The mock fetch simulates HTTP outcomes without requiring an actual network. Neither mock simulates internal module behavior.

### The `distribution-freshness.test.js` is an architectural control

Having a test that enforces parity across CLI, SDK, completions, and README is architecturally significant. It converts documentation drift — normally a human process problem — into an automated build failure. This is a mature practice that deserves recognition. It is the enforcement mechanism that makes the 12-step "Adding New Features" process reliable.

---

## Summary Scorecard

| Area | Rating | Key Finding |
|---|---|---|
| Architecture Pattern | GOOD | Module factory is consistent and coherent |
| Dependency Direction | ADEQUATE | No route-to-db coupling; but db is concrete not abstract |
| Domain Model Quality | ADEQUATE | Identity value object is excellent; most data is `Record<string, unknown>` |
| Module Cohesion | GOOD | Most modules are well-scoped; `server.ts` is too large |
| Scalability | ADEQUATE | Single-node ceiling by design; no extension mechanism |
| Testing Architecture | EXCELLENT | Behavior-based, isolated, mirrors production, parity-enforced |

---

## Prioritized Recommendations

### Priority 1 — High impact, low effort

**1a. Eliminate `setActivityLog` mutation pattern**

The two post-construction injections (`server.ts` lines 216, 222) create initialization-order hazards. The cleanest fix: pass `activityLog` directly into `createSessions(db, { activityLog })` and `createDns(db, { activityLog })`. The circular dependency concern can be resolved by making `activityLog` an optional parameter (the module already handles `activityLog === null`).

**1b. Type the cross-module boundaries in `sugar.ts`**

Replace the six `Record<string, unknown>` return types in `AgentsModule`, `SessionsModule`, and `ActivityLogModule` interfaces with concrete types. The types already exist in the respective modules — `AgentFormatted` in `agents.ts`, the session result shape in `sessions.ts`. Extract them into a `lib/types.ts` file and import them in both the module and `sugar.ts`. This recovers compile-time safety at the most cross-cutting use case in the system.

**1c. Type `briefing.ts` deps interface**

Replace the six `any` typed dependencies in `BriefingDeps` (lines 22-28 of `briefing.ts`) with the concrete module return types. This is the most dangerous `any` cluster in the codebase given how many modules `briefing` aggregates.

### Priority 2 — Architectural cleanup

**2a. Extract `cleanupStale()` from `server.ts`**

`cleanupStale` is an application service that orchestrates 8 modules. Extract it to `lib/cleanup.ts` as `createCleanupService(deps)`. `server.ts` becomes:

```typescript
const cleanup = createCleanupService({ services, messaging, agents, sessions, ... });
setInterval(() => cleanup.run(), config.cleanup.interval_ms);
```

**2b. Extract daemon lifecycle concerns from `server.ts`**

Daemon detection (lines 155-178) and sleep detection (lines 188-198, 468-481) are distinct responsibilities. Both deserve their own modules: `lib/daemon-guard.ts` and `lib/sleep-detector.ts`. `server.ts` should import behavior, not implement it.

**2c. Consolidate schema migration**

Create a migration runner in `lib/db.ts` that maintains a `_schema_versions` table and runs numbered migrations in order. Remove the catch-and-ignore `ALTER TABLE` patterns from `sessions.ts` (lines 157-178), `agents.ts` (lines 118-127), and `resurrection.ts` (lines 79-90). This eliminates race conditions when two processes start simultaneously and both attempt to alter the same table.

### Priority 3 — Long-term extensibility

**3a. Align the resurrection threshold constants**

`DEFAULT_AGENT_TTL` (120000ms) in `agents.ts` and `STALE_THRESHOLD` (600000ms) / `DEAD_THRESHOLD` (1200000ms) in `resurrection.ts` are conceptually related but independently defined. The agent is considered "inactive" at 2 minutes but not "stale" for resurrection purposes until 10 minutes. Whether this is intentional should be explicit. Extract all lifecycle timing constants to `lib/config.ts` or a dedicated `lib/lifecycle-constants.ts` so they can be adjusted in one place.

**3b. Document the single-node constraint as an explicit Architecture Decision Record**

The SQLite-as-coordination-layer decision forecloses multi-instance deployment. This is the right decision for Port Daddy's stated purpose, but it should be documented as an ADR with the tradeoffs made explicit. If multi-instance ever becomes a requirement, the migration path is: replace `better-sqlite3` with a repository interface, implement one concrete `SqliteRepository` and one `PostgresRepository`. The module factory pattern already provides the injection point — it just needs the abstraction layer added.

**3c. Consider a feature registration manifest as a first-class concept**

The `features.manifest.json` is currently a documentation artifact with test enforcement. A registration-based approach — where adding a `lib/foo.ts` module that exports a `{ manifest }` object automatically wires it — would eliminate the 10-file touch requirement. This is a significant investment but the right architectural direction for a tool that adds features regularly.

---

## What the Codebase Gets Genuinely Right

It would be a disservice to leave only criticisms. These patterns deserve explicit recognition:

- The `lib/identity.ts` discriminated union design is textbook value-object modeling.
- The prepared statements pattern in every module (`stmts = { getById: db.prepare(...) }`) ensures queries are compiled once and reused — correct use of `better-sqlite3`.
- The features manifest + parity tests is a production-grade architectural control that many larger teams do not have.
- `createSugar` is a clean, saga-aware application service that demonstrates the right direction for cross-module composition.
- Tests using in-memory SQLite with the real module factories — not mocked modules — is precisely the right testing strategy for this architecture.

The codebase is in good shape for its purpose and scale. The issues identified are the natural tensions that emerge as a system grows from "useful tool" toward "platform" — and Port Daddy is clearly in that transition.
