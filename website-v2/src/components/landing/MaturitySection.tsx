import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { ShieldCheck, HardDrive, Lock, Activity, Globe, Scale } from 'lucide-react'

const MATURITY_FEATURES = [
  { icon: ShieldCheck, title: 'E2EE Networking', description: 'V4 Anchor Protocol provides end-to-end encrypted tunnels via Noise Protocol (Noise_XX) over Lighthouses.' },
  { icon: Lock, title: 'Cryptographic Harbors', description: 'Enforce permission boundaries at the daemon level. Agents without tokens are blocked from system-level resources.' },
  { icon: HardDrive, title: 'Immutable Auditing', description: 'Every port claim, note, and message is persisted to an append-only SQLite log for compliance and post-mortems.' },
  { icon: Scale, title: 'Resource Enforcement', description: 'Monitor agent compute usage. Auto-salvage rogue agents that exceed memory or CPU quotas before they melt your machine.' },
  { icon: Activity, title: 'High-Availability Daemon', description: 'Daemon self-healing with zero-downtime reloads and WAL-mode SQLite persistence for mission-critical swarms.' },
  { icon: Globe, title: 'Cross-Platform Core', description: 'Native Unix Sockets for performance, falling back to secure TCP/Named Pipes for Windows and container environments.' }
]

export function MaturitySection() {
  return (
    <motion.section 
      className="py-32 px-4 sm:px-6 lg:px-8 bg-[var(--bg-surface)] border-t border-b border-[var(--border-subtle)] relative overflow-hidden font-sans"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div 
        className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
      >
        <Scale size={600} />
      </motion.div>
      
      <motion.div className="max-w-7xl mx-auto relative z-10 font-sans">
        <motion.div className="text-center mb-24 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Badge variant="neutral" className="mb-6 px-4 py-1.5 uppercase tracking-widest text-[10px] font-sans">Enterprise Maturity</Badge>
          </motion.div>
          <motion.h2 
            className="text-5xl sm:text-6xl font-bold tracking-tight font-display mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Production-grade <motion.span style={{ color: 'var(--brand-primary)' }}>Agentic Infrastructure</motion.span>
          </motion.h2>
          <motion.p 
            className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Beyond port management. Port Daddy provides the security, stability, 
            and observability required for scaling autonomous software organizations.
          </motion.p>
        </motion.div>

        <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 font-sans">
          {MATURITY_FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col gap-6 p-10 rounded-[40px] transition-all hover:bg-[var(--bg-overlay)] group border border-transparent hover:border-[var(--border-subtle)] shadow-sm hover:shadow-xl font-sans"
              >
                <motion.div 
                  className="w-16 h-14 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--brand-primary)] shadow-inner group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Icon size={28} />
                </motion.div>
                <motion.div className="font-sans">
                  <motion.h3 className="text-2xl font-bold font-display mb-4">{feat.title}</motion.h3>
                  <motion.p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans opacity-80 group-hover:opacity-100 transition-opacity">
                    {feat.description}
                  </motion.p>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
