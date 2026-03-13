import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'

export function Tunnel() {
  return (
    <TutorialLayout
      title="Tunnel Magic"
      description="Expose your local services to the internet securely. Share your progress with clients or test webhooks from external services."
      number="05"
      total="16"
      level="Beginner"
      readTime="10 min read"
      prev={{ title: 'Debugging with Port Daddy', href: '/tutorials/debugging' }}
      next={{ title: 'DNS Resolver', href: '/tutorials/dns' }}
    >
      <motion.div className="font-sans">
        <motion.p className="text-lg leading-relaxed font-sans mb-8" style={{ color: 'var(--text-secondary)' }}>
          Port Daddy includes a built-in tunneling service that allows you to create public URLs for your local ports.
        </motion.p>

        <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>1. Create a Tunnel</motion.h2>
        <CodeBlock language="bash">
          {`$ pd tunnel myapp:api\n✓ Tunnel created: https://myapp-api-7f3a.portdaddy.dev -> localhost:3001`}
        </CodeBlock>

        <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>2. Security Options</motion.h2>
        <motion.p className="mb-6 font-sans">
          Protect your public URLs with authentication and whitelists.
        </motion.p>
        <CodeBlock language="bash">
          {`$ pd tunnel myapp:api --auth user:pass --whitelist 1.2.3.4`}
        </CodeBlock>

        <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
          <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Open Harbor</motion.h3>
          <motion.p className="mb-0 text-lg font-sans">
            Tunnels are temporary by default. Use them for quick demos and integration testing without the overhead of a full deployment.
          </motion.p>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
