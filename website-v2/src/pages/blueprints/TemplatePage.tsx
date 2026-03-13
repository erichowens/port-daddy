}
import { motion } from "framer-motion"
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { BLUEPRINTS } from '@/data/blueprints'
import { ChevronLeft, Box } from 'lucide-react'

export function TemplatePage() {
  const { id } = useParams();
  const bp = BLUEPRINTS.find(b => b.id === id);

  if (!bp) return <motion.div className="p-20 text-center font-sans">Blueprint not found</motion.div>;

  return (
    <TutorialLayout
      title={bp.title}
      description={bp.description}
      number="Blueprint"
      total="Scaffold"
      level="Intermediate"
      readTime="1 min setup"
    >
      <motion.div className="flex items-center gap-2 mb-8 font-sans">
        <Link to="/#blueprints" className="text-sm font-bold text-[var(--brand-primary)] no-underline flex items-center gap-1 hover:underline font-sans">
          <ChevronLeft size={14} /> Back to Blueprints
        </Link>
      </motion.div>

      <motion.div className="flex items-center gap-6 mb-12 p-8 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl font-sans">
        <motion.div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] shadow-inner">
          <Box size={32} />
        </motion.div>
        <motion.div className="font-sans">
          <Badge variant="teal" className="mb-2">
            OFFICIAL TEMPLATE
          </Badge>
          <motion.h3 className="m-0 text-3xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>{bp.title}</motion.h3>
        </motion.div>
      </motion.div>

      <motion.section className="mb-12 font-sans">
        <motion.h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Installation</motion.h2>
        <motion.p className="mb-6 leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>Initialize this blueprint in a new directory using the Port Daddy CLI:</motion.p>
        <CodeBlock
          language="bash"
          code={`mkdir ${bp.id}\ncd ${bp.id}\n\npd init --template ${bp.id}\npd up`}
        />
      </motion.section>

      <motion.section className="font-sans">
        <motion.h2 className="text-2xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>What's included?</motion.h2>
        <motion.ul className="space-y-3 list-none p-0 m-0 font-sans">
          <motion.li className="flex items-start gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] mt-1 font-sans">✓</motion.span>
            <motion.span className="font-sans">Pre-configured <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">.portdaddyrc</motion.code> for the full stack</motion.span>
          </motion.li>
          <motion.li className="flex items-start gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] mt-1 font-sans">✓</motion.span>
            <motion.span className="font-sans">Mock agents demonstrating {bp.title.toLowerCase()} coordination patterns</motion.span>
          </motion.li>
          <motion.li className="flex items-start gap-3 font-sans">
            <motion.span className="text-[var(--brand-primary)] mt-1 font-sans">✓</motion.span>
            <motion.span className="font-sans">Local <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">.claude/skills</motion.code> specific to the architecture</motion.span>
          </motion.li>
        </motion.ul>
      </motion.section>
    </TutorialLayout>
  )
