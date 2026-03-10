# Multi-Agent Patterns: Research Report (2026)

*Research session: Port Daddy v3.5 sprint, 2026-03-10*

---

## Protocol Landscape

### The Two-Layer Stack

Multi-agent systems in 2026 operate on a two-layer protocol stack:

**Layer 1 — Agent ↔ Infrastructure (MCP)**
Model Context Protocol (Anthropic, 2024, now Linux Foundation) handles how agents connect to tools, data sources, and infrastructure. MCP is pull-based: agents declare what they need, the server provides it.

**Layer 2 — Agent ↔ Agent (A2A)**
Agent-to-Agent Protocol (Google, 2025, now Linux Foundation) handles how agents discover each other and exchange work. A2A is message-based: agents push tasks to peers using structured message parts.

Both protocols are now under the **Linux Foundation Agentic AI Foundation**, signaling industry-wide convergence on an open stack.

### The Four Protocols

| Protocol | Origin | Layer | Transport | Best For |
|----------|--------|-------|-----------|----------|
| **MCP** | Anthropic/LF | Agent↔Infra | HTTP/stdio | Tool use, data access, infrastructure |
| **A2A** | Google/LF | Agent↔Agent | HTTP | Multi-agent task delegation, capability discovery |
| **ACP** | IBM | Agent↔Agent | REST | Lightweight agent communication (fewer primitives) |
| **Agent Protocol** | HF/Community | Client↔Agent | HTTP | Standardized agent interface (any backend) |

### Agent Cards (`.well-known/agent.json`)

The A2A spec introduces "Agent Cards" — JSON documents served at `/.well-known/agent.json` that advertise:
- Agent capabilities (what tasks it can do)
- Input/output schemas
- Authentication requirements
- Contact information for orchestration

This is the right long-term design for `pd spawn` — spawned agents should serve an Agent Card. It enables dynamic discovery: one agent can ask "who can do X?" and get a list of spawned agents that advertise that capability.

### Binary Message Parts

A2A messages support multiple content types in a single message:
- `text` — human-readable string
- `data` — JSON-serializable payload
- `binary` — arbitrary bytes (for embeddings, images, audio)

This means agents can exchange embedding vectors directly — not just text — enabling semantic memory passing without re-encoding.

---

## 10 Agent Archetypes

The "Bag of Agents" anti-pattern: failing systems have N agents with overlapping responsibilities and no clear archetype assignment. Solutions:

1. **Orchestrator** — Receives goals, decomposes, delegates to workers. Never does direct work.
2. **Planner** — Converts goals into step-by-step task graphs. Produces DAGs.
3. **Executor** — Runs specific atomic tasks. No planning, pure execution.
4. **Critic** — Reviews outputs against quality criteria. Adversarial by design.
5. **Evaluator** — Scores outputs with rubrics and metrics. Produces numbers, not prose.
6. **Synthesizer** — Combines outputs from multiple workers into coherent results.
7. **Retriever** — Queries stores (docs, code, memory) to provide context.
8. **Memory Keeper** — Maintains persistent state across agent sessions and restarts.
9. **Mediator** — Resolves conflicts between agents (resource contention, disagreements).
10. **Monitor** — Observability. Tracks agent health, detects failures, triggers salvage.

Port Daddy's daemon primarily acts as **Memory Keeper + Mediator + Monitor**: it maintains session state, resolves port conflicts, and triggers the resurrection queue when agents die.

---

## Swarm Patterns

### Ant Colony Optimization (ACO) in Software Agents

Biological pheromone trails map directly to shared message queues:

1. Agent solves a sub-task and publishes quality score to a shared channel
2. Future agents subscribed to that channel see the pheromone signal
3. Higher-quality paths get reinforced — agents prefer routes with high historical success
4. Low-quality paths evaporate (scores decay over time)

**Port Daddy implementation sketch**: Use `pd pub` with timestamped quality scores. Subscribers check scores before picking tasks. Evaporation = TTL on messages.

### Stigmergy (Indirect Coordination)

Agents coordinate without direct communication by modifying shared environment state:
- Agent A claims files → Agent B detects claims and picks different files
- Agent A publishes to `results` channel → Synthesizer subscribes and aggregates
- No direct agent-to-agent messaging needed

Port Daddy's file claims + pub/sub are already a stigmergy substrate.

### Heterogeneous Swarms

Research finding: **heterogeneous swarms outperform homogeneous ones**. A swarm of 4 specialized models (Planner + 2 Executors + Critic) beats 4 identical general-purpose models on complex tasks, even if the specialized models are individually weaker.

This validates the `pd spawn` design: mix Ollama local models with Claude SDK calls with Aider subprocess — pick the right tool for each archetype.

---

## Always-On Agent Pattern

The "ambient agent" pattern: a persistent process that never sleeps, subscribes to triggers, and dispatches agents when conditions match.

### Components

1. **Persistent subscriber** — Process with SSE reconnect loop (no manual restarts)
2. **Trigger registry** — Table of (event, condition, action) tuples
3. **Spawn call** — When trigger fires, call `pd spawn` with appropriate backend + purpose
4. **Observability** — All spawned agents write notes, monitor tracks completion

### What PD Already Has

- SSE subscriptions (`/msg/:channel/subscribe`)
- Agent heartbeats + resurrection queue
- Sessions with notes
- Webhooks (inbound triggers — already implemented!)

### What's Missing

- Reconnect loop in SDK (auto-reconnect on SSE disconnect)
- `pd watch <channel> --exec <script>` — the minimal "trigger → action" primitive
- Scheduled triggers (cron-like)

The `pd watch` command is the kernel. Everything else builds on it.

---

## Harbors / RBAC for Agents (Design Sketch)

### Why Harbors?

Current PD problem: any agent can read/write any channel, claim any file, create any session. This is fine for solo development but breaks down in:
- Untrusted agent code (LLM-generated, third-party)
- Multi-tenant environments
- Security-sensitive operations (prod credentials, PII data)

### The Harbor Model

A "harbor" is a named permission namespace:

```json
{
  "name": "myapp:security-review",
  "capabilities": ["code:read", "security:scan", "notes:write"],
  "agents": ["reviewer:*"],
  "channels": ["security-alerts", "vulnerability-reports"],
  "expires": "2h"
}
```

Agents that "enter" a harbor get scoped JWT tokens. Operations outside their capabilities return 403.

### Industry State

As of 2026, per the research:
- MCP has `tools` capability declarations but no fine-grained RBAC
- A2A has capability advertising but no enforcement
- Most production systems use network-level isolation (separate containers) not protocol-level auth

Port Daddy can pioneer proper agent RBAC. The primitives are:
1. Harbor creation/entry/exit (CLI + API)
2. Capability tokens (JWT with embedded scopes)
3. Enforcement middleware on routes (check token against harbor)

**This is a v4.0 feature.** The JWT crypto infrastructure needs to be designed carefully. Not this sprint.

---

## Strategic Recommendations

### Priority 1: `pd spawn` (This Sprint)

Highest leverage, lowest effort, immediate user value. PD already has everything except the inference layer. `lib/spawner.ts` is ~200 lines. Ship it.

### Priority 2: `pd watch` (This Sprint)

The ambient agent kernel. Without it, PD requires manual intervention to trigger agents. With it, PD becomes a reaction engine.

### Priority 3: Agent Cards at `/.well-known/agent.json` (Next Sprint)

When spawned agents serve Agent Cards, Port Daddy becomes a **capability registry**. Other agents (and humans) can discover what's running and what it can do. This is the long-term differentiator from "just use Docker."

### Priority 4: Harbors (v4.0 — 2-3 Sprints)

After `pd spawn` ships and users hit the "my agent did something it shouldn't" problem, harbors become the solution.

### Priority 5: Scheduled Triggers (v4.1)

Cron syntax in `pd watch`. Opens the door to calendar integration, CI/CD triggers, and monitoring agents.

---

## References

- MCP Specification: https://modelcontextprotocol.io
- A2A Protocol: https://google.github.io/A2A
- ACP (IBM): https://agentcommunicationprotocol.dev
- Linux Foundation Agentic AI Foundation announcement (2026)
- Swarm Intelligence for Optimization (Dorigo & Stützle)
- "Bag of Agents" anti-pattern: Anthropic multi-agent cookbook
