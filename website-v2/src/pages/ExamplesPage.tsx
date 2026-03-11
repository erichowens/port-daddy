import * as React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Link } from 'react-router-dom'

interface Example {
  id: string
  title: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  what: string[]
  code: string[]
  badge: 'teal' | 'amber' | 'green'
}

const EXAMPLES: Example[] = [
  {
    id: 'multi-agent-coding',
    title: 'Multi-Agent Coding Session',
    category: 'Coordination',
    difficulty: 'Beginner',
    description: 'Two Claude Code agents work on the same repo without stepping on each other. Agent A owns auth, Agent B owns the API — Port Daddy prevents conflicts.',
    what: [
      'Each agent registers with a semantic identity',
      'File claims prevent simultaneous edits',
      'Notes let agents leave messages for each other',
      'If one agent crashes, the other can salvage its work',
    ],
    code: [
      '# Agent A: auth refactor',
      'pd begin --identity myapp:auth --purpose "Refactor login flow"',
      'pd session files claim $SESSION src/auth/ src/middleware/',
      '',
      '# Agent B: API routes (separate terminal)',
      'pd begin --identity myapp:api --purpose "Add pagination to /users"',
      'pd session files claim $SESSION src/routes/ src/controllers/',
      '',
      '# Agents communicate via notes',
      'pd note "Auth middleware updated — JWT shape changed" --type milestone',
    ],
    badge: 'teal',
  },
  {
    id: 'fleet-management',
    title: 'Multi-Service Dev Environment',
    category: 'Port Management',
    difficulty: 'Beginner',
    description: 'Start a full microservices stack with zero port collisions. Port Daddy assigns ports atomically and keeps them consistent across restarts.',
    what: [
      'Scan a monorepo to detect all services',
      'Claim ports for each service with deterministic assignment',
      'All agents resolve service addresses via DNS names',
      'Ports survive daemon restarts — no reconfiguration needed',
    ],
    code: [
      '# Auto-detect all services in the monorepo',
      'pd scan ./services',
      '',
      '# Bring everything up',
      'pd up',
      '',
      '# Services can find each other by name',
      'curl http://$(pd dns resolve myapp-api)/health',
      '',
      '# Or in code:',
      "const port = await pd.claim('myapp:api')",
      "const db   = await pd.claim('myapp:postgres')",
    ],
    badge: 'teal',
  },
  {
    id: 'spawn-ai-fleet',
    title: 'Spawn an AI Agent Fleet',
    category: 'Agent Orchestration',
    difficulty: 'Intermediate',
    description: 'Launch 4 specialized agents — a planner, a coder, a reviewer, and a tester — and have them coordinate through Port Daddy pub/sub.',
    what: [
      'pd spawn launches agents with coordination pre-wired',
      'Agents publish results to typed channels',
      'Orchestrator subscribes and routes work to next agent',
      'All agent output preserved as session notes',
    ],
    code: [
      '# Launch a planner agent',
      'pd spawn --backend claude --model claude-haiku-4-5 \\',
      '  --identity myapp:planner \\',
      '  --purpose "Break issue #42 into tasks" \\',
      '  -- "Analyze the auth bug and write a task list"',
      '',
      '# Launch a coding agent against the plan',
      'pd spawn --backend aider --model gemini/gemini-flash \\',
      '  --identity myapp:coder \\',
      '  -- src/auth/login.ts',
      '',
      '# Watch for results',
      'pd watch myapp:coder:done --exec ./scripts/run-tests.sh',
    ],
    badge: 'amber',
  },
  {
    id: 'always-on-trigger',
    title: 'Always-On Agent Trigger',
    category: 'Automation',
    difficulty: 'Intermediate',
    description: 'pd watch creates a persistent listener on any pub/sub channel. When a message arrives, it fires your script — no polling, no cronjob, no custom server.',
    what: [
      'SSE connection to Port Daddy pub/sub',
      'Script receives message as $PD_MESSAGE env var',
      'Auto-reconnects on disconnect',
      'Combine with webhooks for external triggers',
    ],
    code: [
      '# Run tests whenever a "build:done" message arrives',
      'pd watch build:done --exec ./scripts/run-tests.sh',
      '',
      '# Deploy when tests pass',
      'pd watch tests:passed --exec ./scripts/deploy.sh',
      '',
      '# Chain: CI publishes, watch fires, deploy runs',
      "pd msg build:done publish '{\"sha\": \"abc123\"}'",
      '',
      '# The script receives:',
      '# $PD_MESSAGE = {"sha": "abc123"}',
      '# $PD_CHANNEL = "build:done"',
    ],
    badge: 'green',
  },
  {
    id: 'harbors-security-review',
    title: 'Scoped Security Review Harbor',
    category: 'Harbors',
    difficulty: 'Advanced',
    description: 'A security team gets scoped access to a codebase review. Agents inside the harbor can read code and write notes, but cannot create tunnels or modify files.',
    what: [
      'Harbor defines allowed capabilities as a list',
      'Agents receive HMAC-signed JWT on entry',
      'All harbor operations verified against token',
      'Token expires after 2 hours — no orphaned permissions',
    ],
    code: [
      '# Create the harbor with scoped capabilities',
      'pd harbor create myapp:security-review \\',
      '  --cap "code:read,notes:write,lock:acquire" \\',
      '  --ttl 2h',
      '',
      '# Reviewer agent enters the harbor',
      'pd harbor enter myapp:security-review',
      '# → token: eyJhbGciOiJIUzI1NiJ9... (expires 2h)',
      '',
      '# Spawn the review agent with the token',
      'pd spawn --backend claude --model claude-sonnet-4-6 \\',
      '  --identity myapp:reviewer \\',
      '  --harbor myapp:security-review \\',
      '  -- "Review src/auth/ for security vulnerabilities"',
    ],
    badge: 'teal',
  },
  {
    id: 'distributed-lock',
    title: 'Distributed Lock for Migrations',
    category: 'Locks',
    difficulty: 'Beginner',
    description: 'Run database migrations safely when multiple agents could try to migrate simultaneously. The first agent wins, others wait or skip.',
    what: [
      'Atomic lock acquisition — only one holder at a time',
      'TTL prevents orphaned locks from dead agents',
      'with-lock CLI helper for clean shell scripts',
      'Lock owner tracks which agent holds it',
    ],
    code: [
      '# Wrap any command in a distributed lock',
      'pd with-lock db-migration -- npm run migrate',
      '',
      '# Manual lock + unlock',
      'pd lock acquire db-migration --ttl 300',
      'npm run migrate',
      'pd lock release db-migration',
      '',
      '# In agent code:',
      "const lock = await pd.lock('db-migration', { ttl: 300000 })",
      'if (lock.acquired) {',
      '  await runMigration()',
      '  await lock.release()',
      '}',
    ],
    badge: 'amber',
  },
]

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Beginner:     { bg: 'rgba(34,197,94,0.12)',   text: 'var(--p-green-300)' },
  Intermediate: { bg: 'rgba(251,191,36,0.12)',  text: 'var(--p-amber-300)' },
  Advanced:     { bg: 'rgba(58,173,173,0.15)',  text: 'var(--p-teal-300)' },
}

const CATEGORIES = ['All', ...new Set(EXAMPLES.map(e => e.category))]

export function ExamplesPage() {
  const [activeCategory, setActiveCategory] = React.useState('All')
  const [openId, setOpenId] = React.useState<string | null>(null)

  const filtered = activeCategory === 'All'
    ? EXAMPLES
    : EXAMPLES.filter(e => e.category === activeCategory)

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'var(--nav-height)' }}
    >
      {/* Header */}
      <div
        className="py-16 px-4 sm:px-6 lg:px-8 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="text-sm mb-6 inline-flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-muted)', textDecoration: 'none', fontFamily: 'var(--p-font-mono)' }}>
            ← back to port-daddy
          </Link>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="teal" className="mb-4">Use Cases</Badge>
            <h1
              className="text-4xl font-bold mb-4"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--p-font-display)' }}
            >
              What you can build
            </h1>
            <p className="text-xl max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Real patterns, real commands. Copy-paste into your terminal.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: activeCategory === cat ? 'var(--brand-primary)' : 'var(--bg-overlay)',
                color: activeCategory === cat ? '#0a0a0a' : 'var(--text-muted)',
                border: '1px solid transparent',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Example cards */}
        <div className="flex flex-col gap-4">
          {filtered.map((ex, i) => {
            const isOpen = openId === ex.id
            const diff = DIFFICULTY_COLORS[ex.difficulty]
            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border-default)' }}
              >
                {/* Card header */}
                <button
                  className="w-full text-left px-6 py-5 flex items-start gap-4 transition-colors"
                  style={{ background: 'var(--bg-surface)' }}
                  onClick={() => setOpenId(isOpen ? null : ex.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--interactive-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)' }}>
                        {ex.category}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{ background: diff.bg, color: diff.text }}>
                        {ex.difficulty}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {ex.title}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {ex.description}
                    </p>
                  </div>
                  <span
                    className="text-lg flex-shrink-0 mt-0.5 transition-transform"
                    style={{
                      color: 'var(--text-muted)',
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    ▾
                  </span>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="px-6 py-5 grid lg:grid-cols-2 gap-6"
                      style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}
                    >
                      {/* What happens */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                          style={{ color: 'var(--text-muted)' }}>
                          How it works
                        </p>
                        <ul className="flex flex-col gap-2">
                          {ex.what.map((point, j) => (
                            <li key={j} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                              <span style={{ color: 'var(--brand-primary)', flexShrink: 0 }}>→</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Code */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                          style={{ color: 'var(--text-muted)' }}>
                          Commands
                        </p>
                        <div
                          className="rounded-xl p-4 font-mono text-xs leading-relaxed overflow-x-auto"
                          style={{
                            background: 'var(--code-bg)',
                            border: '1px solid var(--border-default)',
                          }}
                        >
                          {ex.code.map((line, j) => (
                            <div key={j}>
                              {line === '' ? (
                                <br />
                              ) : line.startsWith('#') ? (
                                <span style={{ color: 'var(--code-comment)' }}>{line}</span>
                              ) : line.startsWith('pd') || line.startsWith('curl') || line.startsWith('npm') ? (
                                <span>
                                  <span style={{ color: 'var(--code-prompt)' }}>$ </span>
                                  <span style={{ color: 'var(--text-primary)' }}>{line}</span>
                                </span>
                              ) : line.startsWith('  ') || line.startsWith('const') || line.startsWith('if') || line.startsWith('}') || line.startsWith('await') ? (
                                <span style={{ color: 'var(--text-secondary)' }}>{line}</span>
                              ) : line.startsWith('#') ? (
                                <span style={{ color: 'var(--code-comment)' }}>{line}</span>
                              ) : (
                                <span style={{ color: 'var(--code-output)' }}>{line}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-lg mb-4" style={{ color: 'var(--text-secondary)' }}>
            Ready to get started?
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/tutorials" style={{ textDecoration: 'none' }}>
              <button
                className="px-6 py-3 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: 'var(--brand-primary)',
                  color: '#0a0a0a',
                }}
              >
                Step-by-step tutorials
              </button>
            </Link>
            <Link to="/docs" style={{ textDecoration: 'none' }}>
              <button
                className="px-6 py-3 rounded-xl font-medium text-sm transition-all"
                style={{
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                Full API reference
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
