# Port Daddy v2.0 Architecture

## Mental Model

Everything is a **service** with a **semantic identity**:

```
<project>:<stack>:<context>
```

Services have:
- **Port** - localhost assignment
- **Endpoints** - URLs for local/tunnel/dev/staging/prod
- **Process** - optional managed process
- **Messages** - pub/sub channels

## Grammar

```bash
port <verb> [identity] [--attributes]
```

### Core Verbs

| Verb | Purpose |
|------|---------|
| `claim` | Get a port for an identity |
| `release` | Free port(s) by identity or query |
| `find` | Query services |
| `up` | Start a service (claim + launch) |
| `down` | Stop a service |
| `ps` | List running services |
| `logs` | Tail service logs |
| `url` | Get URL for any environment |
| `env` | Generate environment variables |
| `pub` | Publish message to channel |
| `sub` | Subscribe to channel |

### Identity Patterns

```bash
windags                    # project
windags:api                # project:stack
windags:api:main           # project:stack:context
windags:*:main             # wildcard stack
*:frontend:*               # wildcard project
```

### Attributes

```bash
# Port assignment
--port 3000                # preferred port
--range 3000-3100          # acceptable range

# Lifecycle
--expires 2h               # auto-release
--persistent               # survive restarts

# Grouping
--pair api                 # linked service

# Launch
--cmd "npm run dev"        # command to run
--ready "http://..."       # health check URL
--restart always|never|on-failure

# Tunneling
--tunnel ngrok|cloudflare
--tunnel-subdomain myapp

# Environment
--env KEY=value
--env-file .env.local

# Output
--json
--quiet
```

## Database Schema

```sql
-- Services (core registry)
CREATE TABLE services (
  id TEXT PRIMARY KEY,           -- 'windags:api:main'
  port INTEGER UNIQUE,
  pid INTEGER,
  cmd TEXT,
  status TEXT DEFAULT 'assigned', -- assigned, running, stopped, crashed
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER,
  restart_policy TEXT DEFAULT 'never',
  metadata JSON
);

-- Endpoints (service directory)
CREATE TABLE endpoints (
  service_id TEXT NOT NULL,
  env TEXT NOT NULL,              -- local, tunnel, dev, staging, prod
  url TEXT NOT NULL,
  PRIMARY KEY (service_id, env),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- Messages (pub/sub)
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  payload TEXT NOT NULL,          -- JSON string
  sender TEXT,                    -- service ID or agent ID
  created_at INTEGER NOT NULL,
  INDEX idx_channel_time (channel, created_at)
);

-- Subscriptions (in-memory, not persisted)
-- Tracked as SSE connections in the server
```

## API Endpoints

### Ports/Services
```
POST   /claim                    # claim port
DELETE /release                  # release by query
GET    /services                 # list/find services
GET    /services/:id             # get one service
```

### Process Management
```
POST   /services/:id/up          # start service
POST   /services/:id/down        # stop service
POST   /services/:id/restart     # restart service
GET    /services/:id/logs        # stream logs (SSE)
```

### Service Directory
```
GET    /endpoints/:id            # all URLs for service
PUT    /endpoints/:id/:env       # set URL
DELETE /endpoints/:id/:env       # remove URL
```

### Messaging
```
POST   /msg/:channel             # publish
GET    /msg/:channel             # subscribe (SSE)
GET    /msg/:channel/poll        # long-poll single message
DELETE /msg/:channel             # clear channel
```

### Meta
```
GET    /health
GET    /version
GET    /metrics
```

## Config Files

### Project Config (`.port-daddy.json`)

```json
{
  "windags:frontend:*": {
    "port": 3000,
    "range": [3000, 3099],
    "cmd": "npm run dev -- --port {port}",
    "ready": "http://localhost:{port}",
    "env": {
      "NODE_ENV": "development"
    },
    "endpoints": {
      "dev": "https://app-dev.windags.com",
      "prod": "https://app.windags.com"
    }
  },
  "windags:api:*": {
    "port": 3100,
    "range": [3100, 3199],
    "cmd": "cargo run -- --port {port}",
    "ready": "http://localhost:{port}/health",
    "pair": "windags:frontend",
    "tunnel": {
      "provider": "ngrok",
      "subdomain": "windags-api"
    }
  }
}
```

### Global Config (`~/.port-daddy/config.json`)

```json
{
  "defaultRange": [3100, 9999],
  "reservedPorts": [8080, 8000, 9876],
  "defaultExpires": "8h",
  "tunnelProviders": {
    "ngrok": {
      "authtoken": "..."
    },
    "cloudflare": {
      "certPath": "~/.cloudflared/cert.pem"
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Grammar (v2.0-alpha)
- [ ] New database schema
- [ ] Semantic identity parsing (`project:stack:context`)
- [ ] Enhanced `claim` with all attributes
- [ ] `release` with query support
- [ ] `find` with filtering
- [ ] Config file loading

### Phase 2: Launcher (v2.0-beta)
- [ ] Process spawning with `up`
- [ ] Process tracking and `down`
- [ ] `ps` listing
- [ ] `logs` streaming
- [ ] Health checks and ready detection
- [ ] Restart policies

### Phase 3: Service Directory (v2.0-rc)
- [ ] Endpoints table and API
- [ ] `url` command with `--env`
- [ ] `env` command for generating files
- [ ] Tunnel integration (ngrok, cloudflare)

### Phase 4: Messaging (v2.0)
- [ ] Messages table
- [ ] `pub` command
- [ ] `sub` command (SSE)
- [ ] Long-poll endpoint
- [ ] Message expiration/cleanup

## Migration from v1

v1 API remains compatible:
- `POST /ports/request` → internally calls new claim logic
- `DELETE /ports/release` → internally calls new release logic
- `GET /ports/active` → internally calls find

New CLI (`port`) coexists with old CLI (`get-port`, etc.)
