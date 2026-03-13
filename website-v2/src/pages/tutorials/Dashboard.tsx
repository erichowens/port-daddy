}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

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
      <motion.p className="font-sans">Agents work in the dark. Port Daddy brings them into the light. The Live Dashboard is a high-fidelity visualizer for everything happening inside your local daemon.</motion.p>

      <motion.h2 className="font-display">What the Dashboard Shows</motion.h2>
      <motion.p className="font-sans">When you navigate to the <motion.code className="font-mono">/dashboard</motion.code> route, you're tapping into a live Server-Sent Events (SSE) stream directly from the daemon. It provides:</motion.p>
      
      <motion.ul>
        <motion.li className="font-sans"><motion.strong className="font-sans">Network Graph:</motion.strong> A pulsing, animated map of your active services and the agents currently interacting with them. Healthy services glow green; struggling ones glow red.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Lock Contention:</motion.strong> A real-time view of which agents hold which distributed locks, and for how long.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">System Health:</motion.strong> Live metrics on API latency, memory usage, and background daemon errors.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Live Pulse:</motion.strong> A raw feed of every <motion.code className="font-mono">service.claim</motion.code>, <motion.code className="font-mono">lock.acquire</motion.code>, and <motion.code className="font-mono">message.publish</motion.code> happening across your machine.</motion.li>
      </motion.ul>

      <motion.h2 className="font-display">Accessing the Dashboard</motion.h2>
      <motion.p className="font-sans">The dashboard runs locally on the Port Daddy daemon's TCP port (default <motion.code className="font-mono">9876</motion.code>). You can open it directly in your browser:</motion.p>
      <CodeBlock code={`http://localhost:9876/dashboard`} />

      <motion.p className="font-sans">Alternatively, the CLI provides a quick shortcut to open it in your default browser:</motion.p>
      <CodeBlock code={`$ pd dashboard`} />

      <motion.h2 className="font-display">Why Visualization Matters for Agents</motion.h2>
      <motion.p className="font-sans">Traditional orchestration tools output text to stdout. That works for linear scripts, but when 10 AI agents are working simultaneously, text logs become an unreadable blur.</motion.p>
      <motion.p className="font-sans">By visualizing the <motion.strong className="font-sans">topology</motion.strong> of the swarm, you can instantly see if all agents are dogpiling onto a single database lock, or if a critical service has crashed and halted the pipeline.</motion.p>
    </TutorialLayout>
  )
