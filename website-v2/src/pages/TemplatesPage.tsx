import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { MessageSquare, Gavel, Trash2, ArrowRight } from 'lucide-react'

export function TemplatesPage() {
  const templates = [
    {
      title: 'Encrypted Messenger',
      description: 'End-to-End Encrypted messaging between agents using asymmetric Harbor Cards and the inbox dead-drop.',
      icon: <MessageSquare className="w-6 h-6 text-[var(--brand-primary)]" />,
      complexity: 'Beginner',
      path: 'templates/encrypted-messenger'
    },
    {
      title: 'Resource Auction',
      description: 'Stigmergic task allocation. Agents bid on semantic tokens using pheromones to coordinate without a master.',
      icon: <Gavel className="w-6 h-6 text-[var(--brand-secondary)]" />,
      complexity: 'Advanced',
      path: 'templates/resource-auction'
    },
    {
      title: 'Auto-Reaper',
      description: 'A lifecycle guard that watches for "Man Overboard" signals and automatically prunes zombie processes.',
      icon: <Trash2 className="w-6 h-6 text-[var(--status-error)]" />,
      complexity: 'Intermediate',
      path: 'templates/auto-reaper'
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-24 bg-[var(--bg-base)]">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <header className="mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl sm:text-7xl font-display font-black tracking-tighter mb-6 text-[var(--text-primary)]"
          >
            Built on <span className="text-[var(--brand-primary)]">Anchor.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed"
          >
            Start building secure, coordinate agent swarms today. These exemplary templates show you exactly how to use our core primitives.
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((template, i) => (
            <motion.div
              key={template.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="p-8 rounded-[32px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-all flex flex-col gap-6 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-center group-hover:scale-110 transition-transform">
                {template.icon}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">{template.title}</h2>
                  <Badge variant="neutral" className="text-[8px] font-black uppercase tracking-widest">{template.complexity}</Badge>
                </div>
                <p className="text-lg text-[var(--text-secondary)] leading-snug">
                  {template.description}
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-[var(--brand-primary)] cursor-pointer">
                View Code <ArrowRight size={16} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
