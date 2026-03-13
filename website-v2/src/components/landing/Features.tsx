import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { PRODUCT_FEATURES } from '@/data/product'
import { 
  Shield, History, Radio, 
  Anchor, Code, Cpu, Share2, Terminal, Sparkles, Zap
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  'ports': Anchor,
  'coordination': Radio,
  'security': Shield,
  'observability': History,
  'agents': Cpu,
  'intelligence': Sparkles
}

const CATEGORY_COLORS: Record<string, string> = {
  'ports': 'var(--p-blue-400)',
  'coordination': 'var(--p-teal-400)',
  'security': 'var(--p-amber-400)',
  'observability': 'var(--p-red-400)',
  'agents': 'var(--p-purple-400)',
  'intelligence': 'var(--p-blue-300)'
}

export function Features() {
  return (
    <motion.section 
      id="features" 
      className="py-20 px-6 sm:px-8 lg:px-10 font-sans selection:bg-[var(--brand-primary)] selection:text-white bg-[var(--bg-base)] flex flex-col items-center text-center"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 flex flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-4">
             <Badge variant="teal" className="px-5 py-1.5 text-[10px] font-black uppercase tracking-widest font-sans">The Enumeration</Badge>
             <motion.h2 className="text-4xl sm:text-6xl font-bold font-display tracking-tight leading-tight m-0" style={{ color: 'var(--text-primary)' }}>
               The Definitive <br />
               <motion.span className="text-[var(--brand-primary)]">Control Plane.</motion.span>
             </motion.h2>
          </div>
          <motion.p className="text-xl sm:text-2xl max-w-3xl mx-auto leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            Foundational primitives required to turn a collection of scripts into a production-grade, autonomous organization.
          </motion.p>
        </motion.div>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          {PRODUCT_FEATURES.map((feature, i) => {
            const Icon = ICON_MAP[feature.category] || Code
            const color = CATEGORY_COLORS[feature.category] || 'var(--brand-primary)'
            
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.03 }}
                className="group relative"
              >
                <motion.div 
                  className="h-full p-10 rounded-[48px] border transition-all duration-300 flex flex-col items-center text-center gap-8 bg-[var(--bg-surface)]"
                  style={{ borderColor: 'var(--border-subtle)' }}
                  whileHover={{ y: -8, borderColor: color, boxShadow: `0 32px 64px -16px ${color}10` }}
                >
                  <motion.div 
                    className="w-16 h-16 rounded-[24px] flex items-center justify-center border transition-colors group-hover:scale-110"
                    style={{ background: `${color}10`, borderColor: `${color}20` }}
                  >
                    <Icon size={32} style={{ color }} />
                  </motion.div>
                  
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col items-center gap-2">
                      <motion.h3 className="m-0 text-2xl font-display font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {feature.title}
                      </motion.h3>
                      <Badge variant={feature.status === 'core' ? 'neutral' : feature.status === 'new' ? 'teal' : 'amber'} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                        {feature.status}
                      </Badge>
                    </div>
                    
                    <motion.p className="m-0 text-base leading-relaxed group-hover:opacity-100 transition-opacity font-medium" style={{ color: 'var(--text-muted)' }}>
                      {feature.description}
                    </motion.p>
                  </div>

                  <motion.div 
                    className="w-full p-6 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group-hover:border-[var(--border-strong)] transition-colors"
                  >
                    <motion.code className="font-mono text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>
                      {feature.cli}
                    </motion.code>
                    <Terminal size={14} className="opacity-20 group-hover:opacity-40 transition-opacity" />
                  </motion.div>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Call to Action */}
        <motion.div 
          className="mt-32 p-16 rounded-[80px] border border-dashed border-[var(--border-strong)] text-center flex flex-col items-center gap-8 relative overflow-hidden bg-[var(--bg-overlay)] w-full"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <motion.div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            animate={{ rotate: -360 }}
            transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
          >
             <Share2 size={1000} className="text-[var(--brand-primary)]" />
          </motion.div>
          <Badge variant="teal" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest">Deployment Ready</Badge>
          <motion.h3 className="text-4xl sm:text-6xl font-display font-black m-0 tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
            One daemon to <br />
            <motion.span className="text-[var(--brand-primary)]">rule the swarm.</motion.span>
          </motion.h3>
          <motion.p className="text-xl sm:text-2xl max-w-2xl font-sans" style={{ color: 'var(--text-secondary)' }}>
            Port Daddy is open-source and installs in seconds. Start building your autonomous organization today.
          </motion.p>
          <motion.div className="flex flex-wrap justify-center gap-6">
             <motion.button 
               className="px-12 py-6 rounded-full bg-[var(--brand-primary)] text-[var(--bg-base)] font-black text-xl shadow-xl transition-all flex items-center gap-3"
               whileHover={{ scale: 1.05, y: -4 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => window.location.href = '/tutorials/getting-started'}
             >
               GET STARTED NOW
               <Zap size={24} />
             </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
