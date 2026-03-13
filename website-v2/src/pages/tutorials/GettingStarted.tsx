import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function GettingStarted() {
  return (
    <TutorialLayout
      title="Getting Started"
      description="Install Port Daddy, claim your first port, and run the interactive pd learn tutorial. Zero to coordinating in 5 minutes."
      number="01"
      total="16"
      level="Beginner"
      readTime="5 min read"
      next={{ title: 'Multi-Agent Orchestration', href: '/tutorials/multi-agent' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Welcome to the harbor. Port Daddy is a lightweight daemon that manages ports and coordination for your AI agents.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Installation</motion.h2>
        <CodeBlock language="bash">
          {`# Via Homebrew (macOS)\nbrew tap erichowens/port-daddy\nbrew install port-daddy\n\n# Via npm\nnpm install -g port-daddy`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Start the Daemon</motion.h2>
        <CodeBlock language="bash">
          {`pd start`}
        </CodeBlock>
        <motion.p className="mt-8 font-sans">
          The daemon runs in the background on <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">localhost:9876</motion.code>.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>3. Claim Your First Port</motion.h2>
        <CodeBlock language="bash">
          {`pd claim my-app:api`}
        </CodeBlock>
        <motion.p className="mt-8 font-sans">
          Port Daddy will assign a stable, deterministic port (e.g., 3100) to your identity.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Ready for more?</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Run <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd learn</motion.code> in your terminal for an interactive guided walkthrough.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
