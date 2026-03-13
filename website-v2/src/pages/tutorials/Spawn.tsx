import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Spawn() {
  return (
    <TutorialLayout
      title="pd spawn: Launch Agent Fleets"
      description="Spawn Ollama, Claude, Gemini, or Aider agents with Port Daddy coordination auto-wired. Sessions, heartbeats, notes, and salvage — all automatic."
      number="11"
      total="16"
      level="Advanced"
      readTime="15 min read"
      prev={{ title: 'pd watch', href: '/tutorials/watch' }}
      next={{ title: 'Harbor Tokens', href: '/tutorials/harbors' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd spawn</motion.code> is the "orchestrator's command". It launches a sub-agent process and wraps it in a managed Port Daddy session.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Automatic Instrumentation</motion.h2>
        <motion.p className="mb-6 font-sans">
          When you spawn an agent through Port Daddy, the daemon automatically handles:
        </motion.p>
        <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Identity Registration</motion.strong> -- Registers the agent ID and purpose automatically.</motion.span></motion.li>
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Heartbeat Monitoring</motion.strong> -- Watches the sub-process; if it hangs or crashes, it's moved to the salvage queue.</motion.span></motion.li>
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Log Capture</motion.strong> -- Intercepts stdout/stderr and records them as session notes.</motion.span></motion.li>
        </motion.ul>

        <CodeBlock language="bash">
          {`$ pd spawn --backend claude -- "Fix the CSS centering in Header.tsx"`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>The Fleet Commander</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            With <motion.code className="font-mono">pd spawn</motion.code>, you can turn a single prompt into a coordinated effort of 10+ agents, all reporting back to the same HUD.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
