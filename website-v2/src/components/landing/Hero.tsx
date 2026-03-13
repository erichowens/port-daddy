import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@/lib/theme'
import { Zap, Shield, History, ArrowRight } from 'lucide-react'
import { MaritimeSignalRow } from '@/components/viz/MaritimeFlags'

const RAINBOW_SEGMENTS = [
  '#4285f4', '#34a853', '#fbbc04', '#fa7b17', '#ea4335', '#a142f4', '#24c1e0'
]

const CHANGELOG_ITEMS = [
  { version: 'v3.7.0', label: 'Harbors', badge: 'new', text: 'Permission namespaces with signed tokens.', color: 'var(--p-teal-400)', icon: Shield },
  { version: 'v3.7.0', label: 'pd spawn', badge: 'new', text: 'Launch AI agents with auto-wiring.', color: 'var(--p-amber-400)', icon: Zap },
  { version: 'v3.7.0', label: 'Timeline', badge: 'new', text: 'Unified Radio merging infra and agent notes.', color: 'var(--p-blue-400)', icon: History },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

export function Hero() {
  const { theme } = useTheme()
  const { scrollY } = useScroll()
  
  const y1 = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <motion.section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden py-24 font-sans selection:bg-[var(--brand-primary)] selection:text-white"
    >
      {/* Ideogram Background Art */}
      <motion.div 
        style={{ y: y1, opacity }}
        className="absolute inset-0 z-0 pointer-events-none"
      >
        <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-base)] to-[var(--bg-base)] z-10" />
        <motion.img 
          src="/assets/port_daddy_cover_art.webp" 
          className="w-full h-full object-cover opacity-15 scale-105 blur-sm"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.15 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </motion.div>

      <motion.div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 font-sans flex flex-col items-center">
        <motion.div className="flex flex-col items-center text-center gap-10 mb-20 font-sans w-full max-w-4xl">

          <motion.div 
            initial="initial"
            animate="animate"
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-8 relative w-full"
          >
             <motion.div className="flex gap-6 items-center justify-center">
                <MaritimeSignalRow size={32} />
             </motion.div>
            
            <motion.div className="relative group">
               <motion.div 
                 className="absolute inset-0 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity"
                 style={{ background: 'var(--brand-primary)' }}
               />
               <motion.img
                src={theme === 'dark' ? '/pd_logo_darkmode.svg' : '/pd_logo.svg'}
                alt="Port Daddy"
                className="relative h-[220px] w-auto drop-shadow-xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.div className="flex flex-col items-center gap-6">
              <motion.div className="flex gap-0 h-1 w-[240px] rounded-full overflow-hidden shadow-lg border border-[var(--border-subtle)]">
                {RAINBOW_SEGMENTS.map((color, i) => (
                  <motion.div key={i} className="flex-1" style={{ background: color }} />
                ))}
              </motion.div>
              
              <motion.div className="flex flex-wrap justify-center gap-4 items-center">
                <Badge variant="teal" className="px-5 py-1.5 text-[10px] font-black uppercase tracking-widest font-sans">v3.7.0 · The Control Plane</Badge>
                <motion.div className="flex items-center gap-2.5 px-4 py-1 rounded-full bg-[rgba(58,173,173,0.1)] border border-[rgba(58,173,173,0.2)]">
                  <motion.div className="w-2 h-2 rounded-full bg-[var(--p-teal-400)] pulse-active" />
                  <motion.span className="text-[10px] font-black uppercase tracking-widest text-[var(--p-teal-300)] font-sans">Swarm Active</motion.span>
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div className="space-y-6 max-w-3xl">
               <motion.h1 
                 className="text-6xl sm:text-8xl font-black tracking-tighter font-display leading-tight m-0"
                 style={{ color: 'var(--text-primary)' }}
               >
                 Port Authority for <br />
                 <motion.span className="text-[var(--brand-primary)]">AI Swarms.</motion.span>
               </motion.h1>
               <motion.p 
                 className="text-xl sm:text-2xl font-medium leading-relaxed opacity-70 max-w-2xl mx-auto"
                 style={{ color: 'var(--text-secondary)' }}
               >
                 Atomic port assignment, semantic DNS, and cryptographic harbors for multi-agent coordination.
               </motion.p>
            </motion.div>

            <motion.div className="flex flex-wrap justify-center gap-5 mt-8">
               <Link to="/tutorials/getting-started" className="no-underline">
                 <motion.button 
                   className="px-10 py-5 rounded-full bg-[var(--brand-primary)] text-[var(--bg-base)] font-black text-xl shadow-lg flex items-center gap-3 transition-all"
                   whileHover={{ scale: 1.05, y: -4 }}
                   whileTap={{ scale: 0.95 }}
                 >
                   LAUNCH SWARM
                   <ArrowRight size={20} />
                 </motion.button>
               </Link>
               <Link to="/docs" className="no-underline">
                 <motion.button 
                   className="px-10 py-5 rounded-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)] font-black text-xl flex items-center gap-3 transition-all"
                   whileHover={{ scale: 1.05, y: -4 }}
                   whileTap={{ scale: 0.95 }}
                 >
                   SDK MANUAL
                 </motion.button>
               </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Info Panel */}
        <motion.div 
          className="grid sm:grid-cols-3 gap-6 w-full max-w-5xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {CHANGELOG_ITEMS.map((item, i) => (
            <motion.div 
              key={i}
              className="p-8 rounded-[40px] border transition-all duration-300 hover:border-[var(--brand-primary)] group flex flex-col items-center text-center bg-[var(--bg-surface)]"
              style={{ borderColor: 'var(--border-subtle)' }}
              whileHover={{ y: -6 }}
            >
              <motion.div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors shadow-sm"
                style={{ background: `${item.color}10` }}
              >
                <item.icon size={24} style={{ color: item.color }} />
              </motion.div>
              <div className="flex flex-col items-center gap-2">
                <Badge variant="teal" className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5">{item.badge}</Badge>
                <motion.span className="text-[9px] font-black uppercase tracking-widest opacity-40">{item.label}</motion.span>
              </div>
              <motion.p className="text-base font-medium leading-snug m-0 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                {item.text}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
