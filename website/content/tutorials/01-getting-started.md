# Your First 5 Minutes with Port Daddy

Welcome to the end of `lsof -i :3000` diagnostics and port conflict nightmares. In the next five minutes, you'll have Port Daddy running, claim your first stable port, and never manually track port numbers again.

## The Problem You're About to Forget

Ever done this at 9:47pm?

```bash
npm run dev
# Error: EADDRINUSE: address already in use :::3000
# What is on 3000?

lsof -i :3000
# node    12453   erich   45u  IPv6 0x12abc...    0t0  TCP *:hpserver (LISTEN)
# Is that from my last terminal window? A stray Docker container? Who knows.

pkill -f node
# Oops, just killed the wrong process.
```

You're about to throw that workflow in the recycling bin.

## Installation (Choose Your Path)

### Option 1: npm (Recommended)

```bash
npm install -g port-daddy
```

This installs the `pd` CLI globally and the JavaScript SDK locally when you `npm install port-daddy` in your projects.

### Option 2: Homebrew (macOS)

```bash
brew install curiositech/port-daddy/port-daddy
```

### Option 3: Use Without Installing (npx)

You can use Port Daddy without installing:

```bash
PORT=$(npx port-daddy claim myapp -q)
npm run dev -- --port $PORT
```

The `--quiet/-q` flag returns just the port number, perfect for shell scripts and CI/CD pipelines.

## Starting the Daemon

Port Daddy runs as a background daemon on `localhost:9876`. It auto-starts on first use, but let's start it explicitly so you can see what's happening:

```bash
pd start
# ✅ Daemon listening on http://localhost:9876
# Database: /Users/erich/.port-daddy/port-registry.db
```

Check that everything's working:

```bash
pd status
# ✅ Daemon running (pid 45821)
# 📊 Services: 0
# 🔒 Locks: 0
```

## Claiming Your First Port

Here's the magic moment. Instead of hardcoding port 3000, you claim it:

```bash
pd claim myapp
# Port 3100 assigned to myapp
```

Every time you claim `myapp` from this machine, you'll get port 3100. Not 3001, not 3847 — always 3100. The port is deterministic based on your identity.

Now use it in your dev server:

```bash
PORT=$(pd claim myapp -q) npm run dev -- --port $PORT

# Or if your framework uses an env var:
export PORT=$(pd claim myapp -q)
npm run dev
```

### How Naming Works

Port Daddy uses semantic naming: `project:stack:context`. All three parts are optional.

```bash
# Just the project
pd claim myapp
# --> port 3100

# Project + stack (different components)
pd claim myapp:api
# --> port 3101

pd claim myapp:web
# --> port 3102

# Project + stack + context (branches, variants)
pd claim myapp:api:feature-payments
# --> port 3103
```

This means you can run multiple services from the same project, and each gets its own stable port. Your frontend always runs on the same port, your API on another, and if you're working on a feature branch with its own API, that gets its own port too.

Wildcards work everywhere:

```bash
# Find all services for myapp
pd find myapp:*

# Release all myapp services at once
pd release myapp:*
```

## Opening the Dashboard

Port Daddy includes a beautiful web dashboard showing all your claimed services, active locks, agent heartbeats, and system health.

```bash
pd dashboard
```

This opens `http://localhost:9876` in your browser. You'll see:

- **Services**: All claimed ports and their identities
- **Health**: Real-time health checks of each service
- **Locks**: Any distributed locks currently held
- **Activity**: Timeline of claims, releases, and coordination events
- **Metrics**: Daemon uptime, request count, average response time

The dashboard updates in real-time via WebSocket, so you're watching live events as they happen.

## Framework Detection Magic

Port Daddy includes auto-detection for 60+ frameworks. Let it scan your project:

```bash
cd your-existing-project/
pd scan
```

This walks your directory tree recursively and detects:

- **Frontend**: Next.js, Nuxt, SvelteKit, Remix, Astro, Vite, Vue, React, Angular
- **Backend**: Express, Fastify, Hono, NestJS, Koa, FastAPI, Flask, Django, Rails, Laravel, Spring Boot
- **Workers**: Cloudflare Workers, AWS Lambda
- **Languages**: Go, Rust, Deno, Node, Python, Java, Kotlin
- **And 30+ more** (check `pd scan --help` for the full list)

After scanning, you'll get a `.portdaddyrc` file that describes your entire service architecture:

```json
{
  "project": "myapp",
  "services": {
    "api": {
      "cmd": "npm run dev -- --port ${PORT}",
      "healthPath": "/health"
    },
    "web": {
      "cmd": "npm run dev -- --port ${PORT}",
      "needs": ["api"],
      "healthPath": "/"
    },
    "worker": {
      "cmd": "npm run worker",
      "noPort": true
    }
  }
}
```

Notice: no hardcoded ports. Port Daddy assigns them deterministically from the identity hash. Your teammate on a different machine will get the same ports because the math is the same.

## Your Workflow Now

Before Port Daddy:
```
1. "What port should I use?"
2. Check the README (outdated info)
3. Try port 3000 (already in use)
4. Try port 3001 (blocked by Docker)
5. Try port 3456 (finally works)
6. Remember that 3456 is frontend, 3457 is API (hard to keep track)
7. Commit hardcoded ports and break teammates' local dev
8. Spend 20 minutes in Slack explaining port numbers
```

After Port Daddy:
```bash
PORT=$(pd claim myapp:web -q) npm run dev
# Done. Same port, every time. Shared with your teammates.
```

## Releasing Ports

When you're done developing, release the port so it's available again:

```bash
# Release one service
pd release myapp:web

# Release all myapp services
pd release myapp:*
```

Released ports go back into the pool. If you claim `myapp:web` again tomorrow, you'll get the same port.

## What's Stored Where

Port Daddy keeps everything in a local SQLite database:

```bash
# View the database directly
sqlite3 ~/.port-daddy/port-registry.db

# List all services
sqlite3 ~/.port-daddy/port-registry.db "SELECT * FROM services"

# See who claimed what and when
sqlite3 ~/.port-daddy/port-registry.db "SELECT id, port, createdAt FROM services ORDER BY createdAt DESC LIMIT 5"
```

This persistence means your ports survive machine restarts, daemon restarts, even if you `cd` to a different project and come back hours later.

## Making It Auto-Start

If you want Port Daddy to start automatically when you log in (so you never have to `pd start`):

```bash
pd install
# Created /Library/LaunchAgents/ai.curiositech.port-daddy.plist
```

On Linux:
```bash
pd install
# Created ~/.config/systemd/user/port-daddy.service
```

To remove auto-start:
```bash
pd uninstall
```

## Troubleshooting Your First 5 Minutes

### "Daemon won't start"

Check if something is already listening on 9876:

```bash
lsof -i :9876

# If a old daemon is stuck:
pkill -f "port-daddy.*server"

# Try again:
pd start
```

### "Why is my port different from a teammate's?"

Port assignment is machine-local. If you both claim `myapp:api`, you might get 3100 and they get 3104. That's normal and good — it means you're not fighting over the same port.

### "Can I request a specific port?"

Yes:
```bash
pd claim myapp:api --port 3000
```

But this breaks the "stable port" contract if you move machines. Try to avoid it.

### "Does Port Daddy work with Docker?"

Absolutely. If your dev server runs in a container, just claim a port outside:

```bash
PORT=$(pd claim myapp -q)
docker run -p 127.0.0.1:${PORT}:3000 myapp:dev
```

Now your container is accessible on the stable port.

## What's Next

You've got Port Daddy running and you understand the basics. Here's what to explore:

1. **[Orchestration](04-monorepo-mastery.md)** — Run your entire stack with `pd up` instead of juggling 5 terminal windows
2. **[Multi-Agent Coordination](02-multi-agent-orchestration.md)** — Learn how sessions, locks, and pub/sub let you coordinate with other agents
3. **[Tunneling](03-tunnel-magic.md)** — Share your local dev server with the outside world in 30 seconds
4. **[Debugging](05-debugging-with-port-daddy.md)** — Use Port Daddy's tools to diagnose phantom port conflicts

## The Big Picture

Port Daddy replaces three separate tools:

- **Docker Compose** — Use `pd up/down` instead
- **Manual port tracking** — Use semantic identities instead
- **Manual coordination** — Use sessions, locks, and pub/sub instead

One daemon. Many projects. Zero port conflicts.

You'll never `lsof -i :3000` again.
