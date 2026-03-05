Now I have enough evidence. Let me compile the full audit report.

---

# Port Daddy Security Audit Report

**Date:** 2026-03-04
**Scope:** Dependencies, Express configuration, dashboard XSS, MCP server, CLI, and environment/configuration security.
**Auditor note:** `npm audit` could not be executed due to Bash access restrictions. The dependency CVE assessment below is based on static analysis of `package.json` version ranges and known vulnerability history for each package. The owner should run `npm audit` directly to obtain the authoritative CVE list.

---

## 1. Dependency Vulnerabilities

### FINDING DEP-01 — MEDIUM: All production dependencies use SemVer ranges, not pinned versions

**File:** `/Users/erichowens/coding/port-daddy/package.json`, lines 83–89

**Evidence:**
```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.27.1",
  "better-sqlite3": "^12.6.2",
  "cors": "^2.8.5",
  "express": "^4.18.2",
  "express-rate-limit": "^8.2.1",
  "tsx": "^4.21.0",
  "winston": "^3.19.0"
}
```

**Exploitation Scenario:** The `^` prefix allows minor and patch updates automatically. If any dependency ships a compromised patch release (supply chain attack, as occurred with `event-stream`, `ua-parser-js`, `colors`, etc.), the next `npm install` on any machine — including CI — silently installs the malicious version. `tsx` is particularly sensitive because it runs TypeScript at startup time with full Node.js access.

**Remediation:** Pin all production dependencies to exact versions (`"express": "4.18.2"`, no caret). Use `package-lock.json` with `npm ci` in CI. Periodically update with `npm update` and review diffs explicitly. Consider Renovate or Dependabot for automated audited updates.

---

### FINDING DEP-02 — MEDIUM: `tsx` is a production dependency executing TypeScript at runtime

**File:** `/Users/erichowens/coding/port-daddy/package.json`, line 88

**Evidence:**
```json
"tsx": "^4.21.0"
```
`tsx` is listed as a production dependency and used to start the server: `"start": "tsx server.ts"`.

**Exploitation Scenario:** `tsx` is a TypeScript runtime that uses esbuild under the hood and has full filesystem and subprocess access. It is a substantial attack surface addition for what is fundamentally a runtime tool. Its `^` range means any `tsx` patch with a vulnerability is auto-adopted. Additionally, when Port Daddy is installed as an npm package, `tsx` is shipped as a production runtime dependency even though it is only needed for development-style execution.

**Remediation:** Either compile TypeScript to JavaScript before production distribution (which `package.json` already supports via `"build": "tsc"` and the `dist/` exports) and remove `tsx` from production `dependencies` to `devDependencies`, or accept the risk and pin to an exact version. The `prepublishOnly` build step suggests the intent was to ship compiled JS; `tsx` should not be a production dependency.

---

### FINDING DEP-03 — INFO: `cors` package is outdated and unmaintained (v2.8.5 is 8+ years old)

**File:** `/Users/erichowens/coding/port-daddy/package.json`, line 85

**Evidence:**
```json
"cors": "^2.8.5"
```

**Exploitation Scenario:** The `cors` package has not had a major release since 2018. While no active CVEs are currently known, unmaintained packages accumulate security debt. The package is simple enough that the risk is low, but it is worth monitoring.

**Remediation:** Consider implementing CORS manually using Express middleware for a zero-dependency solution, or switch to a maintained alternative. At minimum, run `npm audit` regularly.

---

### FINDING DEP-04 — INFO: devDependencies cannot directly affect production, but can affect CI pipelines

**File:** `/Users/erichowens/coding/port-daddy/package.json`, lines 94–105

**Evidence:**
```json
"devDependencies": {
  "@swc/core": "^1.15.11",
  "@swc/jest": "^0.2.39",
  ...
  "jest": "^30.2.0",
  "supertest": "^7.2.2"
}
```

**Exploitation Scenario:** `@swc/core` and `@swc/jest` are native binaries. A malicious preinstall script in a compromised `@swc/core` patch release would execute during `npm install` in CI, with access to secrets in CI environment variables (API keys, deploy tokens). These are all caret-pinned.

**Remediation:** Pin devDependencies to exact versions as well. Use `npm ci --ignore-scripts` in CI where possible to block preinstall/postinstall script execution.

---

## 2. Express.js Configuration

### FINDING EXP-01 — HIGH: No security headers middleware (Helmet absent)

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, lines 383–419

**Evidence:** There is no `helmet` import or any equivalent manual header setting anywhere in `server.ts` or `routes/index.ts`. The Express app is initialized as:

```typescript
const app: Express = express();
app.use(rateLimit(...));
app.use(cors(...));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(join(__dirname, 'public')));
```

Missing headers include:
- `X-Content-Type-Options: nosniff` — allows MIME-type sniffing attacks
- `X-Frame-Options: DENY` — the dashboard can be embedded in iframes (clickjacking)
- `Content-Security-Policy` — no CSP protects the dashboard from injected scripts
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`

Express itself injects `X-Powered-By: Express` (see EXP-02 below), advertising the framework and version.

**Exploitation Scenario:** Without `X-Frame-Options`, an attacker who can trick a user into visiting a malicious page could embed the dashboard in a transparent iframe and perform clickjacking — causing the user to unknowingly click "Release All" services or abandon sessions. Without CSP, any stored XSS (see XSS findings below) has no browser-level backstop. MIME sniffing attacks become feasible on browsers that respect `X-Content-Type-Options`.

**Remediation:** Add `helmet` as a dependency and apply it as the first middleware: `app.use(helmet())`. Customize CSP for the dashboard's inline scripts (which require `unsafe-inline` or nonce-based CSP).

---

### FINDING EXP-02 — MEDIUM: `X-Powered-By: Express` header is disclosed

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, lines 383–419

**Evidence:** Express enables the `X-Powered-By` header by default. There is no `app.disable('x-powered-by')` call anywhere in the codebase.

**Exploitation Scenario:** An attacker scanning network-accessible instances of the dashboard (which listens on TCP by default) knows the exact framework and version, enabling targeted exploit searches.

**Remediation:** Add `app.disable('x-powered-by')` immediately after `const app = express()`. This is one line and zero cost.

---

### FINDING EXP-03 — MEDIUM: Rate limiter is completely bypassed for all localhost/127.0.0.1 connections

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, lines 396–410

**Evidence:**
```typescript
skip: (req: Request): boolean => {
  if (req.path === '/health' || req.path === '/version') return true;
  const ip = req.ip || req.socket.remoteAddress || '';
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  return false;
},
```

**Exploitation Scenario:** Since Port Daddy runs on localhost, every request from the local machine bypasses rate limiting entirely. In a multi-user development environment, or if any web process (browser, script, locally compromised process) can reach the daemon on port 9876, the rate limiter provides zero protection. The dashboard itself runs in the browser at `http://localhost:9876`, meaning all its API calls originate from localhost and bypass rate limits. An XSS payload in the dashboard executing `fetch('/claim', ...)` in a loop would not be rate-limited.

**Remediation:** For a single-user local tool, this is an accepted tradeoff. Document this explicitly. If the daemon may ever be exposed to shared environments (e.g., Docker, remote dev VMs), remove the localhost bypass or at minimum restrict it to the Unix socket path only.

---

### FINDING EXP-04 — MEDIUM: CORS allows all localhost origins with credentials

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, lines 412–415

**Evidence:**
```typescript
app.use(cors({
  origin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  credentials: true
}));
```

**Exploitation Scenario:** This CORS policy permits any origin from any localhost port with credentials. If a developer has another local web application running (on any port) that is compromised, it can make credentialed cross-origin requests to the Port Daddy API. This is especially relevant because browsers treat `localhost` as a secure context — an XSS on `localhost:3000` could issue credentialed fetches to `localhost:9876` and release all services, delete sessions, or read agent data.

**Remediation:** Since the dashboard is served by Port Daddy itself at the same origin, CORS is only needed for developer tools that deliberately access the API from other local origins. Consider whether cross-origin access is required at all. If not, remove CORS entirely — the dashboard works same-origin. If it is needed, restrict to specific known origins rather than the entire localhost range.

---

### FINDING EXP-05 — LOW: Error handler returns generic 500 but logs full error details

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, lines 443–460

**Evidence:**
```typescript
app.use((err: Error & { type?: string }, req: Request, res: Response, _next: NextFunction): void => {
  logger.error('unhandled_error', {
    error: err.message,
    type: err.type || err.name,
    path: req.path,
    method: req.method
  });
  ...
  res.status(500).json({ error: 'internal server error' });
});
```

**Assessment:** The HTTP response correctly returns a generic error. The full error is only logged to the Winston log files, not returned to the client. This is acceptable. However, the log files (`port-daddy.log`, `port-daddy-error.log`) are written to `__dirname` (the project root), which for a globally installed npm package means they live inside the npm package directory. This is not a typical location and may not be in `.gitignore` depending on project setup.

**Remediation:** Write log files to a user-controlled path like `~/.port-daddy/logs/` or to `/tmp/` rather than the package installation directory.

---

## 3. Dashboard XSS

### FINDING XSS-01 — HIGH: `highlightJson` produces `innerHTML` output containing regex-matched content from API responses

**File:** `/Users/erichowens/coding/port-daddy/public/index.html`, line 410, 444, 457, 465, 475

**Evidence — the `highlightJson` function:**
```javascript
function highlightJson(str){
  if(typeof str!=='string')str=JSON.stringify(str,null,2);
  return str
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    // ---- SAFE: escaping above makes tags inert ----
    .replace(/"([^"]+)":/g,'<span class="json-key">"$1"</span>:')  // KEY VALUES ARE NOT ESCAPED
    .replace(/: "([^"]*)"/g,': <span class="json-str">"$1"</span>') // STRING VALUES ARE NOT ESCAPED
    .replace(/: (\d+\.?\d*)/g,': <span class="json-num">$1</span>')
    ...
}
```

**The critical issue:** After HTML-escaping the entire string, the function uses regex capture groups `$1` from the unescaped capture groups in the replacement pattern. The regex `.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')` re-inserts matched content as `$1` — which is the content captured from the **already-escaped** string. Since HTML entities (`&lt;`, `&gt;`, `&amp;`) survive into `$1`, the output does not execute JavaScript directly.

**However, there is a secondary vector.** The `highlightJson` call at line 444, inside `fetchAndShowChannelMessages`, calls:
```javascript
setH(payload, highlightJson(payloadStr||''));
```
where `payloadStr` is `m.payload` from the API response — raw pub/sub message payload content. The payload field is stored as free-form text in the database.

The `highlightJson` function escapes `<`, `>`, `&` but the regex replacement inserts `<span>` tags whose content is captured from the escaped string. This means a payload like:
```
{"key": "safe"}
```
renders fine. But what about a payload that exploits the regex replacement's own HTML context? The `$1` capture in `.replace(/"([^"]+)":/g, '<span ...>"$1"</span>:')` inserts whatever matched `[^"]+` directly into HTML. The initial `replace(/</g,'&lt;')` means `<` becomes `&lt;`, so `<script>` cannot be injected through JSON keys. This specific vector is mitigated.

**The actual unmitigated XSS is in `refreshSessions` and the `sh()` helper pattern.** See XSS-02.

---

### FINDING XSS-02 — HIGH: `sh()` helper injecting un-escaped content via `onclick` attribute interpolation

**File:** `/Users/erichowens/coding/port-daddy/public/index.html`, line 430 (`refreshSessions`), line 436 (`refreshSalvage`), line 438 (`refreshLocks`)

**Evidence from `refreshSessions`:**
```javascript
acts.push('<button class="act-btn" onclick="endSession(\''+h(s.id)+'\')">End</button>');
acts.push('<button class="act-btn danger" onclick="abandonSession(\''+h(s.id)+'\')">Abandon</button>');
acts.push('<button class="act-btn notes-btn" onclick="toggleSessionNotes(\''+h(s.id)+'\',this)">Notes</button>');
```

The `h()` function is the HTML escaper:
```javascript
function h(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
```

`h()` does NOT escape single quotes (`'`). The `onclick` attribute uses single-quote-escaped string interpolation: `onclick="endSession(\'` + h(s.id) + `\')"`. If a session ID contains a single quote followed by JavaScript, the single-quote escape in the onclick string literal is broken.

**Exploitation scenario:** A session ID is user-controlled (passed in the `POST /sessions` body, or via `pd begin --purpose "..."`, or the agentId in `POST /agents`). If an attacker creates an agent with ID:
```
x'); alert(document.cookie); ('
```
The rendered HTML becomes:
```html
<button onclick="endSession('x'); alert(document.cookie); ('')">End</button>
```
This executes arbitrary JavaScript in the dashboard when the button is clicked (or via DOM event triggering). The same pattern appears in `refreshSalvage` (line 436) using `r.agentId`, `refreshLocks` (line 438) using `l.name`, and `refreshDns` (line 467) using `r.identity` and `r.hostname`.

**Note:** The `h()` function also does not escape backticks (`` ` ``), which could enable further template literal exploitation in certain browser contexts.

**Remediation:** Either (a) use `data-*` attributes to store IDs and attach event listeners with `addEventListener` in JavaScript, avoiding inline `onclick` entirely, or (b) extend `h()` to also escape single quotes as `&#39;`. Option (a) is strongly preferred because it fully eliminates the inline event handler attack surface.

---

### FINDING XSS-03 — MEDIUM: `highlightJson` applied to raw pub/sub message sender field with `setH` (innerHTML)

**File:** `/Users/erichowens/coding/port-daddy/public/index.html`, line 444 (`fetchAndShowChannelMessages`)

**Evidence:**
```javascript
msgs.forEach(m=>{
  ...
  sender.textContent = safeString(m.sender||'anonymous');  // textContent — SAFE
  ...
  setH(payload, highlightJson(payloadStr||''));             // innerHTML — RISK
  ...
});
```

`m.sender` is safely assigned via `textContent`. But `payloadStr` (the message body) is passed through `highlightJson` which outputs HTML and is assigned via `setH` (which is `el.innerHTML = ...`).

As analyzed in XSS-01, the escaping in `highlightJson` is mostly correct. However, the function's regex replacement `.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')` has a subtle bypass: the initial escape converts `<` to `&lt;`, but the regex `[^"]+` can match `&lt;script&gt;alert(1)&lt;/script&gt;` as a JSON key, and re-insert it as-is inside a `<span>` tag. Since the entities are correctly preserved through the regex, this does not execute. The risk here is medium because it depends on future regex modifications or browser parsing edge cases.

**Remediation:** Replace `setH(payload, highlightJson(...))` with a proper syntax highlighter that builds DOM nodes via `document.createElement` and `textContent`. Alternatively, use a well-tested library like `highlight.js` that handles escaping correctly. The custom `highlightJson` regex implementation should be retired.

---

### FINDING XSS-04 — MEDIUM: `const IH='inner'+'HTML'` obfuscation

**File:** `/Users/erichowens/coding/port-daddy/public/index.html`, line 394

**Evidence:**
```javascript
const API=''; const IH='inner'+'HTML';
```

and the `setH` function:
```javascript
function setH(el,html){el[IH]=html;}
```

**Assessment:** This is a deliberate obfuscation of `innerHTML` to evade simple string-based code scanning tools and security audits. It has no performance benefit. Any automated security scanner searching for `innerHTML` assignments in the codebase will miss all `setH()` call sites, which are the primary innerHTML consumers in this dashboard. This is a security process concern as much as a technical one.

**Remediation:** Remove the obfuscation. Use `el.innerHTML = html` directly, or preferably eliminate `innerHTML` entirely. At minimum, document why the obfuscation exists if it is intentional.

---

### FINDING XSS-05 — LOW: `briefing-content` element receives JSON via `setH` (innerHTML)

**File:** `/Users/erichowens/coding/port-daddy/public/index.html`, line 475 (`refreshBriefing`)

**Evidence:**
```javascript
const pre = document.createElement('pre');
setH(pre, highlightJson(JSON.stringify(data.briefing, null, 2)));
el.appendChild(pre);
```

The briefing data returned from `/briefing/port-daddy?projectRoot=...` contains session content, notes, agent names, and purposes — all user-controlled strings. These are passed through `highlightJson` and rendered as `innerHTML`. As discussed in XSS-01, the escaping in `highlightJson` is mostly intact, but the opacity of the multi-step transform (escape → regex replace → innerHTML) leaves this as a medium-confidence safe path that should be simplified.

**Remediation:** Same as XSS-03: build DOM nodes with `textContent` or use a vetted syntax highlighter library.

---

## 4. MCP Server Security

### FINDING MCP-01 — MEDIUM: `PORT_DADDY_URL` is user-controlled and can redirect MCP to a malicious server

**File:** `/Users/erichowens/coding/port-daddy/mcp/server.ts`, line 37

**Evidence:**
```typescript
const DAEMON_URL = process.env.PORT_DADDY_URL || 'http://localhost:9876';
```

**Exploitation Scenario:** If `PORT_DADDY_URL` is set in the environment (e.g., by a compromised shell init script, a `.env` file in a project, or a malicious MCP tool preceding Port Daddy in the chain), the MCP server will send all tool calls — including `claim_port`, `acquire_lock`, `add_note`, `begin_session` — to the attacker-controlled URL. This allows:
1. Exfiltration of all agent IDs, session purposes, file paths, and coordination data
2. Returning fake responses to Claude (e.g., claiming a different port, fabricating agent states)
3. Denial of service for multi-agent workflows

**Remediation:** Validate `PORT_DADDY_URL` to ensure it points to a localhost address. Add a URL validation step at startup:
```typescript
const parsedUrl = new URL(DAEMON_URL);
if (!['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)) {
  throw new Error('PORT_DADDY_URL must point to localhost');
}
```

---

### FINDING MCP-02 — LOW: MCP input schemas lack length limits on string fields

**File:** `/Users/erichowens/coding/port-daddy/mcp/server.ts`, throughout `TOOLS` array

**Evidence:** The `inputSchema` definitions for tools like `add_note`, `start_session`, `begin_session` have no `maxLength` constraints:
```typescript
{
  name: 'add_note',
  inputSchema: {
    properties: {
      content: { type: 'string', description: '...' },  // No maxLength
      ...
    }
  }
}
```

**Exploitation Scenario:** A poorly behaving Claude session or a malicious prompt injection could cause Claude to call `add_note` with extremely large content, potentially causing SQLite write amplification or filling disk. The Express server has a `10kb` JSON body limit, but the MCP server bypasses Express entirely — it communicates via stdio, and the MCP SDK has its own framing. Whether the MCP SDK applies size limits is not evident from the code.

**Remediation:** Add `maxLength` constraints to all string fields in MCP input schemas. Apply server-side truncation or rejection in `handleTool` for strings exceeding reasonable limits (e.g., 10,000 characters for note content).

---

### FINDING MCP-03 — INFO: MCP server has no authentication or isolation from the daemon

**File:** `/Users/erichowens/coding/port-daddy/mcp/server.ts`

**Assessment:** The MCP server is a stdio transport that proxies all calls to the daemon's HTTP API with no additional authentication or authorization layer. Any Claude session with access to the `port-daddy` MCP tool has full read/write access to the daemon — including releasing all services, deleting sessions, claiming salvage, and registering arbitrary agents.

**Assessment:** This is expected for a local developer tool. The risk is low in the intended use case. It becomes higher if the MCP is accessible in a shared Claude environment. Document this trust boundary explicitly.

---

## 5. CLI Security

### FINDING CLI-01 — LOW: `pd with-lock` uses `shell: false` by default, but `--shell` flag enables shell injection

**File:** `/Users/erichowens/coding/port-daddy/cli/commands/sugar.ts`, lines 352–358

**Evidence:**
```typescript
const useShell = !!options.shell;
const [cmd, ...cmdArgs] = command;
const child = spawn(cmd, cmdArgs, {
  stdio: 'inherit',
  shell: useShell,
});
```

**Assessment:** The default behavior (`shell: false`) is secure — `spawn` with an array of arguments does not invoke a shell and is not vulnerable to shell injection. The `--shell` flag is explicitly documented as a user opt-in for commands that use pipes or `&&`. This is a reasonable design.

**Risk:** If a user is tricked into running `pd with-lock mylock --shell "malicious && command"` through documentation, an alias, or a `.portdaddyrc` file that sets a command, the shell would interpret the malicious operator. But this is inherent to shell commands in general.

**Remediation:** Warn users in the `--shell` flag documentation that shell metacharacters in arguments will be interpreted. This is already partially done in the error output.

---

### FINDING CLI-02 — MEDIUM: `.portdaddy/current.json` is written to `process.cwd()` without path validation

**File:** `/Users/erichowens/coding/port-daddy/cli/commands/sugar.ts`, lines 30–57

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

**Exploitation Scenario:** The `agentId`, `sessionId`, `purpose`, and `identity` fields written to this file come directly from API responses and user input. If `process.cwd()` is an unexpected path (e.g., a network share, a sensitive directory, or a path that is world-readable), this file — containing agent coordination context — is written there without any check.

More critically: the file is read back on `pd done` and `pd whoami` without integrity verification. An adversary who can write to `.portdaddy/current.json` can manipulate which `agentId` and `sessionId` the CLI operates on, potentially ending or hijacking another agent's session.

**Remediation:** (1) Validate that `process.cwd()` is a safe directory before writing. (2) Consider writing the context to a user-owned directory (`~/.port-daddy/current.json`) instead of the project directory. (3) Use a file permission of `0o600` when writing `current.json`.

---

### FINDING CLI-03 — LOW: Daemon auto-restart reads `tsxBinPath` from a relative path inside the package directory

**File:** `/Users/erichowens/coding/port-daddy/bin/port-daddy-cli.ts`, lines 334–337

**Evidence:**
```typescript
const serverScript: string = join(__dirname, '..', 'server.ts');
const tsxBinPath: string = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const child: ChildProcess = spawn(tsxBinPath, [serverScript], {
  stdio: 'ignore',
  detached: true
});
```

**Assessment:** `tsxBinPath` and `serverScript` are resolved relative to `__dirname` (the package installation directory). This means the auto-restart spawns `tsx` from `node_modules/.bin/tsx` within the package — a path that an attacker who has write access to the package directory could replace. However, reaching this code requires control of the running process, so this is low severity in the local development context.

**Remediation:** Verify that `tsxBinPath` exists and is a file before spawning. Document the assumption that the package directory is trusted.

---

### FINDING CLI-04 — INFO: `PORT_DADDY_URL` used directly as a URL without hostname validation in CLI

**File:** `/Users/erichowens/coding/port-daddy/bin/port-daddy-cli.ts`, lines 219–221

**Evidence:**
```typescript
if (process.env.PORT_DADDY_URL) {
  const url = new URL(process.env.PORT_DADDY_URL);
  return { host: url.hostname, port: parseInt(url.port, 10) || 9876 };
}
```

**Exploitation Scenario:** If `PORT_DADDY_URL` is set to a non-localhost address (e.g., by a compromised shell init file or a malicious `.env` in a project directory), the CLI will send all daemon requests — including sensitive coordination data — to that remote host. This is the same issue as MCP-01 but in the CLI context.

**Remediation:** Validate that `PORT_DADDY_URL` hostname resolves to a loopback address before use. Warn and exit if a non-loopback URL is set.

---

## 6. Environment & Configuration Security

### FINDING ENV-01 — MEDIUM: `PORT_DADDY_DB` allows arbitrary filesystem write location

**File:** `/Users/erichowens/coding/port-daddy/lib/db.ts`, line 33

**Evidence:**
```typescript
if (process.env.PORT_DADDY_DB) return process.env.PORT_DADDY_DB;
```

**Exploitation Scenario:** An attacker or a compromised `.env` file can set `PORT_DADDY_DB=/etc/passwd` or `PORT_DADDY_DB=/path/to/shared/db` to cause Port Daddy to open (or create) a SQLite database at an arbitrary path. `better-sqlite3` will create the file if it does not exist. On an NFS or shared filesystem, this could expose coordination data to other users. Setting it to a path like `/dev/stderr` would cause daemon startup failures. Setting it to a world-readable location exposes agent IDs, session purposes, file claims, and notes.

**Remediation:** Validate that `PORT_DADDY_DB` resolves to a path under a trusted directory (e.g., the home directory or the project directory). Reject paths that are obviously wrong (e.g., `/dev/`, `/etc/`, `/proc/`). Apply `0o600` permissions to the database file on creation.

---

### FINDING ENV-02 — LOW: `PORT_DADDY_SOCK` allows Unix socket at arbitrary path

**File:** `/Users/erichowens/coding/port-daddy/server.ts`, line 144; `bin/port-daddy-cli.ts`, line 85

**Evidence:**
```typescript
const SOCK_PATH: string = process.env.PORT_DADDY_SOCK || '/tmp/port-daddy.sock';
```

**Exploitation Scenario:** If `PORT_DADDY_SOCK` is set to a path writable by another user or process (e.g., a shared `/tmp` directory with sticky bit), the daemon's socket could be replaced. A malicious process could create a socket at the same path before the daemon starts. The daemon checks for a live socket (via health check) before proceeding, but the check could be raced. The CLI also reads `PORT_DADDY_SOCK` and would connect to whatever socket exists there.

**Remediation:** Consider defaulting to a socket path in the user's home directory (`~/.port-daddy/daemon.sock`) rather than `/tmp`. Check socket file permissions after creation.

---

### FINDING ENV-03 — INFO: No sensitive secrets are handled by Port Daddy; environment risk is limited to configuration

**Assessment:** Port Daddy does not handle passwords, API keys, or authentication tokens. The environment variables it consumes (`PORT_DADDY_URL`, `PORT_DADDY_DB`, `PORT_DADDY_SOCK`, `PORT_DADDY_PORT`, `PORT_DADDY_SILENT`, `PORT_DADDY_NO_TCP`, `PORT_DADDY_PORT_FILE`) are all configuration, not secrets. Webhook secrets are stored in the SQLite database (not in environment variables), which is appropriate.

**Note:** The webhook secret in the database (`webhooks.secret` column) is stored in plaintext. For a local developer tool, this is acceptable. For any multi-user deployment, secrets should be hashed or encrypted at rest.

---

## Summary and Priority Matrix

| ID | Severity | Area | Issue |
|---|---|---|---|
| XSS-02 | HIGH | Dashboard | Single-quote injection in `onclick` handlers — stored XSS via session/agent/lock names |
| EXP-01 | HIGH | Express | No security headers (Helmet absent) — enables clickjacking, MIME sniffing, XSS propagation |
| XSS-01 | HIGH | Dashboard | `highlightJson` + `innerHTML` chain is an opaque trust path for API-supplied data |
| MCP-01 | MEDIUM | MCP | `PORT_DADDY_URL` can be set to a malicious remote host |
| EXP-02 | MEDIUM | Express | `X-Powered-By: Express` header discloses framework |
| EXP-03 | MEDIUM | Express | Rate limiter bypassed for all localhost connections |
| EXP-04 | MEDIUM | Express | CORS with credentials allows all localhost ports |
| XSS-04 | MEDIUM | Dashboard | `IH = 'inner'+'HTML'` obfuscates innerHTML from security scanners |
| ENV-01 | MEDIUM | Config | `PORT_DADDY_DB` allows database write to arbitrary filesystem path |
| CLI-02 | MEDIUM | CLI | `.portdaddy/current.json` written to `cwd()` without validation; no integrity check |
| DEP-01 | MEDIUM | Deps | All production deps use `^` ranges — supply chain exposure |
| DEP-02 | MEDIUM | Deps | `tsx` is a production dep when it should be a dev dep only |
| XSS-03 | MEDIUM | Dashboard | Channel message payloads rendered via `innerHTML` through `highlightJson` |
| XSS-05 | LOW | Dashboard | Briefing JSON rendered via `innerHTML` through `highlightJson` |
| EXP-05 | LOW | Express | Log files written to package install dir |
| CLI-01 | LOW | CLI | `--shell` flag enables shell injection in `with-lock` |
| ENV-02 | LOW | Config | `PORT_DADDY_SOCK` defaults to world-accessible `/tmp` path |
| CLI-03 | LOW | CLI | Auto-restart resolves `tsx` from relative package path |
| MCP-02 | LOW | MCP | No string length limits on MCP input schemas |
| CLI-04 | INFO | CLI | `PORT_DADDY_URL` not validated to localhost in CLI |
| DEP-03 | INFO | Deps | `cors` package is 8 years old and unmaintained |
| DEP-04 | INFO | Deps | devDependency native binaries (`@swc/core`) can execute preinstall scripts |
| MCP-03 | INFO | MCP | MCP has no auth layer — expected for local tool, undocumented trust boundary |
| ENV-03 | INFO | Config | Webhook secrets stored in plaintext SQLite |

---

## Top 3 Immediate Actions

1. **Fix XSS-02 first.** Replace all `onclick="fn('`+h(id)+`')"` patterns with `data-id` attributes and `addEventListener`. The `h()` function does not escape single quotes, making this a live stored XSS vector for any agent name, session ID, lock name, or DNS identity containing a single quote.

2. **Add Helmet (EXP-01, EXP-02).** Two lines: `import helmet from 'helmet'` and `app.use(helmet())`. This eliminates the clickjacking vector, adds MIME type protection, and removes the `X-Powered-By` disclosure simultaneously. CSP will need configuration to allow the dashboard's inline scripts.

3. **Validate `PORT_DADDY_URL` to localhost only (MCP-01, CLI-04).** Add a startup assertion that `PORT_DADDY_URL`, if set, must resolve to `127.0.0.1`, `::1`, or `localhost`. A one-time environment variable compromise should not be able to redirect all multi-agent coordination traffic to an attacker-controlled host.
