import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Badge } from '@/components/ui/Badge'
import { Globe, Shield, Zap, Terminal, Share2, Network, Anchor, Cpu, Activity, Sparkles } from 'lucide-react'

export function RemoteHarbors() {
  return (
    <TutorialLayout
      title="Multiplayer Localhost"
      description="The swarm doesn't stop at your machine. Learn to link Port Daddy daemons across the global mesh to coordinate with remote agent clusters and GPU-powered harbors."
      number="16"
      total="16"
      level="Advanced"
      readTime="15 min read"
      prev={{ title: 'The Session State Machine', href: '/tutorials/session-phases' }}
    >
      <motion.div className="space-y-16">
        {/* Intro Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-blue-400)]">
              <Globe className="text-[var(--p-blue-400)]" size={24} />
            </div>
            <h2 className="m-0">The Infinite Swarm</h2>
          </div>
          <p>
            **Remote Harbors** are the final piece of the Port Daddy architecture. They allow you to treat agents running on different machines—whether it's your teammate's laptop or a cloud-hosted GPU cluster—as part of a single, unified swarm.
          </p>
          <div className="grid sm:grid-cols-2 gap-8 pt-4">
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-teal-500)]/10 flex items-center justify-center">
                   <Anchor size={20} className="text-[var(--p-teal-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Global Lighthouses</h3>
                <p className="text-sm opacity-60 m-0">Public discovery nodes that negotiate secure, encrypted handshakes between daemons behind firewalls.</p>
             </div>
             <div className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--p-amber-500)]/10 flex items-center justify-center">
                   <Sparkles size={20} className="text-[var(--p-amber-400)]" />
                </div>
                <h3 className="text-xl font-display font-black m-0">Compute Routing</h3>
                <p className="text-sm opacity-60 m-0">Re-route intensive agent tasks to remote harbors with more powerful hardware seamlessly.</p>
             </div>
          </div>
        </section>

        {/* Step 1: Discovery */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--brand-primary)]">
              <Network className="text-[var(--brand-primary)]" size={24} />
            </div>
            <h2 className="m-0">1. Summon a Lighthouse</h2>
          </div>
          
          <p>
            Use the <code>harbor discover</code> command to find available remote lighthouses or join a private mesh using a secure invitation.
          </p>

          <CodeBlock language="bash">
            {`$ pd harbor discover --lighthouse global.portdaddy.dev\\
    --invite pd-inv-7f3a-9921\\
    
✓ Identity Verified.
✓ Linked to remote harbor: gpu-swarm-01
✓ Latency: 42ms (Secure P2P)`}
          </CodeBlock>

          <blockquote className="bg-[var(--bg-overlay)] p-8 rounded-3xl border-l-4 border-[var(--brand-primary)]">
             <p className="m-0 text-sm italic opacity-60 font-medium">
               In Port Daddy v3.7, all remote communication is strictly end-to-end encrypted using the **Noise Protocol** (Noise_XX). Even the lighthouse cannot see your agent traffic.
             </p>
          </blockquote>
        </section>

        {/* Step 2: Global Calls */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--p-purple-400)]">
              <Cpu className="text-[var(--p-purple-400)]" size={24} />
            </div>
            <h2 className="m-0">2. Hailing Remote Agents</h2>
          </div>

          <p>
            Once linked, remote identities appear in your local DNS registry. You can call remote agents or publish to their Swarm Radio channels exactly as if they were local.
          </p>

          <CodeBlock language="bash">
            {`# Call an agent running on the remote GPU cluster\\
curl http://$(pd dns resolve gpu-swarm:vision-analyst)/analyze\\
    -d @image.png\\
    
# Broadcast a signal to all linked daemons\\
pd pub global:swarm:events "new-task-ready"`}
          </CodeBlock>

          <div className="bg-[var(--bg-surface)] p-10 rounded-[48px] border border-[var(--border-subtle)] space-y-8 shadow-2xl relative overflow-hidden text-center">
             <div className="absolute inset-0 bg-gradient-to-b from-[var(--p-blue-500)]/5 to-transparent" />
             <p className="text-sm font-black uppercase tracking-widest opacity-40 m-0">The Global Mesh</p>
             
             <div className="flex items-center justify-center gap-12 pt-4">
                <div className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-[var(--bg-overlay)] border-2 border-[var(--p-teal-500)] flex items-center justify-center shadow-lg shadow-[var(--p-teal-500)]/10">
                      <Terminal size={24} className="text-[var(--p-teal-400)]" />
                   </div>
                   <span className="text-[10px] font-black uppercase opacity-40">Local Dev</span>
                </div>
                <div className="flex-1 h-[2px] bg-dashed border-t border-[var(--brand-primary)] opacity-40" />
                <div className="w-20 h-20 rounded-full bg-[var(--brand-primary)]/20 border-2 border-[var(--brand-primary)] flex items-center justify-center animate-pulse shadow-2xl shadow-[var(--brand-primary)]/20">
                   <Globe size={32} className="text-[var(--brand-primary)]" />
                </div>
                <div className="flex-1 h-[2px] bg-dashed border-t border-[var(--brand-primary)] opacity-40" />
                <div className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-[var(--bg-overlay)] border-2 border-[var(--p-amber-500)] flex items-center justify-center shadow-lg shadow-[var(--p-amber-500)]/10">
                      <Cpu size={24} className="text-[var(--p-amber-400)]" />
                   </div>
                   <span className="text-[10px] font-black uppercase opacity-40">GPU Cluster</span>
                </div>
             </div>
          </div>
        </section>

        {/* Vision Callout */}
        <motion.div 
          className="p-16 rounded-[60px] border border-dashed border-[var(--brand-primary)] bg-[var(--bg-overlay)] flex flex-col items-center text-center gap-8 relative overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
              <Activity size={400} />
           </div>
           <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest">The Ultimate Maturity</Badge>
           <h3 className="text-4xl font-display font-black m-0" style={{ color: 'var(--text-primary)' }}>Global Intelligence.</h3>
           <p className="text-xl max-w-xl opacity-70">
             Port Daddy v3.7 isn't just about your machine—it's about the **Mesh**. We're building the infrastructure for a world where agents cooperate across any network, forming vast, secure, and resilient autonomous organizations.
           </p>
           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">
              <Shield size={14} className="animate-pulse" />
              Anchor Protocol v4 Verified
           </div>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
