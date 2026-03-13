import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Pipelines() {
  return (
    <TutorialLayout
      title="Reactive Pipelines"
      description="Turn Port Daddy into an event-driven DAG. Auto-spawn agents or trigger scripts when pub/sub events fire."
      number="14"
      total="16"
      level="Advanced"
      readTime="12 min read"
      prev={{ title: 'Live Dashboard', href: '/tutorials/dashboard' }}
      next={{ title: 'Time-Travel Debugging', href: '/tutorials/time-travel' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          **Pipelines** are the automation layer of Port Daddy. They allow you to define rules that react to swarm events.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Define a Rule</motion.h2>
        <CodeBlock language="bash">
          {`$ pd orchestrator add "Auto-Fix" --channel "test:fail" --action "pd spawn --backend aider -- Fix the broken tests"`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Execution</motion.h2>
        <motion.p className="mb-6 font-sans">
          When a message is published to the <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">test:fail</motion.code> channel, Port Daddy will automatically launch the specified action.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Dynamic DAGs</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Unlike static CI/CD pipelines, Port Daddy pipelines are dynamic and reactive. They live inside your swarm and grow with your agents.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
