# Changelog

All notable changes to Port Daddy will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-02-17

### Added
- **Service orchestration**: `port-daddy up` / `port-daddy down` — start your entire stack with dependency ordering, health checks, and colored multiplexed output (like `docker-compose` for local dev)
- **Orchestrator engine** (`lib/orchestrator.js`): Topological sort via Kahn's algorithm, port claiming, env injection, graceful SIGTERM shutdown in reverse dependency order
- **Service discovery** (`lib/discover.js`): Auto-discovers services in monorepos (npm/yarn/pnpm workspaces, lerna) and generates semantic identity suggestions
- **Log prefixer** (`lib/log-prefix.js`): Docker-compose-style colored output — 10-color palette, padded service names, dim stderr
- **Framework auto-detection**: `port-daddy detect` identifies 16 frameworks (Next.js, Vite, Express, FastAPI, Django, Angular, SvelteKit, Remix, Astro, Nuxt, Vue CLI, CRA, Fastify, Hono, NestJS, Flask)
- **Environment diagnostics**: `port-daddy doctor` checks daemon connectivity, port range, `.portdaddyrc` validity, Node.js version, and system port conflicts
- Unified CLI: Single `port-daddy` command with subcommands replacing separate shell scripts
- Semantic identities: `project:stack:context` naming for all services (e.g., `myapp:api:main`)
- JavaScript SDK (`lib/client.js`): Zero-dependency programmatic API for Node.js
- Pub/sub messaging: Real-time inter-service messaging with SSE subscriptions
- Distributed locks: Atomic lock/unlock with TTL and auto-cleanup
- Agent registry: Register, heartbeat, and discover active agents
- Webhooks: Subscribe to events with HMAC-signed payloads
- Activity logging: Full audit trail of all operations
- `.portdaddyrc` project config: Per-project service definitions with `needs` dependency graph, `env` injection, `healthPath`, `noPort` workers
- Dashboard: Dark-themed real-time web UI at `http://localhost:9876`
- Shell completions for bash and zsh
- Input validation with shared validation module
- Rate limiting: 100 req/min per IP, 10 concurrent SSE connections
- SSRF protection on webhook URLs
- 1078 tests across 19 suites (unit + integration)
- GitHub Actions CI across Node 18/20/22 on Ubuntu and macOS

### Changed
- Complete architectural rewrite from monolithic server.js to modular lib/ + routes/
- CLI rewritten from bash wrapper scripts to unified Node.js CLI
- Port assignment now uses semantic identity parsing
- All state in SQLite with WAL mode
- ESM throughout (import/export)

### Removed
- Separate `get-port`, `release-port`, `list-ports` shell scripts (replaced by unified CLI)
- `VERSION` file (version now in package.json)
- `migrations/` directory (schema inline in server.js)

## [1.2.0] - 2025-01-15

### Added
- Security hardening: input validation, rate limiting, parameterized queries
- npm packaging with cross-platform CLI tools
- GitHub Actions CI and release workflows

### Changed
- Improved error handling across all endpoints

## [1.1.0] - 2025-01-10

### Added
- Initial release
- Port assignment via HTTP API
- SQLite-backed persistence
- Process tracking with auto-cleanup
- Basic web dashboard
- Bash CLI tools (`get-port`, `release-port`, `list-ports`)
- macOS launchd daemon installer
