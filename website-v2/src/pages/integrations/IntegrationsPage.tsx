import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { Boxes, ChevronRight } from 'lucide-react'
import { INTEGRATIONS } from '@/data/integrations'
import { Footer } from '@/components/layout/Footer'

export function IntegrationsPage() {
  return (
    <motion.div 
      className="min-h-screen font-sans" 
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'var(--nav-height)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.section 
        className="py-32 px-4 sm:px-6 lg:px-8 border-b font-sans" 
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <motion.div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="teal" className="mb-6 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest font-sans">The Swarm Ecosystem</Badge>
            <motion.h1 className="text-5xl sm:text-7xl font-bold mb-8 tracking-tight font-display">
              Connect <motion.span className="text-[var(--brand-primary)]">Everything</motion.span>
            </motion.h1>
            <motion.p className="text-xl sm:text-2xl max-w-3xl leading-relaxed text-[var(--text-secondary)] font-sans">
              Port Daddy is the glue for the agentic era. 
              Native integrations for LangGraph, AutoGen, CrewAI, and the modern AI stack.
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 font-sans">
        <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 font-sans">
          {INTEGRATIONS.map((int, i) => (
            <motion.div
              key={int.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="font-sans"
            >
              <Card className="h-full hover:border-[var(--brand-primary)] transition-all group rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl font-sans">
                <CardContent className="p-8 flex flex-col gap-6 font-sans h-full">
                  <motion.div className="flex items-center justify-between font-sans">
                    <motion.div className="w-12 h-12 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--brand-primary)] shadow-inner">
                      <Boxes size={24} />
                    </motion.div>
                    <Badge variant={int.status === 'official' ? 'teal' : int.status === 'preview' ? 'amber' : 'neutral'} className="font-sans">
                      {int.status}
                    </Badge>
                  </motion.div>
                  <motion.h3 className="text-2xl font-bold font-display">{int.name}</motion.h3>
                  <motion.p className="text-base text-[var(--text-secondary)] leading-relaxed font-sans">
                    {int.description}
                  </motion.p>
                  <Link to={`/integrations/${int.id}`} className="mt-auto pt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--brand-primary)] no-underline group-hover:gap-4 transition-all font-sans">
                    Integration Guide <ChevronRight size={18} />
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      <Footer />
    </motion.div>
  )
}
