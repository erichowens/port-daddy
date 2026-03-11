import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Link } from 'react-router-dom'

interface Tutorial {
  slug: string
  number: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  time: string
  tags: string[]
  href: string  // links to existing HTML for now
}

const TUTORIALS: Tutorial[] = [
  {
    slug: 'getting-started',
    number: '01',
    title: 'Getting Started',
    description: 'Install Port Daddy, claim your first port, and run the interactive pd learn tutorial. Zero to coordinating in 5 minutes.',
    level: 'beginner',
    time: '5 min',
    tags: ['install', 'claim', 'basics'],
    href: '/tutorials/getting-started',
  },
  {
    slug: 'multi-agent',
    number: '02',
    title: 'Multi-Agent Orchestration',
    description: 'Coordinate two agents on the same project. File claims, conflict detection, pub/sub signals, and session notes.',
    level: 'intermediate',
    time: '12 min',
    tags: ['sessions', 'pub/sub', 'file claims'],
    href: '/tutorials/multi-agent',
  },
  {
    slug: 'monorepo',
    number: '03',
    title: 'Monorepo Mastery',
    description: 'Scan a monorepo, detect all services, assign ports in bulk, and orchestrate them with pd up / pd down.',
    level: 'intermediate',
    time: '10 min',
    tags: ['scan', 'orchestration', 'monorepo'],
    href: '/tutorials/monorepo',
  },
  {
    slug: 'debugging',
    number: '04',
    title: 'Debugging with Port Daddy',
    description: 'Use the activity log, session notes timeline, and pd diagnostics to track down what went wrong.',
    level: 'intermediate',
    time: '8 min',
    tags: ['debugging', 'activity', 'diagnostics'],
    href: '/tutorials/debugging',
  },
  {
    slug: 'tunnel',
    number: '05',
    title: 'Tunnel Magic',
    description: 'Expose local services to the internet instantly with pd tunnel. Works with ngrok, cloudflared, and bore.',
    level: 'beginner',
    time: '6 min',
    tags: ['tunnel', 'ngrok', 'expose'],
    href: '/tutorials/tunnel',
  },
  {
    slug: 'dns',
    number: '06',
    title: 'DNS Resolver',
    description: 'Register human-readable names for services. Stop hardcoding ports — resolve myapp-api everywhere.',
    level: 'intermediate',
    time: '8 min',
    tags: ['dns', 'naming', 'discovery'],
    href: '/tutorials/dns',
  },
  {
    slug: 'session-phases',
    number: '07',
    title: 'Session Phases',
    description: 'Drive agents through planning → coding → reviewing → done with integration signals and phase-aware salvage.',
    level: 'advanced',
    time: '15 min',
    tags: ['sessions', 'phases', 'integration'],
    href: '/tutorials/session-phases',
  },
  {
    slug: 'inbox',
    number: '08',
    title: 'Inbox & Messaging',
    description: 'Direct agent-to-agent messaging with inboxes, pub/sub channels, and SSE real-time subscriptions.',
    level: 'advanced',
    time: '10 min',
    tags: ['messaging', 'pub/sub', 'SSE'],
    href: '/tutorials/inbox',
  },
  {
    slug: 'sugar',
    number: '09',
    title: 'Sugar Commands',
    description: 'pd begin, pd done, pd whoami, pd with-lock — the high-level API that wraps all Port Daddy primitives.',
    level: 'beginner',
    time: '5 min',
    tags: ['sugar', 'begin', 'done', 'whoami'],
    href: '/tutorials/sugar',
  },
  {
    slug: 'pd-watch',
    number: '10',
    title: 'pd watch: Always-On Agents',
    description: 'Subscribe to any channel and fire a script on every message. Build event-driven pipelines: CI signals, inter-agent triggers, and automated responses without polling.',
    level: 'intermediate',
    time: '10 min',
    tags: ['watch', 'events', 'automation', 'always-on'],
    href: '/tutorials/pd-watch',
  },
  {
    slug: 'pd-spawn',
    number: '11',
    title: 'pd spawn: Launch Agent Fleets',
    description: 'Spawn Ollama, Claude, Gemini, or Aider agents with Port Daddy coordination auto-wired. Sessions, heartbeats, notes, and salvage — all automatic.',
    level: 'advanced',
    time: '15 min',
    tags: ['spawn', 'ollama', 'fleet', 'orchestration'],
    href: '/tutorials/pd-spawn',
  },
  {
    slug: 'harbors',
    number: '12',
    title: 'Harbor Tokens',
    description: 'Create permission namespaces for agent teams. Scope tunnels, file claims, and pub/sub to a harbor. HMAC-signed tokens with TTLs and a full audit trail.',
    level: 'advanced',
    time: '12 min',
    tags: ['harbors', 'tokens', 'permissions', 'security'],
    href: '/tutorials/harbors',
  },
]

const LEVEL_VARIANT: Record<Tutorial['level'], 'teal' | 'amber' | 'neutral'> = {
  beginner: 'teal',
  intermediate: 'amber',
  advanced: 'neutral',
}

const LEVEL_LABEL = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function TutorialsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'var(--nav-height)' }}>
      {/* Header */}
      <div
        className="py-16 px-4 sm:px-6 lg:px-8 border-b"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <Link
            to="/"
            className="text-sm font-mono mb-6 inline-flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            ← back to port-daddy
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="teal" className="mb-4">12 Tutorials</Badge>
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Learn Port Daddy
            </h1>
            <p className="text-xl max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              From zero to multi-agent coordination. Each tutorial is a standalone,
              self-contained walkthrough with real commands you can run.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick start callout */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-8 p-4 rounded-xl flex items-center gap-4"
          style={{
            background: 'var(--bg-glass-teal)',
            border: '1px solid var(--border-focus)',
          }}
        >
          <div style={{ color: 'var(--brand-primary)', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              New to Port Daddy? Start with the interactive tutorial
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Run <code className="text-xs">pd learn</code> in your terminal for a guided 5-minute walkthrough.
            </p>
          </div>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TUTORIALS.map((tutorial, i) => (
            <motion.div
              key={tutorial.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <a href={`/tutorials/${tutorial.slug}.html`} className="block h-full no-underline group">
                <Card
                  variant="default"
                  className="h-full flex flex-col cursor-pointer transition-all hover:border-[var(--border-strong)] hover:-translate-y-0.5"
                >
                  <CardContent className="flex flex-col gap-3 h-full p-5">
                    {/* Number + badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className="font-mono font-bold text-2xl"
                        style={{ color: 'var(--border-strong)' }}
                      >
                        {tutorial.number}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {tutorial.time}
                        </span>
                        <Badge variant={LEVEL_VARIANT[tutorial.level]}>
                          {LEVEL_LABEL[tutorial.level]}
                        </Badge>
                      </div>
                    </div>

                    <h3
                      className="text-base font-bold group-hover:text-[var(--brand-primary)] transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tutorial.title}
                    </h3>

                    <p className="text-sm flex-1" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {tutorial.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {tutorial.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs font-mono px-2 py-0.5 rounded"
                          style={{
                            background: 'var(--bg-overlay)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
