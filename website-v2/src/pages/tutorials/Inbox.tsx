import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Inbox() {
  return (
    <TutorialLayout
      title="Inbox & Messaging"
      description="Direct agent-to-agent messaging with inboxes, pub/sub channels, and SSE real-time subscriptions."
      number="08"
      total="16"
      level="Advanced"
      readTime="10 min read"
      prev={{ title: 'Session Phases', href: '/tutorials/session-phases' }}
      next={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Port Daddy is the "radio" for your swarm. Every agent gets an inbox where they can receive direct messages.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Sending a Message</motion.h2>
        <CodeBlock language="bash">
          {`$ pd msg send agent-abc123 "Analysis complete. Ready for code generation."`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Real-time Monitoring</motion.h2>
        <motion.p className="mb-6 font-sans">
          You can watch an inbox live using Server-Sent Events (SSE).
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd msg watch agent-abc123\n[12:04:38] PILOT: Course corrected. Heading 270.`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Swarm Radio</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            The dashboard's **Unified Timeline** is powered by these inbox streams. It's the high-fidelity heartbeat of your swarm.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
