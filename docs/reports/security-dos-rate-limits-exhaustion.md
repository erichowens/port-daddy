I now have a thorough picture of the entire attack surface. Here is the complete security audit.

---

# Port Daddy — Denial of Service, Rate Limiting, and Resource Exhaustion Audit

---

## EXECUTIVE SUMMARY

Port Daddy is designed as a local developer tool and its threat model reflects that — it binds to `localhost` and a Unix socket. However, its design has several significant gaps that would allow a compromised local process, a rogue MCP tool, or a malicious actor with local access to exhaust resources, lock out legitimate agents, or permanently disable the daemon. The most critical finding is the total bypass of rate limiting for all practical traffic.

---

## FINDING 1 — CRITICAL: Rate Limiting Is Completely Bypassed for All Normal Traffic

**File:** `/Users/erichowens/coding/port-daddy/server.ts`
**Lines:** 385–410

**Evidence:**
```typescript
app.use(rateLimit({
  ...
  skip: (req: Request): boolean => {
    if (req.path === '/health' || req.path === '/version') return true;
    // Skip for Unix socket connections (no remote address = local socket)
    const ip = req.ip || req.socket.remoteAddress || '';
    if (!ip) return true;
    // Skip for localhost/loopback (this is a local dev tool)
    if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
    return false;
  },
```

**Analysis:** The rate limiter skips requests when:

1. The request arrives over the Unix socket (`req.ip` is empty — no `remoteAddress` on Unix sockets).
2. The request arrives from localhost over TCP (`127.0.0.1`, `::1`, or `::ffff:127.0.0.1`).

The primary transport is the Unix socket. The TCP listener (`localhost:9876`) only exists for the browser dashboard. This means **100% of CLI, SDK, and MCP traffic — every agent, every tool call — is permanently exempt from the rate limiter**. The rate limiter exists only on paper.

**Exploitation Scenario:**

A rogue process (malicious npm package, compromised MCP tool, shell script) running locally can send 100,000 requests per second to the Unix socket or to localhost with no throttling. This can:

- Fill the SQLite database with millions of sessions, notes, agents, and messages
- Block the daemon's event loop via synchronous SQLite writes (better-sqlite3 is synchronous)
- Exhaust filesystem disk space
- Make all legitimate agent operations unresponsive

**Key Aggravating Factor:** The `keyGenerator` at lines 388–396 uses `req.body.project` or `req.body.id` — values that never exist in the rate limiter context because `skip()` returns `true` before the rate limiter key is ever evaluated for local traffic.

**Remediation:** The rate limiter needs a completely different strategy for a local daemon. Consider:
- Per-PID throttling using the `X-PID` header or OS socket credentials
- A token-bucket limiter applied at the module layer, not the Express middleware layer, tracking call rates per calling PID
- Setting hard per-operation quotas at the SQLite layer (row count checks before INSERT)

**Severity: CRITICAL**

---

## FINDING 2 — HIGH: Unbounded Agent Inbox — No Per-Agent Message Limit

**File:** `/Users/erichowens/coding/port-daddy/lib/agent-inbox.ts`
**Lines:** 45–65

**Evidence:**
```typescript
const stmts = {
  send: db.prepare(`
    INSERT INTO agent_inbox (agent_id, from_agent, content, type, read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `),
  ...
```

There is no `MAX_INBOX_SIZE` constant, no count check before INSERT, and no limit on message content size in the inbox module itself. The `send()` function inserts unconditionally.

**Exploitation Scenario:** Any caller can enumerate registered agent IDs (via `GET /agents`) and then flood any agent's inbox with `POST /agents/:id/inbox` requests. Since rate limiting is bypassed (Finding 1), this creates an unbounded table that grows until disk is full. A targeted attack against a specific agent can make it impossible for that agent to process its real messages due to read-query performance degradation on millions of rows.

**Remediation:** Add a `MAX_MESSAGES_PER_AGENT` constant (e.g., 500) and check the per-agent count before every INSERT. Return HTTP 429 or 503 when the limit is reached.

**Severity: HIGH**

---

## FINDING 3 — HIGH: Unbounded DNS Records — No Record Count Cap

**File:** `/Users/erichowens/coding/port-daddy/lib/dns.ts`

**Evidence:** The `list()` function has a `limit` parameter but the `register()` / `update()` write path has no count check. There is no `MAX_DNS_RECORDS` constant anywhere in the DNS module.

**Exploitation Scenario:** An attacker loops `POST /dns` with unique identity strings and unique hostnames. Each call inserts a new row. Over time this fills disk. The `listAll` query at `GET /dns` returns up to `limit` (default 100) rows but the table itself is unbounded.

**Comparison:** The webhooks module correctly defines `MAX_WEBHOOKS = 100` and checks `stmts.getAll.all().length` before any registration. The DNS module lacks this pattern entirely.

**Remediation:** Add `MAX_DNS_RECORDS` (e.g., 1000) and check count before INSERT in the `register()` function, mirroring the webhooks pattern.

**Severity: HIGH**

---

## FINDING 4 — HIGH: Session Notes Are Unbounded — No Per-Session or Global Limit

**File:** `/Users/erichowens/coding/port-daddy/lib/sessions.ts`
**Lines:** 555–590 (addNote), 595–643 (quickNote)

**Evidence:**
```typescript
function addNote(sessionId: string, content: string, options: AddNoteOptions = {}) {
  ...
  const result = stmts.insertNote.run(sessionId, trimmedContent, type, now);
```

No count check, no `MAX_NOTES_PER_SESSION` constant, no `MAX_NOTE_CONTENT_LENGTH` constant. The `content` field is stored as-is (after trimming) with no length cap in the module.

**Note content size is only bounded by the JSON body parser at 10KB (`server.ts` line 417), but an attacker can add 100,000 notes of 9KB each to a single session.**

**Exploitation Scenario:**

1. Create one session (`POST /sessions`).
2. Loop `POST /sessions/:id/notes` with 9,999-byte content payloads.
3. The session_notes table grows unboundedly. The `getNotes` query's `LIMIT` parameter only caps read results; it does not prevent writes.
4. The cleanup function only removes sessions older than 7 days, not their note count.

**Remediation:** Add `MAX_NOTES_PER_SESSION` (e.g., 1000) and `MAX_NOTE_CONTENT_LENGTH` (e.g., 4096 characters). Check note count before INSERT.

**Severity: HIGH**

---

## FINDING 5 — HIGH: Services Are Unbounded — Port Exhaustion and Table Inflation

**File:** `/Users/erichowens/coding/port-daddy/lib/services.ts`
**Lines:** 150–265 (claim)

**Evidence:**
```typescript
function claim(id: string, options: ClaimOptions = {}) {
  ...
  stmts.insert.run(
    parsed.normalized, port, pid, cmd, cwd, 'assigned', now, now, expiresAt, ...
  );
```

There is no total service count check. The only natural limit is the port range (3100–9999 = 6899 possible ports), but the `findAvailablePort` function throws when exhausted rather than returning a quota error. Before that threshold is reached, the services table can accumulate thousands of rows from rapidly cycling identities.

**Also:** The `metadata` field is stored as JSON with no size validation in the services module itself (validators.js has a 10KB check for metadata, but only when called from routes — the module itself has no guard).

**Remediation:** Add `MAX_SERVICES` (e.g., 500) and reject claims when the count is exceeded. The metadata size check in routes should be enforced at the module layer as a defense-in-depth measure.

**Severity: HIGH**

---

## FINDING 6 — MEDIUM: SSE Connection Limit Uses IP as Key, Meaningless on Unix Socket

**File:** `/Users/erichowens/coding/port-daddy/shared/connection-tracking.js`
**Lines:** 12–18, 41–50

**Evidence:**
```javascript
export const connectionLimits = {
  maxLongPoll: 50,
  maxSSE: 100,
  maxPerIP: 5,
  ...
};

export function canOpenConnection(ip, type) {
  const map = type === 'longPoll' ? activeConnections.longPoll : activeConnections.sse;
  const total = type === 'longPoll' ? activeConnections.totalLongPoll : activeConnections.totalSSE;
  ...
  const ipCount = map.get(ip) || ...;
  const count = type === 'sse' ? ipCount.size : ipCount;
  return count < connectionLimits.maxPerIP;
}
```

In `routes/messaging.ts` line 120:
```typescript
const clientIp: string = req.ip || 'unknown';
```

For Unix socket connections, `req.ip` is undefined. This means all Unix socket SSE subscribers are tracked under the key `'unknown'`. The `maxPerIP = 5` limit applies to the single key `'unknown'`, meaning the 6th SSE connection from any Unix socket client is rejected — but this also means that the effective global SSE limit for Unix socket clients is 5 connections total, not 100. This is both a DoS vector (a single legitimate agent opening 5 subscriptions blocks all others on the socket) and a design inconsistency.

The global limits (`maxSSE = 100`, `maxLongPoll = 50`) still apply and will correctly prevent catastrophic exhaustion, but the per-key logic is broken for the primary transport.

**Remediation:** For Unix socket connections, use the daemon-internal PID or session identifier as the tracking key, or use a separate per-PID limiter. At minimum, the `'unknown'` key should share the global pool without applying the per-IP cap.

**Severity: MEDIUM**

---

## FINDING 7 — MEDIUM: SSE Has a 5-Minute Timeout, But Long-Poll Has None

**File:** `/Users/erichowens/coding/port-daddy/routes/messaging.ts`
**Lines:** 134, 212–219

**Evidence:**

For SSE:
```typescript
const connectionTimeout = setTimeout(() => {
  ...
  res.end();
}, connectionLimits.sseTimeout); // 300000ms = 5 minutes
```

For long-poll (lines 134, 146–152):
```typescript
const timeout: number = Math.min(parseInt(req.query.timeout as string, 10) || 30000, 60000);
```

Long-poll has a 60-second cap on the requested timeout, enforced correctly. However, the `setInterval` at line 147 runs every 1000ms for the entire timeout duration, executing a SQLite query every second. With `maxLongPoll = 50` concurrent long-poll connections, this is 50 SQLite reads per second minimum — a sustained floor load that cannot be reduced by the caller.

**Remediation:** This is more of a design observation than a critical finding, but consider using a push-based notification model for long-poll (subscribe to in-memory channel, resolve on message) rather than polling SQLite at 1-second intervals.

**Severity: MEDIUM**

---

## FINDING 8 — MEDIUM: Webhook retryPending() Can Bypass Queue Size Check

**File:** `/Users/erichowens/coding/port-daddy/lib/webhooks.ts`
**Lines:** 499–517

**Evidence:**
```typescript
function retryPending() {
  const pending = stmts.getPendingDeliveries.all() as DeliveryRow[];

  for (const delivery of pending) {
    const webhook = stmts.getById.get(delivery.webhook_id) as WebhookRow | undefined;
    if (!webhook || !webhook.active) continue;

    deliveryQueue.push({  // <-- No MAX_QUEUE_SIZE check here
      deliveryId: delivery.id,
      ...
    });
  }
```

The `trigger()` function correctly checks `deliveryQueue.length >= MAX_QUEUE_SIZE` before pushing. The `retryPending()` function does not perform this check. `retryPending()` is called at daemon startup (`server.ts` line 517) and could push an unbounded number of entries from the database into the in-memory queue if many deliveries accumulated while the daemon was offline.

**Exploitation Scenario:** Flood 100 active webhooks with high-frequency events before shutdown, accumulating thousands of pending deliveries in the database. On next daemon start, `retryPending()` pushes all of them into the queue, consuming unbounded heap memory before any limits are checked.

**Remediation:** Apply the `MAX_QUEUE_SIZE` check inside `retryPending()`'s loop, mirroring the `trigger()` function's guard at line 390.

**Severity: MEDIUM**

---

## FINDING 9 — MEDIUM: Webhook Retry Loop — Exponential Backoff Timers Accumulate

**File:** `/Users/erichowens/coding/port-daddy/lib/webhooks.ts`
**Lines:** 453–469

**Evidence:**
```typescript
if (attempt < MAX_RETRY_ATTEMPTS) {
  const delay = Math.pow(2, attempt - 1) * 1000;
  const timer = setTimeout(() => deliverWebhook(delivery, attempt + 1), delay);
  if (typeof timer.unref === 'function') timer.unref();
}
```

`deliverWebhook()` is called from `processQueue()`, which holds `processingQueue = true` until the queue is drained. But retries are scheduled via `setTimeout` outside the queue, so they fire independently. If 10,000 deliveries all fail and retry, there will be up to 50,000 pending timers (5 retries each) active simultaneously. Each timer holds a closure with the delivery payload. This creates a memory leak proportional to the number of failed deliveries multiplied by the retry count.

**Aggravating Factor:** The `deliveryQueue` array is cleared by `processQueue()`, but the retry timers call `deliverWebhook()` directly (bypassing the queue), which means they also bypass the `MAX_QUEUE_SIZE` check entirely.

**Remediation:** Retries should be re-queued through `deliveryQueue` rather than scheduled via free-floating `setTimeout` calls. This would also make them subject to queue size limits.

**Severity: MEDIUM**

---

## FINDING 10 — MEDIUM: Locks Can Be Created Without Limit

**File:** `/Users/erichowens/coding/port-daddy/lib/locks.ts`
**Lines:** 88–186 (acquire)

**Evidence:**
```typescript
function acquire(name: string, options: AcquireOptions = {}) {
  ...
  // No count check before INSERT
  stmts.acquire.run(name, owner, pid, now, expiresAt, ...);
```

The `MAX_TTL = 3600000` (1 hour) and `MAX_TTL` enforcement are correct. However, there is no `MAX_LOCKS` constant and no check on the total number of locks before insertion. The per-agent check (`canAcquireLock`) exists in `lib/agents.ts` but is only applied to registered agents, and only when routes explicitly call it — it is not enforced at the locks module layer.

**Exploitation Scenario:** An attacker rotates through unique lock names (`attack-lock-0000001` through `attack-lock-9999999`) while continuously acquiring them. Each call acquires a new lock. The locks table grows unboundedly until disk is full or SQLite performance degrades.

**The 1-hour TTL and the `releaseExpired` call at the start of each `acquire()` call do limit sustained damage** — expired locks are cleaned before each insert — but during the TTL window, the table can still accumulate `requests_per_second * 3600` rows.

**Remediation:** Add `MAX_TOTAL_LOCKS = 10000` and a count check before INSERT. Also, enforce `canAcquireLock()` at the locks module layer rather than relying on routes to call it.

**Severity: MEDIUM**

---

## FINDING 11 — LOW: Wildcard SSE Subscriber Counts Against Per-Channel Limit, Not Separately

**File:** `/Users/erichowens/coding/port-daddy/lib/messaging.ts`
**Lines:** 222–256, 261–283

**Evidence:**
```typescript
// Also notify wildcard subscribers
const wildcardSubs = subscribers.get('*');
if (wildcardSubs) {
  for (const callback of wildcardSubs) {
    callback({ ...message, channel });
  }
}
```

The wildcard channel `'*'` is subject to the same `MAX_SUBSCRIBERS_PER_CHANNEL = 100` limit as any other channel. A subscriber to `'*'` receives every message published to every channel. This means 100 wildcard subscribers can receive every message — effectively multiplying notification work by 100 for every publish operation.

**Remediation:** Consider a lower limit for the wildcard channel (e.g., `MAX_WILDCARD_SUBSCRIBERS = 10`) or document this behavior explicitly.

**Severity: LOW**

---

## FINDING 12 — LOW: No Limit on Number of Registered Agents

**File:** `/Users/erichowens/coding/port-daddy/lib/agents.ts`
**Lines:** 154–249 (register)

**Evidence:**
```typescript
function register(agentId: string, options: RegisterOptions = {}) {
  ...
  stmts.register.run(agentId, name, pid, type, ...) // INSERT OR REPLACE
```

The register statement uses `INSERT OR REPLACE`, which is idempotent for the same `agentId`. However, there is no limit on unique agent IDs. An attacker can register millions of distinct agent IDs (`agent-00001` through `agent-99999`) without limit.

The agents table is scanned in full during the cleanup loop in `server.ts` (lines 335–356), which calls `sessions.list()` for every non-active agent. With millions of agents, this cleanup becomes an O(n) operation that can block the event loop for seconds at each `config.cleanup.interval_ms` tick.

**Remediation:** Add `MAX_REGISTERED_AGENTS = 500` and reject registrations when at capacity.

**Severity: LOW**

---

## FINDING 13 — LOW: Activity Log Has a Hard Cap but No Rate Limiting Per Entry Source

**File:** `/Users/erichowens/coding/port-daddy/lib/activity.ts`
**Lines:** 10–11

**Evidence:**
```typescript
const MAX_LOG_ENTRIES = 10000;
const LOG_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
```

The `cleanup()` function trims entries when the count exceeds 10,000. This is the correct approach. However, the cleanup is called only once per `config.cleanup.interval_ms` (default 5 minutes). Between cleanup cycles, the table can grow beyond 10,000 rows if writes are fast enough. A flood attack can write 10,000+ entries in seconds, causing the table to balloon temporarily.

This is mitigated by the fact that `activityLog.log()` is only called from internal code, not from arbitrary user input. But combined with the rate limiter bypass (Finding 1) and unbounded sessions/notes (Finding 4), an indirect activity log flood is possible.

**Severity: LOW**

---

## FINDING 14 — INFO: No ReDoS Vulnerabilities Found in Identity and Lock Patterns

**Files Checked:**
- `/Users/erichowens/coding/port-daddy/lib/identity.ts` — `IDENTITY_REGEX = /^[a-zA-Z0-9._*-]+$/`
- `/Users/erichowens/coding/port-daddy/lib/locks.ts` line 94 — `/^[a-zA-Z0-9:_-]+$/`
- `/Users/erichowens/coding/port-daddy/lib/agents.ts` line 159 — `/^[a-zA-Z0-9:_-]+$/`
- `/Users/erichowens/coding/port-daddy/shared/validators.js` — All channel, identity, agent, lock, env, and URL validators
- `/Users/erichowens/coding/port-daddy/lib/detect.ts` — `gemRegex`, `depRegex`, `groupRegex`, `pkgRegex`

All regular expressions use anchored character classes (`[...]`) with no nested quantifiers. None of the patterns exhibit polynomial backtracking characteristics. The detect.ts patterns iterate over file content using `exec()` in a `while` loop, which is the correct pattern for `g`-flagged regexes and does not cause catastrophic backtracking.

The `safeGlobMatch()` function in `lib/webhooks.ts` (lines 333–357) does not use regex at all — it performs linear string index searching. This is safe.

**Severity: INFO — No action required**

---

## FINDING 15 — INFO: getMessages() `after` Parameter Has No Upper Bound Validation

**File:** `/Users/erichowens/coding/port-daddy/routes/messaging.ts`
**Lines:** 104–107

**Evidence:**
```typescript
const result = messaging.getMessages((req.params.channel as string), {
  limit: safeLimit,
  after: after ? parseInt(after as string, 10) : null
});
```

The `after` parameter is parsed as an integer with no validation of range. Passing `after=NaN` (via `?after=abc`) results in `parseInt` returning `NaN`, which is then passed to the prepared statement `WHERE id > ?`. SQLite treats `NaN` as `NULL`, which would cause the query to return all records without an `after` filter. This is a logical quirk rather than a security issue, since the limit cap prevents unbounded result sets.

**Severity: INFO — Input sanitization improvement recommended but not a security issue**

---

## SUMMARY TABLE

| Finding | Severity | File | Issue |
|---------|----------|------|-------|
| 1 | CRITICAL | server.ts:397–404 | Rate limiter bypassed for all Unix socket and localhost traffic |
| 2 | HIGH | lib/agent-inbox.ts:62–65 | No per-agent inbox message count limit |
| 3 | HIGH | lib/dns.ts | No DNS record count cap |
| 4 | HIGH | lib/sessions.ts:555–590 | Notes unbounded in count and content length |
| 5 | HIGH | lib/services.ts:150–265 | No total service count limit |
| 6 | MEDIUM | shared/connection-tracking.js:41–50 | IP tracking broken for Unix socket clients (all share `'unknown'` key) |
| 7 | MEDIUM | routes/messaging.ts:146–152 | Long-poll polling SQLite every 1s per connection |
| 8 | MEDIUM | lib/webhooks.ts:499–517 | retryPending() bypasses MAX_QUEUE_SIZE |
| 9 | MEDIUM | lib/webhooks.ts:453–469 | Free-floating retry timers bypass queue limits |
| 10 | MEDIUM | lib/locks.ts:88–186 | No total lock count limit |
| 11 | LOW | lib/messaging.ts:261–283 | Wildcard channel subscriber multiplies every publish |
| 12 | LOW | lib/agents.ts:154–249 | No registered agent count limit |
| 13 | LOW | lib/activity.ts:10–11 | Log cap enforced only at cleanup interval |
| 14 | INFO | lib/identity.ts, detect.ts, etc. | No ReDoS vulnerabilities found |
| 15 | INFO | routes/messaging.ts:104–107 | after=NaN coerces to NULL in SQLite query |

---

## REMEDIATION PRIORITY

**Immediate (block on next release):**

Finding 1 is the root cause that makes most other findings exploitable at scale. The rate limiter should be replaced with a per-PID or per-calling-process quota enforced at the module layer or via a SQLite-backed request counter. Alternatively, remove the misleading rate limiter entirely and document that security relies on Unix socket filesystem permissions, then add hard record count limits at every INSERT site (Findings 2–5, 10, 12) to contain the damage.

**Short term:**

Fix Findings 2–5 and 10 (add MAX constants and count checks before every unbounded INSERT). Fix Finding 8 (retryPending queue size check). Fix Finding 9 (route retries through the queue).

**Medium term:**

Fix Finding 6 (Unix socket connection tracking). The `'unknown'` key collapsing all socket clients is both a false denial-of-service risk and makes the per-IP limit meaningless for the primary transport.
