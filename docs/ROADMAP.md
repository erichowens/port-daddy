# Port Daddy Roadmap & Feature Requests

**Last Updated**: 2026-02-24

This document tracks feature requests and planned work. Items are added the moment they're discussed.

---

## v3.3: Install Experience & Integrations

From Desktop Commander inspiration — make the install experience delightful and integrated.

### Install Experience
- [ ] **ASCII Art Banner** — Ship/anchor themed on `npx port-daddy` first run
- [ ] **Auto-Add to Claude MCP Config** — Detect Claude desktop, add MCP server entry
- [ ] **Auto-Restart Claude** — After MCP install, restart Claude app automatically
- [ ] **Calendar Invite Link** — "Need help? Book a call" in install output
- [ ] **Discord/Community Link** — Community invite in install output
- [ ] **Auto-Updates** — Check GitHub releases on daemon start, notify user of updates

### Integrations (MCP & IDE Plugins)
- [ ] **MCP Server** — Port Daddy as an MCP server so Claude agents can claim ports directly
  - `mcp-server.json` definition
  - Tools: `claim_port`, `release_port`, `get_services`, `create_session`, `add_note`
- [ ] **VS Code Extension** — Port status in status bar, commands in palette
- [ ] **Tailwind Plugin** — TBD (what would this even do?)
- [ ] **XCode Plugin** — Port management for iOS dev servers

---

## v4.0: Agent Coordination Vision

From the unified roadmap plan. These build on Sessions & Notes.

- [ ] **Agent KV Scratchpads** — Per-agent key-value namespace
- [ ] **Inbox/Outbox Messaging** — Directed 1:1 messages between registered agents
- [ ] **Lock Priority for Registered Agents** — Latency tax for unregistered agents on contested locks
- [ ] **Session Auto-Binding** — Sessions auto-link to registering agent's ID
- [ ] **Pro-Forma Task Reporting** — Session completion can auto-generate changelog entries
- [ ] **Breadcrumbs & `pd salvage`** — Recover useful work from abandoned sessions
- [ ] **Inline Markup for Agent Messages** — `@agent-id`, `#file:path`, `$session-id` sigils

---

## Code Quality

- [ ] **Dynamic Daemon Port** — Handle 9876 being taken
  - Currently: Hardcodes 9876 everywhere, fails if taken
  - Fix: Server tries 9876-9899 range, writes actual port to `~/.port-daddy/daemon.json`
  - CLI reads state file OR relies on Unix socket (socket is port-agnostic)
  - Unix socket (`/tmp/port-daddy.sock`) is already primary transport
  - TCP is fallback for cross-machine or when socket unavailable

- [ ] **Dashboard Maritime Parity** — Add signal flags to dashboard
  - CLI has full maritime design system (`lib/maritime.ts`): Charlie, November, Kilo, Uniform, Victor, Lima flags
  - Dashboard has ZERO maritime flag references
  - Need: CSS signal flag rendering (colored blocks), status badges using flag semantics
  - Need: Agent voice styling (mayday=red, pan-pan=yellow, securite=cyan, etc.)

- [ ] **API Maritime Voice** — Add maritime flavor to JSON responses
  - Error messages should use nautical metaphors
  - Status fields could include maritime voice variants
  - Example: "service anchored at port 3100" vs "assigned new port"

- [ ] **Break Up CLI Monolith** — Split `bin/port-daddy-cli.ts` (4000+ lines) into:
  - `cli/commands/` — One file per command group
  - `cli/handlers/` — Business logic for each command
  - `cli/output/` — Formatting utilities (maritime, tables, etc.)
  - `cli/index.ts` — Entry point that wires it together

---

## Adversarial Testing (In Progress)

Bugs found and fixed during adversarial testing sweep:

### Fixed
- [x] Bug #16: Lock TTL string concatenation (`"300s"` → invalid expiry)
- [x] Bug #17: Negative TTL creates already-expired locks
- [x] Bug #18: Whitespace-only session purpose accepted
- [x] Bug #19: Non-array files parameter silently ignored
- [x] Bug #20: Numeric arrays in files parameter accepted
- [x] Bug #21: Non-string agentId accepted
- [x] Bug #22: Whitespace-only note content accepted
- [x] Bug #23: Empty string message payload accepted
- [x] Bug #24: Whitespace-only message payload accepted
- [x] Bug #25: Non-integer maxServices/maxLocks accepted in agent registration
- [x] Bug #26: Non-array webhook events iterated as string characters

### Pending Testing
- [x] Service claim edge cases — validated (port range, id validation)
- [x] Lock concurrency edge cases — validated (negative TTL clamps to default, string TTL rejected)

---

## UX Friction (Pending)

- [ ] **23-Persona Audit** — Full UX friction analysis across all personas (Task #1)
