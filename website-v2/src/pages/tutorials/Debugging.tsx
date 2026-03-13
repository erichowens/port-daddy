import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export function Debugging() {
  return (
    <TutorialLayout
      title="The Port Is Already In Use: A Horror Story"
      description="Turn 2am EADDRINUSE nightmares into 5-second diagnoses with Port Daddy's debugging toolkit."
      number="04"
      total="16"
      level="Intermediate"
      readTime="14 min read"
      prev={{ title: 'Monorepo Mastery', href: '/tutorials/monorepo' }}
      next={{ title: 'Tunnel Magic', href: '/tutorials/tunnel' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          It's 2am. You're deploying a hotfix. The staging server won't start. Your terminal screams at you in red:
        </motion.p>
        
        <CodeBlock language="bash">
          {`$ npm run dev\nError: listen EADDRINUSE: address already in use :::3100\n    at Server.setupListenHandle [as _listen2] (net.js:1318:16)`}
        </CodeBlock>

        <motion.p className="mt-8 mb-4 font-sans">The old you reaches for <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">lsof</motion.code>:</motion.p>
        
        <CodeBlock language="bash">
          {`$ lsof -i :3100\nCOMMAND   PID   USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nnode    48291  erich   23u  IPv6 0x1a2b3c...   0t0    TCP *:3100 (LISTEN)`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Port Daddy Solution</motion.h2>
        <motion.p className="mb-6 font-sans">When every service claims its port through Port Daddy, you get a complete registry of what's running, why, and when it started.</motion.p>
        
        <CodeBlock language="bash">
          {`$ pd find :3100\nmyapp:api  port=3100  claimed 2h ago  healthy`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Deep Diagnostics: <motion.code className="font-mono text-inherit">pd health</motion.code></motion.h2>
        <CodeBlock language="bash">
          {`$ pd health\nmyapp:api          :3100  healthy   (200 OK, 12ms)\nmyapp:worker       :3102  UNHEALTHY (connection refused)`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Stuck on something else?</motion.h3>
          <motion.p className="mb-8 text-lg font-sans">The API reference contains the full detail on every command and error code.</motion.p>
          <Link to="/docs" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--bg-base)] font-bold no-underline hover:scale-105 transition-all font-sans">
            View full documentation <ChevronRight size={18} />
          </Link>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
