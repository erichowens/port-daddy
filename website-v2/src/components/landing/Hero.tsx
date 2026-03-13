import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@/lib/theme'
import { Zap, Shield, History, ArrowRight, Activity, Globe } from 'lucide-react'
import { MaritimeSignalRow } from '@/components/viz/MaritimeFlags'

const RAINBOW_SEGMENTS = [
  '#4285f4', '#34a853', '#fbbc04', '#fa7b17', '#ea4335', '#a142f4', '#24c1e0'
]

const CHANGELOG_ITEMS = [
  { version: 'v3.7.0', label: 'Harbors', badge: 'new', text: 'Permission namespaces with HMAC-signed tokens.', color: 'var(--p-teal-400)', icon: Shield },
  { version: 'v3.7.0', label: 'pd spawn', badge: 'new', text: 'Launch AI agents with coordination auto-wired.', color: 'var(--p-amber-400)', icon: Zap },
  { version: 'v3.7.0', label: 'Timeline', badge: 'new', text: 'Unified Swarm Radio merging infra logs and agent notes.', color: 'var(--p-blue-400)', icon: History },
]

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  animate: { opacity: 1, y: 0 },
}

export function Hero() {
  const { theme } = useTheme()
  const { scrollY } = useScroll()
  
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <motion.section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden py-48 font-sans selection:bg-[var(--brand-primary)] selection:text-white"
    >
      {/* Ideogram Background Art */}
      <motion.div 
        style={{ y: y1, opacity }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)] to-[var(--bg-base)] z-10" />
        <motion.img 
          src="/assets/port_daddy_cover_art.webp" 
          className="w-full h-full object-cover opacity-20 scale-110 blur-sm"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </motion.div>

      {/* Floating Blobs */}
      <motion.div 
        className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none opacity-20 z-0"
        animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div className="w-full h-full" style={{ background: 'radial-gradient(circle, var(--p-teal-500) 0%, transparent 70%)' }} />
      </motion.div>

      <motion.div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 font-sans flex flex-col items-center">
        <motion.div className="flex flex-col items-center text-center gap-16 mb-32 font-sans w-full max-w-5xl">

          <motion.div 
            initial="initial"
            animate="animate"
            variants={fadeUp}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-10 relative w-full"
          >
             <motion.div className="flex gap-10 items-center justify-center mb-4">
                <MaritimeSignalRow size={48} />
             </motion.div>
            
            <motion.div className="relative group">
               <motion.div 
                 className="absolute inset-0 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
                 style={{ background: 'var(--brand-primary)' }}
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ duration: 4, repeat: Infinity }}
               />
               <motion.img
                src={theme === 'dark' ? '/pd_logo_darkmode.svg' : '/pd_logo.svg'}
                alt="Port Daddy"
                className="relative h-[320px] w-auto drop-shadow-2xl"
                animate={{ y: [0, -12, 0], rotate: [0, -2, 2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.div className="flex flex-col items-center gap-8">
              <motion.div className="flex gap-0 h-2 w-[320px] rounded-full overflow-hidden shadow-xl border border-[var(--border-subtle)]">
                {RAINBOW_SEGMENTS.map((color, i) => (
                  <motion.div 
                    key={i} 
                    className="flex-1" 
                    style={{ background: color }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
                  />
                ))}
              </motion.div>
              
              <motion.div className="flex flex-wrap justify-center gap-6 items-center">
                <Badge variant="teal" className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.25em] font-sans shadow-2xl">v3.7.0 · The Control Plane</Badge>
                <motion.div className="flex items-center gap-3 px-5 py-2 rounded-full bg-[rgba(58,173,173,0.1)] border border-[rgba(58,173,173,0.2)] shadow-lg">
                  <motion.div className="w-2.5 h-2.5 rounded-full bg-[var(--p-teal-400)] shadow-[0_0_12px_var(--p-teal-400)] pulse-active" />
                  <motion.span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--p-teal-300)] font-sans">Swarm Active</motion.span>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div className="space-y-8 max-w-4xl pt-4">
               <motion.h1 
                 className="text-7xl sm:text-9xl font-black tracking-tighter font-display leading-[0.85] m-0"
                 style={{ color: 'var(--text-primary)' }}
               >
                 Port Authority for <br />
                 <motion.span className="text-[var(--brand-primary)]">AI Swarms.</motion.span>
               </motion.h1>
               <motion.p 
                 className="text-2xl sm:text-4xl font-medium leading-relaxed opacity-70 max-w-3xl mx-auto"
                 style={{ color: 'var(--text-secondary)' }}
               >
                 Atomic port assignment, semantic DNS, and cryptographic harbors for multi-agent coordination.
               </motion.p>
            </motion.div>

            <motion.div className="flex flex-wrap justify-center gap-8 mt-12">
               <Link to="/tutorials/getting-started" className="no-underline">
                 <motion.button 
                   className="px-16 py-8 rounded-full bg-[var(--brand-primary)] text-[var(--bg-base)] font-black text-2xl shadow-[0_32px_64px_rgba(58,173,173,0.3)] flex items-center gap-4 transition-all"
                   whileHover={{ scale: 1.05, y: -6, boxShadow: '0 40px 80px rgba(58,173,173,0.4)' }}
                   whileTap={{ scale: 0.95 }}
                 >
                   LAUNCH YOUR SWARM
                   <ArrowRight size={28} />
                 </motion.button>
               </Link>
               <Link to="/docs" className="no-underline">
                 <motion.button 
                   className="px-16 py-8 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] font-black text-2xl flex items-center gap-4 transition-all shadow-xl"
                   whileHover={{ scale: 1.05, y: -6, background: 'var(--interactive-hover)' }}
                   whileTap={{ scale: 0.95 }}
                 >
                   SDK MANUAL
                 </motion.button>
               </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Quick Changelog / Info Panel */}
        <motion.div 
          className="grid sm:grid-cols-3 gap-10 mt-12 w-full"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          {CHANGELOG_ITEMS.map((item, i) => (
            <motion.div 
              key={i}
              className="p-12 rounded-[56px] border transition-all duration-300 hover:border-[var(--brand-primary)] group flex flex-col items-center text-center shadow-xl"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              whileHover={{ y: -10 }}
            >
              <motion.div 
                className="w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 transition-colors shadow-inner"
                style={{ background: `${item.color}15` }}
              >
                <item.icon size={32} style={{ color: item.color }} />
              </motion.div>
              <div className="flex flex-col items-center gap-4">
                <Badge variant="teal" className="text-[8px] font-black uppercase tracking-widest px-3 py-1">{item.badge}</Badge>
                <motion.span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 group-hover:opacity-100 transition-opacity">{item.label}</motion.span>
              </div>
              <motion.p className="text-xl font-medium leading-snug m-0 mt-6 opacity-70 group-hover:opacity-100 transition-opacity">
                {item.text}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
