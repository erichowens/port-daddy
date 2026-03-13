import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function SessionPhases() {
  return (
    <TutorialLayout
      title="Session Phases"
      description="Drive agents through planning → coding → reviewing → done with integration signals and phase-aware salvage."
      number="07"
      total="16"
      level="Advanced"
      readTime="15 min read"
      prev={{ title: 'DNS Resolver', href: '/tutorials/dns' }}
      next={{ title: 'Inbox & Messaging', href: '/tutorials/inbox' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Complex tasks require multiple steps. Port Daddy's **Session Phases** allow you to track an agent's progress through a lifecycle.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Defining Phases</motion.h2>
        <motion.p className="mb-6 font-sans">
          You can transition a session through predefined or custom phases. This state is visible to every agent in the harbor.
        </motion.p>

        <CodeBlock language="bash">
          {`$ pd session phase planning\n$ pd session phase coding\n$ pd session phase reviewing`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Phase-Aware Salvage</motion.h2>
        <motion.p className="mb-6 font-sans">
          If an agent dies during the `coding` phase, the next agent knows it needs to check for half-written files and failing tests before resuming.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>The Handoff</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Phases are the "checkpoints" of your swarm. They ensure that work flows smoothly from one specialist agent to the next without losing context.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
