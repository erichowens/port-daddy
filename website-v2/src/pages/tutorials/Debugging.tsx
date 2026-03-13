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
      number="4"
      total="12"
      level="Intermediate"
      readTime="14 min read"
      prev={{ title: 'Monorepo Mastery', href: '/tutorials/monorepo' }}
      next={{ title: 'Tunnel Magic', href: '/tutorials/tunnel' }}
    >
      <motion.p className="text-lg leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
        It's 2am. You're deploying a hotfix. The staging server won't start. Your terminal screams at you in red:
      </motion.p>
      
      <CodeBlock
        code={`$ npm run dev
Error: listen EADDRINUSE: address already in use :::3100
    at Server.setupListenHandle [as _listen2] (net.js:1318:16)
    at listenInCluster (net.js:1366:12)`}
      />

      <motion.p className="mt-8 mb-4 font-sans">The old you reaches for <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">lsof</motion.code>:</motion.p>
      
      <CodeBlock
        code={`$ lsof -i :3100
COMMAND   PID   USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    48291  erich   23u  IPv6 0x1a2b3c...   0t0    TCP *:3100 (LISTEN)

# What is PID 48291? When did it start? Which project?
# Is it safe to kill? Is anyone depending on it?
# You have no idea.

$ pkill -f node
# You just killed 7 unrelated Node processes.
# Your VS Code extensions are crashing.
# Your other terminal windows are blank.`}
      />

      <motion.p className="mt-8 font-sans font-bold" style={{ color: 'var(--text-primary)' }}>There is a better way.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The 2am Nightmare (In Detail)</motion.h2>
      <motion.p className="mb-6 font-sans">The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">EADDRINUSE</motion.code> error is just the symptom. The real problems are:</motion.p>
      <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>You don't know what's listening</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">lsof</motion.code> shows PIDs, not purpose</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>You don't know why it's listening</motion.strong> -- Is it a forgotten dev server? A stale process? A different project?</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>You don't know when it started</motion.strong> -- Was it 5 minutes ago or 5 days ago?</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>You don't know who started it</motion.strong> -- Was it you? An agent? A CI runner?</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>You can't safely kill it</motion.strong> -- Without knowing the above, <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">kill</motion.code> is a dice roll</motion.span>
        </motion.li>
      </motion.ul>
      <motion.p className="font-sans">Port Daddy answers all five questions instantly.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Port Daddy Solution</motion.h2>
      <motion.p className="mb-6 font-sans">When every service claims its port through Port Daddy, you get a complete registry of what's running, why, and when it started. Instead of <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">lsof</motion.code> forensics, you ask Port Daddy:</motion.p>
      
      <CodeBlock
        code={`$ pd find :3100
myapp:api  port=3100  claimed 2h ago  healthy`}
      />

      <motion.p className="mt-8 font-sans">One line. You know the project (<motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">myapp</motion.code>), the stack (<motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">api</motion.code>), how long it's been running, and whether it's healthy. No PIDs, no guessing, no collateral damage.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Full System Status: <motion.code className="font-mono text-inherit">pd status</motion.code></motion.h2>
      <motion.p className="mb-6 font-sans">For a bird's eye view of everything Port Daddy is managing:</motion.p>
      
      <CodeBlock
        code={`$ pd status
Daemon running (pid 45821) on http://localhost:9876
Uptime: 14h 23m

Services:  5 claimed
Locks:     1 held
Agents:    3 active, 1 stale
Sessions:  2 active
Channels:  4 with subscribers`}
      />

      <motion.p className="mt-8 font-sans">This tells you at a glance: are things healthy, or is something stuck? Five services running is expected for your project. But if you see 47 services claimed when you only have 3 projects -- something is leaking.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Deep Diagnostics: <motion.code className="font-mono text-inherit">pd health</motion.code></motion.h2>
      <motion.p className="mb-6 font-sans">The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">health</motion.code> command goes beyond "is the port claimed?" and actually checks whether the service is responding:</motion.p>
      
      <CodeBlock
        code={`$ pd health
myapp:api          :3100  healthy   (200 OK, 12ms)
myapp:web          :3101  healthy   (200 OK, 45ms)
myapp:worker       :3102  UNHEALTHY (connection refused)
dashboard:next     :3200  healthy   (200 OK, 8ms)
blog:gatsby        :3300  UNHEALTHY (timeout after 5000ms)`}
      />

      <motion.p className="mt-8 font-sans">Now you see the problem immediately: <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">myapp:worker</motion.code> has a claimed port but nothing is listening. And <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">blog:gatsby</motion.code> is responding but too slowly (probably frozen).</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Cleanup: Removing Stale Services</motion.h2>
      <motion.p className="mb-6 font-sans">Over time, ghost claims accumulate -- ports claimed by processes that crashed, laptops that went to sleep, or agents that died mid-task. The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">cleanup</motion.code> command handles this.</motion.p>

      <CodeBlock
        code={`$ pd cleanup --dry-run
Would release 3 stale services:
  blog:gatsby        port=3300  claimed 3d ago   UNHEALTHY
  dashboard:worker   port=3202  claimed 1d ago   UNHEALTHY
  myapp:worker       port=3102  claimed 45m ago  UNHEALTHY`}
      />

      <motion.p className="mt-8 font-sans italic opacity-60">The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">--dry-run</motion.code> flag is your friend. Always preview before cleaning.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Debugging Mindset</motion.h2>
      <motion.ol className="space-y-3 list-decimal pl-6 mb-12 font-sans text-lg">
        <motion.li className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Identify</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd find</motion.code> to see what's claimed</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Diagnose</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd health</motion.code> to see what's actually running</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Investigate</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd log</motion.code> to see what happened and when</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Resolve</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd release</motion.code> or <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd cleanup</motion.code> to fix ghost claims</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Prevent</motion.strong> -- <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd status</motion.code> and <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd metrics</motion.code> to monitor going forward</motion.li>
      </motion.ol>
      <motion.p className="font-sans text-lg">The days of <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">lsof | grep | awk | xargs kill</motion.code> are over. Port Daddy gives you semantic, timestamped, queryable records of every port operation. At 2am or 2pm, the answer is always one command away.</motion.p>

      <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
        <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Stuck on something else?</motion.h3>
        <motion.p className="mb-8 text-lg font-sans">The API reference contains the full detail on every command and error code.</motion.p>
        <Link to="/docs" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--bg-base)] font-bold no-underline hover:scale-105 transition-all font-sans">
          View full documentation <ChevronRight size={18} />
        </Link>
      </motion.div>
    </TutorialLayout>
  )
}
