import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Badge } from '@/components/ui/Badge'
import { Globe, Search, Zap, Terminal, Shield, Network, Anchor, Activity } from 'lucide-react'

export function DNSResolver() {
  return (
    <TutorialLayout
      title="Identity Discovery"
      description="Stop memorizing port numbers. Learn to use Port Daddy's internal DNS to resolve services by their semantic identities across your entire mesh."
      number="09"
      total="16"
      level="Intermediate"
      readTime="8 min read"
      prev={{ title: 'Visual Control Plane', href: '/tutorials/dashboard' }}
      next={{ title: 'Agent Inbox', href: '/tutorials/inbox' }}
    >
      <motion.div className="space-y-16">
        {/* Concept Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-teal-400)]">
              <Globe className="text-[var(--p-teal-400)]" size={24} />
            </div>
            <h2 className="m-0">Beyond Localhost</h2>
          </div>
          <p>
            In a swarm, services are dynamic. They move between ports, containers, and harbors. **Identity Discovery** allows your agents to find services using stable, semantic names (like <code>auth.pd.local</code>) instead of fragile, hardcoded port numbers.
          </p>
          <div className="grid sm:grid-cols-2 gap-8 pt-4">
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-teal-500)]/10 flex items-center justify-center">
                   <Zap size={20} className="text-[var(--p-teal-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Zero Config</h3>
                <p className="text-sm opacity-60 m-0">Port Daddy automatically updates your system hosts file or provides a local DNS server.</p>
             </div>
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-blue-500)]/10 flex items-center justify-center">
                   <Anchor size={20} className="text-[var(--p-blue-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Semantic Mapping</h3>
                <p className="text-sm opacity-60 m-0">Map <code>project:stack:identity</code> strings directly to reachable network addresses.</p>
             </div>
          </div>
        </section>

        {/* Step 1: Registration */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--brand-primary)]">
              <Network className="text-[var(--brand-primary)]" size={24} />
            </div>
            <h2 className="m-0">1. Register a Name</h2>
          </div>
          
          <p>
            When you claim an identity, Port Daddy can automatically register a corresponding <code>.pd.local</code> hostname.
          </p>

          <CodeBlock language="bash">
            {`$ pd claim my-swarm:api --dns auth.pd.local\n\n✓ Port 3102 assigned.\n✓ DNS Registered: http://auth.pd.local -> localhost:3102`}
          </CodeBlock>

          <blockquote className="bg-[var(--bg-overlay)] p-8 rounded-3xl border-l-4 border-[var(--brand-primary)]">
             <p className="m-0 text-sm italic opacity-60 font-medium">
               The daemon handles the complexity of OS-level DNS resolution, ensuring your browser and local tools can resolve these names instantly.
             </p>
          </blockquote>
        </section>

        {/* Step 2: Resolution */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-blue-400)]">
              <Search className="text-[var(--p-blue-400)]" size={24} />
            </div>
            <h2 className="m-0">2. Discovery in Code</h2>
          </div>

          <p>
            Agents can query the daemon to resolve identities to current network addresses. This is pivotal for LangChain tools that need to call dynamic APIs.
          </p>

          <CodeBlock language="bash">
            {`# Resolve an identity to an address\n$ pd dns resolve my-swarm:api\n\nlocalhost:3102`}
          </CodeBlock>

          <div className="bg-[var(--bg-surface)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-6 relative overflow-hidden shadow-2xl">
             <div className="absolute inset-0 bg-gradient-to-r from-[var(--p-blue-500)]/5 to-[var(--p-teal-500)]/5" />
             <p className="text-sm font-black uppercase tracking-widest opacity-40 m-0 relative z-10">Real-time Resolution</p>
             <div className="space-y-4 relative z-10">
                <div className="p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase opacity-40">Identity</span>
                      <code className="text-xs font-bold text-[var(--brand-primary)]">swarm:db:primary</code>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black uppercase opacity-40">Resolved</span>
                      <code className="text-xs font-bold">127.0.0.1:5432</code>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Vision Callout */}
        <motion.div 
          className="p-16 rounded-[60px] border border-dashed border-[var(--p-teal-400)] bg-[var(--bg-overlay)] flex flex-col items-center text-center gap-8 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Activity size={400} />
           </div>
           <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest">Discovery Maturity</Badge>
           <h3 className="text-4xl font-display font-black m-0" style={{ color: 'var(--text-primary)' }}>Identity is Address.</h3>
           <p className="text-xl max-w-xl opacity-70">
             In Port Daddy v3.7, we've decoupled address from identity. Your agents no longer "search" for services—they declare an intent to communicate, and the daemon handles the routing.
           </p>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--p-teal-400)]">
              <Shield size={14} className="animate-pulse" />
              Anchor Protocol v4 Active
           </div>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
