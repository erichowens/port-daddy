import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function TimeTravel() {
  return (
    <TutorialLayout
      title="Time-Travel Debugging"
      description="Scrub through history. Correlate infrastructure events with agent session notes to diagnose complex swarm failures."
      number="15"
      total="16"
      level="Advanced"
      readTime="10 min read"
      prev={{ title: 'Reactive Pipelines', href: '/tutorials/pipelines' }}
      next={{ title: 'Remote Harbors (Preview)', href: '/tutorials/remote-harbors' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          In a multi-agent system, the hardest question is "what happened first?". **Time-Travel Debugging** provides the answer.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Chronological Log</motion.h2>
        <motion.p className="mb-6 font-sans">
          Port Daddy persists every event to an append-only SQLite database. This includes port claims, lock acquisitions, pub/sub messages, and every note an agent has ever written.
        </motion.p>

        <CodeBlock language="bash">
          {`$ pd activity timeline --limit 50`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Correlation</motion.h2>
        <motion.p className="mb-6 font-sans">
          The dashboard's timeline view allows you to see the exact sequence of events. For example, you can see that a database lock was acquired *after* a coding agent started its work — a clear indicator of a race condition.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Immutable Truth</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Because the logs are immutable, they serve as the "ground truth" for your harbor. Use them for post-mortems and to train your agents to avoid past mistakes.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
