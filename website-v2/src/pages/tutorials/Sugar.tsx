import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Badge } from '@/components/ui/Badge'
import { Zap, Terminal, Shield, Globe, Share2, Sparkles, Box, Lock, Activity } from 'lucide-react'

export function Sugar() {
  return (
    <TutorialLayout
      title="Sugar Commands"
      description="Coordination shouldn't be a chore. Learn to use Port Daddy's high-level wrappers to claim ports, acquire locks, and manage sessions with zero friction."
      number="12"
      total="16"
      level="Beginner"
      readTime="5 min read"
      prev={{ title: 'The Agent Inbox', href: '/tutorials/inbox' }}
      next={{ title: 'Swarm Bootstrapping', href: '/tutorials/spawn' }}
    >
      <motion.div className="space-y-16">
        {/* Intro Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-amber-400)]">
              <Sparkles className="text-[var(--p-amber-400)]" size={24} />
            </div>
            <h2 className="m-0">Invisible Infrastructure</h2>
          </div>
          <p>
            While Port Daddy provides a robust REST API for deep integrations, most humans and CLI-native agents prefer our **Sugar Commands**. These are high-level wrappers that combine multiple primitives into a single, intuitive action.
          </p>
          <div className="grid sm:grid-cols-2 gap-8 pt-4">
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-teal-500)]/10 flex items-center justify-center">
                   <Zap size={20} className="text-[var(--p-teal-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Zero Config</h3>
                <p className="text-sm opacity-60 m-0">Sugar commands auto-detect your project root and existing sessions so you don't have to pass IDs.</p>
             </div>
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-blue-500)]/10 flex items-center justify-center">
                   <Shield size={20} className="text-[var(--p-blue-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Safe Defaults</h3>
                <p className="text-sm opacity-60 m-0">Built-in timeouts and retry logic ensure that your agent scripts are resilient to network blips.</p>
             </div>
          </div>
        </section>

        {/* Step 1: Managed Sessions */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--brand-primary)]">
              <Activity className="text-[var(--brand-primary)]" size={24} />
            </div>
            <h2 className="m-0">1. pd begin & pd done</h2>
          </div>
          
          <p>
            Instead of manually creating a session and registering an agent, use <code>pd begin</code>. It writes the session state to a local file, allowing all subsequent commands to "just work."
          </p>

          <CodeBlock language="bash">
            {`$ pd begin --identity swarm:analyst\\
    --purpose "Analyze log files"\\
    --files "logs/*.log"`}
          </CodeBlock>

          <blockquote className="bg-[var(--bg-overlay)] p-8 rounded-3xl border-l-4 border-[var(--brand-primary)]">
             <p className="m-0 text-sm italic opacity-60 font-medium">
               When the agent finishes, <code>pd done</code> releases all file claims and port assignments cleanly, closing the session timeline.
             </p>
          </blockquote>
        </section>

        {/* Step 2: Atomic Locks */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-amber-400)]">
              <Lock className="text-[var(--p-amber-400)]" size={24} />
            </div>
            <h2 className="m-0">2. pd with-lock</h2>
          </div>

          <p>
            Safely run any terminal command under a distributed lock. If the command fails, the daemon still ensures the lock is released after its TTL.
          </p>

          <CodeBlock language="bash">
            {`$ pd with-lock db-migration -- npm run migrate\n\n✓ Lock acquired: db-migration\n✓ Running: npm run migrate...\n✓ Command complete. Lock released.`}
          </CodeBlock>

          <div className="bg-[var(--bg-surface)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-6 relative overflow-hidden shadow-2xl">
             <div className="absolute inset-0 bg-gradient-to-r from-[var(--p-amber-500)]/5 to-transparent" />
             <p className="text-sm font-black uppercase tracking-widest opacity-40 m-0 relative z-10">Productivity HUD</p>
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)]">
                   <div className="flex items-center gap-4">
                      <Terminal size={14} className="opacity-20" />
                      <code className="text-xs">pd whoami</code>
                   </div>
                   <span className="text-[10px] font-mono opacity-40">Identify current agent</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)]">
                   <div className="flex items-center gap-4">
                      <Terminal size={14} className="opacity-20" />
                      <code className="text-xs">pd salvage</code>
                   </div>
                   <span className="text-[10px] font-mono opacity-40">Recover orphaned work</span>
                </div>
             </div>
          </div>
        </section>

        {/* Vision Callout */}
        <motion.div 
          className="p-16 rounded-[60px] border border-dashed border-[var(--brand-primary)] bg-[var(--bg-overlay)] flex flex-col items-center text-center gap-8 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Box size={400} />
           </div>
           <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest">Efficiency Maturity</Badge>
           <h3 className="text-4xl font-display font-black m-0" style={{ color: 'var(--text-primary)' }}>Sweet Simplicity.</h3>
           <p className="text-xl max-w-xl opacity-70">
             Multi-agent coordination is complex, but the interface shouldn't be. Port Daddy's sugar commands turn deep infrastructure primitives into a "standard library" for your agent swarm prompts.
           </p>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">
              <Zap size={14} className="animate-pulse" />
              Anchor Protocol v4 Active
           </div>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
