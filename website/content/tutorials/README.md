# Port Daddy Tutorials

Welcome to the Port Daddy learning path. These five tutorials take you from "what is this?" to "why didn't I have this years ago?"

## The Learning Path

### 1. [Your First 5 Minutes with Port Daddy](01-getting-started.md)
**Time: 10 minutes | Difficulty: Beginner**

Start here. You'll install Port Daddy, start the daemon, claim your first port, explore the dashboard, and understand semantic naming. After this, you'll never `lsof -i :3000` again.

**You'll learn:**
- Installation (npm, Homebrew, or npx)
- Starting the daemon
- Claiming stable ports
- Using the web dashboard
- Framework auto-detection magic

### 2. [Orchestrating 5 AI Agents Without Losing Your Mind](02-multi-agent-orchestration.md)
**Time: 20 minutes | Difficulty: Intermediate**

Multiple agents working on the same codebase? Learn how Port Daddy coordinates them with sessions, notes, file claims, pub/sub messaging, locks, and agent heartbeats. This is where single-agent power becomes multi-agent intelligence.

**You'll learn:**
- Sessions and notes (structured coordination)
- File claims (conflict detection)
- Pub/Sub messaging (real-time signaling)
- Distributed locks (exclusive access)
- Agent registration and heartbeats
- The salvage system (agent resurrection)
- Real-world pattern: building a payment system in parallel

### 3. [Share Your Local Dev Server in 30 Seconds](03-tunnel-magic.md)
**Time: 15 minutes | Difficulty: Intermediate**

Show your work to stakeholders, test webhooks with external services, debug on mobile, or integrate with CI/CD — all without deploying. Port Daddy auto-detects ngrok, cloudflared, or localtunnel and makes your localhost global.

**You'll learn:**
- Why tunnels matter (5 real scenarios)
- Installing tunnel providers
- Starting and managing tunnels
- Sharing URLs with clients
- Webhook testing
- Security considerations
- CI/CD integration

### 4. [Port Daddy in a 50-Service Monorepo](04-monorepo-mastery.md)
**Time: 25 minutes | Difficulty: Advanced**

Got a massive monorepo with 15, 30, or 50 services? Port Daddy scans it, detects every framework (60+), generates a `.portdaddyrc` config, and starts your entire stack with `pd up`. Deterministic ports, dependency order, health checks, color-coded logs.

**You'll learn:**
- Deep scanning with auto-detection
- Dependency ordering (what starts first)
- Health checks (service readiness)
- Environment variable injection
- Graceful shutdown
- Starting individual services
- Sharing configs with your team
- Branch-specific configurations

### 5. [The Port Is Already In Use: A Horror Story](05-debugging-with-port-daddy.md)
**Time: 20 minutes | Difficulty: Advanced**

It's 2am. Production is down. You can't start your dev environment because port 3000 is occupied by a ghost process. Learn Port Daddy's complete forensic debugging toolkit: status, health checks, activity logs, lock inspection, session tracking, and SQLite queries. You'll solve in 30 seconds what used to take 2 hours.

**You'll learn:**
- pd find (what services are claimed)
- pd status (big picture)
- pd health (service diagnostics)
- pd log (forensic audit trail)
- pd cleanup (removing stale services)
- Lock debugging
- Session timeline analysis
- Direct SQLite queries
- Troubleshooting checklist
- Real 2am debugging scenario

## Choose Your Path

**New developer?** Start with Tutorial 1 only. Get comfortable with the basics.

**Building a small app?** Tutorials 1 + 3. You'll claim ports and optionally tunnel.

**Working with AI agents?** Tutorials 1 + 2 + 5. Focus on coordination and debugging.

**In a monorepo?** Tutorials 1 + 4 + 5. Learn orchestration and debugging.

**Full mastery?** All five, in order. You'll understand every layer of Port Daddy.

## Quick Reference

### Most Common Commands

```bash
# Claim a port
PORT=$(pd claim myapp -q)

# See what's running
pd find

# Start entire stack
pd up

# Share locally with the internet
pd tunnel start myapp:api

# Diagnose port conflicts
pd status
pd health

# Coordinate agents
pd session start "Building auth"
pd note "Finished OAuth integration"
pd pub myapp:api '{"status":"ready"}'
```

### Key Concepts

- **Semantic Identity**: `project:stack:context` (e.g., `myapp:api:feature-auth`)
- **Deterministic Ports**: Same identity always gets the same port on a machine
- **Sessions**: Structured coordination with file claims and notes
- **Pub/Sub**: Real-time signaling between services or agents
- **Locks**: Exclusive access to critical resources
- **Tunnels**: Share local dev servers with the outside world
- **Orchestration**: `pd up` starts services in dependency order with health checks

## Troubleshooting

**"I don't understand the semantic naming"** — Read Tutorial 1, section "How naming works". It's three optional parts: `project`, `project:stack`, or `project:stack:context`.

**"How do I coordinate multiple agents?"** — Tutorial 2 covers everything. Start with the "Real Scenario" section.

**"My monorepo has 30 services"** — Tutorial 4 is written for exactly this. Use the `.portdaddyrc` examples as templates.

**"Something's broken at 2am"** — Tutorial 5's "2am Port Debugging" scenario shows the exact diagnostic flow.

## Beyond the Tutorials

After mastering these five, explore:

- **[Full CLI Reference](https://github.com/curiositech/port-daddy#cli-reference)** — Every command with all flags
- **[JavaScript SDK Reference](https://github.com/curiositech/port-daddy/docs/sdk.md)** — Programmatic API
- **[HTTP API Reference](https://github.com/curiositech/port-daddy#api-reference)** — Raw endpoints
- **[Examples](https://github.com/curiositech/port-daddy/examples)** — Working patterns and use cases

## Your Success Metrics

After Tutorial 1:
- You've started the daemon
- You've claimed a port
- You understand semantic naming

After Tutorial 2:
- You've started a session
- You've sent pub/sub messages
- You understand agent coordination

After Tutorial 3:
- You've tunneled a local service
- You've shared a URL with someone else
- You've tested a webhook locally

After Tutorial 4:
- You've scanned a monorepo
- You've started multiple services with `pd up`
- You understand dependency ordering

After Tutorial 5:
- You've diagnosed a port conflict without `lsof`
- You've used the activity log for forensics
- You've cleaned up stale services

## The Big Picture

Port Daddy replaces three separate tools and fixes a class of bugs that shouldn't exist:

**Before Port Daddy:**
- Use `docker-compose` for orchestration (heavy, configuration hell)
- Use manual port tracking (error-prone, breaks across machines)
- Use flat-file coordination (`.CLAUDE_LOCK`, `.CLAUDE_NOTES.md`) for agents
- Spend 2 hours debugging ghost processes on port 3000
- Deploy to staging to show clients your work
- Fight with teammates over port numbers

**After Port Daddy:**
- `pd up` starts your entire stack with health checks
- Deterministic port assignment (same identity, same port, always)
- Structured sessions, notes, pub/sub, locks for agent coordination
- `pd status` and `pd health` tell you exactly what's happening
- `pd tunnel start` shares your localhost with the world
- Everything is consistent across your whole team

## Remember

Port Daddy's purpose is simple: **Your ports. My rules. Zero conflicts.**

Happy building.
