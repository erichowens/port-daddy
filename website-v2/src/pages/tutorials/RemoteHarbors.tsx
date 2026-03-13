}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

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
      <motion.p className="font-sans">Port Daddy V4 is expanding beyond the single machine. <motion.strong className="font-sans">Remote Harbors</motion.strong> allow agents on your laptop to securely coordinate with agents on a teammate's laptop, or a powerful cloud GPU instance.</motion.p>

      <motion.div className="bg-[var(--badge-amber-bg)] border-l-4 border-[var(--badge-amber-border)] p-4 rounded-r-md my-6 text-sm text-[var(--text-secondary)]">
        <motion.strong className="text-[var(--text-primary)] font-bold text-lg block mb-1">Preview Feature</motion.strong>
        This functionality is currently in development as part of the V4 roadmap. The commands below demonstrate the architectural vision.
      </motion.div>

      <motion.h2 className="font-display">The "Lighthouse" Concept</motion.h2>
      <motion.p className="font-sans">To connect two Port Daddy daemons across the internet, they need a signaling server. We call this a <motion.strong className="font-sans">Lighthouse</motion.strong>.</motion.p>
      
      <motion.p className="font-sans">When you create a harbor with the <motion.code className="font-mono">--public</motion.code> flag, your daemon registers its cryptographic signature, capabilities, and active tunnel URLs with the Lighthouse.</motion.p>
      
      <CodeBlock
        code={`# Alice's machine (Frontend Developer)
$ pd harbor create project-x --public
[Lighthouse] Registered project-x.
[Lighthouse] Waiting for peers...`}
      />

      <motion.h2 className="font-display">Discover and Join</motion.h2>
      <motion.p className="font-sans">Your teammate (or a cloud agent) can then query the Lighthouse to find your harbor, establish a secure peer-to-peer connection, and join the swarm.</motion.p>
      
      <CodeBlock
        code={`# Bob's machine (Backend Developer)
$ pd harbor discover project-x
Found harbor: project-x (hosted by alice-macbook)

$ pd harbor join project-x
Joined project-x. Handshake complete.
Shared pub/sub channels and distributed locks are now active.`}
      />

      <motion.h2 className="font-display">Multiplayer Localhost</motion.h2>
      <motion.p className="font-sans">Once connected, the daemons sync their state. If Alice's frontend agent publishes a message to <motion.code className="font-mono">build:complete</motion.code>, Bob's backend agent receives it instantly.</motion.p>
      
      <motion.p className="font-sans">More importantly, <motion.strong className="font-sans">Remote DNS</motion.strong> allows Bob to run <motion.code className="font-mono">curl http://frontend.project-x.local</motion.code> on his machine, and Port Daddy will automatically route that request through a secure tunnel directly to Alice's local dev server.</motion.p>

      <motion.p className="font-sans">This is the foundation of the true distributed Agentic OS.</motion.p>
    </TutorialLayout>
  )
