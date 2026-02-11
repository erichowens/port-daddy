# Contributing to Port Daddy

Thank you for your interest in contributing to Port Daddy!

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- macOS or Linux (Windows support via WSL)

### Installation

```bash
# Clone the repo
git clone https://github.com/erichowens/port-daddy.git
cd port-daddy

# Install dependencies
npm install

# Run tests
npm test

# Start development server (manual, not daemon)
npm run dev
```

## Project Structure

```
port-daddy/
├── server.js           # Main Express API server
├── install-daemon.js   # Daemon installer/manager
├── config.json         # Configuration (customizable)
├── VERSION             # Semantic version number
├── bin/               # CLI tools (symlinked to ~/bin)
│   ├── get-port       # Request port assignment
│   ├── release-port   # Release port assignment
│   └── list-ports     # List active assignments
├── tests/
│   ├── integration/   # API endpoint tests
│   ├── unit/          # Unit tests (future)
│   └── e2e/           # End-to-end tests (future)
├── public/            # Web dashboard (static files)
│   └── index.html
├── migrations/        # Database schema migrations
│   └── 001_initial_schema.sql
└── completions/       # Shell completion scripts
    └── port-daddy.bash
```

## Architecture

### Core Components

**1. Express API Server** (`server.js`)
- Handles HTTP requests for port assignment
- Manages SQLite database (WAL mode for concurrency)
- Tracks process IDs for automatic cleanup
- Provides metrics and health endpoints

**2. CLI Tools** (`bin/*`)
- Bash wrappers that call the HTTP API
- Include retry logic and fallback mechanisms
- Designed for shell integration

**3. Database** (SQLite)
- Single file: `port-registry.db`
- WAL mode for concurrent reads/writes
- Automatic cleanup of stale entries every 5 minutes

### Key Design Decisions

**Why SQLite?**
- Atomic transactions (no race conditions)
- Single file (easy backup/migration)
- No separate service to manage
- Fast (<10ms queries)
- ACID guarantees

**Why localhost-only?**
- Port assignment is inherently local
- No remote access needed
- Simpler security model
- No authentication required

**Why process tracking?**
- Automatic cleanup when processes die
- No manual intervention needed
- Prevents port leaks

## Development Workflow

### Making Changes

1. Create a feature branch
2. Make your changes (follow existing code style)
3. Add tests for new features
4. Run tests: `npm test`
5. Commit with clear messages
6. Push and create PR

### Testing Guidelines

**Unit Tests** (`tests/unit/`)
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (<1s total)

**Integration Tests** (`tests/integration/`)
- Test API endpoints end-to-end
- Use real database (test instance)
- Verify HTTP contracts

**E2E Tests** (`tests/e2e/`)
- Test full CLI workflows
- Verify daemon behavior
- Test race conditions

**Test Coverage Target**: 80%+ for core functionality

### Code Style

- ES Modules (import/export)
- No semicolons
- 2-space indentation
- Descriptive variable names
- Comments for non-obvious logic

### Security Guidelines

- Use spawnSync with array args (not shell strings)
- Validate all inputs
- Parameterize SQL queries
- localhost-only binding
- Rate limiting enabled

## Release Process

1. Update VERSION file
2. Update CHANGELOG.md with changes
3. Run full test suite
4. Tag release: `git tag v1.x.x`
5. Push tags: `git push --tags`
6. Create GitHub release with notes

## Getting Help

- Issues: https://github.com/erichowens/port-daddy/issues
- Discussions: https://github.com/erichowens/port-daddy/discussions

## License

By contributing, you agree that your contributions will be licensed under MIT.

---

**Thank you for contributing to Port Daddy!** 🎉
