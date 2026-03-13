}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function SessionPhases() {
  return (
    <TutorialLayout
      title="Session Phases & Integration"
      description="Track agent progress and coordinate service startup with structured phases and integration signals. Like PR status labels, but for running agent work."
      number="7"
      total="12"
      level="Advanced"
      readTime="12 min read"
      prev={{ title: 'DNS Resolver', href: '/tutorials/dns' }}
      next={{ title: 'Agent Inbox: Direct Messaging', href: '/tutorials/inbox' }}
    >
      <motion.h2 className="font-display">What are session phases?</motion.h2>
      <motion.p className="font-sans">Sessions have a lifecycle. Phases let agents communicate their current state -- to other agents, to humans watching the dashboard, and to the salvage system if something goes wrong.</motion.p>
      <motion.p className="font-sans">Think of phases like status labels on a pull request: <em>In Review</em>, <em>Changes Requested</em>, <em>Merged</em>. They don't enforce anything. They're a shared signal that answers the question "where are you in your work right now?" without requiring a dedicated communication channel.</motion.p>
      <motion.p className="font-sans">Phases also feed the salvage system. When an agent dies and another agent picks up its work, the phase tells the rescuer exactly where the previous agent stopped. An agent with phase <motion.code className="font-mono">testing</motion.code> died while running tests -- the rescuer knows to look at test output, not at the implementation.</motion.p>

      <motion.h2 className="font-display">The 6 Phases</motion.h2>
      <motion.p className="font-sans">Sessions can be in one of six phases. They flow roughly left to right, with <motion.code className="font-mono">abandoned</motion.code> as an escape hatch from anywhere:</motion.p>

      <motion.div className="bg-[var(--codeblock-bg)] border border-[var(--border-subtle)] rounded-2xl p-8 my-8 overflow-x-auto">
        <motion.div className="flex flex-col items-center gap-6 min-w-fit">
          <motion.div className="flex items-center gap-4">
            <motion.span className="px-4 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm">planning</motion.span>
            <motion.span className="text-[var(--text-muted)] font-bold">→</motion.span>
            <motion.span className="px-4 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm">in_progress</motion.span>
            <motion.span className="text-[var(--text-muted)] font-bold">→</motion.span>
            <motion.span className="px-4 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm">testing</motion.span>
            <motion.span className="text-[var(--text-muted)] font-bold">→</motion.span>
            <motion.span className="px-4 py-2 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-sm">reviewing</motion.span>
            <motion.span className="text-[var(--text-muted)] font-bold">→</motion.span>
            <motion.span className="px-4 py-2 rounded-xl bg-[var(--status-success)] text-[var(--bg-base)] font-bold text-sm">completed</motion.span>
          </motion.div>
          <motion.div className="relative w-full h-px border-t border-dashed border-[var(--border-strong)] mt-4">
            <motion.span className="absolute left-1/2 -translate-x-1/2 -top-3 px-4 py-1.5 rounded-lg bg-[var(--status-error)] text-[var(--bg-base)] font-bold text-xs">abandoned</motion.span>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div className="overflow-x-auto my-8">
        <table className="w-full border-collapse rounded-xl overflow-hidden shadow-sm" style={{ border: '1px solid var(--border-subtle)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)' }}>
              <th className="p-4 text-left font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Phase</th>
              <th className="p-4 text-left font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>When to use it</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 font-mono font-bold text-[var(--brand-primary)]">planning</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Designing the approach, writing specs, deciding which files to touch</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}>
              <td className="p-4 font-mono font-bold text-[var(--brand-primary)]">in_progress</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Actively writing code, making changes, executing the plan</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 font-mono font-bold text-[var(--brand-primary)]">testing</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Running the test suite, fixing failures, verifying behavior</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-overlay)' }}>
              <td className="p-4 font-mono font-bold text-[var(--brand-primary)]">reviewing</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Code review in progress, waiting for human approval or another agent's critique</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <td className="p-4 font-mono font-bold text-[var(--status-success)]">completed</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Work merged or definitively done -- set automatically by <motion.code className="font-mono">pd done</motion.code></td>
            </tr>
            <tr style={{ background: 'var(--bg-overlay)' }}>
              <td className="p-4 font-mono font-bold text-[var(--status-error)]">abandoned</td>
              <td className="p-4 text-sm text-[var(--text-secondary)]">Work stopped due to a blocker -- triggers salvage so another agent can continue</td>
            </tr>
          </tbody>
        </table>
      </motion.div>

      <motion.h2 className="font-display">Starting a Session with a Phase</motion.h2>
      <motion.p className="font-sans">Pass <motion.code className="font-mono">--phase</motion.code> to <motion.code className="font-mono">pd begin</motion.code> to start directly in a specific phase. The default is <motion.code className="font-mono">planning</motion.code> if you omit it.</motion.p>
      
      <CodeBlock
        code={`# Start in planning phase (default)
$ pd begin --identity myapp:feature-auth --purpose "Add JWT auth" --phase planning
Agent registered: agent-a1b2c3
Session started: sess-d4e5f6 [planning]
Context saved to .portdaddy/current.json

# Jump straight to in_progress if you already know what you're doing
$ pd begin --identity myapp:bugfix-timeout --purpose "Fix connection timeout" --phase in_progress
Agent registered: agent-b2c3d4
Session started: sess-e5f6a7 [in_progress]
Context saved to .portdaddy/current.json`}
      />

      <motion.div className="bg-[var(--bg-glass-teal)] border border-[var(--brand-primary)] p-6 rounded-2xl my-8 text-sm leading-relaxed" style={{ backdropFilter: 'blur(12px)' }}>
        <motion.strong className="text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs block mb-2">Salvage Tip</motion.strong>
        <motion.p className="m-0" style={{ color: 'var(--text-secondary)' }}>
          The <motion.code className="font-mono">--identity</motion.code> flag tells Port Daddy which project and stack you're working on. When another agent in the same project runs <motion.code className="font-mono">pd salvage</motion.code>, they'll see your session and know what you were doing.
        </motion.p>
      </motion.div>

      <motion.h2 className="font-display">Advancing Through Phases</motion.h2>
      <motion.p className="font-sans">Update the phase as your work progresses. This keeps other agents and humans informed of exactly where you are.</motion.p>
      
      <CodeBlock
        code={`# Done planning, starting to code
$ pd session update sess-d4e5f6 --phase in_progress
Session sess-d4e5f6 updated: planning -> in_progress

# Coding done, running tests
$ pd session update sess-d4e5f6 --phase testing
Session sess-d4e5f6 updated: in_progress -> testing

# Tests pass, requesting review
$ pd session update sess-d4e5f6 --phase reviewing
Session sess-d4e5f6 updated: testing -> reviewing

# Merged! pd done marks it completed automatically
$ pd done "Auth merged, all tests green"
Session ended: sess-d4e5f6 [completed]
Agent unregistered`}
      />

      <motion.p className="font-sans">You can also update the phase via the HTTP API directly -- useful when automating from CI or a shell script:</motion.p>
      <CodeBlock
        language="bash"
        code={`curl -X PUT http://localhost:9876/sessions/sess-d4e5f6 \\
    -H "Content-Type: application/json" \\
    -d '{"phase": "testing"}'`}
      />

      <motion.h3 className="font-display">Abandoning a session</motion.h3>
      <motion.p className="font-sans">If you hit a blocker and can't continue, mark the session as abandoned. This places it in the salvage queue so another agent can pick it up with full context.</motion.p>
      
      <CodeBlock
        code={`$ pd session update sess-d4e5f6 --phase abandoned
Session sess-d4e5f6 marked as abandoned
Entering salvage queue...

# Another agent sees it
$ pd salvage --project myapp
1 session(s) needing salvage in myapp:*

Session: sess-d4e5f6
Agent:   agent-a1b2c3 (dead)
Phase:   abandoned
Purpose: Add JWT auth
Notes:   4 note(s)
Files:   src/auth.ts, src/middleware.ts`}
      />

      <motion.h2 className="font-display">Integration Signals</motion.h2>
      <motion.p className="font-sans">Integration signals solve the startup coordination problem: "Is service X ready yet?" Instead of polling <motion.code className="font-mono">/health</motion.code> endpoints in a loop, services declare when they're ready and waiters block until that signal arrives.</motion.p>

      <motion.h3 className="font-display">The basic pattern</motion.h3>
      
      <CodeBlock
        code={`# auth-service signals it's ready
$ pd integration ready auth-service
Signal broadcast: auth-service is ready

# api-service blocks until auth-service is ready
$ pd integration wait auth-service
Waiting for auth-service...
auth-service is ready!`}
      />

      <motion.h3 className="font-display">Coordinating a multi-service startup</motion.h3>
      <motion.p className="font-sans">Here's a real pattern for a three-service app where the API depends on auth and the frontend depends on the API:</motion.p>
      
      <CodeBlock
        language="bash"
        filename="auth-service/start.sh"
        code={`node src/auth-server.js &
# Wait for the server to bind and pass health check
until curl -sf http://localhost:3100/health >/dev/null; do sleep 0.5; done
pd integration ready auth-service`}
      />

      <CodeBlock
        language="bash"
        filename="api-service/start.sh"
        code={`pd integration wait auth-service  # blocks until auth is up
node src/api-server.js &
until curl -sf http://localhost:3101/health >/dev/null; do sleep 0.5; done
pd integration ready api-service`}
      />

      <motion.h2 className="font-display">Viewing Session History</motion.h2>
      <motion.p className="font-sans">Several commands let you inspect active and past sessions:</motion.p>
      
      <CodeBlock
        code={`# List all active sessions
$ pd sessions
SESSION       AGENT          PHASE        PURPOSE
sess-d4e5f6   agent-a1b2c3   reviewing    Add JWT auth
sess-e5f6a7   agent-b2c3d4   testing      Fix connection timeout

# Details and notes for a specific session
$ pd session sess-d4e5f6
Session: sess-d4e5f6
Agent:   agent-a1b2c3
Phase:   reviewing
Purpose: Add JWT auth
Files:   src/auth.ts, src/middleware.ts

Notes:
  [10:14] planning: Decided to use jose library for JWT
  [10:31] in_progress: Auth route working, token generation done
  [11:02] testing: All 24 tests passing
  [11:15] reviewing: PR opened, waiting for review`}
      />

      <motion.h2 className="font-display">SDK Usage</motion.h2>
      <motion.p className="font-sans">All phase and integration operations are available in the JavaScript SDK:</motion.p>
      
      <CodeBlock
        language="typescript"
        code={`const pd = new PortDaddy();

// Start session with a phase
const { sessionId } = await pd.begin({
  identity: 'myapp:feature-auth',
  purpose: 'Add JWT authentication',
  phase: 'planning',
});

// Advance through phases
await pd.updateSession(sessionId, { phase: 'in_progress' });
await pd.updateSession(sessionId, { phase: 'testing' });

// Signal that a dependency is ready
await pd.publish('integration:ready:auth-service', { ready: true });

// Wait for a dependency (resolves immediately if already signaled)
await pd.integrationWait('auth-service');

// End session -- marks completed automatically
await pd.done({ sessionId, note: 'Auth merged, all tests green' });`}
      />

      <motion.div className="mt-12 p-8 rounded-3xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
        <motion.h3 className="m-0 mb-4">Direct Communication</motion.h3>
        <motion.p className="mb-6">Phases are great for status, but sometimes you need to send a targeted message to one agent.</motion.p>
        <Link to="/tutorials/inbox" className="text-[var(--brand-primary)] font-bold no-underline hover:underline">Learn about Agent Inboxes →</Link>
      </motion.div>
    </TutorialLayout>
  )
