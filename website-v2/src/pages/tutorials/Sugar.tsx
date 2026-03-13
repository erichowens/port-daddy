}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Sugar() {
  return (
    <TutorialLayout
      title="Sugar Commands"
      description="One-line agent lifecycle with begin, done, and whoami. The recommended way to use Port Daddy."
      number="9"
      total="12"
      level="Beginner"
      readTime="6 min read"
      prev={{ title: 'Agent Inbox: Direct Messaging', href: '/tutorials/inbox' }}
      next={{ title: 'pd watch', href: '/tutorials/pd-watch' }}
    >
      <motion.p className="font-sans">Sugar commands combine multiple operations into single calls -- the recommended way to start and end agent work sessions. They handle the "paperwork" of registration and context tracking automatically.</motion.p>

      <motion.h2 className="font-display">begin -- Start Everything</motion.h2>
      <CodeBlock
        code={`$ pd begin "Building auth system"
Agent registered: agent-a1b2c3
Session started: sess-d4e5f6
Context saved to .portdaddy/current.json`}
      />

      <motion.p className="font-sans">This single command perform three actions:</motion.p>
      <motion.ol>
        <motion.li className="font-sans"><motion.strong className="font-sans">Registers</motion.strong> you as an active agent in the registry.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Starts</motion.strong> a new coordination session.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Persists</motion.strong> the context to <motion.code className="font-mono">.portdaddy/current.json</motion.code> so subsequent commands know who you are.</motion.li>
      </motion.ol>

      <motion.h2 className="font-display">done -- End Everything</motion.h2>
      <CodeBlock
        code={`$ pd done "Auth complete, tests passing"
Session ended with note
Agent unregistered
Context cleaned up`}
      />

      <motion.p className="font-sans">When you finish your task, <motion.code className="font-mono">pd done</motion.code> cleans up the lifecycle:</motion.p>
      <motion.ol>
        <motion.li className="font-sans">Ends the active session with a final closing note.</motion.li>
        <motion.li className="font-sans">Unregisters the agent from the active pool.</motion.li>
        <motion.li className="font-sans">Cleans up the local context file.</motion.li>
      </motion.ol>

      <motion.h2 className="font-display">whoami -- Check Context</motion.h2>
      <CodeBlock
        code={`$ pd whoami
Agent:   agent-a1b2c3
Session: sess-d4e5f6
Purpose: Building auth system
Files:   src/auth.ts, src/middleware.ts`}
      />

      <motion.p className="font-sans">Shows your current identity and session details as read from <motion.code className="font-mono">.portdaddy/current.json</motion.code>. This is useful for agents to verify their environment after a restart.</motion.p>

      <motion.h2 className="font-display">with-lock -- Run Under Lock</motion.h2>
      <motion.p className="font-sans">Instead of manually acquiring and releasing locks, use <motion.code className="font-mono">with-lock</motion.code> to wrap any shell command:</motion.p>
      
      <CodeBlock
        code={`$ pd with-lock db-migrations -- npm run migrate
Lock acquired: db-migrations
Running: npm run migrate
...
Lock released: db-migrations`}
      />

      <motion.p className="font-sans">The lock is guaranteed to be released when the command finishes, even if it crashes or returns a non-zero exit code.</motion.p>

      <motion.h2 className="font-display">SDK Equivalent</motion.h2>
      <CodeBlock
        language="typescript"
        code={`import { PortDaddy } from 'port-daddy';

const pd = new PortDaddy();

// Register and start session in one call
const { agentId, sessionId } = await pd.begin({ 
  purpose: 'Building auth system' 
});

// ... do work ...

// End everything gracefully
await pd.done({ note: 'Auth complete' });`}
      />

      <motion.div className="mt-12 p-8 rounded-3xl" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}>
        <motion.h3 className="m-0 mb-4">Going Deeper</motion.h3>
        <motion.p className="mb-6">Sugar commands are shortcuts for the core API. Learn about the events driving them.</motion.p>
        <Link to="/tutorials/pd-watch" className="text-[var(--brand-primary)] font-bold no-underline hover:underline">Learn about Always-On Agents →</Link>
      </motion.div>
    </TutorialLayout>
  )
