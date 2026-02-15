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
  detect.js         # Framework detection
  config.js         # Configuration loading
  health.js         # Health check utilities
  utils.js          # Common utilities
bin/
  port-daddy-cli.js # CLI entry point
public/
  index.html        # Dashboard UI
tests/
  integration/      # Integration tests
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

Tests require a running daemon. The test harness:
1. Restarts daemon with fresh code
2. Verifies code hash matches
3. Runs integration tests against live daemon

```bash
# Run specific test file
npm test -- tests/integration/api.test.js

# Run with verbose output
npm test -- --verbose
```

## Adding New Features

1. Add module to `lib/`
2. Export from module and import in `server.js`
3. Add routes in `server.js`
4. Add to code hash list in `server.js` and `cli.test.js`
5. Update dashboard in `public/index.html`
6. Write integration tests
7. Update README.md

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
| `/activity` | GET | Activity log |
| `/health` | GET | Health check |
| `/version` | GET | Version and code hash |
