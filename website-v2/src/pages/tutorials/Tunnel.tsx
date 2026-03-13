}
import { motion } from "framer-motion"
import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'

export function Tunnel() {
  return (
    <TutorialLayout
      title="Share Your Local Dev Server in 30 Seconds"
      description="Stop emailing screenshots. Give your client a live URL to the thing running on your laptop -- right now, tonight, no deploy required."
      number="5"
      total="12"
      level="Beginner"
      readTime="6 min read"
      prev={{ title: 'Debugging with Port Daddy', href: '/tutorials/debugging' }}
      next={{ title: 'Real-time Radio', href: '/tutorials/inbox' }}
    >
      <motion.p className="text-lg leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
        You're on a Zoom call. The client asks, "Can I see the latest checkout flow?" 
        You haven't pushed to staging yet. You don't want to deal with Vercel builds or Docker deployments.
      </motion.p>

      <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Tunnel Solution</motion.h2>
      <motion.p className="mb-6 font-sans">
        Port Daddy creates secure, encrypted tunnels from your local daemon to the public internet. 
        It works by generating a random subdomain on our Lighthouse fleet and routing traffic 
        directly to your claimed port.
      </motion.p>
      
      <CodeBlock
        code={`$ pd tunnel myapp:api
✓ Tunnel active: https://myapp-api-7f3a.portdaddy.dev -> localhost:3001
[pd] Watching traffic...`}
      />

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Security & Protection</motion.h2>
      <motion.p className="mb-6 font-sans">
        Public URLs are dangerous. Port Daddy tunnels include built-in protection:
      </motion.p>
      <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
        <motion.li className="flex gap-3"><motion.span className="text-[var(--brand-primary)]">✓</motion.span> <motion.span><motion.strong style={{ color: 'var(--text-primary)' }}>IP Whitelisting</motion.strong> -- Only allow specific IPs to access the tunnel</motion.span></motion.li>
        <motion.li className="flex gap-3"><motion.span className="text-[var(--brand-primary)]">✓</motion.span> <motion.span><motion.strong style={{ color: 'var(--text-primary)' }}>Basic Auth</motion.strong> -- Protect your URL with a simple username/password</motion.span></motion.li>
        <motion.li className="flex gap-3"><motion.span className="text-[var(--brand-primary)]">✓</motion.span> <motion.span><motion.strong style={{ color: 'var(--text-primary)' }}>Automatic Expiry</motion.strong> -- Tunnels die after a set duration (default 2h)</motion.span></motion.li>
      </motion.ul>

      <CodeBlock
        code={`# Create a protected tunnel
$ pd tunnel myapp:api --auth user:pass --whitelist 1.2.3.4 --ttl 30m`}
      />

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>V4 Vision: P2P Tunnels</motion.h2>
      <motion.p className="mb-6 font-sans text-lg italic opacity-60">
        Coming in V4: Noise Protocol-powered P2P tunnels. Bypass our Lighthouses entirely 
        and establish direct, E2EE connections between Port Daddy daemons across the globe.
      </motion.p>

      <motion.div className="mt-12 p-10 rounded-[40px] font-sans shadow-xl border border-dashed" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
        <motion.h3 className="m-0 mb-4 font-display text-2xl" style={{ color: 'var(--text-primary)' }}>Lesson Complete!</motion.h3>
        <motion.p className="mb-8 text-lg font-sans">You now know how to share your local harbor with the world safely.</motion.p>
        <Link to="/tutorials/inbox" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-[var(--bg-base)] font-bold no-underline hover:scale-105 transition-all">
          Next: Real-time Radio <motion.span className="ml-2 font-mono">→</motion.span>
        </Link>
      </motion.div>
    </TutorialLayout>
  )
