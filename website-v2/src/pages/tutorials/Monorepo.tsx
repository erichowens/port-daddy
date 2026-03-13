import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Monorepo() {
  return (
    <TutorialLayout
      title="Port Daddy in a 50-Service Monorepo"
      description="Scan your entire monorepo, start the full stack in dependency order, and finally stop juggling 15 terminal tabs."
      number="03"
      total="16"
      level="Advanced"
      readTime="14 min read"
      prev={{ title: 'Multi-Agent Orchestration', href: '/tutorials/multi-agent' }}
      next={{ title: 'Debugging with Port Daddy', href: '/tutorials/debugging' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          You work at PaymentCo. Fifteen services. Three databases. Two message queues. A search engine. And every developer on the team has a different way of starting it all.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Monorepo Port Nightmare</motion.h2>
        <motion.p className="mb-6 font-sans">Here is what monorepo development looks like without orchestration:</motion.p>
        
        <CodeBlock language="text">
          {`Monday:\n  "API is on 3000, frontend on 3001, worker on 3002"\n\nTuesday:\n  "Wait, Dave changed the API to 4000 in his branch"\n  "The worker is failing because it's hardcoded to call localhost:3000"`}
        </CodeBlock>

        <motion.p className="mt-8 mb-4 font-sans font-bold" style={{ color: 'var(--text-primary)' }}>The core problems are always the same:</motion.p>
        <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
          <motion.li className="flex gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
            <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Port collisions</motion.strong> -- Teams pick random ports and break each other</motion.span>
          </motion.li>
          <motion.li className="flex gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
            <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Startup ordering</motion.strong> -- The API crashes because postgres isn't ready yet</motion.span>
          </motion.li>
        </motion.ul>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Scanning Your Monorepo</motion.h2>
        <motion.p className="mb-6 font-sans">First, let Port Daddy understand what you're working with. The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">pd scan</motion.code> command detects every service.</motion.p>
        
        <CodeBlock language="bash">
          {`$ pd scan\n\nScanning monorepo...\nFound 15 services in 3.2s\n\n  services/api           Next.js (App Router)     needs: [postgres, redis]\n  infra/postgres         PostgreSQL 16            standalone`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Starting the Whole Stack</motion.h2>
        <CodeBlock language="bash">
          {`$ pd up\n\n[paymentco] Starting 15 services...\n  [postgres]        Starting on port 5532...\n  [api]             Starting on port 3101...\n\nAll 15 services healthy. Total startup: 14.3s`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>The Handoff</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            The hardest part of running a monorepo was never the code. It was getting the infrastructure to cooperate. That problem is now solved.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
