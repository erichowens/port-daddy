Now I have a thorough picture of the entire codebase. Let me compile the complete security audit report.

---

# Port Daddy Security Audit Report

## Executive Summary

Port Daddy is a developer tool designed explicitly for localhost use. Most findings below reflect deliberate design trade-offs for a local dev tool, but several represent real risk even in that context — particularly around privilege escalation, information disclosure, and SSRF in the health check module. The overall security posture is reasonable for its stated purpose, with two HIGH findings that warrant attention.

---

## 1. Authentication and Authorization

### FINDING AUTH-01 — No Authentication on Any Endpoint
**Severity: MEDIUM (accepted design trade-off, but scope matters)**

**File:** `server.ts`, lines 384–410; `routes/index.ts`, entire file

**Evidence:**
```typescript
// server.ts lines 397–404
skip: (req: Request): boolean => {
  if (req.path === '/health' || req.path === '/version') return true;
  const ip = req.ip || req.socket.remoteAddress || '';
  if (!ip) return true;
  // Skip for localhost/loopback (this is a local dev tool)
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  return false;
},
```

There is zero authentication on any API endpoint. Every route — including destructive ones like `DELETE /resurrection/:agentId`, `DELETE /projects/:id`, `DELETE /sessions/:id`, and `POST /resurrection/reap` — is fully accessible to any process that can reach the socket or TCP port.

**Exploitation Scenario:**
Any process running as the same user (or any process with loopback access, including a compromised browser tab making a cross-origin fetch to `localhost:9876` if CORS is misconfigured) can:
- Unregister arbitrary agents
- Delete sessions and cascade-delete all their notes
- Trigger the reaper to force-mark agents dead
- Claim resurrection of any dead agent's work context
- Register webhooks pointing to external URLs

**Remediation:**
For a localhost-only tool, this is a known and accepted trade-off. However, consider adding an optional shared secret (generated on daemon start, written to the port file or a companion file readable only by the owning user) that clients present as a header. This would prevent cross-process attacks. At minimum, document explicitly that the daemon should never be exposed beyond loopback.

---

### FINDING AUTH-02 — Rate Limiter is Completely Bypassed for All Localhost Traffic
**Severity: MEDIUM**

**File:** `server.ts`, lines 397–404

**Evidence:**
```typescript
if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
```

The rate limiter unconditionally skips all loopback-originating requests. Combined with no authentication, any local process can flood all endpoints at unlimited rates. This includes the webhook trigger path, which does async HTTP delivery, and the `POST /scan` endpoint which does filesystem traversal.

**Exploitation Scenario:**
A compromised or buggy local process can hammer `POST /scan` with arbitrary filesystem paths at CPU-saturating rates. It can also flood the webhook delivery queue (capped at `MAX_QUEUE_SIZE = 10000`) to exhaust it, blocking legitimate webhook delivery.

**Remediation:**
Apply lightweight rate limiting even for loopback clients, or at minimum rate-limit specific high-cost endpoints (`/scan`, `/webhooks/:id/test`, `/wait/*`) regardless of origin IP.

---

### FINDING AUTH-03 — Agent Identity Can Be Fully Impersonated
**Severity: MEDIUM**

**File:** `routes/agents.ts`, line 88; `routes/locks.ts`, lines 65, 78, 121, 184; `lib/agents.ts`, lines 154–165

**Evidence:**
```typescript
// routes/locks.ts line 78
owner: owner || req.headers['x-agent-id'] || `agent-${process.pid}`,
```

Agent IDs are self-declared strings in either the request body or the `X-Agent-ID` header. Any client can claim any agent ID. There is no ownership verification. This means:

- Agent A can send a heartbeat claiming to be Agent B, keeping B alive indefinitely
- Agent A can acquire locks in the name of Agent B, bypassing B's lock quota
- Agent A can unregister Agent B entirely (`DELETE /agents/:id`)
- Agent A can claim B's resurrection queue entry, stealing B's session context

**Exploitation Scenario:**
In a multi-agent scenario, a rogue agent registers as an existing agent ID to inherit that agent's identity, purpose field, and any associated session context. The rogue agent then calls `POST /resurrection/claim/<victim-agent-id>` to receive the victim's full session notes and file claims.

**Remediation:**
This is fundamental to the current architecture. The recommended direction is a per-agent token issued at registration time (a random secret returned once and stored in `.portdaddy/current.json`). Subsequent API calls for that agent ID would need to present the token. The CLI already writes to `.portdaddy/current.json`, making this an achievable upgrade.

---

### FINDING AUTH-04 — Force-Release of Any Lock Without Ownership Proof
**Severity: MEDIUM**

**File:** `routes/locks.ts`, lines 115–148; `lib/locks.ts`, lines 191–223

**Evidence:**
```typescript
// routes/locks.ts line 118-122
const { owner, force } = req.body || {};
const result = locks.release(name, {
  owner: owner || req.headers['x-agent-id'],
  force: force === true
});
```

The `force` flag is accepted directly from the request body. Any client can send `{"force": true}` to release any lock held by any agent, regardless of who acquired it.

**Exploitation Scenario:**
Agent A holds a critical lock protecting a shared database migration. Agent B sends `DELETE /locks/db-migration {"force": true}` and steals the lock window, causing a race condition and potential data corruption.

**Remediation:**
The `force` parameter should either be removed from the public API entirely (making forced release a daemon-internal-only operation triggered by TTL expiry and agent cleanup), or require a secondary verification such as the holder's agent token.

---

## 2. SSRF (Server-Side Request Forgery)

### FINDING SSRF-01 — Health Check Module Has No SSRF Protection
**Severity: HIGH**

**File:** `lib/health.ts`, lines 54–117; `routes/health.ts`

**Evidence:**
```typescript
// lib/health.ts lines 68-116
function checkUrl(url: string, timeout = 5000): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.get(url, { timeout }, (res) => { ... });
    }
  });
}
```

The `checkUrl` function makes outbound HTTP/HTTPS requests to any URL with **no validation of private IP ranges, loopback addresses, or metadata endpoints**. The webhook module correctly implements a `PRIVATE_IP_PATTERNS` blocklist — the health module does not implement any equivalent.

The `healthUrl` field is set when a service is claimed (`POST /claim`) and stored in the database. A client claims a service with:
```json
{
  "id": "myapp:api",
  "healthUrl": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"
}
```

Then `GET /services/health/myapp:api` triggers the daemon to fetch that cloud metadata URL and the latency and status code are returned in the response.

**Exploitation Scenario (Cloud Instance):**
1. Register a service with `healthUrl` pointing to `http://169.254.169.254/latest/meta-data/` (AWS IMDS v1)
2. Call `GET /services/health/myapp:api` — daemon makes the request
3. Response includes `statusCode: 200` confirming the endpoint is reachable
4. An attacker on the same machine with access to Port Daddy (any localhost process) can use the daemon as an SSRF relay to probe and potentially exfiltrate IAM credentials from the instance metadata service

Additionally, `checkUrl` is exported from `lib/health.ts` (line 346) and is callable directly through the health module if future routes expose it.

**Remediation:**
Apply the same `PRIVATE_IP_PATTERNS` blocklist from `lib/webhooks.ts` to the `checkUrl` function before making the request. Additionally, resolve the hostname to its IP address and validate the resolved IP, since a malicious hostname could resolve to a private IP (DNS rebinding).

---

### FINDING SSRF-02 — Webhook URL Validation Bypasses DNS Rebinding
**Severity: MEDIUM**

**File:** `lib/webhooks.ts`, lines 209–214, 224–236

**Evidence:**
```typescript
function isPrivateHost(hostname: string): boolean {
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) return true;
  }
  return false;
}
// ...
if (isPrivateHost(parsed.hostname)) {
  return { success: false, error: 'Webhook URLs cannot target private or internal addresses' };
}
```

The `PRIVATE_IP_PATTERNS` check runs against the hostname **at registration time** only, using string matching, not DNS resolution. A DNS rebinding attack can bypass this:

1. Register webhook with `https://attacker.com/hook` — passes the IP check
2. Attacker controls DNS for `attacker.com` and changes the A record to `192.168.1.1` (internal network IP)
3. When the daemon delivers the next webhook, it resolves the hostname to the internal IP and makes the request to the internal network

**Remediation:**
At delivery time, resolve the webhook URL's hostname to its IP address and validate the resolved IP against `PRIVATE_IP_PATTERNS` before making the HTTP request. Node.js's `dns.lookup()` can be used for this. This is the standard defense against DNS rebinding in SSRF contexts.

---

### FINDING SSRF-03 — Config Route Accepts Arbitrary Filesystem Paths
**Severity: MEDIUM**

**File:** `routes/config.ts`, lines 28–56; `routes/projects.ts`, lines 57–137

**Evidence:**
```typescript
// routes/config.ts lines 30-33
const { dir } = req.query;
const targetDir: string = (dir as string) || process.cwd();
const config = loadConfig(targetDir);
```

```typescript
// routes/projects.ts lines 59-63
const { dir, save = true, dryRun = false, useBranch = false } = req.body;
const targetDir: string = dir || process.cwd();
const result = scanProject(targetDir, { useBranch });
```

Any client can supply an arbitrary directory path. `GET /config?dir=/etc` would attempt to read `/etc/.portdaddyrc`. `POST /scan {"dir": "/", "save": false}` would recursively walk the entire filesystem. `POST /scan {"dir": "/Users/erichowens", "save": true}` would write a `.portdaddyrc` file into the user's home directory.

`loadConfig` in `lib/config.ts` uses `findConfig`, which walks upward from the given directory using `join(current, '..')`. There is no path canonicalization or containment check.

**Exploitation Scenario:**
- Path traversal via directory walking: `GET /config?dir=/etc` traverses upward looking for `.portdaddyrc` in `/etc`, then `/`, potentially reading any world-readable file on the path if a config file happens to exist there
- Arbitrary filesystem writes: `POST /scan {"dir": "/tmp/malicious", "save": true}` writes a `.portdaddyrc` to `/tmp/malicious/.portdaddyrc`
- Filesystem enumeration: `POST /scan` reveals directory structure, framework detection results, and file existence for any path the daemon process can read

**Remediation:**
Validate and sanitize the `dir` parameter. At minimum, reject paths containing `..` or that resolve outside of a set of allowed root directories (e.g., paths under the user's home directory). Consider removing the `dir` parameter from `GET /config` entirely — the daemon can always read its own cwd-relative config. For `POST /scan`, apply `path.resolve()` and compare against an allowlist of acceptable roots.

---

## 3. Secrets and Credential Exposure

### FINDING SECRET-01 — Installation Directory Exposed in /version Response
**Severity: LOW**

**File:** `routes/info.ts`, lines 75–87

**Evidence:**
```typescript
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: VERSION,
    codeHash: CODE_HASH,
    startedAt: STARTED_AT,
    service: 'port-daddy',
    api: 'semantic',
    node_version: process.version,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    installDir: __dirname   // <-- FULL FILESYSTEM PATH EXPOSED
  });
});
```

The `GET /version` endpoint returns the daemon's installation directory as an absolute path (e.g., `/Users/erichowens/coding/port-daddy`). This also reveals the username, home directory structure, and project layout. The PID is also included, which aids in targeting the daemon process.

**Exploitation Scenario:**
Combined with SSRF-03, an attacker who learns the install directory from `/version` can then craft a precise `GET /config?dir=/Users/erichowens/coding/port-daddy` request to read the daemon's own `.portdaddyrc`, which may contain service configurations, database credentials in `env` fields, or internal project structure.

**Remediation:**
Remove `installDir` from the `/version` response. It provides no value to legitimate API consumers. The PID is borderline — it's useful for tooling but could be removed or gated.

---

### FINDING SECRET-02 — Webhook Secrets Stored Plaintext in SQLite
**Severity: LOW**

**File:** `lib/webhooks.ts`, lines 140–172 (schema), lines 396–402 (delivery)

**Evidence:**
```sql
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  secret TEXT,    -- stored as plaintext
  ...
)
```

```typescript
deliveryQueue.push({
  deliveryId,
  webhookId: webhook.id,
  url: webhook.url,
  secret: webhook.secret,  // raw plaintext secret from DB
  payload
});
```

Webhook signing secrets are stored as plaintext in the SQLite database (`port-registry.db` in the project root). The `.gitignore` correctly excludes `*.db` files, but the database is readable by any process running as the same OS user. The `parseWebhook` function correctly omits the secret from API responses (`hasSecret: !!row.secret`), but the secret is fully recoverable from the database.

**Exploitation Scenario:**
A process with read access to `port-registry.db` (same user as daemon) can read all webhook secrets and forge signed payloads to any registered webhook endpoint, bypassing HMAC verification on the receiving end.

**Remediation:**
Store webhook secrets as HMAC-SHA256 hashes of the user-provided secret, not the raw secret. Alternatively, use an OS keychain (macOS Keychain, Linux Secret Service) for secret storage. Note that hashing the secret does change the signing behavior — the daemon would need the raw secret to sign, so a better approach is one-way storage combined with a note to users that secrets cannot be retrieved after registration.

---

### FINDING SECRET-03 — Scan Response Leaks Internal Filesystem Paths
**Severity: LOW**

**File:** `routes/projects.ts`, lines 102–130

**Evidence:**
```typescript
res.json({
  success: true,
  project: result.project,
  root: result.root,            // absolute path e.g. /Users/erichowens/coding/myapp
  ...
  savedPath,                    // absolute path to saved .portdaddyrc
  ...
  existingConfig: result.existingConfig ? {
    path: (result.existingConfig as Record<string, unknown>)._path,  // absolute path
    ...
  } : null
});
```

The `POST /scan` response includes absolute filesystem paths (`root`, `savedPath`, `existingConfig.path`). These leak the full directory layout of the host system.

**Remediation:**
Return paths relative to a known base (e.g., the project root or home directory) rather than absolute paths in API responses.

---

### FINDING SECRET-04 — .gitignore Missing Patterns for Sensitive Port Daddy Runtime Files
**Severity: LOW**

**File:** `.gitignore`

**Evidence:**
The `.gitignore` excludes `*.db` (database files) and `.portdaddy/` (CLI context files). However, it does not exclude:
- `port-daddy.log` and `port-daddy-error.log` — log files contain full request paths, service IDs, agent IDs, and timing data
- `config.json` — the daemon config file, if created, could contain port ranges and custom settings
- `/tmp/port-daddy.sock` and `/tmp/port-daddy-port` are outside the project but worth noting in documentation

The log files are excluded via `*.log` which does cover this. However, `config.json` at the project root is not excluded and could be committed.

**Remediation:**
Add `config.json` to `.gitignore` if that file is user-generated. The `*.log` exclusion already covers log files.

---

## 4. Cryptographic Issues

### FINDING CRYPTO-01 — No Constant-Time Comparison for Webhook HMAC Signatures
**Severity: LOW (daemon-side issue only)**

**File:** `lib/webhooks.ts`, lines 327–331

**Evidence:**
```typescript
function signPayload(payload: unknown, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}
```

Port Daddy generates HMAC signatures for webhook delivery. The daemon does not verify incoming HMAC signatures — it only generates them. The receiving webhook endpoint is responsible for verification. If the receiving endpoint uses Port Daddy's client SDK for verification and implements a naive `===` string comparison, it would be vulnerable to timing attacks. The daemon itself is not exposed here, but no guidance is provided to consumers about constant-time comparison.

**Exploitation Scenario:**
A receiving endpoint using string equality (`===`) to compare the `X-PortDaddy-Signature` header against an expected value is vulnerable to timing-based signature forgery.

**Remediation:**
Document in the SDK and README that receivers must use `crypto.timingSafeEqual()` for signature comparison. Consider providing a verification helper function in the SDK that correctly implements constant-time comparison.

---

### FINDING CRYPTO-02 — Session and Agent IDs Have Low Entropy
**Severity: LOW**

**File:** `lib/sessions.ts`, line 332; `lib/sugar.ts`, line 79

**Evidence:**
```typescript
// lib/sessions.ts line 332
return 'session-' + randomBytes(4).toString('hex');

// lib/sugar.ts line 79
const agentId = options.agentId || `agent-${randomBytes(4).toString('hex')}`;
```

Session IDs use only 4 bytes (32 bits) of entropy, yielding 4,294,967,296 possible values. Agent IDs auto-generated by `sugar.begin()` also use 4 bytes. By contrast, `randomUUID()` (used for webhook IDs) provides 122 bits of entropy.

**Exploitation Scenario:**
With 32-bit IDs and birthday paradox math, there is a ~50% collision probability after approximately 65,000 sessions are created. More practically, a local attacker who knows the format could enumerate valid session IDs in `GET /sessions/:id` requests. Given no authentication and no rate limiting for loopback clients, 2^32 requests is not infeasible on a fast machine.

**Remediation:**
Increase to `randomBytes(16).toString('hex')` (128 bits, 32 hex characters) or use `randomUUID()` from the crypto module, which is already imported in `lib/webhooks.ts`. The current 4-byte value is insufficient for security-sensitive identifiers.

---

### FINDING CRYPTO-03 — Lock Ownership Verification Uses Self-Reported Strings
**Severity: MEDIUM (see AUTH-03)**

**File:** `lib/locks.ts`, lines 191–223

**Evidence:**
```typescript
function release(name: string, options: ReleaseOptions = {}) {
  const { owner = null, force = false } = options;
  ...
  if (owner && !force) {
    const result = stmts.releaseIfOwner.run(name, owner);
    ...
  }
}
```

Lock ownership is verified by comparing the provided `owner` string against the stored value. Since the `owner` is client-provided with no authentication, any client that knows (or guesses) another agent's ID can release that agent's locks by claiming to be that owner. This is a direct consequence of AUTH-03 — there are no cryptographic credentials binding an agent ID to a specific caller.

**Remediation:**
Same as AUTH-03: introduce per-agent tokens at registration time and require the token for ownership-sensitive operations (lock release, session modification, agent unregister).

---

## 5. Information Disclosure

### FINDING INFO-01 — /health Exposes PID in Production
**Severity: LOW**

**File:** `routes/info.ts`, lines 106–115

**Evidence:**
```typescript
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    active_ports: serviceResult.success ? serviceResult.count : 0,
    pid: process.pid   // <-- exposed
  });
});
```

The `/health` endpoint (exempted from rate limiting) exposes the daemon's PID. Combined with the knowledge of the process name, this aids in targeted signal delivery or process inspection attacks.

**Remediation:**
Remove `pid` from `/health`. It belongs in `/version` at most, and as noted in SECRET-01, even `/version` should reconsider its exposure surface.

---

### FINDING INFO-02 — Scan Error Messages Leak Internal Details
**Severity: LOW**

**File:** `routes/projects.ts`, lines 132–136

**Evidence:**
```typescript
} catch (error) {
  metrics.errors++;
  logger.error('scan_error', { error: (error as Error).message });
  res.status(500).json({ error: 'scan failed', details: (error as Error).message });
}
```

The `POST /scan` error handler returns `(error as Error).message` directly to the client in the `details` field. Node.js filesystem errors include full absolute paths in their messages (e.g., `ENOENT: no such file or directory, open '/Users/erichowens/secrets/.portdaddyrc'`). This leaks filesystem structure.

By contrast, most other routes correctly return only `'internal server error'` for unexpected exceptions.

**Remediation:**
Remove the `details` field from the scan error response, or sanitize it to remove absolute paths before returning.

---

### FINDING INFO-03 — Activity Log Accessible Without Any Filtering or Auth
**Severity: LOW**

**File:** `routes/activity.ts` (not read, but inferred from API table)

The `GET /activity` and `GET /activity/range` endpoints expose a full audit trail including agent IDs, service names, session IDs, purposes, and timing. This gives any local process a complete picture of all agent activity on the system, which in a multi-user shared environment could be sensitive.

**Remediation:**
For a single-user localhost tool this is acceptable. In shared environments, consider adding a project-scoped filter parameter so agents only see activity relevant to their project.

---

## Summary Table

| ID | Category | Severity | File | Finding |
|----|----------|----------|------|---------|
| AUTH-01 | Authentication | MEDIUM | `server.ts` | No authentication on any endpoint |
| AUTH-02 | Authentication | MEDIUM | `server.ts` | Rate limiter completely bypassed for loopback |
| AUTH-03 | Authentication | MEDIUM | `routes/agents.ts`, `routes/locks.ts` | Agent identity is self-declared, enables impersonation |
| AUTH-04 | Authentication | MEDIUM | `routes/locks.ts` | Force-release of any lock without proof of ownership |
| SSRF-01 | SSRF | HIGH | `lib/health.ts` | Health check `checkUrl()` has no SSRF protection |
| SSRF-02 | SSRF | MEDIUM | `lib/webhooks.ts` | Webhook validation does not prevent DNS rebinding |
| SSRF-03 | SSRF | MEDIUM | `routes/config.ts`, `routes/projects.ts` | Arbitrary filesystem path traversal via `dir` parameter |
| SECRET-01 | Information Disclosure | LOW | `routes/info.ts` | Installation directory and PID in `/version` |
| SECRET-02 | Secrets | LOW | `lib/webhooks.ts` | Webhook signing secrets stored plaintext in SQLite |
| SECRET-03 | Information Disclosure | LOW | `routes/projects.ts` | Scan response leaks absolute filesystem paths |
| SECRET-04 | Configuration | LOW | `.gitignore` | `config.json` not excluded |
| CRYPTO-01 | Cryptography | LOW | `lib/webhooks.ts` | No guidance on constant-time HMAC verification for consumers |
| CRYPTO-02 | Cryptography | LOW | `lib/sessions.ts`, `lib/sugar.ts` | 32-bit session and agent ID entropy is insufficient |
| CRYPTO-03 | Cryptography | MEDIUM | `lib/locks.ts` | Lock ownership verification uses unauthenticated strings |
| INFO-01 | Information Disclosure | LOW | `routes/info.ts` | PID exposed in `/health` endpoint |
| INFO-02 | Information Disclosure | LOW | `routes/projects.ts` | Scan errors return raw Node.js error messages with paths |
| INFO-03 | Information Disclosure | LOW | `routes/activity.ts` | Activity log is globally readable without scoping |

## Priority Recommendations

1. **SSRF-01** is the highest priority. Add the `PRIVATE_IP_PATTERNS` block (already present in `lib/webhooks.ts`) to `lib/health.ts`'s `checkUrl()` function. This is a direct copy and requires minimal work.

2. **SSRF-03** — sanitize the `dir` parameter in `routes/config.ts` and `routes/projects.ts` by calling `path.resolve()` and rejecting paths outside an allowed root. This prevents filesystem enumeration and arbitrary writes.

3. **CRYPTO-02** — increase session and agent ID entropy from `randomBytes(4)` to `randomBytes(16)` or `randomUUID()`. One-line change in two files.

4. **SSRF-02** — add DNS resolution check before webhook delivery. The fix requires resolving the hostname and checking the resolved IP against `PRIVATE_IP_PATTERNS` in `deliverWebhook()`.

5. **SECRET-01** — remove `installDir` from the `/version` response.
