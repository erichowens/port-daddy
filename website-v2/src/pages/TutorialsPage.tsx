import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { BookOpen, Clock, ChevronRight, Play, Zap, Shield, Globe, Terminal, Sparkles, Anchor } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'

interface Tutorial {
  slug: string
  number: string
  title: string
  description: string
  level: 'beginner' | 'intermediate' | 'advanced'
  time: string
  tags: string[]
  href: string
}

const TUTORIALS: Tutorial[] = [
  {
    slug: 'getting-started',
    number: '01',
    title: 'The First Handshake',
    description: 'Install Port Daddy, claim your first semantic identity, and learn why ports are a relic of the past.',
    level: 'beginner',
    time: '5 min',
    tags: ['CLI', 'Identity', 'Basics'],
    href: '/tutorials/getting-started',
  },
  {
    slug: 'multi-agent',
    number: '02',
    title: 'Multi-Agent Orchestration',
    description: 'Coordinate two agents on the same project. File claims, conflict detection, and real-time signaling.',
    level: 'intermediate',
    time: '12 min',
    tags: ['Sessions', 'Radio', 'Files'],
    href: '/tutorials/multi-agent',
  },
  {
    slug: 'harbors',
    number: '03',
    title: 'Secure Harbors',
    description: 'Define cryptographic permission boundaries and issue HMAC-signed capability tokens to your agents.',
    level: 'advanced',
    time: '15 min',
    tags: ['Security', 'JWT', 'Harbors'],
    href: '/tutorials/harbors',
  },
  {
    slug: 'always-on',
    number: '04',
    title: 'Always-On Avatars',
    description: 'Deploy persistent agent processes that live in the background and respond to global swarm signals.',
    level: 'intermediate',
    time: '10 min',
    tags: ['Avatars', 'Processes', 'BG'],
    href: '/tutorials/always-on',
  },
  {
    slug: 'tunnel',
    number: '05',
    title: 'P2P Tunnels',
    description: 'Link two daemons across the internet to create a secure, shared service mesh for your agents.',
    level: 'advanced',
    time: '20 min',
    tags: ['P2P', 'Noise', 'Network'],
    href: '/tutorials/tunnel',
  },
  {
    slug: 'time-travel',
    number: '06',
    title: 'Time-Travel Debugging',
    description: 'Use the unified Swarm Radio timeline to debug complex inter-agent race conditions.',
    level: 'intermediate',
    time: '8 min',
    tags: ['Timeline', 'Debug', 'Radio'],
    href: '/tutorials/time-travel',
  }
]

export default function TutorialsPage() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--bg-base)] flex flex-col pt-[var(--nav-height)] font-sans selection:bg-[var(--brand-primary)] selection:text-white"
    >
      {/* Hero Section */}
      <motion.section className="py-32 px-6 sm:px-8 lg:px-10 border-b relative overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <motion.div 
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.1] pointer-events-none" 
          style={{ background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)' }} 
        />
        
        <div className="max-w-7xl mx-auto text-center relative z-10 flex flex-col items-center gap-10">
           <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] shadow-xl">Port Daddy Academy</Badge>
           <motion.h1 
             className="text-6xl sm:text-9xl font-black tracking-tighter font-display leading-[0.9]"
             initial={{ opacity: 0, y: 32 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           >
             Master the <br />
             <span className="text-[var(--brand-primary)]">Swarm Protocol.</span>
           </motion.h1>
           <motion.p 
             className="text-2xl sm:text-3xl max-w-3xl leading-relaxed opacity-70 font-medium"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.1 }}
           >
             From your first port claim to production-grade P2P harbors. Learn to orchestrate the next generation of AI.
           </motion.p>
        </div>
      </motion.section>

      {/* Grid Section */}
      <motion.main className="flex-1 py-24 px-6 sm:px-8 lg:px-10 max-w-7xl mx-auto w-full font-sans">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {TUTORIALS.map((tutorial, i) => (
            <motion.div
              key={tutorial.slug}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className="group"
            >
              <Link to={tutorial.href} className="no-underline block h-full">
                <motion.div 
                  className="h-full p-10 rounded-[48px] border transition-all duration-[var(--p-transition-spring)] flex flex-col items-start gap-8"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
                  whileHover={{ y: -10, borderColor: 'var(--brand-primary)', boxShadow: '0 32px 64px -12px rgba(58,173,173,0.15)' }}
                >
                  <div className="w-full flex justify-between items-start">
                     <div className="w-16 h-16 rounded-[24px] bg-[var(--interactive-active)] flex items-center justify-center border border-[var(--border-subtle)] group-hover:scale-110 transition-transform">
                        <span className="text-xl font-display font-black text-[var(--brand-primary)]">{tutorial.number}</span>
                     </div>
                     <Badge variant={tutorial.level === 'beginner' ? 'teal' : tutorial.level === 'intermediate' ? 'amber' : 'neutral'} className="text-[8px] font-black uppercase tracking-widest px-3 py-1">
                        {tutorial.level}
                     </Badge>
                  </div>

                  <div className="space-y-4 flex-1">
                    <h3 className="m-0 text-3xl font-display font-black leading-tight text-[var(--text-primary)]">
                      {tutorial.title}
                    </h3>
                    <p className="m-0 text-base opacity-60 leading-relaxed group-hover:opacity-100 transition-opacity">
                      {tutorial.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                     {tutorial.tags.map(tag => (
                       <span key={tag} className="px-3 py-1 rounded-lg bg-[var(--bg-overlay)] text-[10px] font-bold opacity-40 uppercase tracking-widest border border-transparent group-hover:border-[var(--border-subtle)] transition-all">{tag}</span>
                     ))}
                  </div>

                  <div className="w-full flex items-center justify-between pt-6 border-t border-[var(--border-subtle)] group-hover:border-transparent transition-colors">
                     <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                        <Clock size={12} className="text-[var(--brand-primary)]" />
                        {tutorial.time}
                     </div>
                     <div className="w-8 h-8 rounded-full bg-[var(--bg-overlay)] flex items-center justify-center group-hover:bg-[var(--brand-primary)] group-hover:text-[var(--bg-base)] transition-all">
                        <Play size={12} fill="currentColor" className="ml-0.5" />
                     </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Impressively long additional info */}
        <motion.div 
          className="mt-32 p-20 rounded-[80px] border border-dashed border-[var(--border-strong)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] flex flex-col items-center text-center gap-12 relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
           <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
              <Anchor size={600} />
           </div>
           
           <div className="space-y-6 max-w-3xl relative z-10">
              <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-xl">Automated Verification</Badge>
              <h3 className="text-4xl sm:text-7xl font-display font-black tracking-tight leading-[0.95]" style={{ color: 'var(--text-primary)' }}>
                Certified <span className="text-[var(--p-teal-400)]">Integrations.</span>
              </h3>
              <p className="text-2xl leading-relaxed opacity-70">
                Every tutorial in the Academy is backed by a headless Playwright integration test. When we update the Port Daddy core, we run the Academy. If a tutorial fails, the build fails. You are learning from working, verified code.
              </p>
           </div>

           <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
              {[
                { label: 'VHS Recorded', icon: Play },
                { label: 'LangChain Ready', icon: Sparkles },
                { label: 'CrewAI Tested', icon: Globe },
                { label: 'CI/CD Verified', icon: Shield }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-[40px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex flex-col items-center gap-4">
                   <item.icon size={24} className="text-[var(--brand-primary)]" />
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{item.label}</span>
                </div>
              ))}
           </div>
        </motion.div>
      </motion.main>

      <Footer />
    </motion.div>
  )
}
