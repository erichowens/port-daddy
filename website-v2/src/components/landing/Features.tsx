import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PRODUCT_FEATURES } from '@/data/product'
import { 
  Shield, History, Radio, 
  Anchor, Code 
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  'ports': Anchor,
  'coordination': Radio,
  'security': Shield,
  'observability': History
}

export function Features() {
  return (
    <motion.section 
      id="features" 
      className="py-32 px-4 sm:px-6 lg:px-8 font-sans"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-24 font-sans"
        >
          <Badge variant="teal" className="mb-6 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest font-sans">Product Enumeration</Badge>
          <motion.h2 className="text-4xl sm:text-6xl font-bold mb-8 font-display" style={{ color: 'var(--text-primary)' }}>
            The Definitive <motion.span className="text-[var(--brand-primary)]">Control Plane</motion.span>
          </motion.h2>
          <motion.p className="text-xl max-w-3xl mx-auto leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            Port Daddy provides the foundational primitives required to turn a group of AI agents 
            into a production-grade autonomous organization.
          </motion.p>
        </motion.div>

        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 font-sans">
          {PRODUCT_FEATURES.map((feature, i) => {
            const Icon = ICON_MAP[feature.category] || Code
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -8 }}
                className="font-sans"
              >
                <Card className="h-full border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-all group bg-[var(--bg-surface)] rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl font-sans">
                  <CardContent className="p-10 flex flex-col gap-6 h-full font-sans">
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-[var(--bg-overlay)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:shadow-xl"
                      whileHover={{ rotate: 10, scale: 1.1 }}
                    >
                      <Icon size={28} />
                    </motion.div>

                    <motion.div className="font-sans">
                      <motion.div className="flex items-center gap-2 mb-3 font-sans">
                        <motion.h3 className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                          {feature.title}
                        </motion.h3>
                      </motion.div>
                      <Badge variant={feature.status === 'new' ? 'teal' : feature.status === 'preview' ? 'amber' : 'neutral'} className="font-sans mb-4">
                        {feature.status.toUpperCase()}
                      </Badge>
                    </motion.div>

                    <motion.p className="text-base leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                      {feature.description}
                    </motion.p>

                    <motion.div className="mt-auto pt-8 font-sans">
                      <motion.div className="font-mono text-[11px] px-5 py-3.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] opacity-60 group-hover:opacity-100 group-hover:border-[var(--brand-primary)] transition-all overflow-hidden whitespace-nowrap font-mono">
                        <motion.span className="text-[var(--brand-primary)] font-mono">$ </motion.span>
                        <motion.span className="font-mono">{feature.cli}</motion.span>
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
