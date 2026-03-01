# The Port Is Already In Use: A Horror Story (And How Port Daddy Fixes It)

It's 2:47am. You're on call. Production is down because a webhook isn't being processed.

You spin up the local dev environment to reproduce the issue:

```bash
npm run dev
# Error: EADDRINUSE: address already in use :::3000
```

Now what? Something's listening on 3000 and you don't know what.

```bash
lsof -i :3000
# node    94120   erich   45u  IPv6 0x8f2c4a8e62c54e33      0t0  TCP *:hpserver (LISTEN)
```

What's process 94120? Is it from 5 days ago? Is it a Docker container? Is it the background sync service from Dropbox masquerading as Node?

You try things:

```bash
pkill -f node
# Killed 7 processes. Oops.

ps aux | grep node
# Nothing useful.

sudo lsof -i :3000 | grep -v COMMAND
# Still something there, maybe a zombie?

netstat -an | grep 3000
# Shows listening but lsof doesn't?
# (TCP state inconsistency)
```

This is the nightmare. You're debugging a ghost process at 2am when you should be fixing the actual bug.

Port Daddy turns this into a 5-second diagnosis.

## The Port Daddy Solution

Instead of hardcoding port 3000, you claim it:

```bash
PORT=$(pd claim myapp -q)
npm run dev -- --port $PORT

# If port 3000 was stuck:
# Port Daddy assigns you 3100 instead
# You see immediately that something is wrong
```

But let's go deeper. Here's how to debug port conflicts properly with Port Daddy.

## Understanding What's Listening: pd find

List all services Port Daddy knows about:

```bash
pd find
```

Output:
```
Service        Port  Created    Status
────────────────────────────────────────────
myapp:api      3100  2h ago     active
myapp:web      3101  2h ago     active
frontend:react 3102  30m ago    stale
other:service  3103  1d ago     stale
```

The `stale` status means the service was claimed but never checked in (likely crashed or forgotten).

Find services matching a pattern:

```bash
pd find myapp:*
# Only services starting with "myapp:"

pd find '*:api'
# All services named "api"
```

## Full System Status: pd status

Get a bird's-eye view of everything:

```bash
pd status
```

Output:
```
Daemon:     ✅ Running (pid 45821, 2h uptime)
Database:   ✅ Healthy (/Users/erich/.port-daddy/port-registry.db)
Services:   4 active, 2 stale, 1 orphaned
Locks:      1 active (db-migrations)
Sessions:   2 active (Agent 1, Agent 2)
Activity:   12 events in last 5 minutes
```

Now you know: are there orphaned services? Are there locks held? Are sessions active?

## Deep Diagnostics: pd health

Health-check all services:

```bash
pd health
```

Output:
```
myapp:api      ✅ 200 OK (45ms)
myapp:web      ✅ 200 OK (12ms)
frontend:react ⚠️  STALE (claimed 30m ago, no heartbeat)
other:service  ❌ TIMEOUT (no response for 60s)
```

Failing services are immediately visible. A service timing out? Port Daddy tries to connect and tells you the response time.

Health-check a single service:

```bash
pd health myapp:api
# ✅ 200 OK
# Response time: 45ms
# Last checked: 1m ago
# URL: http://localhost:3100/health
```

## The Activity Log: Forensic Debugging

Port Daddy keeps a complete audit trail of every action:

```bash
pd log
```

Output (most recent first):
```
[2:47:23] CLAIM   myapp:web         Port 3101 assigned
[2:46:45] CLAIM   myapp:api         Port 3100 assigned
[2:30:12] RELEASE myapp:web         Port 3101 released
[1:15:33] CLAIM   myapp:web         Port 3101 assigned
[1:14:20] RELEASE myapp:api         Port 3100 released
[1:12:05] CLAIM   myapp:api         Port 3100 assigned
...
```

This is gold for debugging. When did that service claim port 3100? Look at the log.

Filter by service:

```bash
pd log --filter myapp:api
# Only shows myapp:api activity
```

Filter by action:

```bash
pd log --filter CLAIM
# Only shows port claims

pd log --filter RELEASE
# Only shows releases
```

Time ranges:

```bash
# Last hour
pd log --since 1h

# Last 30 minutes
pd log --since 30m

# Specific time range
pd log --from "2024-02-28 2:00am" --to "2024-02-28 3:00am"
```

## Real Scenario: 2am Port Debugging

You're on call, production webhook broken, can't start your dev environment:

```bash
npm run dev
# Error: EADDRINUSE :::3000
```

### Step 1: Understand the Situation

```bash
pd status
# Daemon: ✅ Running
# Services: 2 active, 1 stale
# Activity: 8 events in last 5 minutes
```

Something is active and something is stale.

### Step 2: See What's Claimed

```bash
pd find
# myapp:api       3100  10m ago    active
# myapp:web       3101  10m ago    active
# legacy:service  3000  5d ago     stale
```

Aha! `legacy:service` on port 3000 is stale (hasn't checked in for 5 days). Probably a zombie from a previous session.

### Step 3: Check Its Status

```bash
pd health legacy:service
# ❌ TIMEOUT (no response for 60s)
# Last claimed: 5d ago
# Port: 3000
```

It's definitely dead. Nothing is responding on 3000, but Port Daddy still has it registered.

### Step 4: Release the Stale Service

```bash
pd release legacy:service
# Port 3000 released
```

Now port 3000 is free. You can either:

Option A: Claim it explicitly:
```bash
pd claim myapp -p 3000 -q
# 3000
npm run dev -- --port 3000
```

Option B: Let Port Daddy assign the next available port:
```bash
PORT=$(pd claim myapp -q)
# 3101 (next available)
npm run dev -- --port $PORT
```

### Step 5: Fix the Actual Bug

Now that your environment is running, you can investigate the webhook processing issue. The port conflict is gone.

## Cleanup: Removing Stale Services

Port Daddy has a cleanup function for stale ports:

```bash
pd cleanup
# ✅ Released 3 stale services
# - legacy:service   (5d old)
# - old:api          (3d old)
# - abandoned:worker (2d old)
```

This removes services that haven't been touched in a long time (configurable, default 7 days).

## Distributed Locks: Understanding Lock Contention

If multiple processes are fighting over a resource (like database migrations), locks prevent chaos:

```bash
pd locks
# db-migrations    Held for 45s by myapp:db-init
# payment-config   Available
```

A lock is held on `db-migrations`. Who's holding it?

```bash
pd lock --status db-migrations
# Status: HELD
# Holder: myapp:db-init
# Duration: 45 seconds
# TTL: 5m remaining
```

The database initialization service is running migrations. Other services are waiting for it to finish.

If a lock hangs (service crashed while holding it):

```bash
# Force-release after 30 seconds
pd unlock db-migrations --force
```

## Deep Dive: SQLite Database

Want to get really deep into the weeds?

```bash
sqlite3 ~/.port-daddy/port-registry.db
```

The database schema:

```sql
.schema

-- Services (claimed ports)
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  port INTEGER,
  createdAt INTEGER,
  updatedAt INTEGER,
  healthPath TEXT,
  status TEXT
);

-- Sessions (agent coordination)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  purpose TEXT,
  startedAt INTEGER,
  endedAt INTEGER,
  status TEXT
);

-- Locks (distributed coordination)
CREATE TABLE locks (
  name TEXT PRIMARY KEY,
  holder TEXT,
  acquiredAt INTEGER,
  ttl INTEGER
);

-- Activity (audit trail)
CREATE TABLE activity (
  id INTEGER PRIMARY KEY,
  action TEXT,
  service TEXT,
  details TEXT,
  timestamp INTEGER
);
```

Query examples:

```sql
-- What ports are claimed right now?
SELECT id, port, status FROM services WHERE status = 'active';

-- When was myapp:api last updated?
SELECT id, updatedAt FROM services WHERE id = 'myapp:api';

-- Activity for the last hour
SELECT action, service, details, datetime(timestamp, 'unixepoch')
FROM activity
WHERE timestamp > datetime('now', '-1 hour');

-- Which services are stale (haven't updated in 30 minutes)?
SELECT id, port, datetime(updatedAt, 'unixepoch')
FROM services
WHERE updatedAt < strftime('%s', datetime('now', '-30 minutes'));
```

## Metrics and Performance Debugging

Port Daddy keeps metrics on its own performance:

```bash
pd metrics
```

Output:
```
Uptime:              2h 15m
Requests:            847
Avg Response Time:   8.3ms
Max Response Time:   234ms
Database Queries:    1,247
Errors:              0
Memory Usage:        24.5MB
```

If the daemon is slow:

```bash
pd metrics --slow
# Slowest requests (>100ms):
# POST /claim/myapp:api           245ms
# GET /sessions                   178ms
# PUT /locks/db-migrations        134ms
```

This tells you what's expensive. If claims are slow, maybe there's lock contention.

## Session Tracking for Multi-Agent Debugging

When agents are working together, sessions provide a timeline:

```bash
pd sessions
# session-ab3  Building checkout UI         active, 30m
# session-cd7  Payment API implementation   active, 25m
# session-ef2  Database schema              completed, 2m
```

See what each session is doing:

```bash
pd notes session-ab3
# [2:10am] Started building CheckoutForm component
# [2:15am] Integrated Stripe React library
# [2:20am] Blocked waiting on payment API types
# [2:25am] Received payment API types
# [2:30am] Component complete, ready for integration
```

If one agent is stalled, you see it immediately. Session history shows exactly where they got stuck.

## Troubleshooting Checklist

### "I can't start my service"

```bash
# Step 1: What's Port Daddy say?
pd status

# Step 2: Any stale services?
pd find | grep stale

# Step 3: Release them
pd cleanup

# Step 4: Try again
npm run dev
```

### "Service shows as healthy but doesn't respond"

```bash
# The health check might be passing incorrectly
pd health myapp:api
# Shows ✅ but curl fails?

# Check the health endpoint
curl http://localhost:3100/health
# If this fails but health check passed, the health endpoint config is wrong

# Fix the .portdaddyrc
# (Ensure healthPath: "/health" is correct)
```

### "Port assignments are random"

```bash
# Are you committing .portdaddyrc to git with hardcoded ports?
cat .portdaddyrc | grep -i port

# If you see hardcoded ports, remove them:
# Port Daddy assigns deterministically from identity hash

# Correct format:
{
  "services": {
    "api": {
      "cmd": "npm run dev -- --port ${PORT}",
      "healthPath": "/health"
      // No "port" field
    }
  }
}
```

### "Locks are held forever"

```bash
# Check lock status
pd locks
# db-migrations held for 2h?

# See who's holding it
pd lock --status db-migrations

# Force release if process is dead
pd unlock db-migrations --force

# Understand what happened
pd log --filter db-migrations --since 2h30m
```

## One Final Scenario: The 2am Victory

You've got:
1. **pd status** telling you the big picture
2. **pd find** showing all claimed services
3. **pd health** diagnosing unhealthy services
4. **pd log** showing the forensic trail of what happened
5. **pd cleanup** removing zombie services
6. **pd locks** showing coordination contention
7. **pd sessions** showing agent progress
8. **SQLite** for deep dives

Now, when your webhook breaks at 2am:

```bash
# 1. Understand the current state
pd status
# Shows 2 active, 1 stale, 1 lock held

# 2. See what's stuck
pd find
# Shows service on port 3000 hasn't been touched in 5 days

# 3. Check if it's alive
pd health legacy:service
# Timeout — it's dead

# 4. Clean it up
pd release legacy:service

# 5. Start your dev environment
PORT=$(pd claim myapp -q)
npm run dev -- --port $PORT

# 6. Investigate the actual bug (which is what you should be doing)
# The port conflict was a 30-second detour instead of a 2-hour nightmare
```

## What's Next

You now have all the tools to debug Port Daddy issues. Explore:

1. **[Getting Started](01-getting-started.md)** — Review the basics
2. **[Monorepo Mastery](04-monorepo-mastery.md)** — Debug multi-service systems
3. **[Multi-Agent Orchestration](02-multi-agent-orchestration.md)** — Debug agent coordination

The most important lesson: **Visibility prevents panic.**

With Port Daddy's complete audit trail, health checks, and forensic tools, you never have to wonder "what is using this port?" again.

You'll always know exactly what's listening, what's stale, what's healthy, and when it happened.

No more `lsof -i` diagnostics at 2am. Just `pd status` and you've got the full picture.
