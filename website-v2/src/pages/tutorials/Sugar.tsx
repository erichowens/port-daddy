import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Sugar() {
  return (
    <TutorialLayout
      title="Sugar Commands"
      description="pd begin, pd done, pd whoami, pd with-lock — the high-level API that wraps all Port Daddy primitives."
      number="09"
      total="16"
      level="Beginner"
      readTime="5 min read"
      prev={{ title: 'Inbox & Messaging', href: '/tutorials/inbox' }}
      next={{ title: 'The Always-On Agent Pattern', href: '/tutorials/always-on' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Under the hood, Port Daddy uses a robust REST API. But for humans and CLI-native agents, we provide "Sugar Commands" — easy-to-use wrappers.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>pd begin & pd done</motion.h2>
        <motion.p className="mb-6 font-sans">
          Instead of manually creating sessions and registering agents, use <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd begin</motion.code>. It writes state to a local file so subsequent commands "just work".
        </motion.p>
        
        <CodeBlock language="bash">
          {`$ pd begin --identity myapp:coder\n# ... work ...\n$ pd done`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>pd with-lock</motion.h2>
        <motion.p className="mb-6 font-sans">
          Safely run a command under a distributed lock. If the command fails, the lock is still released.
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd with-lock migration -- npm run migrate`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Sweet Primitives</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Sugar commands make Port Daddy invisible. They integrate into your existing shell scripts and agent prompts without adding friction.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
