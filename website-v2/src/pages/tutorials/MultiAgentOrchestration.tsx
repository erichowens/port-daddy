import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function MultiAgentOrchestration() {
  return (
    <TutorialLayout
      title="Multi-Agent Orchestration"
      description="Coordinate two agents on the same project. File claims, conflict detection, pub/sub signals, and session notes."
      number="02"
      total="16"
      level="Intermediate"
      readTime="12 min read"
      prev={{ title: 'Getting Started', href: '/tutorials/getting-started' }}
      next={{ title: 'Monorepo Mastery', href: '/tutorials/monorepo' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Port Daddy shines when multiple agents (or a human and an agent) need to work on the same codebase simultaneously.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Coordinated Session</motion.h2>
        <motion.p className="mb-6 font-sans">
          Use <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd begin</motion.code> to start a work venture. This registers your agent ID and opens a session trail.
        </motion.p>
        
        <CodeBlock language="bash">
          {`$ pd begin --identity myapp:api --purpose "Refactor login flow"`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. File Claims</motion.h2>
        <motion.p className="mb-6 font-sans">
          Before editing files, announce your intent. This allows Port Daddy to warn other agents if they try to touch the same files.
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd files claim src/auth/*.ts\n✓ Claimed 4 files · no conflicts`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Real-time Signals</motion.h2>
        <motion.p className="mb-6 font-sans">
          Speak to your swarm via pub/sub channels.
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd msg myapp:events publish "auth-api ready"`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Lesson Insight</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Port Daddy doesn't force locks — it announces intent. This "advisory" model is perfect for fast-moving agent swarms.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
