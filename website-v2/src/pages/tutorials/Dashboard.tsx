import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Dashboard() {
  return (
    <TutorialLayout
      title="Live Dashboard"
      description="Visualize your swarm. Real-time network graphs, lock contention, and system health metrics."
      number="13"
      total="16"
      level="Beginner"
      readTime="5 min read"
      prev={{ title: 'Harbor Tokens', href: '/tutorials/harbors' }}
      next={{ title: 'Reactive Pipelines', href: '/tutorials/pipelines' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          The Port Daddy HUD (Heads-Up Display) is a high-fidelity control plane for your local machine.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Launching the HUD</motion.h2>
        <CodeBlock language="bash">
          {`pd dashboard`}
        </CodeBlock>
        <motion.p className="mt-8 font-sans">
          This opens your browser to <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">http://localhost:3144/dashboard</motion.code>.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Key Features</motion.h2>
        <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
          <motion.li className="flex gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
            <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Network Map</motion.strong> -- A 2D visualization of active services and agents.</motion.span>
          </motion.li>
          <motion.li className="flex gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
            <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Swarm Radio</motion.strong> -- A real-time timeline of all traffic and notes.</motion.span>
          </motion.li>
          <motion.li className="flex gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
            <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Lock HUD</motion.strong> -- See exactly which agent is holding a lock.</motion.span>
          </motion.li>
        </motion.ul>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Observer Effect</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            The dashboard doesn't just show state — it facilitates coordination. You can manually trigger pipeline rules or clear stale ports directly from the UI.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
