import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function RemoteHarbors() {
  return (
    <TutorialLayout
      title="Remote Harbors (Preview)"
      description="Multiplayer localhost. Discover and connect to remote Port Daddy instances securely over the internet."
      number="16"
      total="16"
      level="Advanced"
      readTime="8 min read"
      prev={{ title: 'Time-Travel Debugging', href: '/tutorials/time-travel' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          **Remote Harbors** represent the next frontier: connecting your local swarm to agents running on other machines.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Lighthouses</motion.h2>
        <motion.p className="mb-6 font-sans">
          A Lighthouse is a public discovery node that allows two Port Daddy instances to establish a peer-to-peer connection without complex firewall configuration.
        </motion.p>

        <CodeBlock language="bash">
          {`$ pd harbor discover --lighthouse global.portdaddy.dev`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>P2P Mesh</motion.h2>
        <motion.p className="mb-6 font-sans">
          In V4, all communication between remote harbors is encrypted end-to-end using the **Noise Protocol**.
        </motion.p>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>The Future</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Imagine a world where your local agent can "hail" an agent running on a specialized GPU cluster as easily as it hails a local script. That is the V4 vision.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
