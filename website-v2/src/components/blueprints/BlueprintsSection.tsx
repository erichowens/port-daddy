import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Link } from 'react-router-dom'
import { BLUEPRINTS } from '@/data/blueprints'
import { ArrowRight, Code, Search, Network, Shield } from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  pipeline: Code,
  research: Search,
  multiplayer: Network,
  ops: Shield,
}

export function BlueprintsSection() {
  return (
    <motion.section 
      className="py-32 px-4 sm:px-6 lg:px-8 bg-[var(--bg-base)] font-sans"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans">
        <motion.div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20 font-sans">
          <motion.div className="max-w-2xl font-sans">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="teal" className="mb-6 px-4 py-1.5 uppercase tracking-widest text-[10px] font-sans">Product Blueprints</Badge>
            </motion.div>
            <motion.h2 
              className="text-5xl sm:text-6xl font-bold tracking-tight font-display mb-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Build your next <motion.span className="text-[var(--brand-primary)]">Agentic App</motion.span>
            </motion.h2>
            <motion.p 
              className="text-xl text-[var(--text-secondary)] leading-relaxed font-sans"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Don't start from scratch. Use our battle-tested templates to launch 
              complex multi-agent systems in minutes.
            </motion.p>
          </motion.div>
          <motion.button 
            className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group font-sans"
            whileHover={{ x: 5 }}
          >
            View All Templates <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        <motion.div className="grid md:grid-cols-2 gap-10 font-sans">
          {BLUEPRINTS.map((bp, i) => {
            const Icon = ICON_MAP[bp.hero] || Code
            return (
              <motion.div
                key={bp.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -8 }}
                className="font-sans"
              >
                <Card className="group overflow-hidden border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-all bg-[var(--bg-surface)] shadow-sm hover:shadow-2xl rounded-[40px]">
                  <CardContent className="p-0 flex flex-col sm:flex-row h-full font-sans">
                    <motion.div className="sm:w-1/3 bg-[var(--bg-overlay)] flex items-center justify-center p-10 transition-colors group-hover:bg-[rgba(58,173,173,0.05)] font-sans">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon size={56} className="text-[var(--brand-primary)] opacity-80" />
                      </motion.div>
                    </motion.div>
                    <motion.div className="p-10 flex-1 flex flex-col justify-center font-sans">
                      <motion.h3 className="text-2xl font-bold font-display mb-4" style={{ color: 'var(--text-primary)' }}>{bp.title}</motion.h3>
                      <motion.p className="text-base text-[var(--text-secondary)] leading-relaxed mb-8 font-sans">
                        {bp.description}
                      </motion.p>
                      <motion.div className="flex items-center gap-6 mt-auto font-sans">
                        <Link 
                          to={`/templates/${bp.id}`}
                          className="px-6 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] text-xs font-black uppercase tracking-widest hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all shadow-sm no-underline font-sans"
                        >
                          Get Template
                        </Link>
                        <motion.span className="text-[10px] font-mono text-[var(--text-muted)] opacity-40 group-hover:opacity-100 transition-opacity">
                          {bp.templatePath}
                        </motion.span>
                      </motion.div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
