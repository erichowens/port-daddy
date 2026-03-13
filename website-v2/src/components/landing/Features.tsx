import * as React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  code?: string
  badge?: string
}

// Lucide-style SVG icons
function PortIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" /></svg> }
function SessionIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> }
function LockIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg> }
function BellIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> }
function SalvageIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg> }
function HarborIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> }
function DnsIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> }
function McpIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /><path d="M7 8h2l2 3 2-5 2 2h2" /></svg> }
function NetworkIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" /></svg> }
function PipelineIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg> }
function HistoryIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg> }

const FEATURES: Feature[] = [
  { icon: <NetworkIcon />, title: 'Live Dashboard', description: 'Real-time UI to visualize active agents, harbors, and locks.', code: 'pd dashboard', badge: 'v3.7.0' },
  { icon: <PipelineIcon />, title: 'Reactive Pipelines', description: 'Event-driven DAGs to auto-spawn agents on pub/sub events.', code: 'pd orchestrator', badge: 'v3.7.0' },
  { icon: <HistoryIcon />, title: 'Time-Travel Debug', description: 'Interleave infra events with agent notes for diagnostics.', code: 'pd activity timeline', badge: 'v3.7.0' },
  { icon: <PortIcon />, title: 'Atomic Ports', description: 'Deterministic hashing for stable, collision-free service ports.', code: 'pd claim myapp:api' },
  { icon: <SessionIcon />, title: 'Sessions & Notes', description: 'Structured coordination with immutable append-only audit trails.', code: 'pd begin' },
  { icon: <LockIcon />, title: 'Distributed Locks', description: 'Named locks with automatic TTL expiry and safety wrappers.', code: 'pd with-lock' },
  { icon: <BellIcon />, title: 'Pub/Sub Messaging', description: 'Real-time SSE subscriptions and persistent message queues.', code: 'pd msg publish' },
  { icon: <SalvageIcon />, title: 'Agent Salvage', description: 'Automatically recover work from dead agents mid-task.', code: 'pd salvage', badge: 'Core' },
  { icon: <HarborIcon />, title: 'Remote Harbors', description: 'Discover and connect to remote Port Daddy instances via Lighthouses.', code: 'pd harbor', badge: 'V4 Preview' },
  { icon: <DnsIcon />, title: 'Service DNS', description: 'Human-readable .local hostnames for all your local services.', code: 'pd dns register' },
  { icon: <McpIcon />, title: 'MCP Server', description: 'Native Model Context Protocol for Claude Code and Cursor.', code: 'pd mcp install' },
]

export function Features() {
  return (
    <motion.section 
      id="features" 
      className="py-20 px-4 sm:px-6 lg:px-8 font-sans"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 font-sans"
        >
          <motion.h2 className="text-4xl sm:text-5xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>
            Everything agents need to <motion.span className="text-[var(--brand-primary)]">Coordinate</motion.span>
          </motion.h2>
          <motion.p className="text-xl max-w-2xl mx-auto leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            Port Daddy is the ultimate "Agentic OS" Control Plane. One daemon, all the primitives.
          </motion.p>
        </motion.div>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 font-sans">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              whileHover={{ y: -5 }}
              className="font-sans"
            >
              <Card className="h-full border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-all group bg-[var(--bg-surface)] rounded-3xl overflow-hidden shadow-sm">
                <CardContent className="p-8 flex flex-col gap-4 h-full font-sans">
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors bg-[var(--bg-overlay)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                  >
                    {feature.icon}
                  </motion.div>

                  <motion.div className="flex items-center gap-2 font-sans">
                    <motion.h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                      {feature.title}
                    </motion.h3>
                    {feature.badge && (
                      <motion.span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[rgba(58,173,173,0.1)] text-[var(--brand-primary)] border border-[rgba(58,173,173,0.2)] font-sans">
                        {feature.badge}
                      </motion.span>
                    )}
                  </motion.div>

                  <motion.p className="text-sm leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                    {feature.description}
                  </motion.p>

                  {feature.code && (
                    <motion.div className="font-mono text-[11px] px-4 py-3 rounded-xl mt-auto bg-[var(--bg-overlay)] border border-[var(--border-subtle)] opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden whitespace-nowrap">
                      <motion.span className="text-[var(--brand-primary)] font-mono">$ </motion.span>
                      <motion.span className="font-mono">{feature.code}</motion.span>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
