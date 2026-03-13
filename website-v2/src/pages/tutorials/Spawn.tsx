}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Spawn() {
  return (
    <TutorialLayout
      title="pd spawn"
      description="Launch Ollama, Claude, Aider, and Gemini agents from one command. Port Daddy coordination — sessions, heartbeats, notes, salvage — is auto-wired."
      number="11"
      total="12"
      level="Intermediate"
      readTime="7 min read"
      prev={{ title: 'pd watch', href: '/tutorials/pd-watch' }}
      next={{ title: 'Harbor Tokens', href: '/tutorials/harbors' }}
    >
      <motion.p className="font-sans"><motion.code className="font-mono">pd spawn</motion.code> launches AI agents (Ollama, Claude API, Aider, Gemini, or any custom subprocess) with Port Daddy coordination pre-wired. The spawned agent is registered as a Port Daddy agent, sends heartbeats automatically, logs its responses as notes, and enters the salvage queue if it crashes.</motion.p>

      <motion.h2 className="font-display">What pd spawn Does</motion.h2>
      <motion.p className="font-sans">Without <motion.code className="font-mono">pd spawn</motion.code>, integrating an AI agent into Port Daddy requires manual calls: register the agent, start a session, send heartbeats in a loop, write notes, end the session on completion. <motion.code className="font-mono">pd spawn</motion.code> does all of this for you.</motion.p>
      <motion.p className="font-sans">The agent you spawn becomes a full Port Daddy citizen: it appears in the dashboard, its output becomes queryable notes, other agents can pub/sub with it, and if it dies unexpectedly its last note becomes its salvage context.</motion.p>

      <motion.h2 className="font-display">Quick Start — Ollama</motion.h2>
      <motion.p className="font-sans">Spawn a local Ollama agent to perform a coding task:</motion.p>
      
      <CodeBlock
        code={`# Prerequisite: Ollama must be running (ollama serve)
$ pd spawn \\
    --backend ollama \\
    --model llama3.2:8b \\
    --identity myapp:coder \\
    --purpose "Refactor auth module" \\
    -- "Fix the login bug in src/auth.ts"

Agent spawned: agent-a1b2c3
Backend:  ollama (llama3.2:8b)
Identity: myapp:coder
Session:  sess-d4e5f6
Heartbeat: every 30s

[llama3.2:8b] Analyzing src/auth.ts...
[llama3.2:8b] Found issue: session token not invalidated on logout.
[llama3.2:8b] Fix: call destroySession() in the logout handler.
Agent done: sess-d4e5f6 ended`}
      />
      <motion.p className="font-sans">The <motion.code className="font-mono">--</motion.code> separator marks the end of <motion.code className="font-mono">pd spawn</motion.code> flags. Everything after it is the prompt sent to the agent.</motion.p>

      <motion.h2 className="font-display">Backends</motion.h2>
      <motion.p className="font-sans">Five backends are supported. Each is tuned for its runtime:</motion.p>
      
      <CodeBlock
        code={`# Ollama — local inference, uses HTTP to port 11434
$ pd spawn --backend ollama --model llama3.2:8b \\
    --identity myapp:coder -- "Review src/auth.ts"

# Claude API — uses @anthropic-ai/sdk directly (not the CLI)
$ pd spawn --backend claude --model claude-haiku-4-5 \\
    --identity myapp:reviewer -- "Review PR for security issues"

# Gemini — uses @google/generative-ai
$ pd spawn --backend gemini --model gemini-flash \\
    --identity myapp:analyst -- "Summarize the test failures"

# Aider — git-native coding agent, wraps stdout as PD notes
$ pd spawn --backend aider --model gpt-4o \\
    --identity myapp:writer -- src/auth.ts src/middleware.ts

# Custom — any subprocess, stdout becomes PD notes
$ pd spawn --backend custom \\
    --identity myapp:worker -- python3 ./process.py`}
      />

      <motion.h2 className="font-display">Coordination Auto-Wired</motion.h2>
      <motion.p className="font-sans">Every spawned agent automatically gets:</motion.p>
      <motion.ol>
        <motion.li className="font-sans">An agent registration with the identity you specify</motion.li>
        <motion.li className="font-sans">A Port Daddy session opened with the purpose you specify</motion.li>
        <motion.li className="font-sans">Heartbeats sent every 30 seconds</motion.li>
        <motion.li className="font-sans">Each LLM response chunk added as an immutable note</motion.li>
        <motion.li className="font-sans">Session ended cleanly when the agent completes</motion.li>
        <motion.li className="font-sans">Resurrection queue entry if the agent crashes unexpectedly</motion.li>
      </motion.ol>
      <motion.p className="font-sans">Other agents can see spawned agents in <motion.code className="font-mono">pd salvage</motion.code>, read their notes, and pick up where they left off if they crash.</motion.p>

      <motion.h2 className="font-display">Managing Agents</motion.h2>
      <CodeBlock
        code={`# See all running spawned agents
$ pd spawned
AGENT ID      BACKEND   MODEL           IDENTITY       STATUS
agent-a1b2c3  ollama    llama3.2:8b     myapp:coder    running
agent-b2c3d4  claude    haiku-4-5       myapp:review   running

# Get JSON output for scripting
$ pd spawned --json

# Stop a specific agent
$ pd spawn kill agent-a1b2c3
Agent agent-a1b2c3 stopped. Session ended.`}
      />

      <motion.h2 className="font-display">SDK Equivalent</motion.h2>
      <CodeBlock
        language="typescript"
        code={`import { PortDaddy } from 'port-daddy';

const pd = new PortDaddy();

// Spawn an Ollama agent
const agent = await pd.spawn({
  backend: 'ollama',
  model: 'llama3.2:8b',
  identity: 'myapp:coder',
  purpose: 'Refactor auth module',
  prompt: 'Fix the login bug in src/auth.ts',
});

// Stream output as it arrives
agent.on('output', (chunk) => console.log(chunk));
agent.on('done', () => console.log('Agent finished'));

// Or await completion
const result = await agent.wait();
console.log(result.notes);`}
      />

      <motion.div className="mt-12 p-8 rounded-3xl" style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}>
        <motion.h3 className="m-0 mb-4">Scaling Up</motion.h3>
        <motion.p className="mb-6">Ready to run a fleet? Use Harbors to manage permissions for your spawned agents.</motion.p>
        <Link to="/tutorials/harbors" className="text-[var(--brand-primary)] font-bold no-underline hover:underline">Learn about Harbor Tokens →</Link>
      </motion.div>
    </TutorialLayout>
  )
