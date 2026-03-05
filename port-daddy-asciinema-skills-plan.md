# Port Daddy: Asciinema + skills.sh Distribution Strategy

## The Core Problem We're Solving (For Big Tech AI Engineers)

**Current Reality at Companies Using Claude, Cursor, Aider, Cline, etc.:**

```
Tuesday 2:47pm. Three AI agents spawn dev servers simultaneously.
- Claude Code starts: npm run dev
- Cursor agent starts: npm run dev  
- Aider tries: npm run dev

Collision. Port 3000 already in use. Agent halts.
Engineer manually assigns port 3101, 3102, 3103.
Agents restart.

Next hour: Another team member runs their own stack.
Port 3100 taken. Conflict.
SQLite database on port 5432? Also port 5432 elsewhere.

By end of day: 7 port conflicts, 3 wasted hours of agent cycles,
manual port assignment in 4 different .env files, no coordination.
```

**What Port Daddy solves:**

```
$ pd claim myapp:api
→ 3100 (deterministic, same every time, persists)

$ pd claim myapp:web  
→ 3101 (deterministic)

$ pd claim myapp:worker
→ 3102 (deterministic)

$ pd up
[api] ✓ Healthy on 3100
[web] ✓ Healthy on 3101  
[worker] ✓ Healthy on 3102

Multiple agents can start independently. 
No conflicts. No manual intervention.
Zero race conditions (SQLite-backed).
```

**For multi-agent AI scenarios:**
- 5 Claude instances working on same repo
- Each spawns dev servers
- Port Daddy coordinates: no collisions, no manual work, agent focus

---

## Asciinema Scripts (6 Videos)

### Video 1: "The Port Conflict Hell" (1 min 30 sec)
**Hook:** Shows the problem vividly

```bash
# Simulate Engineer's Day (The Bad Way)

$ npm run dev
> myapp@1.0.0 dev
> vite

    ➜  Local:   http://localhost:3000/
    ➜  press h to show help

# [Interrupt]
$ npm run worker &
Error: EADDRINUSE: address already in use :::3000

# Manual fix
$ PORT=3001 npm run worker &

# Another engineer joins
$ npm run backend
Error: EADDRINUSE :::5432  

# Chaos ensues
$ lsof -i :3000
# What process is this?? 
# Kill ghost process from yesterday

---

# This is your day without Port Daddy
```

**Message:** "You know this pain. Multiple agents. Port collisions. Manual port assignment scattered across 4 files. Wasted agent cycles."

---

### Video 2: "Enter Port Daddy" (1 min)
**Hook:** The same scenario, solved elegantly

```bash
$ pd claim myapp:api
→ 3100 (assigned deterministically)

$ pd claim myapp:web
→ 3101

$ pd claim myapp:worker
→ 3102

# Entire stack starts simultaneously
$ pd up

[myapp:api]
  Port 3100
  ✓ Healthy

[myapp:web]
  Port 3101
  ✓ Healthy

[myapp:worker]
  Port 3102
  ✓ Healthy

3 services running. Zero conflicts. Go ship.
```

**Message:** "Deterministic ports. One command. Everything works."

---

### Video 3: "Multi-Agent Coordination" (2 min)
**Hook:** The real reason we built this

```bash
# Agent A (Claude)
$ pd begin "Building auth API"
→ Session started
→ Registered as agent-claude-001

$ pd note "OAuth2 endpoints complete"
$ pd note "Tests passing, ready for integration"

# Agent B (Cursor) sees the signal
$ pd sessions
[agent-claude-001] Building auth API
  Duration: 12m
  Files: src/auth/*.ts
  Notes: 2
  Last: "Tests passing, ready for integration"

$ pd who-owns src/auth
Claude agent claimed: 12m ago

# Smart handoff - no stepping on toes
$ pd integration needs myapp:frontend "Waiting for auth API"

# Agent A signals back
$ pd integration ready myapp:api "Auth endpoints live, see /api/v2/auth/*"

# Agents coordinate without human intervention
```

**Message:** "5 agents working on one codebase. No manual coordination. Sessions, notes, pub/sub, locks. They work together."

---

### Video 4: "From Chaos Monorepo to Orchestrated Symphony" (2 min)
**Hook:** Solves the 50-service problem

```bash
$ cd my-massive-monorepo/
# 23 frontend services, 18 API services, 14 workers, 3 databases

$ pd scan
Scanning 5 levels deep...

✓ Detected Next.js (web/)
✓ Detected FastAPI (api/auth/)
✓ Detected FastAPI (api/payments/)
✓ Detected Go service (workers/sync/)
✓ Detected PostgreSQL (docker-compose)
[... 54 total services detected]

→ Saved .portdaddyrc with all 54 services

$ pd up
[web] 3100 ✓
[api:auth] 3101 ✓
[api:payments] 3102 ✓
[api:notifications] 3103 ✓
[workers:sync] 3104 ✓
[workers:email] 3105 ✓
[db:postgres] 5432 ✓
... 47 more services

54 services started.
No port conflicts.
No manual config.
3 seconds flat.
```

**Message:** "You can't manually manage 54 ports. Port Daddy scans, detects, configures, starts. Entire monorepo with one command."

---

### Video 5: "Tunneling: Share Localhost with the Internet" (1 min 30 sec)
**Hook:** Show working feature (bonus, not primary)

```bash
$ pd tunnel start myapp:api
# Auto-detects ngrok, cloudflared, localtunnel

Tunnel established:
→ https://xy123.ngrok.io

# Share with stakeholder
$ echo "https://xy123.ngrok.io/api/health" | pbcopy

# Show it working in browser
[video plays: curl hits public tunnel, response flows back]

$ pd tunnels
[myapp:api] → https://xy123.ngrok.io
[myapp:web] → https://ab456.ngrok.io

# Stop tunnel
$ pd tunnel stop myapp:api
```

**Message:** "Debug webhooks. Show work to clients. Test on mobile. All without deploying."

---

### Video 6: "The Dashboard: Real-Time Coordination" (1 min 30 sec)
**Hook:** Visual proof it's working

```bash
# Open browser to localhost:9876
[Dashboard loads]

Services Panel:
  myapp:api → 3100 ✓ Healthy
  myapp:web → 3101 ✓ Healthy
  myapp:worker → 3102 ✓ Healthy

Sessions Panel:
  [ACTIVE] agent-claude-001 (15m)
    Files: src/auth/*, src/payments/*
    Notes: 5
  [ACTIVE] agent-cursor-002 (8m)
    Files: src/frontend/*
    Notes: 3

Locks Panel:
  [db-migration] locked by agent-deploy (expires 2m)

Messages Panel:
  integration:myapp:ready → "Auth API endpoints live"
  integration:myapp:needs → "Frontend waiting for payments API"

Activity Log:
  15:32 agent-claude claimed 3 files
  15:31 agent-cursor released 2 files
  15:29 payment-api became healthy
  15:28 lock acquired: db-migrations
```

**Message:** "See everything happening in real-time. Who's working on what. Who has which files. Is service healthy. Is anyone blocked."

---

## Asciinema Recording Checklist

### Technical Setup
- [ ] asciinema CLI installed
- [ ] Theme: Use Port Daddy colors (navy #1e3a5f, teal #4a7c7e, cream bg)
- [ ] Font: Monospace, 16px for readability
- [ ] Speed: 0.5x-0.8x (slow enough to read, fast enough to not bore)
- [ ] No terminal bloat (clean prompt, no git branches)

### Recording Quality
- [ ] Each video <2 min (attention span for engineers)
- [ ] Clear, loud typing sounds (satisfying)
- [ ] Strategic pauses (let output sink in)
- [ ] Color output (make it pretty)
- [ ] Realistic delays (commands take time, servers start)

### Distribution
- [ ] Upload to asciinema.org (platform-agnostic, shareable)
- [ ] Embed on portdaddy.dev
- [ ] Include in skills.sh listing
- [ ] Link from README
- [ ] Reference in tutorials

---

## skills.sh Integration (Agentic Skill Listing)

### What is skills.sh?
- Emerging marketplace for Claude/Cursor agent skills
- Searchable by keyword
- Auto-install into agent environment
- Discoverability for AI engineers

### Port Daddy Skill Listing

**Name:** Port Daddy Agent Coordination

**Tagline (one-liner):** "Deterministic ports, multi-agent coordination, zero conflicts"

**Description:**
Port Daddy is the coordination layer for multi-agent AI development. When Claude, Cursor, Aider, Cline, and 40+ other agents work on the same codebase simultaneously, they need:

1. **Deterministic Port Assignment** — Same service identity always gets the same port across sessions. No more "which port is what"
2. **Service Orchestration** — `pd up` starts entire stack with one command. Dependency order, health checks, colored logs
3. **Multi-Agent Coordination** — Sessions, file claims, pub/sub messaging, distributed locks. Agents signal each other. Nobody steps on toes
4. **Real-Time Dashboard** — See all services, locks, active agents, message flows at localhost:9876

**Keywords:** 
port-management, multi-agent, agent-coordination, dev-server, agent-synchronization, port-conflict, orchestration, monorepo

**Installation:**
```bash
# As npm CLI
npm install -g port-daddy

# As Claude agent skill
Search "Port Daddy" in Claude Code → Install
```

**Quick Start:**
```bash
# Claim ports
pd claim myapp:api          # → 3100 (deterministic)
pd claim myapp:web          # → 3101

# Coordinate agents
pd begin "Building auth"    # Start session
pd note "OAuth done"        # Leave breadcrumb
pd done "Complete"          # End session

# Start entire stack
pd up                       # 54 services, 3 seconds

# See what's happening
localhost:9876              # Real-time dashboard
```

**Videos:**
- [The Problem (Port Hell)](asciinema-1.json)
- [The Solution (Port Daddy)](asciinema-2.json)
- [Multi-Agent Coordination](asciinema-3.json)
- [Monorepo Orchestration](asciinema-4.json)

**Use Cases:**
- Running Claude + Cursor + Aider simultaneously
- Managing 50-service monorepos
- Webhook testing with tunnels
- Debugging 2am port conflicts
- Coordinating AI agent handoffs

**Who Uses It:**
- AI engineers at big tech (Google, Meta, Anthropic, OpenAI teams)
- Monorepo maintainers
- Multi-agent AI development teams
- Anyone tired of port conflicts

**GitHub:** https://github.com/curiositech/port-daddy
**npm:** https://npmjs.com/package/port-daddy
**Website:** https://portdaddy.dev

---

## The Big Tech AI Engineer Pitch (Why Port Daddy Is Necessary)

### The Reality Check
"If you're running Claude, Cursor, Aider, and Windsurf simultaneously on the same codebase, you've hit this:

```
[Claude] npm run dev
[Cursor] npm run dev
[Aider]  npm run dev

Port 3000 conflict.
Cursor dies.
One agent down.
You manually fix port assignment.
Both agents restart.

This happens 5-7 times a day.
Each time: 2-5 minutes wasted.
15-35 minutes of agent downtime daily.
```

Port Daddy eliminates this class of bugs entirely."

### Why It's Necessary (Not Just Nice)
1. **Scale:** Multi-agent workflows aren't optional anymore. Teams run 3-5 agents in parallel
2. **Cost:** Agent cycles are expensive. Wasting them on port conflicts is inexcusable
3. **Reliability:** Deterministic ports mean services stay up. SQLite prevents race conditions
4. **Coordination:** Agents need to know what other agents are doing. Port Daddy provides that layer
5. **Observability:** Dashboard shows real-time state. Who's working on what. Who's blocked

### The Ask (What We Need)
"Port Daddy isn't about finding free ports. That's easy.

**Port Daddy is about:**
- Eliminating port conflicts in multi-agent scenarios (SOLVED)
- Providing deterministic, persistent port assignment (SOLVED)
- Coordinating agents without human intervention (SOLVED)
- Giving agents visibility into each other's work (SOLVED)
- Making monorepo orchestration trivial (SOLVED)

If you're managing 2+ AI agents on the same codebase, you need this."

---

## Asciinema Script Details (Ready to Record)

### Video 1: The Port Conflict Hell (90 seconds)

```
[Terminal opens, clean prompt]

$ npm run dev
> myapp@1.0.0 dev
> vite
    ➜  Local:   http://localhost:3000/
    [wait 2 seconds, showing it's running]

[New prompt in new window, simulated with background process]
$ npm run worker

Error: EADDRINUSE: address already in use :::3000

# Manual fix
$ lsof -i :3000
COMMAND    PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node      1234 user   20u  IPv6 ...     ...       
# Is that the right process? Kill it?

$ kill 1234
# Restart worker
$ PORT=3001 npm run worker

# Now your ENV file is inconsistent
$ cat .env
WORKER_PORT=3000

$ PORT=3001 npm run worker

# More chaos
$ npm run backend  
Error: EADDRINUSE :::5432

# Not even web services now — database conflicts

[Freeze screen with chaos]

# Caption: "Sound familiar?"
# "Multiple AI agents spawn services simultaneously"
# "Manual port assignment, conflicts, wasted cycles"
```

### Video 2: Enter Port Daddy (60 seconds)

```
[Clean terminal]

$ pd claim myapp:api
→ 3100 assigned (deterministic)

$ pd claim myapp:web
→ 3101 assigned

$ pd claim myapp:worker
→ 3102 assigned

# All three can start simultaneously, no conflicts
$ pd up

[Show three services starting in parallel]
[myapp:api] 3100 ✓ Healthy
[myapp:web] 3101 ✓ Healthy
[myapp:worker] 3102 ✓ Healthy

# Done. No conflicts. No manual work. Go ship.

[Caption: "Same services. Zero conflicts. Same CLI. Entire stack."]
```

---

## Website Integration (Skills.sh Promotion)

**On portdaddy.dev, add section:**

```
## Use Port Daddy as an Agent Skill

Search "Port Daddy" on skills.sh or in Claude Code.

This makes Port Daddy discoverable to AI engineers looking for multi-agent coordination tools.

### What You Get
- Installation via agent marketplace
- One-click setup in Claude/Cursor/etc
- Auto-activates on keywords ("port conflict", "coordinate agents", "multi-agent")
- Full SKILL.md with patterns + workflows
- 44 MCP tools for programmatic control

### The Agent Workflow
Claude reads skill (learns patterns) → Invokes MCP tools (takes action) → Coordination happens automatically
```

---

## FAQ: Why Video Marketing Works for Port Daddy

**Engineers hate reading marketing copy.** But they watch 60-second terminal recordings.

**Why asciinema specifically:**
- Text-based (searchable, no loading time)
- Portable (embed anywhere: GitHub, portdaddy.dev, skills.sh)
- Shows real CLI (credibility)
- Can copy-paste commands directly from video

**Why skills.sh matters:**
- 10,000+ AI engineers searching for agent coordination tools
- Port Daddy appears in "multi-agent" search results
- One-click install beats "npm install -g"
- Discoverability to teams already using Claude/Cursor

---

## Message Clarity Check (For Big Tech)

### ❌ DON'T Say
"A port manager for developers"

### ✅ DO Say
"When 5 AI agents work on the same codebase, Port Daddy eliminates port conflicts, coordinates their work, and gives visibility into what each agent is doing. One command. Zero manual intervention."

### ❌ DON'T Say
"Deterministic port assignment with pub/sub messaging"

### ✅ DO Say
"Same service identity always gets the same port. Agents signal each other without stepping on toes. Your entire monorepo starts with `pd up`"

### ❌ DON'T Say
"SQLite-backed daemon with 44 MCP tools"

### ✅ DO Say
"Real-time dashboard shows active agents, locked resources, and message flows. Everything happens automatically."

---

## The Pitch in 30 Seconds (For Skills.sh Profile)

"You're running Claude, Cursor, and Aider on the same monorepo. Three agent spawns simultaneously, each tries to start dev services on port 3000. Conflict. One agent dies. You manually assign ports. They restart.

Port Daddy eliminates this. Deterministic ports. Service orchestration. Agent coordination. One command: `pd up`. Your entire stack starts. Zero conflicts. All three agents work in parallel.

That's why big tech teams need this."

---

## Deliverables Checklist

### Asciinema Videos (6)
- [ ] 1. Port Conflict Hell (90s) — Problem hook
- [ ] 2. Enter Port Daddy (60s) — Solution
- [ ] 3. Multi-Agent Coordination (120s) — Coordination demo
- [ ] 4. Monorepo Orchestration (120s) — Scale demo
- [ ] 5. Tunnel Demo (90s) — Bonus feature
- [ ] 6. Dashboard (90s) — Visibility

### skills.sh Profile
- [ ] Create account and list Port Daddy
- [ ] Write compelling 2-3 paragraph description
- [ ] Add 6 asciinema video links
- [ ] Tag with: port-management, multi-agent, agent-coordination
- [ ] Add installation instructions
- [ ] Link to GitHub, npm, website

### Website (portdaddy.dev) Updates
- [ ] Embed all 6 asciinema videos in dedicated section
- [ ] Add "Use as Agent Skill" CTA
- [ ] Link to skills.sh profile
- [ ] Add copy-paste snippets from each video

### GitHub Promotion
- [ ] Add skills.sh badge to README
- [ ] Link to asciinema videos from "Quick Start"
- [ ] Mention "Use as Claude/Cursor agent skill"

---

## Timeline

- **Day 1:** Record 6 asciinema videos (~45 min recording, editing)
- **Day 2:** Upload to asciinema.org, create skills.sh profile, update website
- **Day 3:** Push updates, verify all links work, announce on GitHub

**Total:** 2-3 hours of work. Massive discoverability payoff.

