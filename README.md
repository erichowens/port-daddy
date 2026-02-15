# Port Daddy 👔

**The authoritative port manager for multi-agent development.**

When you have multiple Claude sessions, AI agents, or dev servers all fighting for ports on your machine, Port Daddy brings order to the chaos. It's a small daemon that runs locally and answers one simple question: *"What port should I use?"*

```bash
port-daddy claim myapp:frontend
# → myapp:frontend → port 3100

port-daddy claim myapp:api
# → myapp:api → port 3101
```

No conflicts. No coordination. No wasted time.

---

## Why Port Daddy?

### The Problem

You're deep in a coding session. You spin up a frontend on port 3000. Then an API on 3001. Then another Claude session starts a different project and—*conflict*. Port already in use.

You check what's running. Kill something. Pick a new port. Update your config. And by then you've lost your flow.

Multiply this by five agents working in parallel, each unaware of the others, and you have a coordination nightmare.

### The Solution

Port Daddy runs as a local daemon and provides:

- **Atomic port assignment** — No race conditions, ever
- **Semantic naming** — `myapp:frontend:main` instead of "port 3247"
- **Agent coordination** — Pub/sub messaging, locks, and event webhooks
- **Agent registry** — Track who's active, enforce resource limits
- **Activity logging** — Full audit trail of all operations
- **Auto-cleanup** — Dead processes release their ports automatically
- **Zero config** — Works immediately, defaults make sense

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/erichowens/port-daddy.git
cd port-daddy
npm install

# Install as system service (auto-starts on login)
port-daddy install

# Or just start it manually
port-daddy start
```

Now you're ready:

```bash
# Claim a port
port-daddy claim myapp
# → myapp → port 3100

# See what's running
port-daddy ps

# Release when done
port-daddy release myapp
```

---

## Semantic Identities

Port Daddy uses a `project:stack:context` naming scheme that makes your services discoverable:

```
myapp                     # Just the project
myapp:api                 # Project + stack
myapp:api:feature-auth    # Project + stack + context
```

| Part | Purpose | Examples |
|------|---------|----------|
| **project** | Your application | `myapp`, `acme-api`, `todo` |
| **stack** | Component type | `api`, `frontend`, `worker`, `db` |
| **context** | Branch or variant | `main`, `feature-x`, `pr-123`, `staging` |

This unlocks powerful queries:

```bash
# All services for myapp
port-daddy find myapp:*

# All API services across all projects
port-daddy find *:api:*

# Release everything for a feature branch
port-daddy release myapp:*:feature-auth
```

---

## Agent Coordination

Here's where Port Daddy shines for multi-agent workflows.

### The Coordination Problem

Imagine three Claude sessions working on the same project:

- **Agent A** is building the API
- **Agent B** is building the frontend
- **Agent C** is running integration tests

Agent C needs to know when A and B are ready before running tests. Without coordination, C either polls constantly, guesses, or waits for human input.

### Pub/Sub Messaging

Port Daddy includes a message broker. Agents publish events and subscribe to channels:

```bash
# Agent A finishes the API
port-daddy pub build:api '{"status":"ready","port":3100}'

# Agent B finishes the frontend
port-daddy pub build:frontend '{"status":"ready","port":3101}'

# Agent C subscribes and waits
port-daddy sub build:*
# [2024-01-15T10:30:00Z] {"status":"ready","port":3100}
# [2024-01-15T10:30:05Z] {"status":"ready","port":3101}
# Now C knows both services are ready for integration tests
```

### Distributed Locks

Prevent conflicting operations across agents:

```bash
# Agent A: Exclusive access to database
port-daddy lock db-migrations
npx prisma migrate dev
port-daddy unlock db-migrations

# Agent B: Waits or fails immediately if lock is held
port-daddy lock db-migrations || echo "Lock held, skipping"
```

### Channel Patterns

| Pattern | Purpose |
|---------|---------|
| `build:<target>` | Build completion events |
| `service:<id>:ready` | Service readiness signals |
| `task:<name>` | Task handoff between agents |
| `errors` | Error broadcasting |
| `heartbeat:<agent>` | Agent health monitoring |

---

## Agent Registry

Agents can formally register with Port Daddy for better coordination and resource management:

```bash
# Register an agent
curl -X POST http://localhost:9876/agents/claude-session-1 \
  -H 'Content-Type: application/json' \
  -d '{"name": "API Builder", "type": "claude"}'

# Send heartbeats (keeps agent marked as active)
curl -X PUT http://localhost:9876/agents/claude-session-1/heartbeat

# See all active agents
curl http://localhost:9876/agents

# Check agent status
curl http://localhost:9876/agents/claude-session-1
```

### Resource Limits

Each agent can have resource limits enforced:

```json
{
  "maxServices": 50,
  "maxLocks": 20
}
```

When an agent exceeds its limits, further claims/locks are rejected until resources are released.

### Auto-Cleanup

Agents that stop sending heartbeats for 2+ minutes are marked stale. Their services and locks are automatically released, preventing resource leakage from crashed agents.

---

## Webhooks

External systems can subscribe to Port Daddy events via webhooks:

```bash
# Register a webhook
curl -X POST http://localhost:9876/webhooks \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://your-server.com/port-daddy-events",
    "events": ["service.claim", "service.release"],
    "secret": "your-hmac-secret"
  }'
```

### Supported Events

| Event | Payload |
|-------|---------|
| `service.claim` | Service was claimed |
| `service.release` | Service was released |
| `agent.register` | Agent registered |
| `agent.unregister` | Agent unregistered |
| `agent.stale` | Agent went stale |
| `lock.acquire` | Lock was acquired |
| `lock.release` | Lock was released |
| `message.publish` | Message was published |
| `daemon.start` | Daemon started |
| `daemon.stop` | Daemon stopping |

### Payload Verification

Each delivery includes an HMAC-SHA256 signature for verification:

```
X-PortDaddy-Signature: sha256=abc123...
X-PortDaddy-Event: service.claim
X-PortDaddy-Delivery: uuid
X-PortDaddy-Timestamp: 1704000000000
```

Verify in your handler:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = `sha256=${hmac.digest('hex')}`;
  return signature === expected;
}
```

### Retry & Reliability

- **Automatic retries**: Failed deliveries retry with exponential backoff (1s, 2s, 4s, 8s)
- **Delivery tracking**: View delivery history for any webhook
- **Test endpoint**: Send test payloads to verify webhook setup

---

## Activity Log

Every operation in Port Daddy is logged with full context:

```bash
# View recent activity
curl http://localhost:9876/activity?limit=20

# Filter by action type
curl http://localhost:9876/activity?action=claim

# Filter by identity
curl http://localhost:9876/activity?targetId=myapp:api
```

### Logged Actions

| Action | Description |
|--------|-------------|
| `claim` | Service port claimed |
| `release` | Service port released |
| `lock_acquire` | Lock acquired |
| `lock_release` | Lock released |
| `publish` | Message published |
| `agent_register` | Agent registered |
| `agent_heartbeat` | Agent heartbeat |
| `agent_unregister` | Agent unregistered |
| `cleanup` | Automatic cleanup |

Each log entry includes:
- Timestamp
- Action type
- Target (service ID, lock name, etc.)
- Actor (agent ID or IP address)
- Metadata (port, message, etc.)

---

## Dashboard

Port Daddy includes a web dashboard at `http://localhost:9876`:

- **Services**: View all claimed ports, release services
- **Locks**: See active locks and their holders
- **Agents**: Monitor registered agents and their health
- **Messages**: Browse pub/sub channels and messages
- **Webhooks**: Manage webhook subscriptions
- **Activity**: Real-time activity log

---

## CLI Reference

### Service Commands

| Command | Description |
|---------|-------------|
| `port-daddy claim <id>` | Claim a port for a service |
| `port-daddy release <id>` | Release port(s) by identity or pattern |
| `port-daddy find [pattern]` | List services (default: all) |
| `port-daddy url <id>` | Get the URL for a service |
| `port-daddy env [pattern]` | Export as environment variables |
| `port-daddy ps` | Alias for `find` |

### Agent Coordination

| Command | Description |
|---------|-------------|
| `port-daddy pub <channel> <msg>` | Publish a message |
| `port-daddy sub <channel>` | Subscribe to a channel (real-time) |
| `port-daddy wait <id> [...]` | Wait for service(s) to become healthy |
| `port-daddy lock <name>` | Acquire a distributed lock |
| `port-daddy unlock <name>` | Release a lock |
| `port-daddy locks` | List all active locks |
| `port-daddy log` | View activity log |

### Daemon Management

| Command | Description |
|---------|-------------|
| `port-daddy start` | Start the daemon |
| `port-daddy stop` | Stop the daemon |
| `port-daddy restart` | Restart the daemon |
| `port-daddy status` | Check if daemon is running |
| `port-daddy install` | Install as system service |
| `port-daddy uninstall` | Remove system service |

### Options

| Option | Description |
|--------|-------------|
| `-p, --port <n>` | Request a specific port |
| `--range <a>-<b>` | Acceptable port range |
| `--expires <dur>` | Auto-release (e.g., `2h`, `30m`, `1d`) |
| `-e, --env <name>` | Environment: local, tunnel, dev, staging, prod |
| `-j, --json` | Output as JSON |
| `-q, --quiet` | Minimal output (just the value) |
| `--timeout <ms>` | Wait timeout (default: 60000) |
| `--ttl <ms>` | Lock time-to-live (default: 300000) |
| `--owner <id>` | Lock owner identifier |

---

## API Reference

### Health & Status

```
GET /health          # Health check (for monitoring)
GET /version         # Version and code hash
GET /activity        # Activity log
```

### Services

```
POST   /claim/:id         # Claim a port
DELETE /release/:id       # Release a service
GET    /services          # List all services
GET    /services/:id      # Get service details
```

### Locks

```
POST   /locks/:name       # Acquire a lock
DELETE /locks/:name       # Release a lock
GET    /locks             # List all locks
GET    /locks/:name       # Get lock details
```

### Messages

```
POST   /msg/:channel      # Publish a message
GET    /msg/:channel      # Get channel messages
GET    /subscribe/:channel # SSE subscription
DELETE /msg/:channel      # Clear channel
GET    /channels          # List all channels
```

### Agents

```
POST   /agents/:id        # Register agent
PUT    /agents/:id/heartbeat # Send heartbeat
DELETE /agents/:id        # Unregister agent
GET    /agents            # List all agents
GET    /agents/:id        # Get agent details
```

### Webhooks

```
POST   /webhooks          # Register webhook
GET    /webhooks          # List webhooks
GET    /webhooks/:id      # Get webhook details
PUT    /webhooks/:id      # Update webhook
DELETE /webhooks/:id      # Delete webhook
POST   /webhooks/:id/test # Send test payload
GET    /webhooks/:id/deliveries # Delivery history
GET    /webhooks/events   # List available events
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────┐
│           Your Development Environment           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Claude  │  │ Claude  │  │ Claude  │         │
│  │Session 1│  │Session 2│  │Session 3│         │
│  └────┬────┘  └────┬────┘  └────┬────┘         │
│       │            │            │               │
│       └────────────┼────────────┘               │
│                    │                            │
│                    ▼                            │
│           ┌───────────────┐                    │
│           │  Port Daddy   │◄─── Webhooks       │
│           │   Daemon      │     to external    │
│           │ (port 9876)   │     systems        │
│           └───────┬───────┘                    │
│                   │                            │
│     ┌─────────────┼─────────────┐              │
│     │      │      │      │      │              │
│     ▼      ▼      ▼      ▼      ▼              │
│  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐          │
│  │Ports││Locks││ Pub ││Agent││Activ│          │
│  │     ││     ││ Sub ││ Reg ││ Log │          │
│  └─────┘└─────┘└─────┘└─────┘└─────┘          │
│                                                 │
│     All backed by SQLite (atomic, persistent)  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Database

Port Daddy uses SQLite for atomic operations:

- No race conditions between concurrent claims
- Survives daemon restarts
- Automatic cleanup of dead processes
- Pattern-based queries via SQL LIKE

### Security Features

- **SSRF Protection**: Webhook URLs cannot target private/internal addresses
- **Rate Limiting**: Connection limits prevent abuse
- **Input Validation**: All inputs validated and sanitized
- **HMAC Signing**: Webhook payloads signed for verification

---

## Configuration

Defaults work for most cases:

| Setting | Default | Description |
|---------|---------|-------------|
| Port | 9876 | Daemon port |
| Range | 3100-9999 | Available ports |
| Reserved | 8080, 8000, 9876 | Never assigned |

Override via environment:

```bash
PORT_DADDY_PORT=9999
PORT_DADDY_RANGE_START=4000
PORT_DADDY_RANGE_END=5000
```

---

## Examples

### Using with Dev Servers

```bash
# Next.js
PORT=$(port-daddy claim myproject:frontend -q) npm run dev -- --port $PORT

# Vite
PORT=$(port-daddy claim myproject -q) vite --port $PORT

# Express
PORT=$(port-daddy claim myproject:api -q) node server.js
```

### Multi-Agent Build Pipeline

```bash
# Agent A: Build API
port-daddy claim myproject:api
npm run build:api
port-daddy pub build:api '{"status":"complete","port":3100}'

# Agent B: Build Frontend
port-daddy claim myproject:frontend
npm run build:frontend
port-daddy pub build:frontend '{"status":"complete","port":3101}'

# Agent C: Integration Tests (waits for both)
port-daddy sub build:* --json | jq 'select(.status=="complete")' | head -2
npm run test:integration
```

### Bug Fix Handoff

```bash
# Agent A: Reports a bug
port-daddy pub bugs '{"file":"auth.ts","line":42,"desc":"null check missing"}'
port-daddy lock bug-fix-auth

# Agent B: Sees the bug, waits for lock
port-daddy sub bugs
port-daddy lock bug-fix-auth --wait  # Blocks until A releases

# Agent B: Fixes and releases
port-daddy pub bugs '{"file":"auth.ts","status":"fixed"}'
port-daddy unlock bug-fix-auth
```

### File Coordination

```bash
# Agent A: Claims files
port-daddy lock files:src-auth
port-daddy pub files '{"agent":"A","files":["src/auth/*"],"status":"editing"}'

# Agent B: Sees lock, works elsewhere
port-daddy locks --json | jq '.locks[] | select(.name | startswith("files:"))'
# → files:src-auth is locked by A
port-daddy lock files:src-api  # Work on different files

# Agent A: Done
port-daddy pub files '{"agent":"A","files":["src/auth/*"],"status":"done"}'
port-daddy unlock files:src-auth
```

---

## Future Vision

Port Daddy is growing. Coming soon:

- **Tunnel Integration**: Automatic ngrok/cloudflare tunnel setup
- **Launch Mode**: `port-daddy launch myapp:api` — claims AND starts
- **Metrics Export**: Prometheus/StatsD integration
- **Cross-Machine**: Coordinate across multiple dev machines

---

## Why "Daddy"?

Because someone has to be the authority. In a house full of children (agents) all wanting different things, daddy decides who gets what. No fighting. No negotiation. Just ask, and receive.

---

## License

MIT

---

*Port Daddy: Because port conflicts are beneath you.*
