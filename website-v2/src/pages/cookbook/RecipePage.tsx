import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { COOKBOOK_RECIPES } from '@/data/cookbook'
import { ChevronLeft, Shield, Activity, Zap, MessageSquare, UserMinus, Network } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const ICON_MAP: Record<string, any> = {
  Shield,
  Activity,
  Zap,
  MessageSquare,
  UserMinus,
  Network
}

export function RecipePage() {
  const { id } = useParams();
  const recipe = COOKBOOK_RECIPES.find(r => r.id === id);

  if (!recipe) return <motion.div className="p-20 text-center font-sans">Recipe not found</motion.div>;

  const Icon = ICON_MAP[recipe.icon] || Zap;

  return (
    <TutorialLayout
      title={recipe.title}
      description={recipe.description}
      number="Pattern"
      total="Cookbook"
      level={recipe.difficulty === 'advanced' ? 'Advanced' : 'Intermediate'}
      readTime="5 min read"
    >
      <motion.div className="font-sans">
        <motion.div className="flex items-center gap-2 mb-8 font-sans">
          <Link to="/cookbook" className="text-sm font-bold text-[var(--brand-primary)] no-underline flex items-center gap-1 hover:underline font-sans">
            <ChevronLeft size={14} /> Back to Cookbook
          </Link>
        </motion.div>

        <motion.div className="flex items-center gap-6 mb-12 p-8 rounded-[32px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] shadow-xl font-sans">
          <motion.div className="w-16 h-16 rounded-2xl bg-[var(--p-amber-400)]/10 flex items-center justify-center text-[var(--p-amber-400)] shadow-inner">
            <Icon size={32} />
          </motion.div>
          <motion.div className="font-sans">
            <Badge variant={recipe.difficulty === 'advanced' ? 'neutral' : 'amber'} className="mb-2 font-sans">
              {recipe.difficulty.toUpperCase()} PATTERN
            </Badge>
            <motion.h3 className="m-0 text-3xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>{recipe.title}</motion.h3>
          </motion.div>
        </motion.div>

        <motion.div className="prose prose-invert max-w-none tutorial-content leading-relaxed text-lg font-sans" style={{ color: 'var(--text-secondary)' }}>
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <motion.div className="my-6 font-mono">
                    <CodeBlock
                      language={match[1]}
                    >
                      {String(children).replace(/\n$/, '')}
                    </CodeBlock>
                  </motion.div>
                ) : (
                  <motion.code className="px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] border border-[var(--border-subtle)] text-[var(--brand-primary)] font-mono" {...props}>
                    {children}
                  </motion.code>
                )
              }
            }}
          >
            {recipe.body}
          </ReactMarkdown>
        </motion.div>
      </motion.div>
    </TutorialLayout>
  )
}
