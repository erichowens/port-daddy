import * as React from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Link } from 'react-router-dom'

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  group: string
}

const METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  GET:    { bg: 'rgba(34, 197, 94, 0.12)',   text: 'var(--p-green-300)' },
  POST:   { bg: 'rgba(58, 173, 173, 0.15)',  text: 'var(--p-teal-300)' },
  PUT:    { bg: 'rgba(251, 191, 36, 0.12)',  text: 'var(--p-amber-300)' },
  DELETE: { bg: 'rgba(239, 68, 68, 0.12)',   text: 'var(--p-red-300)' },
  PATCH:  { bg: 'rgba(167, 139, 250, 0.12)', text: '#c4b5fd' },
}

const ENDPOINTS: Endpoint[] = [
  // Port Management
  { method: 'POST',   path: '/claim/:id',              description: 'Claim a port for a service identity',          group: 'Ports' },
  { method: 'DELETE', path: '/release/:id',             description: 'Release a service port',                       group: 'Ports' },
  { method: 'GET',    path: '/services',                description: 'List all active service claims',               group: 'Ports' },
  { method: 'GET',    path: '/ports/active',            description: 'List raw port assignments',                    group: 'Ports' },
  { method: 'GET',    path: '/ports/system',            description: 'List well-known system ports',                 group: 'Ports' },
  { method: 'POST',   path: '/ports/cleanup',           description: 'Release stale/orphaned ports',                 group: 'Ports' },
  // Sessions & Notes
  { method: 'POST',   path: '/sessions',                description: 'Start a new agent session',                    group: 'Sessions' },
  { method: 'GET',    path: '/sessions',                description: 'List all sessions',                            group: 'Sessions' },
  { method: 'GET',    path: '/sessions/:id',            description: 'Get session details',                          group: 'Sessions' },
  { method: 'PUT',    path: '/sessions/:id',            description: 'Update session (phase, status, purpose)',      group: 'Sessions' },
  { method: 'DELETE', path: '/sessions/:id',            description: 'Delete session (cascades to notes)',           group: 'Sessions' },
  { method: 'POST',   path: '/sessions/:id/notes',      description: 'Add a note to a session',                     group: 'Sessions' },
  { method: 'GET',    path: '/sessions/:id/notes',      description: 'Get all notes for a session',                  group: 'Sessions' },
  { method: 'POST',   path: '/sessions/:id/files',      description: 'Claim files in a session',                    group: 'Sessions' },
  { method: 'DELETE', path: '/sessions/:id/files',      description: 'Release file claims',                         group: 'Sessions' },
  { method: 'GET',    path: '/sessions/:id/files',      description: 'List claimed files',                          group: 'Sessions' },
  { method: 'POST',   path: '/notes',                   description: 'Quick note (auto session)',                   group: 'Sessions' },
  { method: 'GET',    path: '/notes',                   description: 'Get recent notes',                            group: 'Sessions' },
  // Agents
  { method: 'POST',   path: '/agents/:id',              description: 'Register an agent',                           group: 'Agents' },
  { method: 'DELETE', path: '/agents/:id',              description: 'Unregister an agent',                         group: 'Agents' },
  { method: 'PUT',    path: '/agents/:id/heartbeat',    description: 'Send agent heartbeat',                        group: 'Agents' },
  // Salvage
  { method: 'GET',    path: '/salvage',                 description: 'List resurrection queue',                     group: 'Salvage' },
  { method: 'GET',    path: '/salvage/pending',         description: 'Dead agents pending salvage',                 group: 'Salvage' },
  { method: 'POST',   path: '/salvage/claim/:agentId',  description: 'Claim dead agent\'s work',                   group: 'Salvage' },
  { method: 'POST',   path: '/salvage/complete/:agentId', description: 'Mark salvage complete',                    group: 'Salvage' },
  { method: 'DELETE', path: '/salvage/:agentId',        description: 'Dismiss agent from queue',                   group: 'Salvage' },
  // Locks
  { method: 'POST',   path: '/locks/:name',             description: 'Acquire a distributed lock',                  group: 'Locks' },
  { method: 'PUT',    path: '/locks/:name',             description: 'Extend lock TTL',                             group: 'Locks' },
  { method: 'DELETE', path: '/locks/:name',             description: 'Release a lock',                              group: 'Locks' },
  { method: 'GET',    path: '/locks',                   description: 'List all active locks',                       group: 'Locks' },
  // Messaging
  { method: 'POST',   path: '/msg/:channel',            description: 'Publish message to channel',                  group: 'Messaging' },
  { method: 'GET',    path: '/msg/:channel',            description: 'Read messages from channel',                  group: 'Messaging' },
  { method: 'DELETE', path: '/msg/:channel',            description: 'Clear all messages in channel',              group: 'Messaging' },
  { method: 'GET',    path: '/channels',                description: 'List pub/sub channels',                       group: 'Messaging' },
  { method: 'GET',    path: '/subscribe/:channel',      description: 'SSE real-time subscription',                  group: 'Messaging' },
  // DNS
  { method: 'POST',   path: '/dns',                     description: 'Register a DNS name → port mapping',         group: 'DNS' },
  { method: 'GET',    path: '/dns',                     description: 'List all DNS records',                        group: 'DNS' },
  { method: 'GET',    path: '/dns/:name',               description: 'Resolve a DNS name to port',                 group: 'DNS' },
  { method: 'DELETE', path: '/dns/:name',               description: 'Remove a DNS record',                        group: 'DNS' },
  // Tunnels
  { method: 'POST',   path: '/tunnel/:id',              description: 'Start tunnel for service',                   group: 'Tunnels' },
  { method: 'DELETE', path: '/tunnel/:id',              description: 'Stop tunnel for service',                    group: 'Tunnels' },
  { method: 'GET',    path: '/tunnel/:id',              description: 'Get tunnel status',                          group: 'Tunnels' },
  { method: 'GET',    path: '/tunnels',                 description: 'List all active tunnels',                    group: 'Tunnels' },
  { method: 'GET',    path: '/tunnel/providers',        description: 'Check available tunnel providers',           group: 'Tunnels' },
  // Webhooks
  { method: 'POST',   path: '/webhooks',                description: 'Create a webhook subscription',              group: 'Webhooks' },
  { method: 'GET',    path: '/webhooks',                description: 'List all webhooks',                          group: 'Webhooks' },
  { method: 'GET',    path: '/webhooks/events',         description: 'List available webhook events',              group: 'Webhooks' },
  { method: 'GET',    path: '/webhooks/:id',            description: 'Get webhook details',                        group: 'Webhooks' },
  { method: 'PUT',    path: '/webhooks/:id',            description: 'Update webhook',                             group: 'Webhooks' },
  { method: 'DELETE', path: '/webhooks/:id',            description: 'Delete webhook',                             group: 'Webhooks' },
  { method: 'POST',   path: '/webhooks/:id/test',       description: 'Send test delivery',                         group: 'Webhooks' },
  // System
  { method: 'GET',    path: '/health',                  description: 'Daemon health check',                        group: 'System' },
  { method: 'GET',    path: '/version',                 description: 'Version and code hash',                      group: 'System' },
  { method: 'GET',    path: '/metrics',                 description: 'Daemon performance metrics',                 group: 'System' },
  { method: 'GET',    path: '/config',                  description: 'Resolved configuration',                     group: 'System' },
  { method: 'GET',    path: '/activity',                description: 'Activity log',                               group: 'System' },
]

const GROUPS = [...new Set(ENDPOINTS.map(e => e.group))]

export function DocsPage() {
  const [search, setSearch] = React.useState('')
  const [activeGroup, setActiveGroup] = React.useState<string | null>(null)

  const filtered = ENDPOINTS.filter(ep => {
    const q = search.toLowerCase()
    const matchesSearch = !q || ep.path.includes(q) || ep.description.toLowerCase().includes(q) || ep.method.toLowerCase().includes(q)
    const matchesGroup = !activeGroup || ep.group === activeGroup
    return matchesSearch && matchesGroup
  })

  const grouped = GROUPS.reduce<Record<string, Endpoint[]>>((acc, g) => {
    const items = filtered.filter(ep => ep.group === g)
    if (items.length) acc[g] = items
    return acc
  }, {})

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'var(--nav-height)' }}>
      {/* Header */}
      <div
        className="py-16 px-4 sm:px-6 lg:px-8 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="text-sm font-mono mb-6 inline-flex items-center gap-2 transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            ← back to port-daddy
          </Link>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="teal" className="mb-4">API Reference</Badge>
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              HTTP API
            </h1>
            <p className="text-xl max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
              Port Daddy runs on <code>localhost:9876</code> by default.
              All endpoints return JSON. All state is SQLite-backed.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search endpoints…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveGroup(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: !activeGroup ? 'var(--brand-primary)' : 'var(--bg-overlay)',
                color: !activeGroup ? 'var(--p-navy-950)' : 'var(--text-muted)',
                border: '1px solid transparent',
              }}
            >
              All
            </button>
            {GROUPS.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: activeGroup === g ? 'var(--bg-overlay)' : 'transparent',
                  color: activeGroup === g ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: activeGroup === g ? 'var(--border-default)' : 'transparent',
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint groups */}
        {Object.entries(grouped).map(([group, endpoints], gi) => (
          <motion.div
            key={group}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: gi * 0.04 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{group}</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                {endpoints.length}
              </span>
            </div>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border-default)' }}
            >
              {endpoints.map((ep, i) => {
                const colors = METHOD_COLORS[ep.method]
                return (
                  <div
                    key={ep.path + ep.method}
                    className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-[var(--interactive-hover)]"
                    style={{
                      borderBottom: i < endpoints.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold px-2 py-1 rounded flex-shrink-0 w-16 text-center"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {ep.method}
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                      <code
                        className="text-sm font-mono flex-shrink-0"
                        style={{ color: 'var(--text-code)' }}
                      >
                        {ep.path}
                      </code>
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {ep.description}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            <p className="text-lg">No endpoints match "{search}"</p>
          </div>
        )}

        {/* Base URL note */}
        <div
          className="mt-8 p-4 rounded-xl font-mono text-sm"
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span style={{ color: 'var(--code-comment)' }}># Base URL</span>
          <br />
          <span style={{ color: 'var(--text-secondary)' }}>http://localhost:9876</span>
          <span style={{ color: 'var(--code-comment)' }}> — override with </span>
          <span style={{ color: 'var(--text-code)' }}>PORT_DADDY_PORT</span>
          <span style={{ color: 'var(--code-comment)' }}> env var</span>
        </div>
      </div>
    </div>
  )
}
