import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Watch() {
  return (
    <TutorialLayout
      title="pd watch"
      description="Subscribe to a pub/sub channel and execute a script on every message. The primitive that makes AI agents always-on."
      number="10"
      total="16"
      level="Intermediate"
      readTime="6 min read"
      prev={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
      next={{ title: 'pd spawn: Launch Agent Fleets', href: '/tutorials/pd-spawn' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd watch</motion.code> turns any script into an ambient agent trigger. It opens a persistent SSE connection to a Port Daddy pub/sub channel and executes a shell command on every message.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Always-On Agents</motion.h2>
        <motion.p className="mb-6 font-sans">
          A watcher is a lightweight persistent process that runs a script every time something happens in your swarm. No polling, no cron jobs.
        </motion.p>

        <CodeBlock language="bash">
          {`$ pd watch build-results --exec './analyze.sh'\nWatching channel: build-results\nConnected. Waiting for messages...`}
        </CodeBlock>
        
        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Environment Variables</motion.h2>
        <motion.p className="mb-6 font-sans">When your script runs, Port Daddy sets these variables automatically:</motion.p>
        <CodeBlock language="bash">
          {`# Inside your script:\nPD_CHANNEL=build-results\nPD_MESSAGE={"status":"failed"}\nPD_TIMESTAMP=2026-03-11T08:23:41.000Z`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Auto-Reconnect</motion.h2>
        <motion.p className="mb-6 font-sans">
          <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd watch</motion.code> handles connection drops with exponential backoff. It will keep trying indefinitely until the connection is restored.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Ambient Intelligence</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Use watchers to build self-healing pipelines. When a test fails, trigger a Debugger agent to fix it and re-run.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
