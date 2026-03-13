}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Inbox() {
  return (
    <TutorialLayout
      title="Agent Inbox: Direct Messaging"
      description="Give every agent a personal message queue. Send targeted handoffs, alerts, and task results directly to the agent that needs them — without broadcasting to everyone."
      number="8"
      total="12"
      level="Advanced"
      readTime="8 min read"
      prev={{ title: 'Session Phases', href: '/tutorials/session-phases' }}
      next={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
    >
      <motion.p className="font-sans">You've got four agents running in parallel — one building an API, one running tests, one applying migrations, one updating docs. Pub/sub is great for broadcasting "I'm done." But sometimes you need to tell one specific agent something private: <em>"The schema changed. Update your types before running the next test suite."</em></motion.p>
      <motion.p className="font-sans">That's the inbox.</motion.p>

      <motion.h2 className="font-display">What the Inbox Is</motion.h2>
      <motion.p className="font-sans">Every registered agent gets a personal message queue. Any caller can deliver a message; only the named recipient reads it. Messages are <motion.strong className="font-sans">persistent</motion.strong> — they wait in the inbox until read or cleared.</motion.p>
      
      <CodeBlock
        code={`# pub/sub channel — everyone subscribed hears it
$ pd msg build:api publish '{"status":"done"}'

# agent inbox — only agent-bob receives it
$ pd inbox send agent-bob "Schema migration complete, ready for review"`}
      />

      <motion.div className="bg-[var(--bg-glass-teal)] border border-[var(--brand-primary)] p-6 rounded-2xl my-8 text-sm leading-relaxed" style={{ backdropFilter: 'blur(12px)' }}>
        <motion.strong className="text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs block mb-2">Inbox vs Pub/Sub</motion.strong>
        <motion.p className="m-0" style={{ color: 'var(--text-secondary)' }}>
          Pub/sub delivers to current subscribers in real-time (ephemeral). The inbox holds messages until the recipient explicitly reads or clears them (persistent). Use the inbox when the message matters even if the recipient isn't listening right now.
        </motion.p>
      </motion.div>

      <motion.h2 className="font-display">Registration is the Inbox Address</motion.h2>
      <motion.p className="font-sans">The inbox exists as long as the agent is registered. When you register an agent, you create its delivery address:</motion.p>
      
      <CodeBlock
        code={`# Register yourself — this creates your inbox
$ pd agent register --agent my-agent \\
    --purpose "Building the payment API"

# Now any caller can message you:
$ pd inbox send my-agent "Hey, the Stripe webhook secret changed"`}
      />

      <motion.p className="font-sans">Using the SDK:</motion.p>
      <CodeBlock
        language="typescript"
        code={`const pd = new PortDaddy({ agentId: 'my-agent' });
await pd.register({ type: 'ci', purpose: 'Building the payment API' });
// Inbox is live at: POST /agents/my-agent/inbox`}
      />

      <motion.h2 className="font-display">Sending Messages</motion.h2>

      <motion.h3 className="font-display">Send from the terminal</motion.h3>
      <CodeBlock code={`$ pd inbox send agent-bob "Schema migration complete, ready for review"`} />

      <motion.h3 className="font-display">Send via HTTP</motion.h3>
      <CodeBlock
        language="bash"
        code={`curl -X POST http://localhost:9876/agents/agent-bob/inbox \\
  -H 'Content-Type: application/json' \\
  -d '{"content":"Schema migration complete","from":"agent-alice","type":"handoff"}'`}
      />

      <motion.h3 className="font-display">Send from JavaScript</motion.h3>
      <CodeBlock
        language="typescript"
        code={`await pd.inboxSend('agent-bob', 'Schema migration complete', { 
  from: 'agent-alice',
  type: 'handoff',
});`}
      />

      <motion.p className="font-sans"><motion.strong className="font-sans">Message types</motion.strong> are free-form strings. Common conventions:</motion.p>
      <motion.ul>
        <motion.li className="font-sans"><motion.code className="font-mono">message</motion.code> — general note</motion.li>
        <motion.li className="font-sans"><motion.code className="font-mono">handoff</motion.code> — "I finished X, you can proceed with Y"</motion.li>
        <motion.li className="font-sans"><motion.code className="font-mono">alert</motion.code> — something needs attention</motion.li>
        <motion.li className="font-sans"><motion.code className="font-mono">result</motion.code> — output of a completed task</motion.li>
      </motion.ul>

      <motion.h2 className="font-display">Reading Your Inbox</motion.h2>

      <motion.h3 className="font-display">CLI</motion.h3>
      <CodeBlock
        code={`# Read all messages
$ pd inbox
[09:42:15] [handoff] agent-alice: Schema migration complete, ready for review
[09:38:02] [alert]   system: Lock db-migrations held >30m

# Unread only (useful for polling scripts)
$ pd inbox --unread`}
      />

      <motion.h3 className="font-display">SDK</motion.h3>
      <CodeBlock
        language="typescript"
        code={`// All messages
const { messages } = await pd.inboxList('my-agent');

// Unread only
const { messages } = await pd.inboxList('my-agent', { unreadOnly: true });

// Paginated
const { messages } = await pd.inboxList('my-agent', { limit: 20, since: '2026-01-01T00:00:00Z' });

// Print messages
for (const msg of messages) { 
  const ts = new Date(msg.createdAt).toISOString().slice(11, 19);
  console.log(\`[\${ts}] [\${msg.type}] \${msg.from ?? 'system'}: \${msg.content}\`);
}`}
      />

      <motion.p className="font-sans"><motion.strong className="font-sans">InboxMessage shape:</motion.strong></motion.p>
      <CodeBlock
        language="typescript"
        code={`interface InboxMessage { 
  id: string;
  agentId: string;     // recipient
  from?: string;       // sender (optional, free-form)
  content: string;
  type: string;
  read: boolean;
  createdAt: string;   // ISO 8601
}`}
      />

      <motion.h2 className="font-display">Stats, Mark Read, Clear</motion.h2>
      <motion.h3 className="font-display">CLI</motion.h3>
      <CodeBlock
        code={`# Stats
$ pd inbox stats
Total: 5  Unread: 2

# Mark all read
$ pd inbox read-all

# Clear inbox
$ pd inbox clear`}
      />

      <motion.h3 className="font-display">SDK</motion.h3>
      <CodeBlock
        language="typescript"
        code={`// Stats
const { total, unread } = await pd.inboxStats('my-agent');
console.log(\`\${unread} unread of \${total} total\`);

// Mark a single message read
await pd.inboxMarkRead('my-agent', messageId);

// Mark all read
await pd.inboxMarkAllRead('my-agent');

// Clear inbox — returns count of deleted messages
const { deleted } = await pd.inboxClear('my-agent');
console.log(\`Cleared \${deleted} messages\`);`}
      />

      <motion.h2 className="font-display">Polling Pattern</motion.h2>
      <motion.p className="font-sans">Agents typically poll for new messages at a regular interval. There is no push/SSE for inbox — poll with <motion.code className="font-mono">unreadOnly: true</motion.code> to only wake on new messages:</motion.p>
      
      <CodeBlock
        language="typescript"
        code={`async function poll(): Promise<void> { 
  const { messages } = await pd.inboxList('my-agent', { unreadOnly: true });
  for (const msg of messages) { 
    console.log(\`[\${msg.type}] \${msg.from ?? 'system'}: \${msg.content}\`);
    await pd.inboxMarkRead('my-agent', msg.id);
  }
}

// Check every 10 seconds
setInterval(poll, 10_000);
poll();`}
      />
      <motion.p className="font-sans">See <motion.code className="font-mono">examples/inbox/inbox-monitor.ts</motion.code> for a complete standalone monitor.</motion.p>

      <motion.h2 className="font-display">Real Workflow: Migration Handoff</motion.h2>
      <motion.p className="font-sans">Here is a four-agent workflow where the database agent signals the API agent after migrations complete.</motion.p>

      <motion.h3 className="font-display">1. db-agent runs migrations, sends handoff</motion.h3>
      <CodeBlock
        code={`# db-agent
$ pd begin --identity db-agent --purpose "Database migrations" --files db/migrations/*
$ npx prisma migrate dev
$ pd inbox send api-agent \\
    "Migrations complete. New tables: payments, refunds." \\
    --from db-agent --type handoff
$ pd note "Migrations deployed, api-agent signaled"
$ pd done`}
      />

      <motion.h3 className="font-display">2. api-agent polls inbox, proceeds on handoff</motion.h3>
      <CodeBlock
        language="typescript"
        code={`async function waitForMigrations(): Promise<void> { 
  while (true) { 
    const { messages } = await pd.inboxList('api-agent', { unreadOnly: true });
    const handoff = messages.find(
      (m) => m.from === 'db-agent' && m.type === 'handoff'
    );
    if (handoff) { 
      console.log('Got handoff:', handoff.content);
      await pd.inboxMarkRead('api-agent', handoff.id);
      break;
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
}

await waitForMigrations();
// Safe to start the API now`}
      />

      <motion.h2 className="font-display">Inbox vs Pub/Sub: Choosing the Right Tool</motion.h2>
      <motion.div className="overflow-x-auto my-8">
        <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-subtle)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              <th className="p-4 text-left font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Situation</th>
              <th className="p-4 text-left font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Use</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Tell one specific agent something</td>
              <td className="p-4 font-bold text-[var(--brand-primary)]">Inbox</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Signal all subscribers that the build is ready</td>
              <td className="p-4 font-bold">Pub/Sub</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Deliver a task result that must not be lost</td>
              <td className="p-4 font-bold text-[var(--brand-primary)]">Inbox</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Broadcast status to a monitoring dashboard</td>
              <td className="p-4 font-bold">Pub/Sub</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Handoff context from one agent to another</td>
              <td className="p-4 font-bold text-[var(--brand-primary)]">Inbox</td>
            </tr>
            <tr style={{ background: 'var(--bg-overlay)' }}>
              <td className="p-4 text-[var(--text-secondary)]">Coordinate across an unknown number of agents</td>
              <td className="p-4 font-bold">Pub/Sub</td>
            </tr>
          </tbody>
        </table>
      </motion.div>
      <motion.p className="font-sans">The inbox is <motion.strong className="font-sans">persistent</motion.strong> — messages wait until retrieved. Pub/sub is <motion.strong className="font-sans">ephemeral</motion.strong> — only current subscribers receive messages at publish time.</motion.p>

      <motion.h2 className="font-display">Inbox Limits</motion.h2>
      <motion.ul>
        <motion.li className="font-sans"><motion.strong className="font-sans">1000 messages</motion.strong> per agent inbox. The oldest messages are dropped when the limit is reached.</motion.li>
        <motion.li className="font-sans">Messages have no TTL — they remain until read or explicitly cleared with <motion.code className="font-mono">inboxClear()</motion.code>.</motion.li>
        <motion.li className="font-sans">There is no SSE/push notification for inbox messages. Poll with <motion.code className="font-mono">inboxList({'{ unreadOnly: true }'})</motion.code>.</motion.li>
      </motion.ul>

      <motion.div className="mt-12 p-8 rounded-3xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <motion.h3 className="m-0 mb-4">What's Next</motion.h3>
        <motion.ul className="space-y-2 m-0 p-0 list-none">
          <motion.li className="font-sans"><Link to="/tutorials/multi-agent" className="text-[var(--brand-primary)] font-bold no-underline hover:underline">Multi-Agent Orchestration tutorial →</Link></motion.li>
          <motion.li className="font-sans"><Link to="/docs" className="text-[var(--brand-primary)] font-bold no-underline hover:underline">SDK Reference →</Link></motion.li>
        </motion.ul>
      </motion.div>
    </TutorialLayout>
  )
