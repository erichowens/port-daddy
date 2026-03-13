import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Badge } from '@/components/ui/Badge'
import { History, Clock, Activity, Terminal, Shield, Zap, Search, Database } from 'lucide-react'

export function TimeTravel() {
  return (
    <TutorialLayout
      title="Time-Travel Debugging"
      description="Scrub through the history of your swarm. Correlate infrastructure events with agent session notes to diagnose complex race conditions and state drifts."
      number="06"
      total="16"
      level="Intermediate"
      readTime="8 min read"
      prev={{ title: 'P2P Tunnels', href: '/tutorials/tunnel' }}
      next={{ title: 'Reactive Pipelines', href: '/tutorials/pipelines' }}
    >
      <motion.div className="space-y-16">
        {/* Concept Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-blue-400)]">
              <History className="text-[var(--p-blue-400)]" size={24} />
            </div>
            <h2 className="m-0">The Chronological Truth</h2>
          </div>
          <p>
            In a multi-agent system, the hardest question is always: **"What happened first?"** Port Daddy solves this by persisting every inter-agent event into an append-only, immutable SQLite database.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 pt-4">
             <div className="p-6 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-3">
                <Badge variant="teal" className="text-[8px] font-black uppercase tracking-widest">Infra</Badge>
                <p className="text-xs font-bold m-0">Port Claims</p>
             </div>
             <div className="p-6 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-3">
                <Badge variant="amber" className="text-[8px] font-black uppercase tracking-widest">Signals</Badge>
                <p className="text-xs font-bold m-0">Pub/Sub Msgs</p>
             </div>
             <div className="p-6 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-center space-y-3">
                <Badge variant="neutral" className="text-[8px] font-black uppercase tracking-widest">Cognition</Badge>
                <p className="text-xs font-bold m-0">Agent Notes</p>
             </div>
          </div>
        </section>

        {/* Step 1: Querying */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--brand-primary)]">
              <Search className="text-[var(--brand-primary)]" size={24} />
            </div>
            <h2 className="m-0">1. Scrub the Timeline</h2>
          </div>
          
          <p>
            Use the <code>activity timeline</code> command to view a unified stream of everything that happened in your harbor.
          </p>

          <CodeBlock language="bash">
            {`$ pd activity timeline --limit 50`}
          </CodeBlock>

          <div className="bg-[var(--bg-overlay)] p-10 rounded-[48px] border border-[var(--border-subtle)] font-mono text-xs space-y-2 overflow-hidden shadow-2xl">
             <div className="flex items-center gap-4 opacity-40">
                <span className="w-20">12:04:01</span>
                <span className="text-[var(--p-teal-400)]">[infra]</span>
                <span>Agent 'planner' claimed port 3102</span>
             </div>
             <div className="flex items-center gap-4">
                <span className="w-20">12:04:05</span>
                <span className="text-[var(--p-amber-400)]">[radio]</span>
                <span className="font-bold text-[var(--text-primary)]">swarm:task:new -> {"{id: 42}"}</span>
             </div>
             <div className="flex items-center gap-4 opacity-40">
                <span className="w-20">12:04:12</span>
                <span className="text-[var(--p-blue-400)]">[note]</span>
                <span>'planner': Started decomposition</span>
             </div>
          </div>
        </section>

        {/* Step 2: Correlation */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-purple-400)]">
              <Activity className="text-[var(--p-purple-400)]" size={24} />
            </div>
            <h2 className="m-0">2. Diagnose Race Conditions</h2>
          </div>

          <p>
            By interleaving infrastructure logs with agent notes, you can see if an agent attempted to write to a file *before* claiming it, or if two agents were fighting for the same lock.
          </p>

          <blockquote className="bg-[var(--bg-surface)] p-10 rounded-[32px] border-l-8 border-[var(--p-red-500)]">
             <p className="font-bold text-[var(--text-primary)] m-0 mb-4 text-2xl font-display">Post-Mortem Integrity:</p>
             <p className="m-0 text-lg">
               Since the database is immutable, agents can't "delete their mistakes" to hide errors. This ensures a 100% audit trail for your autonomous organization.
             </p>
          </blockquote>
        </section>

        {/* Formal Verification Note */}
        <motion.div 
          className="p-16 rounded-[60px] border border-dashed border-[var(--p-blue-400)] bg-[var(--bg-overlay)] flex flex-col items-center text-center gap-8 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Database size={400} />
           </div>
           <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest">Ground Truth</Badge>
           <h3 className="text-4xl font-display font-black m-0" style={{ color: 'var(--text-primary)' }}>Immutable State.</h3>
           <p className="text-xl max-w-xl opacity-70">
             The timeline isn't just a log—it's a <strong>ledger</strong>. It provides the historical evidence needed to train agents on "coordination failures," allowing your swarms to learn from their own race conditions over time.
           </p>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--p-blue-400)]">
              <Zap size={14} className="animate-pulse" />
              SQLite WAL-Mode Active
           </div>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
