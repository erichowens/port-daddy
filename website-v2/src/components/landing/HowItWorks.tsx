import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { ArrowRight, Terminal, Zap, Shield, RefreshCw, Cpu, Anchor } from 'lucide-react'

interface Step {
  number: string
  title: string
  description: string
  code: string[]
  color: string
  icon: any
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Atomic Identity',
    description:
      'Summon a session. Port Daddy assigns a stable port and a cryptographic identity, then checks for orphaned work from previous swarms.',
    code: [
      '$ pd begin --identity swarm:analyst',
      '',
      '[pd] Handshake complete · agent-7f3a',
      '  Port 3102 assigned (deterministic)',
      '  Salvage: No dead agents detected',
    ],
    color: 'var(--p-teal-400)',
    icon: Anchor
  },
  {
    number: '02',
    title: 'Harbor Coordination',
    description:
      'Claim files, acquire locks, and broadcast events on Swarm Radio. All inter-agent signaling happens through the local daemon.',
    code: [
      '$ pd files claim src/models/*.py',
      '✓ Claimed · 0 conflicts',
      '',
      '$ pd pub swarm:events "model-ready"',
      '✓ Published to 12 subscribers',
    ],
    color: 'var(--p-amber-400)',
    icon: Zap
  },
  {
    number: '03',
    title: 'Self-Healing Done',
    description:
      "When a task finishes, pd done releases resources. If an agent crashes, the work is escrowed—ready for an Always-On Avatar to salvage.",
    code: [
      '$ pd done --note "Model training complete"',
      '✓ Resources released',
      '✓ Note pinned to harbor history',
    ],
    color: 'var(--p-blue-400)',
    icon: RefreshCw
  },
]

export function HowItWorks() {
  return (
    <motion.section 
      id="how-it-works" 
      className="py-32 px-4 sm:px-6 lg:px-8 font-sans relative"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-32"
        >
          <Badge variant="teal" className="mb-10 px-6 py-2 text-[10px] font-black uppercase tracking-[0.25em] shadow-xl">The Lifecycle</Badge>
          <motion.h2 className="text-5xl sm:text-8xl font-bold font-display tracking-tight leading-[0.95] mb-10" style={{ color: 'var(--text-primary)' }}>
            One daemon. <motion.span className="text-[var(--brand-primary)]">Infinite Swarms.</motion.span>
          </motion.h2>
          <motion.p className="text-xl sm:text-2xl max-w-4xl mx-auto leading-relaxed opacity-70" style={{ color: 'var(--text-secondary)' }}>
            Port Daddy manages the low-level coordination so your agents can focus on the logic. 
            From initial handshake to crash recovery, it is the bedrock of your autonomous team.
          </motion.p>
        </motion.div>

        <motion.div className="grid lg:grid-cols-3 gap-12">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative group"
            >
              <motion.div className="space-y-10">
                <motion.div className="flex items-center justify-between">
                   <motion.div 
                     className="w-20 h-20 rounded-[32px] flex items-center justify-center border transition-all duration-500 group-hover:scale-110"
                     style={{ background: `${step.color}10`, borderColor: `${step.color}20` }}
                   >
                     <step.icon size={40} style={{ color: step.color }} />
                   </motion.div>
                   <motion.span className="text-6xl font-display font-black opacity-10 group-hover:opacity-20 transition-opacity" style={{ color: step.color }}>
                     {step.number}
                   </motion.span>
                </motion.div>

                <motion.div className="space-y-4">
                   <motion.h3 className="text-3xl font-display font-black m-0" style={{ color: 'var(--text-primary)' }}>{step.title}</motion.h3>
                   <motion.p className="text-lg leading-relaxed opacity-60 m-0 group-hover:opacity-100 transition-opacity">
                     {step.description}
                   </motion.p>
                </motion.div>

                <motion.div 
                  className="p-8 rounded-[40px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-sm leading-relaxed relative overflow-hidden group-hover:border-[var(--border-strong)] transition-all shadow-xl"
                >
                   <motion.div className="absolute top-0 right-0 p-4 opacity-10">
                      <Terminal size={16} />
                   </motion.div>
                   {step.code.map((line, j) => (
                     <motion.div key={j} className={line.startsWith('$') ? 'text-[var(--brand-primary)] font-bold mb-1' : 'opacity-60'}>
                       {line}
                     </motion.div>
                   ))}
                </motion.div>
              </motion.div>
              
              {i < STEPS.length - 1 && (
                <motion.div className="hidden lg:block absolute top-10 -right-6 z-20">
                   <ArrowRight size={24} className="opacity-20" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Self-Healing / Always-On Highlight */}
        <motion.div 
          className="mt-32 p-12 sm:p-20 rounded-[80px] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-base)] border border-[var(--border-strong)] relative overflow-hidden flex flex-col lg:flex-row items-center gap-16"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
           <motion.div className="flex-1 space-y-8 relative z-10">
              <Badge variant="teal" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-2xl">Autonomous Resilience</Badge>
              <motion.h3 className="text-4xl sm:text-6xl font-display font-black leading-[0.95]" style={{ color: 'var(--text-primary)' }}>
                The <motion.span className="text-[var(--p-teal-400)]">Self-Healing</motion.span> Swarm.
              </motion.h3>
              <motion.p className="text-xl leading-relaxed opacity-70 max-w-xl">
                Port Daddy doesn't just manage ports—it manages <strong>resilience</strong>. If a critical background agent dies, its state, file claims, and notes are held in an escrow harbor until a replacement is spawned to take its place.
              </motion.p>
              <motion.div className="flex items-center gap-6 pt-4">
                 <motion.div className="flex -space-x-4">
                    {[1,2,3].map(i => (
                      <motion.div key={i} className="w-12 h-12 rounded-full border-4 border-[var(--bg-surface)] bg-[var(--p-teal-500)]/20 flex items-center justify-center">
                         <Cpu size={20} className="text-[var(--p-teal-400)]" />
                      </motion.div>
                    ))}
                 </motion.div>
                 <motion.p className="text-sm font-black uppercase tracking-widest opacity-40">3 Active Background Avatars</motion.p>
              </motion.div>
           </motion.div>
           
           <motion.div className="flex-1 w-full relative">
              <motion.div className="absolute inset-0 bg-[var(--brand-primary)] opacity-[0.05] blur-[100px] rounded-full" />
              <motion.div className="relative p-10 rounded-[48px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-2xl space-y-6">
                 <motion.div className="flex items-center justify-between">
                    <motion.span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Resurrection Queue</motion.span>
                    <Badge variant="teal">Escrow Active</Badge>
                 </motion.div>
                 <motion.div className="space-y-4">
                    <motion.div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--p-teal-500)]/20 flex items-center justify-between">
                       <motion.div className="flex items-center gap-4">
                          <RefreshCw size={16} className="text-[var(--p-teal-400)] animate-spin-slow" />
                          <motion.span className="text-sm font-bold">Refactor-Agent state preserved</motion.span>
                       </motion.div>
                       <motion.span className="text-[10px] font-mono opacity-40">2m ago</motion.span>
                    </motion.div>
                    <motion.div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-transparent opacity-40 flex items-center justify-between">
                       <motion.div className="flex items-center gap-4">
                          <Shield size={16} />
                          <motion.span className="text-sm font-bold">Harbor tokens locked</motion.span>
                       </motion.div>
                       <motion.span className="text-[10px] font-mono opacity-40">Active</motion.span>
                    </motion.div>
                 </motion.div>
              </motion.div>
           </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
