import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Harbors() {
  return (
    <TutorialLayout
      title="Harbor Tokens"
      description="Create permission namespaces for agent teams. Scope tunnels, file claims, and pub/sub to a harbor. HMAC-signed tokens with TTLs and a full audit trail."
      number="12"
      total="16"
      level="Advanced"
      readTime="12 min read"
      prev={{ title: 'pd spawn: Launch Agent Fleets', href: '/tutorials/pd-spawn' }}
      next={{ title: 'Live Dashboard', href: '/tutorials/dashboard' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          As your swarm grows, identity management becomes mission-critical. **Harbors** provide cryptographic boundaries for your agents.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>What is a Harbor?</motion.h2>
        <motion.p className="mb-6 font-sans">
          A harbor is a named workspace within the Port Daddy daemon. When an agent "enters" a harbor, it receives a signed **Capability Token** (JWT). This token defines exactly what the agent is allowed to do.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Create a Harbor</motion.h2>
        <CodeBlock language="bash">
          {`$ pd harbor create myapp:security-review --cap "code:read,notes:write,lock:acquire" --ttl 2h`}
        </CodeBlock>
        <motion.p className="mt-8 font-sans">
          This command creates a harbor named <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">myapp:security-review</motion.code> with three specific capabilities. Any agent attempting to perform a restricted action without a token from this harbor will be blocked.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Enter and Receive a Token</motion.h2>
        <CodeBlock language="bash">
          {`$ pd harbor enter myapp:security-review\n✓ Entered harbor: myapp:security-review\ntoken: eyJhbGciOiJIUzI1NiJ9... (expires in 2h)`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>3. Use the Token</motion.h2>
        <motion.p className="mb-6 font-sans">
          Agents must provide their token in the <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">Authorization</motion.code> header (HTTP) or the <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded font-mono">--token</motion.code> flag (CLI).
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd claim myapp:api --token eyJhbGciOiJIUzI1NiJ9...`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Capability Scopes</motion.h2>
        <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>code:read</motion.strong> -- Access source code via file claims</motion.span></motion.li>
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>notes:write</motion.strong> -- Post updates to the session timeline</motion.span></motion.li>
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>tunnel:create</motion.strong> -- Expose services to the internet</motion.span></motion.li>
          <motion.li className="flex gap-3 font-sans"><motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>lock:acquire</motion.strong> -- Participate in distributed locking</motion.span></motion.li>
        </motion.ul>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Security First</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Harbors are the foundation of our **Formal Verification** roadmap. In V4, the daemon will automatically 
            isolate agents that violate their harbor's state machine.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
