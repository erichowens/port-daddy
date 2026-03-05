# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for Port Daddy. Each ADR documents a significant architectural choice: what was decided, why, and what the consequences are.

ADRs follow the [MADR format](https://adr.github.io/madr/) (Markdown Architectural Decision Records).

## Index

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [0001](0001-sqlite-as-primary-database.md) | SQLite as Primary Database | Accepted | 2025-01 |
| [0002](0002-module-factory-pattern.md) | Module Factory Pattern for Dependency Injection | Accepted | 2025-01 |
| [0003](0003-semantic-identity-system.md) | Semantic Identity System (`project:stack:context`) | Accepted | 2025-01 |
| [0004](0004-unix-socket-primary-transport.md) | Unix Socket as Primary CLI-to-Daemon Transport | Accepted | 2025-03 |
| [0005](0005-single-file-dashboard.md) | Single-File HTML Dashboard | Accepted | 2025-02 |
| [0006](0006-synchronous-sqlite-queries.md) | Synchronous SQLite Queries via `better-sqlite3` | Accepted | 2025-01 |
| [0007](0007-immutable-session-notes.md) | Immutable Session Notes (Append-Only) | Accepted | 2025-02 |
| [0008](0008-agent-resurrection-pattern.md) | Agent Resurrection Pattern for Dead-Agent Recovery | Accepted | 2025-03 |
| [0009](0009-mcp-server-integration.md) | MCP Server Integration for Claude Agent Tooling | Accepted | 2025-03 |
| [0010](0010-maritime-design-language.md) | Maritime Design Language Throughout CLI and Dashboard | Accepted | 2025-02 |

## How to Read These

Each ADR is self-contained. They are ordered roughly chronologically and by foundational importance — earlier ADRs establish the ground rules that later ADRs build on.

**Suggested reading order for new contributors:**

1. Start with ADR-0001 (SQLite) and ADR-0002 (factory pattern) — these two decisions shape every module in the codebase.
2. Read ADR-0003 (identities) to understand the naming convention used everywhere.
3. Read ADR-0006 (sync queries) alongside ADR-0001 — together they explain why the entire system is synchronous-first.
4. Read the remaining ADRs in any order.

## Adding a New ADR

Copy the template below and save it as `NNNN-short-title.md` (next available number, kebab-case title).

```markdown
# NNNN. Title

## Status

Proposed | Accepted | Deprecated | Superseded by [NNNN](link)

## Context

What problem or situation prompted this decision?

## Decision Drivers

- Driver 1
- Driver 2

## Considered Options

- Option A
- Option B
- Option C

## Decision

What was chosen and a one-sentence rationale.

## Rationale

Detailed explanation of why this option was preferred.

## Consequences

### Positive
- ...

### Negative
- ...

### Neutral
- ...
```
