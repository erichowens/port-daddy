}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function MultiAgentOrchestration() {
  return (
    <TutorialLayout
      title="Orchestrating 5 AI Agents Without Losing Your Mind"
      description="Turn multi-agent chaos into a coordinated symphony using sessions, file claims, pub/sub, and distributed locks."
      number="2"
      total="12"
      level="Intermediate"
      readTime="15 min read"
      prev={{ title: 'Getting Started', href: '/tutorials/getting-started' }}
      next={{ title: 'Tunnel Magic', href: '/tutorials/tunnel' }}
    >
      <motion.p className="font-sans">It's 3pm on a Thursday. You've launched 5 Claude Code agents to build different parts of your full-stack app simultaneously. Within 30 seconds, chaos:</motion.p>
      
      <CodeBlock
        code={`Agent 1 (Frontend):   "Claiming port 3100 for the React app..."
Agent 2 (API):        "Claiming port 3100 for the backend..."
Agent 3 (Database):   "Setting up migrations..."
Agent 4 (Worker):     "Starting the job processor..."
Agent 5 (Auth):       "Implementing OAuth, need session coordination!"`}
      />

      <motion.p className="font-sans">Without coordination, agents step on each other's files, fight over ports, duplicate work, and collide on dependencies. Port Daddy turns this chaos into a symphony.</motion.p>

      <motion.h2 className="font-display">The Problem: Multi-Agent Collision</motion.h2>
      <motion.p className="font-sans">Let's say you're building a payments system. You launch multiple agents:</motion.p>
      <motion.ol>
        <motion.li className="font-sans"><motion.strong className="font-sans">Frontend Agent</motion.strong> -- Building the checkout UI</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Backend Agent</motion.strong> -- Building the payment API</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Database Agent</motion.strong> -- Creating the schema and migrations</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Testing Agent</motion.strong> -- Writing integration tests (needs backend running first)</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Docs Agent</motion.strong> -- Documenting the API (needs final backend shape)</motion.li>
      </motion.ol>
      <motion.p className="font-sans">Without coordination, you'd see:</motion.p>
      <motion.ul>
        <motion.li className="font-sans">Both frontend and backend agents try to claim port 3100 (race condition)</motion.li>
        <motion.li className="font-sans">Database agent migrates, frontend agent expects old schema</motion.li>
        <motion.li className="font-sans">Testing agent starts before backend is healthy</motion.li>
        <motion.li className="font-sans">Multiple agents editing <motion.code className="font-mono">src/types.ts</motion.code> simultaneously (merge conflict)</motion.li>
        <motion.li className="font-sans">Nobody knows what anyone else is doing</motion.li>
      </motion.ul>
      <motion.p className="font-sans">Port Daddy solves all of this with three primitives:</motion.p>
      <motion.ol>
        <motion.li className="font-sans"><motion.strong className="font-sans">Sessions &amp; Notes</motion.strong> -- Structured coordination</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">File Claims</motion.strong> -- Conflict detection on files</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Pub/Sub + Locks</motion.strong> -- Synchronization and exclusive access</motion.li>
      </motion.ol>

      <motion.h2 className="font-display">Sessions: The Coordination Journal</motion.h2>
      <motion.p className="font-sans">A session is like a bouncer at a club: "I'm working on this. Here are the files I've claimed. Here's what I've discovered so far."</motion.p>

      <motion.h3 className="font-display">Agent 1: Frontend</motion.h3>
      <CodeBlock
        code={`# Start a session with file claims
$ pd session start "Building checkout UI" \\
  --files "src/components/checkout/*" \\
  "src/pages/checkout.tsx" \\
  "src/hooks/usePayment.ts"

# Make notes of progress
$ pd note "Installed Stripe React library"
$ pd note "Built CheckoutForm component"
$ pd note "Blocked waiting on payment API types"`}
      />

      <motion.h3 className="font-display">Agent 2: Backend</motion.h3>
      <CodeBlock
        code={`# Start a session
$ pd session start "Building payment API" \\
  --files "src/api/payments/*" \\
  "src/types/Payment.ts" \\
  "src/middleware/auth.ts"

# Make notes as you work
$ pd note "Created POST /api/payments endpoint" --type commit
$ pd note "Integrated Stripe API client"
$ pd note "TypeScript types ready at src/types/Payment.ts"`}
      />

      <motion.p className="font-sans">Then, when you ask the Testing Agent what's ready:</motion.p>
      <CodeBlock
        code={`# View all notes across all agents
$ pd notes --limit 20

[Agent 1] Built CheckoutForm component
[Agent 1] Blocked waiting on payment API types
[Agent 2] TypeScript types ready at src/types/Payment.ts
[Agent 2] Created POST /api/payments endpoint
[Agent 3] Created payments table with webhook_id tracking
[Agent 3] Ready for integration tests`}
      />
      <motion.p className="font-sans">Now Agent 4 (Testing) knows exactly what's ready and can write tests against the actual API.</motion.p>

      <motion.h2 className="font-display">File Claims: Preventing Collisions</motion.h2>
      <motion.p className="font-sans">When you claim files, Port Daddy warns if another session already claimed them:</motion.p>
      <CodeBlock
        code={`# Agent 5 tries to claim a file Agent 2 is working on
$ pd session start "OAuth integration" \\
  --files "src/middleware/auth.ts"

Warning: src/middleware/auth.ts claimed by session-ab3 (Backend Agent)
Use --force to claim anyway`}
      />
      <motion.p className="font-sans">This is advisory, not enforced. You can force-claim if you need to, but the warning lets you say "wait, should Backend Agent and I coordinate here?" and avoid a merge conflict later.</motion.p>

      <motion.h2 className="font-display">Pub/Sub: Real-Time Signaling</motion.h2>
      <motion.p className="font-sans">Sometimes agents need to wait for each other. Use pub/sub for real-time events:</motion.p>
      <CodeBlock
        code={`# Backend Agent: "I'm ready, other agents listening?"
$ pd msg payments:api publish '{"status":"healthy","port":3101}'

# Testing Agent: "Waiting for backend..."
$ pd watch payments:* --exec ./start-tests.sh

{"status":"healthy","port":3101}`}
      />

      <motion.p className="font-sans">In code (JavaScript SDK):</motion.p>
      <CodeBlock
        language="typescript"
        code={`import { PortDaddy } from 'port-daddy';
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
});`}
      />

      <motion.h2 className="font-display">Distributed Locks: Exclusive Access</motion.h2>
      <motion.p className="font-sans">When only one agent can run something (migrations, seeding), use locks:</motion.p>
      <CodeBlock
        code={`# Database Agent claims exclusive lock for migrations
$ pd lock acquire db-migrations
$ npx prisma migrate dev
$ pd lock release db-migrations

# Better yet, wrap it so the lock releases even on crash:
$ pd with-lock db-migrations -- npx prisma migrate dev`}
      />

      <motion.p className="font-sans">In code:</motion.p>
      <CodeBlock
        language="typescript"
        code={`// Exclusive access pattern
await pd.withLock('db-migrations', async () => {
  await runMigrations();
  console.log('Migrations complete');
});`}
      />

      <motion.h2 className="font-display">Real Scenario: Building a Payment System in Parallel</motion.h2>
      <motion.p className="font-sans">Here's how 5 agents coordinate to build a complete payments feature:</motion.p>

      <motion.h3 className="font-display">Chronological Flow</motion.h3>

      <h4>10:00am -- Agent 1 (Database)</h4>
      <CodeBlock
        code={`$ pd begin --identity payments:db --purpose "Payment system schema"
$ pd note "Creating payments table, webhook_requests, refunds"`}
      />

      <h4>10:02am -- Agent 1 (Database)</h4>
      <CodeBlock
        code={`$ pd note "Schema ready, importing src/types/Payment.ts"
$ pd msg payments:schema publish '{"version":1,"tables":["payments","refunds"]}'
$ pd with-lock db-migrations -- npx prisma migrate dev`}
      />

      <h4>10:05am -- Agent 2 (Backend API)</h4>
      <CodeBlock
        code={`$ pd begin --identity payments:api --purpose "Stripe API integration"

# Wait to see the schema signal (or just read notes)
$ pd msg payments:schema get

$ pd note "Implemented POST /api/payments (charges)"
$ pd note "Ready for integration tests"
$ pd msg payments:api publish '{"status":"ready","port":3101}'`}
      />

      <h4>10:12am -- Agent 4 (Frontend)</h4>
      <CodeBlock
        code={`$ pd begin --identity payments:frontend --purpose "Checkout UI"

# Check if API is ready
$ pd msg payments:api get

$ PORT=$(pd claim payments:frontend -q)
$ pd note "Integrated with payment API on port 3101"`}
      />

      <h4>10:15am -- Agent 5 (Integration Tests)</h4>
      <CodeBlock
        code={`$ pd begin --identity payments:tests --purpose "Integration tests"

$ pd note "All tests passing"
$ pd msg payments:complete publish '{"status":"done"}'
$ pd done`}
      />

      <motion.h3 className="font-display">What Happened</motion.h3>
      <motion.ul>
        <motion.li className="font-sans">5 agents worked in parallel (not sequentially)</motion.li>
        <motion.li className="font-sans">Each knew exactly what others were doing via notes</motion.li>
        <motion.li className="font-sans">Database and API coordinated via locks and pub/sub</motion.li>
        <motion.li className="font-sans">Frontend waited for backend readiness before even starting</motion.li>
        <motion.li className="font-sans">Testing waited for everything to be ready</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Total time: 18 minutes instead of 90 minutes</motion.strong></motion.li>
      </motion.ul>

      <motion.h2 className="font-display">Agent Registration and Heartbeats</motion.h2>
      <motion.p className="font-sans">For better coordination, register agents with semantic identity (handled automatically by <motion.code className="font-mono">pd begin</motion.code>):</motion.p>

      <motion.p className="font-sans">Check which agents are alive:</motion.p>
      <CodeBlock
        code={`$ pd agents
Active frontend-builder (payments:web, 30s ago)
Active backend-builder (payments:api, 15s ago)
Dead   database-builder (payments:db, 8m ago) [stale]`}
      />

      <motion.p className="font-sans">When an agent dies before finishing (e.g. context window limits):</motion.p>
      <CodeBlock
        code={`$ pd salvage --project payments
# Shows all dead agents in payments:* with their session notes
# Other agents can claim their work and continue`}
      />

      <motion.h2 className="font-display">JavaScript SDK Full Pattern</motion.h2>
      <CodeBlock
        language="typescript"
        code={`import { PortDaddy } from 'port-daddy';

const pd = new PortDaddy();

// Start a session & register in one go
await pd.begin({
  identity: 'myapp:api',
  purpose: 'Building payment endpoints',
});

// Make notes as you work
await pd.note('Started payment API implementation');

// Claim exclusive access for critical operation
await pd.withLock('payment-config', async () => {
  await initializeStripe();
});

// Signal readiness
await pd.publish('myapp:api', {
  status: 'healthy',
  port: 3101,
});

// When done, end the session
await pd.done('Payment API complete');`}
      />

      <motion.h2 className="font-display">What's Next</motion.h2>
      <motion.p className="font-sans">You've learned how to coordinate multiple agents. Now explore:</motion.p>
      <motion.ol>
        <motion.li className="font-sans"><Link to="/tutorials/tunnel">Tunneling</Link> -- Share agent-built features with stakeholders</motion.li>
        <motion.li className="font-sans"><Link to="/tutorials/monorepo">Monorepo Mastery</Link> -- Scaling to 50 services</motion.li>
        <motion.li className="font-sans"><Link to="/tutorials/debugging">Debugging</Link> -- When coordination goes wrong</motion.li>
      </motion.ol>
      <motion.p className="font-sans">The key insight: <motion.strong className="font-sans">The bottleneck was never intelligence. It was coordination.</motion.strong></motion.p>
      <motion.p className="font-sans">One brilliant agent is powerful. A swarm of coordinated agents is exponentially more powerful.</motion.p>
    </TutorialLayout>
  )
