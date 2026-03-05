I now have a thorough understanding of all user surfaces. Here is the comprehensive UX friction audit.

---

# Port Daddy UX Friction Audit

## Surface 1: CLI Experience

### Journey 1 -- New User First Run

**`npm install -g port-daddy` --> `pd start` --> `pd begin "my task"` --> `pd whoami` --> `pd done`**

**What goes right:**
- `pd` alias is short and memorable.
- `pd begin` without args triggers interactive mode in TTY -- maritime flag prompts are distinctive and charming.
- Auto-start on first use: if daemon is not running, CLI auto-starts it for Tier 2 commands. This is excellent zero-config behavior.
- `pd whoami` gives clean, scannable output with labeled fields.
- "Did you mean?" fuzzy matching (Levenshtein, threshold 2) catches typos.

**Friction points identified:**

**F1. `pd start` is unnecessary for new users but not communicated.**
The CLI auto-starts the daemon on first use for most commands, but the README Quick Start section shows `pd up` first (which triggers `pd scan` + orchestration, not just daemon start). A new user running `pd begin` for the first time sees "Port Daddy daemon is not running. Starting it..." which is fine, but if they run `pd up` without a `.portdaddyrc` they get a different, potentially confusing flow. The happy path (`pd begin`) works, but the README leads them toward `pd up` first, which is the orchestration command, not the session workflow command.

**F2. Help text is 100+ lines of dense content.**
The HELP constant (`/Users/erichowens/coding/port-daddy/bin/port-daddy-cli.ts`, line 400-596) is 196 lines. Running `pd help` or `pd --help` dumps everything at once. There is no progressive disclosure -- no `pd help begin`, no `pd help locks`, no categorized help. A new user scanning for "how do I start a session" has to read through Orchestration, Service Commands, Agent Coordination, Agent Registry, Activity Log, Sessions & Notes, File Claims, Integration Signals, DNS, Briefing, and finally Quick Start (Sugar Commands) at line 476. The most common workflow is buried 76 lines deep.

**F3. Sugar commands not first in help output.**
The "Quick Start (Sugar Commands)" section appears AFTER lower-level primitives. `begin`, `done`, `whoami` should be the first thing users see since they are the recommended happy path. Instead, the help opens with `up/down` (orchestration) which assumes a pre-existing project setup.

**F4. `pd learn` is not mentioned in `pd help`.**
The tutorial is listed only under "Tutorial: learn" at line 500. It is not suggested anywhere in error messages, not in the first-run experience, and not in the Quick Start guide's top lines. A new user who runs `pd help` and feels overwhelmed has no obvious path to guided learning.

### Journey 2 -- Power User Daily Workflow

**What goes right:**
- Single-letter aliases (`c`, `r`, `f`, `n`, `u`, `d`) reduce keystroke count significantly.
- `--quiet` / `-q` enables pipeline composition: `PORT=$(pd claim myapp -q)`.
- `--json` / `-j` enables machine parsing.
- `.portdaddy/current.json` preserves session context across terminal sessions -- `pd whoami` and `pd done` work without re-specifying IDs.
- Tab completions are comprehensive (1330 lines of bash completions, with dynamic daemon queries).

**Friction points identified:**

**F5. Alias inconsistency: `n` for note but not `b` for begin, `w` for whoami.**
Aliases exist for `n` (note), `u` (up), `d` (down), but not for the most common sugar commands. `pd b "my task"` would be faster than `pd begin "my task"`.

**F6. No `pd status` summary for power users.**
`pd status` only checks if the daemon is running. A power user wanting a quick dashboard (`pd status` showing: 3 services, 1 agent active, 2 locks held, 1 dead agent needs salvage) must run multiple commands. `pd whoami` only shows the current agent context, not the system state.

**F7. Session identity is auto-detected from `package.json` but never confirmed.**
In `cli/commands/sugar.ts` line 102, identity falls back to `autoIdentityFromPackageJson()`. If you are in a subdirectory of a monorepo, you might get a different package.json than expected. The auto-detection is silent in non-interactive mode -- you do not discover the mismatch until `pd whoami`.

### Journey 3 -- Agent (Non-TTY) Usage

**What goes right:**
- `canPrompt()` (`/Users/erichowens/coding/port-daddy/cli/utils/prompt.ts`, line 21) correctly checks `IS_TTY`, `CI` env var, and `PORT_DADDY_NON_INTERACTIVE`. Prompts are fully skipped in non-interactive mode.
- `-q` outputs just the value (port number, agent ID, session ID) for scripting.
- `-j` outputs full JSON for structured consumption.
- Tier 1 commands work without the daemon via direct SQLite access -- this is crucial for CI/CD where the daemon may not be running.

**Friction points identified:**

**F8. No `--format` flag for output customization.**
Agents get either raw quiet output or full JSON. There is no middle ground like `--format=csv` or `--format=tsv` for simple multi-value extraction. This is minor for a developer tool.

**F9. `begin` requires daemon (Tier 2) but does not fail gracefully in CI without daemon.**
`begin` is Tier 2 (line 115, `port-daddy-cli.ts`). In CI, if the daemon is not running, the error message is `"begin" requires the running daemon. Start with: port-daddy start`. An agent or CI script that calls `pd begin` will get a non-zero exit code with a human-readable error, which is correct, but there is no machine-readable signal (the error is on stderr, not JSON).

### Journey 4 -- Discovery

**What goes right:**
- Fuzzy "Did you mean?" suggestions for typos.
- Tab completion dynamically queries the daemon for service IDs, channels, lock names, and agent IDs.
- Command suggestion dropdown in the dashboard's command bar.

**Friction points identified:**

**F10. No `pd commands` or `pd help <topic>` for targeted help.**
If a user knows they need "something about locks" but not the exact command, they must read the full help text or rely on tab completion. There is no `pd help locks` or `pd help sessions` to get targeted documentation.

**F11. Tab completions require daemon for dynamic values.**
Bash completions query `localhost:9876` with a 1-second timeout (`/Users/erichowens/coding/port-daddy/completions/port-daddy.bash`, line 29-31). If the daemon is not running, dynamic completions silently return nothing. This is correct behavior but could confuse users who expect their service IDs to appear.

---

## Surface 2: Web Dashboard

### Information Density

**F12. 15 sidebar navigation items across 5 groups is dense but not overwhelming.**
The groups (Overview, Core, Coordination, Monitoring, System) provide reasonable categorization. However, the sidebar has no collapse/expand -- all 15 items are always visible. On smaller screens, this uses significant vertical space. The nav groups cannot be collapsed.

**F13. Stats grid shows 6 cards in a single row on wide screens.**
`/Users/erichowens/coding/port-daddy/public/index.html`, line 101: `grid-template-columns:repeat(6,1fr)`. On 1440px screens this works. On 1100px it wraps to 3 columns (media query on line 109). The stats cards (Services, Agents, Locks, Channels, Sessions, Uptime) are the right top-level metrics.

### Navigation

**F14. No URL routing -- navigation state is lost on refresh.**
`showPanel()` (line 416) manipulates DOM classes but does no URL hash or pushState management. Refreshing the browser always returns to the Overview panel. A user looking at the Sessions panel who refreshes loses their position.

**F15. No breadcrumbs or back navigation.**
Expanding a project card or session notes creates inline expansions (via `expandedSessions`, `expandedProjects` objects). These are tracked in JavaScript memory, not URLs, and are lost on refresh.

### Data Refresh

**F16. Auto-refresh every 5 seconds is aggressive.**
Line 481: `setInterval(refreshAll,5000)`. `refreshAll()` fires 17 parallel API calls every 5 seconds (line 479). For a local daemon this is fine on performance, but it means every table re-renders every 5 seconds, potentially disrupting user interactions (scrolling, reading expanded notes, selecting text). The 5-second polling is not configurable.

**F17. No loading states during refresh.**
When `refreshAll()` fires, there are no loading indicators. Tables silently re-render. If the daemon is slow or unresponsive, the user sees stale data with no feedback.

### Mobile Responsiveness

**F18. Fixed sidebar layout breaks on mobile.**
The sidebar is `position:fixed;width:240px` (line 47). The main content has `margin-left:240px` (line 67). There are no media queries to collapse the sidebar on small screens. On phones (< 768px), the sidebar takes 240px of a ~375px screen, leaving ~135px for content. The dashboard is functionally unusable on mobile.

**F19. Tables overflow horizontally without visible scrollbars.**
`.table-wrap{overflow-x:auto}` (line 111) enables horizontal scrolling, but there is no visual indicator that the table extends beyond the viewport. On narrow screens, important columns (Actions buttons) may be hidden off-screen.

### Accessibility (WCAG Analysis)

**F20. CRITICAL: No ARIA landmarks or roles.**
The entire HTML has zero `aria-*` attributes (confirmed by grep). No `role="navigation"` on the sidebar, no `role="main"` on content, no `role="dialog"` on the modal. Screen readers cannot navigate by landmarks.

**F21. CRITICAL: No skip navigation link.**
There is no skip link to bypass the 15-item sidebar and jump to the main content. Keyboard users must tab through every nav item to reach the content area.

**F22. CRITICAL: Interactive elements built on `<div>` instead of `<button>` or `<a>`.**
Navigation items are `<div class="nav-item" onclick="showPanel('...')">` (lines 291-313). These are not keyboard-focusable, have no button role, and are invisible to screen readers. The pattern is used for all sidebar navigation.

**F23. CRITICAL: No focus management for modals and panels.**
The modal overlay (`/Users/erichowens/coding/port-daddy/public/index.html`, line 221-224) uses `display:none` / `display:flex` toggling but does not trap focus, does not set `aria-modal`, and does not return focus to the trigger element on close. Keyboard users can tab out of the modal into the background. The settings panel (line 198-202) has the same issue.

**F24. No `prefers-reduced-motion` media query.**
Confirmed by grep: zero instances of `prefers-reduced-motion`. The dashboard uses 7 animations (`fadeIn`, `countPulse`, `toastIn`, `toastOut`, `scanPulse`, `shimmer`, `glowBreathe`). Users with vestibular disorders who set `prefers-reduced-motion: reduce` in their OS will still see all animations.

**F25. No `prefers-color-scheme` support.**
The dashboard is dark-mode only. There is no light mode and no `prefers-color-scheme` media query. While dark mode is intentional for the "glassmorphism" aesthetic, it may cause readability issues for some users.

**F26. Color contrast concerns on muted text.**
`--text-muted:#5c6170` on `--bg-deep:#0c0a1a`. Running these values through contrast analysis: `#5c6170` on `#0c0a1a` yields approximately 3.8:1 contrast ratio, which fails WCAG AA (4.5:1 required for normal text). This affects timestamps, labels, and secondary information throughout the dashboard.

**F27. Color-only status indication without text alternatives.**
The status dot (`.status-dot.online` / `.status-dot.offline`) uses green/red color only (lines 62-64). The text "Online"/"Offline" is adjacent, which partially addresses this, but badge classes like `.badge-active`, `.badge-stale`, `.badge-dead` rely on color to distinguish states. The badge text content does provide the text alternative, so this is partially mitigated.

**F28. SVG icons have no accessible labels.**
All sidebar SVG icons (lines 291-313) lack `aria-hidden="true"` (to indicate decorative) or `<title>` elements (to provide labels). Screen readers will attempt to read the SVG path data, producing gibberish.

**F29. Toast notifications not announced to screen readers.**
The toast container (line 192) has no `role="alert"` or `aria-live` region. When toasts appear (success/error messages), screen readers do not announce them. This is a significant accessibility barrier -- a user performing an action (release service, force release lock) gets no feedback.

### Error States

**F30. Daemon-down state has minimal feedback.**
When the daemon is offline, `refreshHealth()` (line 423) sets the status dot to red and text to "Offline". But every other panel still shows "Loading..." or stale data with no clear indication that the daemon is unreachable. There is no full-page error state or reconnection indicator.

---

## Surface 3: Onboarding

**F31. README Quick Start assumes familiarity.**
The Quick Start (README line 30-51) shows a 5-command sequence that works, but does not explain the mental model. "What is a session?" "What is an agent?" "Why do I need `pd begin` vs `pd claim`?" are unanswered. The conceptual jump from "port manager" (the name and npm listing) to "multi-agent coordination daemon" is jarring.

**F32. `pd learn` discoverability is poor.**
The interactive tutorial command `pd learn` is mentioned once in the README (line 500 of the help text) and once in SKILL.md line 41. It is not in the Quick Start section, not in the error messages, and not in the post-install output. A new user who needs guided help must already know it exists.

**F33. Time-to-first-value is mixed.**
For the "just want stable ports" user: excellent. `pd claim myapp` is immediate value in one command. For the "agent coordination" user: the ceremony is `pd begin` (which requires daemon, which auto-starts), so first-value is ~3-5 seconds including daemon startup. For the "run my whole stack" user: requires `pd scan` + `.portdaddyrc` creation, which may take 10-30 seconds for deep scanning plus manual review.

**F34. README "Jump to" navigation is helpful but incomplete.**
The table of contents (README line 26) links to major sections but omits DNS, Tunnels, Webhooks, and the Tutorial. The README itself is very long (400+ lines read) and has the same "wall of text" problem as `pd help`.

---

## Surface 4: AI Agent Experience (MCP/SDK)

### MCP Tool Descriptions

**What goes right:**
- MCP tool descriptions are detailed and actionable. For example, `claim_port` (mcp/server.ts line 103-107) explains the identity format, idempotency behavior, and deterministic port assignment.
- Cross-references between tools: `start_session` notes "Prefer begin_session for typical workflows" (line 201). This guides AI agents toward the right abstraction.
- Input schemas have `required` fields clearly marked.
- 40+ tools cover the full API surface.

**Friction points identified:**

**F35. MCP tool naming is inconsistent with CLI commands.**
CLI uses `pd begin` / `pd done` / `pd whoami`. MCP uses `begin_session` / `end_session_full` / `whoami`. CLI uses `pd salvage`. MCP uses `check_salvage` / `claim_salvage`. This naming gap means an AI agent that learned from SKILL.md or README examples may try to call the wrong tool name.

**F36. No tool for `pd up` / `pd down` (orchestration) in MCP.**
The MCP server does not expose `scan_project` result saving or `pd up` / `pd down` orchestration. An AI agent that wants to start a user's dev stack has no MCP tool for it and must fall back to CLI via shell execution.

### SDK (`/Users/erichowens/coding/port-daddy/lib/client.ts`)

**What goes right:**
- Fully typed interfaces for every response shape.
- Socket + TCP transport with automatic fallback (same as CLI).
- Clean API: `pd.claim()`, `pd.release()`, `pd.lock()`, `pd.unlock()`.

**F37. SDK missing `begin()` and `done()` sugar methods per CLAUDE.md.**
The CLAUDE.md "Remaining Work" section confirms SDK still lacks `pd.begin()` and `pd.done()` sugar methods. This means SDK users must manually compose `pd.registerAgent()` + `pd.startSession()`, which is exactly the ceremony that sugar commands were designed to eliminate.

### SKILL.md (`/Users/erichowens/coding/port-daddy/skills/port-daddy-cli/SKILL.md`)

**What goes right:**
- Concise and focused on the sugar workflow first.
- Anti-patterns section is excellent -- tells agents what NOT to do.
- Concrete code examples for every major operation.

**F38. SKILL.md does not mention MCP tools at all.**
The skill document exclusively shows CLI commands (`pd begin`, `pd note`, etc.). An AI agent using MCP integration would need to mentally map CLI commands to MCP tool names, which differ (see F35). There should be an MCP-specific section or at minimum a mapping table.

---

## Friction Matrix

| # | Friction Point | Surface | Users Affected | Severity (1-10) | Fix Difficulty | Priority |
|---|---|---|---|---|---|---|
| F1 | README Quick Start leads to `pd up` before `pd begin` | Onboarding | New users | 4 | Easy | Medium |
| F2 | Help text is 196 lines with no progressive disclosure | CLI | All CLI users | 6 | Medium | High |
| F3 | Sugar commands buried in help output | CLI | New users | 5 | Easy | High |
| F4 | `pd learn` not mentioned in error messages or first-run | Onboarding | New users | 5 | Easy | High |
| F5 | No aliases for `begin`/`done`/`whoami` | CLI | Power users | 2 | Easy | Low |
| F6 | No `pd status` system summary | CLI | Power users | 3 | Medium | Low |
| F7 | Auto-detected identity is silent in non-interactive mode | CLI | All CLI users | 3 | Easy | Medium |
| F8 | No `--format` flag for output customization | CLI | Scripting users | 2 | Medium | Low |
| F9 | `begin` fails without daemon in CI; error not JSON | CLI | CI/agent users | 4 | Medium | Medium |
| F10 | No `pd help <topic>` for targeted help | CLI | All CLI users | 5 | Medium | High |
| F11 | Tab completions silent-fail without daemon | CLI | All CLI users | 2 | N/A (by design) | Low |
| F12 | Sidebar nav groups not collapsible | Dashboard | Dashboard users | 2 | Medium | Low |
| F13 | Stats grid responsive breakpoints are adequate | Dashboard | -- | 1 | -- | -- |
| F14 | No URL routing -- refresh loses panel state | Dashboard | Dashboard users | 5 | Medium | Medium |
| F15 | Expanded sections lost on refresh | Dashboard | Dashboard users | 3 | Medium | Low |
| F16 | 5-second polling fires 17 parallel requests | Dashboard | Dashboard users | 4 | Easy | Medium |
| F17 | No loading states during refresh | Dashboard | Dashboard users | 3 | Easy | Medium |
| F18 | Fixed sidebar breaks on mobile (< 768px) | Dashboard | Mobile users | 6 | Medium | Medium |
| F19 | Horizontal table scroll not visually indicated | Dashboard | Narrow screens | 3 | Easy | Low |
| F20 | **No ARIA landmarks or roles** | Dashboard | Screen reader users | 9 | Easy | **Immediate** |
| F21 | **No skip navigation link** | Dashboard | Keyboard users | 8 | Easy | **Immediate** |
| F22 | **Nav items are `<div>` not `<button>` -- not keyboard accessible** | Dashboard | Keyboard/screen reader | 9 | Easy | **Immediate** |
| F23 | **Modal has no focus trap or aria-modal** | Dashboard | Keyboard users | 8 | Medium | **Immediate** |
| F24 | No `prefers-reduced-motion` media query | Dashboard | Vestibular disorders | 6 | Easy | High |
| F25 | No `prefers-color-scheme` / light mode | Dashboard | Light mode users | 3 | Hard | Low |
| F26 | Muted text fails AA contrast (~3.8:1 vs 4.5:1 required) | Dashboard | Low vision users | 7 | Easy | **Immediate** |
| F27 | Color-only badge states (mitigated by text) | Dashboard | Color blind users | 3 | Easy | Medium |
| F28 | SVG icons lack aria-hidden or title | Dashboard | Screen reader users | 5 | Easy | High |
| F29 | **Toast notifications not in aria-live region** | Dashboard | Screen reader users | 7 | Easy | **Immediate** |
| F30 | Daemon-down has no full-page error state | Dashboard | All dashboard users | 4 | Medium | Medium |
| F31 | README does not explain mental model before commands | Onboarding | New users | 5 | Easy | High |
| F32 | `pd learn` not discoverable | Onboarding | New users | 5 | Easy | High |
| F33 | Time-to-first-value is good for ports, slower for agents | Onboarding | -- | 2 | -- | -- |
| F34 | README TOC incomplete (missing DNS, Tunnels, Tutorial) | Onboarding | All readers | 3 | Easy | Medium |
| F35 | MCP tool names inconsistent with CLI commands | MCP | AI agents | 4 | Easy | Medium |
| F36 | No MCP tool for `up`/`down` orchestration | MCP | AI agents | 3 | Hard | Low |
| F37 | SDK missing `begin()`/`done()` sugar methods | SDK | SDK users | 5 | Medium | High |
| F38 | SKILL.md has no MCP tool mapping | MCP | AI agents | 4 | Easy | Medium |

---

## ADHD-Friendly Assessment

**Can users pause and resume?**
YES -- excellent. `.portdaddy/current.json` preserves the agent ID and session ID across terminal sessions. A user can close their terminal, come back hours later, and `pd whoami` still knows who they are. `pd done` reads from the context file. Sessions persist in SQLite. This is one of Port Daddy's strongest UX qualities.

**Progressive disclosure?**
PARTIALLY. The sugar commands (`begin`, `done`, `whoami`) are a great progressive disclosure layer over the primitives (`agent register`, `session start`, `session files claim`). However, the help text dumps everything at once. The dashboard shows 15 panels with no ability to hide unused ones. The interactive tutorial (`pd learn`) is the right approach but is not discoverable enough.

**Gentle feedback?**
YES. The maritime flag system (Kilo flag for prompts, Charlie flag for success, November flag for cancel) is distinctive and avoids harsh error walls. Success messages use `maritimeStatus('success', ...)`. Error messages include actionable next steps ("Start with: port-daddy start", "Run: pd salvage"). The tone is firm but helpful.

**Context preservation?**
YES. Between the `.portdaddy/current.json` context file, the SQLite persistence, and session notes, Port Daddy is unusually good at preserving state for users who lose context. The salvage system extends this to inter-agent context: when one agent dies, another can pick up where it left off with full notes history.

**Areas of concern for ADHD users:**
- The 196-line help text is overwhelming. ADHD users need scannable, chunked information.
- The dashboard's 15-panel sidebar with auto-refresh can be distracting.
- No "what should I do next?" guidance after `pd begin`. The system waits silently until `pd done`.

---

## Recommendations

### Immediate (accessibility blockers, < 1 day each)

1. **Add ARIA landmarks to dashboard** (`/Users/erichowens/coding/port-daddy/public/index.html`): `role="navigation"` on sidebar, `role="main"` on content, `role="dialog"` on modal overlay. Add `aria-label` to each landmark.

2. **Make nav items keyboard-accessible**: Change `<div class="nav-item" onclick="...">` to `<button class="nav-item" onclick="...">` or add `role="button" tabindex="0"` with `keydown` handler for Enter/Space. All 15 nav items.

3. **Add skip navigation link**: Insert `<a href="#main-content" class="skip-link">Skip to main content</a>` as first child of `<body>`, visually hidden until focused. Add `id="main-content"` to the content area.

4. **Add focus trap to modal**: When modal opens, trap Tab/Shift+Tab within it. On close, return focus to the element that opened it. Add `role="dialog" aria-modal="true" aria-labelledby="modal-title"`.

5. **Fix muted text contrast**: Change `--text-muted:#5c6170` to `#7a7f8e` or lighter to meet 4.5:1 against `#0c0a1a`. Verify all color combinations.

6. **Add `role="alert"` to toast container**: Change `<div class="toast-container" id="toast-container">` to include `role="status" aria-live="polite"`. For error toasts, use `aria-live="assertive"`.

7. **Add `aria-hidden="true"` to decorative SVG icons**: All sidebar nav icons are decorative (the text label is adjacent). Add `aria-hidden="true"` to prevent screen reader gibberish.

8. **Add `prefers-reduced-motion` media query**: Wrap all `@keyframes` usage in `@media (prefers-reduced-motion: no-preference)` or set `animation: none` in `@media (prefers-reduced-motion: reduce)`.

### Medium-term (UX improvements, 1-3 days each)

9. **Restructure help text with progressive disclosure**: Implement `pd help <topic>` (e.g., `pd help sessions`, `pd help locks`). Keep `pd help` as a short summary (20-30 lines) with "Run pd help <topic> for details" pointers. Move Sugar Commands to the top of the default help.

10. **Add URL hash routing to dashboard**: Use `window.location.hash` to persist panel state. `#services`, `#sessions`, `#locks` etc. Listen for `hashchange` events. Minimal code change.

11. **Make `pd learn` discoverable**: Add a hint in `pd help` output (first line: "New to Port Daddy? Run `pd learn` for an interactive tutorial."). Add it to the error message when an unknown command is entered. Add it to the first-run auto-start message.

12. **Add sidebar collapse for mobile**: Media query at 768px to transform sidebar into a hamburger menu or slide-out drawer. Hide sidebar by default on mobile.

13. **Reduce polling aggression**: Change from 5s to 15s default with a "Live" toggle button in the topbar. When the user is actively interacting (typing in command bar, expanding sections), pause polling temporarily.

14. **Add daemon-down error state to dashboard**: When `refreshHealth()` fails, show a full-width banner at the top of the content area: "Daemon offline -- data may be stale. Start with: pd start". Dim all panels.

15. **Add `begin()`/`done()`/`whoami()` to SDK**: Complete the sugar method parity. These should compose the same REST calls as `routes/sugar.ts`.

16. **Add MCP-to-CLI mapping in SKILL.md**: A simple table: `pd begin` = `begin_session` MCP tool, `pd done` = `end_session_full`, etc.

### Long-term (architecture, > 3 days)

17. **Component-based dashboard**: The single-file HTML (527 lines of markup, 135 lines of JS) is reaching its maintainability ceiling. Consider extracting to a lightweight framework (Preact, Lit) to enable proper state management, virtual DOM diffing (prevents scroll-jank during refresh), and component-level accessibility patterns.

18. **Server-Sent Events for dashboard updates**: Replace polling with SSE from the daemon. The daemon already has SSE infrastructure for pub/sub (`/msg/:channel/subscribe`). Add a `/dashboard/events` SSE endpoint that pushes state changes. This eliminates the 17-request-per-5-seconds polling overhead.

19. **Context-aware help in CLI**: `pd help` could read `.portdaddy/current.json` and show context-relevant help. If a session is active, show "You have an active session. Common next steps: pd note, pd done, pd session phase". If no session, show "Start with: pd begin".

20. **README restructure**: Split into a short README (Quick Start + conceptual overview, < 200 lines) and a docs/ folder with individual topic pages (Sessions, Locks, Orchestration, Agent Coordination, DNS). The current README tries to be both a landing page and a reference manual.

---

### Summary

Port Daddy's CLI UX is strong for a developer tool. The sugar commands, context preservation, maritime feedback system, interactive prompting, and Tier 1/Tier 2 split are genuinely thoughtful design decisions. The auto-start behavior, fuzzy command suggestion, and `.portdaddy/current.json` context file show attention to the developer experience.

The web dashboard has significant accessibility barriers. The complete absence of ARIA landmarks, keyboard-inaccessible navigation elements, unfocusable modal, and missing `aria-live` regions mean the dashboard is effectively unusable by screen reader and keyboard-only users. These are all fixable with targeted changes to the single HTML file.

The onboarding path would benefit most from progressive disclosure: shorter default help text, a discoverable `pd learn` command, and restructuring help to put sugar commands first.
