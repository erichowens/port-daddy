# Port Daddy - Developer Context

## What Is This?

Port Daddy is the authoritative port manager for multi-agent development. It's a daemon running on `localhost:9876` that provides:

- **Atomic port assignment** — No race conditions
- **Agent coordination** — Pub/sub messaging and distributed locks
- **Agent registry** — Track active agents with heartbeats
- **Webhooks** — External system integration
- **Activity logging** — Full audit trail

## Architecture

```
server.js           # Express daemon (main entry point)
lib/
  services.js       # Port assignment module
  locks.js          # Distributed locks
  messaging.js      # Pub/sub messaging
  agents.js         # Agent registry
  activity.js       # Activity logging
  webhooks.js       # Webhook subscriptions
  identity.js       # Semantic ID parsing
  detect.js         # Framework detection (22 frameworks)
  scan.js           # Deep recursive project scanner
  projects.js       # Project registry (CRUD against SQLite)
  discover.js       # Monorepo/workspace discovery
  orchestrator.js   # Service orchestration (up/down)
  config.js         # Configuration loading
  health.js         # Health check utilities
  client.js         # JavaScript SDK (PortDaddy class)
  log-prefix.js     # Color-coded log prefixes for orchestrator
  utils.js          # Common utilities
routes/
  index.js          # Route registration
  projects.js       # /scan, /projects endpoints
bin/
  port-daddy-cli.js # CLI entry point
public/
  index.html        # Dashboard UI
completions/
  port-daddy.bash   # Bash tab completion
  port-daddy.zsh    # Zsh tab completion
tests/
  setup-unit.js     # In-memory SQLite factory for unit tests
  unit/             # Unit tests (17 suites, 1042 tests)
  integration/      # Integration tests (require live daemon)
examples/
  agent-coordination.js  # Multi-agent example
```

## Development

```bash
# Start in development mode
npm run dev

# Run tests (restarts daemon with fresh code)
npm test

# Check test coverage
npm test -- --coverage
```

## Key Patterns

### Semantic Identities
All services use `project:stack:context` naming:
- `myapp:api:main` — Main API for myapp
- `myapp:frontend:feature-auth` — Frontend on feature branch

### SQLite-Backed
All state is in SQLite for:
- Atomic operations
- Persistence across restarts
- Pattern-based queries

### Rate Limiting
Server has built-in rate limiting:
- 100 requests/minute per IP (HTTP)
- 10 concurrent SSE connections per IP
- Queue size limits for webhooks/messages

## Security Considerations

- **SSRF Protection**: Webhook URLs validated against private IPs
- **Input Validation**: All user input validated
- **SQL Injection**: Parameterized queries throughout
- **HMAC Signing**: Webhook payloads signed for verification

## Testing

Two test tiers:

**Unit tests** (no daemon required):
```bash
# All unit tests
NODE_OPTIONS="--experimental-vm-modules" npx jest tests/unit/ --no-coverage

# Single file
NODE_OPTIONS="--experimental-vm-modules" npx jest tests/unit/scan.test.js
```

**Integration tests** (require a running daemon):
```bash
# Restarts daemon, verifies code hash, then runs
npm test

# Specific file
npm test -- tests/integration/cli.test.js
```

## Adding New Features

1. Add module to `lib/`
2. Export from module and import in `server.js`
3. Add routes in `routes/` and register in `routes/index.js`
4. Add to code hash list in `server.js` and `cli.test.js`
5. Update dashboard in `public/index.html`
6. Write unit tests in `tests/unit/` and integration tests in `tests/integration/`
7. Update completions in `completions/`
8. Update README.md

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/claim/:id` | POST | Claim a port |
| `/release/:id` | DELETE | Release a service |
| `/services` | GET | List services |
| `/locks/:name` | POST/DELETE | Acquire/release lock |
| `/locks` | GET | List locks |
| `/msg/:channel` | POST/GET | Publish/get messages |
| `/subscribe/:channel` | GET | SSE subscription |
| `/agents/:id` | POST/DELETE | Register/unregister agent |
| `/agents/:id/heartbeat` | PUT | Agent heartbeat |
| `/webhooks` | POST/GET | Manage webhooks |
| `/scan` | POST | Deep-scan directory, register project |
| `/projects` | GET | List registered projects |
| `/projects/:id` | GET/DELETE | Get or remove a project |
| `/activity` | GET | Activity log |
| `/health` | GET | Health check |
| `/version` | GET | Version and code hash |
