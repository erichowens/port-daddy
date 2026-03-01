# Orchestrating 5 AI Agents Without Losing Your Mind

It's 3pm on a Thursday. You've launched 5 Claude Code agents to build different parts of your full-stack app simultaneously. Within 30 seconds, chaos:

```
Agent 1 (Frontend):   "Claiming port 3100 for the React app..."
Agent 2 (API):        "Claiming port 3100 for the backend..."
Agent 3 (Database):   "Setting up migrations..."
Agent 4 (Worker):     "Starting the job processor..."
Agent 5 (Auth):       "Implementing OAuth, gonna need session coordination!"
```

Without coordination, agents step on each other's files, fight over ports, duplicate work, and collide on dependencies. Port Daddy turns this chaos into a symphony.

## The Problem: Multi-Agent Collision

Let's say you're building a payments system. You launch multiple agents:

1. **Frontend Agent** — Building the checkout UI
2. **Backend Agent** — Building the payment API
3. **Database Agent** — Creating the schema and migrations
4. **Testing Agent** — Writing integration tests (needs backend running first)
5. **Docs Agent** — Documenting the API (needs final backend shape)

Without coordination, you'd see:

- Both frontend and backend agents try to claim port 3100 (race condition)
- Database agent migrates, frontend agent expects old schema
- Testing agent starts before backend is healthy
- Multiple agents editing `src/types.ts` simultaneously (merge conflict)
- Nobody knows what anyone else is doing

Port Daddy solves all of this with three primitives:

1. **Sessions & Notes** — Structured coordination
2. **File Claims** — Conflict detection on files
3. **Pub/Sub + Locks** — Synchronization and exclusive access

## Sessions: The Coordination Journal

A session is like a bouncer at a club: "I'm working on this. Here are the files I've claimed. Here's what I've discovered so far."

### Agent 1: Frontend

```bash
# Start a session with file claims
pd session start "Building checkout UI" \
  --files "src/components/checkout/*" \
  "src/pages/checkout.tsx" \
  "src/hooks/usePayment.ts"

# Make a note of progress
pd note "Installed Stripe React library"
pd note "Built CheckoutForm component"
pd note "Blocked waiting on payment API types"
```

### Agent 2: Backend

```bash
# Start a session
pd session start "Building payment API" \
  --files "src/api/payments/*" \
  "src/types/Payment.ts" \
  "src/middleware/auth.ts"

# Check if other agents have claimed overlapping files
# (If they have, Port Daddy warns you)

# Make notes as you work
pd note "Created POST /api/payments endpoint" --type commit
pd note "Integrated Stripe API client"
pd note "TypeScript types ready at src/types/Payment.ts"
```

### Agent 3: Database

```bash
# Session with file claims
pd session start "Database schema for payments" \
  --files "supabase/migrations/*" \
  "src/db/schema.ts"

# Notes mark key milestones
pd note "Created payments table with webhook_id tracking"
pd note "Added indexes on user_id and payment_status"
pd note "Ready for integration tests"
```

Then, when you ask the Testing Agent what's ready:

```bash
# View all notes across all agents
pd notes --limit 20

# Output shows a timeline:
# [Agent 1] Built CheckoutForm component
# [Agent 1] Blocked waiting on payment API types
# [Agent 2] TypeScript types ready at src/types/Payment.ts
# [Agent 2] Created POST /api/payments endpoint
# [Agent 3] Created payments table with webhook_id tracking
# [Agent 3] Ready for integration tests
```

Now Agent 4 (Testing) knows exactly what's ready and can write tests against the actual API.

## File Claims: Preventing Collisions

When you claim files, Port Daddy warns if another session already claimed them:

```bash
# Agent 5 tries to claim a file Agent 2 is working on
pd session start "OAuth integration" \
  --files "src/middleware/auth.ts"

# Port Daddy warns:
# Warning: src/middleware/auth.ts claimed by session-ab3 (Backend Agent)
# Use --force to claim anyway
```

This is advisory, not enforced. You can force-claim if you need to:

```bash
pd session start "OAuth integration" \
  --files "src/middleware/auth.ts" \
  --force
```

But the warning lets you say "wait, should Backend Agent and I coordinate here?" and avoid a merge conflict later.

## Pub/Sub: Real-Time Signaling

Sometimes agents need to wait for each other. Use pub/sub for real-time events:

```bash
# Backend Agent: "I'm ready, other agents listening?"
pd pub payments:api '{"status":"healthy","port":3101}'

# Testing Agent: "Waiting for backend..."
pd sub payments:*

# Receives:
# {"status":"healthy","port":3101}
```

In code (JavaScript SDK):

```javascript
import { PortDaddy } from 'port-daddy/client';
const pd = new PortDaddy();

// Backend finishes setup
await pd.publish('payments:api', {
  status: 'healthy',
  port: 3101,
  typesUrl: 'http://localhost:3101/api/types.json'
});

// Testing agent waits for backend signal
const sub = pd.subscribe('payments:*');
sub.on('message', async (msg) => {
  if (msg.status === 'healthy') {
    console.log('Backend ready, starting tests');
    await runTests(msg.port);
  }
});
```

## Distributed Locks: Exclusive Access

When only one agent can run something (migrations, seeding), use locks:

```bash
# Database Agent claims exclusive lock for migrations
pd lock db-migrations
npx prisma migrate dev
pd unlock db-migrations

# Testing Agent checks if it can run (non-blocking)
pd lock db-migrations || echo "Migrations already running, skipping"
```

In code:

```javascript
// Exclusive access pattern
await pd.withLock('db-migrations', async () => {
  await execSync('npx prisma migrate dev');
  console.log('Migrations complete');
});

// Non-blocking pattern
const lockAcquired = await pd.lock('db-migrations', { blocking: false });
if (!lockAcquired) {
  console.log('Migrations already running, skipping');
} else {
  try {
    await execSync('npx prisma migrate dev');
  } finally {
    await pd.unlock('db-migrations');
  }
}
```

## Real Scenario: Building a Payment System in Parallel

Here's how 5 agents coordinate to build a complete payments feature:

### Chronological Flow

**10:00am — Agent 1 (Database)**
```bash
pd session start "Payment system schema" \
  --files "supabase/migrations/*"
pd note "Creating payments table, webhook_requests, refunds"
```

**10:02am — Agent 1 (Database)**
```bash
pd note "Schema ready, importing src/types/Payment.ts"
pd pub payments:schema '{"version":1,"tables":["payments","refunds"]}'
pd lock db-migrations
# (runs actual migration)
pd unlock db-migrations
```

**10:05am — Agent 2 (Backend API)**
```bash
pd session start "Stripe API integration" \
  --files "src/api/payments/*" \
  "src/types/Payment.ts"

# Waits for schema signal
pd sub payments:schema
# Receives: version 1, tables ready
```

```bash
pd note "Schema loaded, creating Stripe client"
pd note "Implemented POST /api/payments (charges)"
pd note "Implemented POST /api/payments/:id/refund"
pd note "Ready for integration tests"
pd pub payments:api '{"status":"ready","port":3101}'
```

**10:10am — Agent 3 (Database Queries)**
```bash
pd session start "Payment query layer" \
  --files "src/db/queries/*"

# Waits for API to signal readiness
pd sub payments:api
# Receives: ready, port 3101
```

```bash
pd note "Created getPaymentById() and listPayments()"
pd note "Ready for frontend to consume"
pd pub payments:queries '{"status":"ready"}'
```

**10:12am — Agent 4 (Frontend)**
```bash
pd session start "Checkout UI" \
  --files "src/components/Checkout/*"

# Waits for both API and queries
pd sub payments:api,payments:queries
# Receives both ready signals
```

```bash
PORT=$(pd claim payments:frontend -q)
pd note "Building CheckoutForm component"
pd note "Integrated with payment API on port 3101"
pd pub payments:frontend '{"status":"ready","port":'${PORT}'}'
```

**10:15am — Agent 5 (Integration Tests)**
```bash
pd session start "Payment integration tests" \
  --files "tests/payments/*"

# Waits for all components to be ready
pd sub payments:*
# Receives ready signals from schema, api, queries, frontend
```

```bash
pd note "Running checkout flow tests"
pd note "All tests passing"
pd note "Payment system complete!"
pd pub payments:complete '{"status":"done","timestamp":"2024-02-28T10:18:00Z"}'
```

### What Happened

- 5 agents worked in parallel (not sequentially)
- Each knew exactly what others were doing via notes
- Database and API coordinated via locks and pub/sub
- Frontend waited for backend readiness before even starting
- Testing waited for everything to be ready
- **Total time: 18 minutes instead of 90 minutes**

## Agent Registration and Heartbeats

For better coordination, register agents with semantic identity:

```bash
# Agent registers with project+stack+context
pd agent register \
  --agent frontend-builder \
  --identity payments:web \
  --purpose "Building checkout UI" \
  --type ai

# Agent sends periodic heartbeats (keeps it alive in the registry)
pd agent heartbeat --agent frontend-builder
```

Check which agents are alive:

```bash
pd agents
# Active frontend-builder (payments:web, 30s ago)
# Active backend-builder (payments:api, 15s ago)
# Dead database-builder (payments:db, 8m ago) [stale]
```

When an agent dies before finishing:

```bash
pd salvage --project payments
# Shows all dead agents in payments:* with their session notes
# Other agents can claim their work and continue
```

## JavaScript SDK Full Pattern

Here's a complete example showing all coordination primitives:

```javascript
import { PortDaddy } from 'port-daddy/client';

const pd = new PortDaddy({
  agentId: 'backend-builder',
});

// Register as an agent
await pd.registerAgent({
  name: 'Backend Builder',
  identity: 'myapp:api',
  purpose: 'Building REST API',
  type: 'ai',
});

// Start a session
const session = await pd.startSession({
  purpose: 'Building payment endpoints',
  files: ['src/api/payments/*', 'src/types/Payment.ts'],
});

// Make notes as you work
await pd.note('Started payment API implementation', { type: 'note' });

// Wait for database schema to be ready
const schemaSub = pd.subscribe('myapp:db');
schemaSub.on('message', async (msg) => {
  if (msg.status === 'schema-ready') {
    // Safe to import types now
    await pd.note('Schema ready, importing types', { type: 'commit' });
  }
});

// Claim exclusive access for critical operation
await pd.withLock('payment-config', async () => {
  // Write configuration that can't be overwritten
  await initializeStripe();
});

// Signal other agents that you're ready
const port = 3101;
await pd.claim('myapp:api', { port });
await pd.publish('myapp:api', {
  status: 'healthy',
  port: port,
  typesUrl: `http://localhost:${port}/api/types.json`,
});

// Send heartbeat (shows you're still alive)
setInterval(() => {
  await pd.sendHeartbeat();
}, 30000);

// When done, end the session
await pd.endSession('Payment API complete, ready for testing');
```

## Common Patterns

### Pattern 1: Blocking Chain

Agent B waits for Agent A to signal completion:

```bash
# Agent A
pd pub build:complete '{"status":"ready"}'

# Agent B
pd sub build:complete
# (waits for signal before proceeding)
```

### Pattern 2: Exclusive Access

Multiple agents need the database, only one touches migrations at a time:

```bash
# Each agent that touches the DB does this
await pd.withLock('db-schema', async () => {
  // Only one agent runs this at a time
  await runMigrations();
});
```

### Pattern 3: Status Board

Agents publish their status for other agents to monitor:

```bash
# Each agent publishes status on a schedule
setInterval(() => {
  await pd.publish('team:status', {
    agent: 'frontend-builder',
    progress: 75,
    blockedOn: 'api-types',
    eta: '5m',
  });
}, 10000);

# Dashboard or monitoring tool subscribes
const status = pd.subscribe('team:*');
status.on('message', (msg) => {
  updateProgressBoard(msg);
});
```

## Preventing Agent Deadlock

Two agents waiting on each other forever? This breaks coordination:

```bash
# Don't do this
# Agent A waits for Agent B
pd sub agentB:ready

# Agent B waits for Agent A
pd sub agentA:ready

# Both hang forever
```

Instead:

```bash
// Define explicit ordering
// Database -> Backend -> Frontend -> Testing

// Use timeouts
const result = await Promise.race([
  pd.waitForSignal('backend:ready'),
  new Promise((_, reject) =>
    setTimeout(() => reject('timeout'), 30000)
  ),
]);
```

## What's Next

You've learned how to coordinate multiple agents. Now explore:

1. **[Tunneling](03-tunnel-magic.md)** — Share agent-built features with stakeholders
2. **[Monorepo Mastery](04-monorepo-mastery.md)** — Scaling to 50 services
3. **[Debugging](05-debugging-with-port-daddy.md)** — When coordination goes wrong

The key insight: The bottleneck was never intelligence. It was coordination.

One brilliant agent is powerful. A swarm of coordinated agents is exponentially more powerful.
