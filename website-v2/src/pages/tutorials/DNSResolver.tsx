import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function DNSResolver() {
  return (
    <TutorialLayout
      title="DNS Resolution"
      description="Access your dev services by hostname instead of port numbers. Map myapp-api.local to your running service with a single command."
      number="06"
      total="16"
      level="Intermediate"
      readTime="8 min read"
      prev={{ title: 'Tunnel Magic', href: '/tutorials/tunnel' }}
      next={{ title: 'Session Phases', href: '/tutorials/session-phases' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Stop memorizing port numbers. Port Daddy includes a local DNS resolver that maps friendly names to your claimed ports.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Register a Name</motion.h2>
        <CodeBlock language="bash">
          {`$ pd dns register myapp-api 3001\n✓ Registered: http://myapp-api.pd.local -> localhost:3001`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Use Everywhere</motion.h2>
        <motion.p className="mb-6 font-sans">
          You can now use <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">myapp-api.pd.local</motion.code> in your browser, your code, or your agent prompts.
        </motion.p>
        <CodeBlock language="bash">
          {`curl http://myapp-api.pd.local/health`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Magic Names</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Port Daddy handles the <motion.code className="font-mono">/etc/hosts</motion.code> updates and backup management for you. 
            It's like having a professional IT team for your laptop.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
