import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function AlwaysOn() {
  return (
    <TutorialLayout
      title="The Always-On Agent Pattern"
      description="Build agents that never sleep. Subscribe to triggers and dispatch specialized swarms when conditions are met."
      number="10"
      total="16"
      level="Advanced"
      readTime="15 min read"
      prev={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
      next={{ title: 'pd spawn: Launch Agent Fleets', href: '/tutorials/pd-spawn' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Most agents are "one-shot" — you ask, they act, they die. **Always-On Agents** live in the background, watching for events.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Event-Driven Intelligence</motion.h2>
        <motion.p className="mb-6 font-sans">
          Combining <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd watch</motion.code> with a specialized script allows you to build agents that react to filesystem changes, Slack messages, or CI failures.
        </motion.p>

        <CodeBlock language="bash">
          {`# A background watcher that triggers a linter on every save\npd watch fs:change --exec './agents/auto-lint.sh' &`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>The V4 Vision</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Always-on agents are the sensors of your "Agentic OS". They observe the harbor and signal the swarm when something needs attention.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
