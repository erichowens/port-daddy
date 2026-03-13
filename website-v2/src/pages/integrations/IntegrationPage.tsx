import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { INTEGRATIONS } from '@/data/integrations'
import { ChevronLeft, Puzzle, CheckCircle2 } from 'lucide-react'

export function IntegrationPage() {
  const { id } = useParams();
  const integration = INTEGRATIONS.find(i => i.id === id);

  if (!integration) return <motion.div className="p-20 text-center font-sans">Integration not found</motion.div>;

  return (
    <TutorialLayout
      title={`${integration.name} Integration`}
      description={integration.description}
      number="Integration"
      total="Swarm"
      level="Intermediate"
      readTime="5 min read"
    >
      <motion.div className="flex items-center gap-2 mb-8 font-sans">
        <Link to="/integrations" className="text-sm font-bold text-[var(--brand-primary)] no-underline flex items-center gap-1 hover:underline font-sans">
          <ChevronLeft size={14} /> Back to Integrations
        </Link>
      </motion.div>

      <motion.div className="flex flex-col md:flex-row md:items-center gap-8 mb-12 p-8 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl relative overflow-hidden font-sans">
        <motion.div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none font-sans">
           <Puzzle size={200} />
        </motion.div>
        <motion.div className="w-20 h-20 rounded-3xl bg-[var(--bg-base)] flex items-center justify-center text-[var(--brand-primary)] shadow-2xl shrink-0 border border-[var(--border-subtle)]">
          <Puzzle size={40} />
        </motion.div>
        <motion.div className="font-sans">
          <motion.h3 className="m-0 text-3xl font-bold font-display leading-tight" style={{ color: 'var(--text-primary)' }}>
            {integration.name} <motion.span className="opacity-30 font-display">×</motion.span> Port Daddy
          </motion.h3>
          <motion.div className="flex items-center gap-3 mt-3 font-sans">
            <Badge variant={integration.status === 'official' ? 'teal' : 'neutral'} className="font-sans">
              {integration.status} integration
            </Badge>
            <motion.span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] font-sans">Verified for v3.7.0</motion.span>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.section className="mb-12 font-sans">
        <motion.h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Capabilities</motion.h2>
        <motion.div className="grid gap-4 font-sans">
          {integration.details.map((detail, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-sans"
            >
              <CheckCircle2 size={20} className="text-[var(--p-teal-400)] shrink-0 mt-0.5" />
              <motion.p className="m-0 text-base text-[var(--text-secondary)] leading-relaxed font-sans">{detail}</motion.p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section className="mb-12 font-sans">
        <motion.h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Quick Start</motion.h2>
        <motion.p className="mb-6 font-sans text-[var(--text-secondary)]">Integrate {integration.name} with your local Port Daddy daemon using the following pattern:</motion.p>
        <CodeBlock
          language={integration.id === 'langgraph' || integration.id === 'crewai' ? 'python' : 'typescript'}
          children={integration.setupCode}
        />
      </motion.section>

      <motion.section className="font-sans">
        <motion.h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Why use this?</motion.h2>
        <motion.p className="font-sans text-[var(--text-secondary)] leading-relaxed">Port Daddy serves as the shared infrastructure layer for your {integration.name} agents. It provides the necessary state management and resource isolation that primitive agent frameworks lack, turning a group of scripts into a coordinated swarm.</motion.p>
      </motion.section>
    </TutorialLayout>
  )
}
