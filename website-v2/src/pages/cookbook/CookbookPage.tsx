}
import { motion } from "framer-motion"
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Link } from 'react-router-dom'
import { Book, Shield, Activity, Zap, MessageSquare, UserMinus, ChevronRight } from 'lucide-react'
import { COOKBOOK_RECIPES } from '@/data/cookbook'
import type { Recipe } from '@/data/cookbook'
import { Footer } from '@/components/layout/Footer'

const ICON_MAP: Record<string, any> = {
  Shield,
  Activity,
  Zap,
  MessageSquare,
  UserMinus,
}

export function CookbookPage() {
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
            <Badge variant="amber" className="mb-6 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">Orchestration Patterns</Badge>
            <motion.h1 className="text-5xl sm:text-7xl font-bold mb-8 tracking-tight font-display">
              The <motion.span className="text-[var(--p-amber-400)]">Cookbook</motion.span>
            </motion.h1>
            <motion.p className="text-xl sm:text-2xl max-w-3xl leading-relaxed text-[var(--text-secondary)] font-sans">
              Advanced recipes for coordinating agentic swarms. 
              Proven patterns for scale, resilience, and cryptographic security.
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 font-sans">
        <motion.div className="grid md:grid-cols-2 gap-10">
          {COOKBOOK_RECIPES.map((recipe, i) => {
            const Icon = ICON_MAP[recipe.icon] || Book
            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:border-[var(--p-amber-400)] transition-all group rounded-[40px] overflow-hidden shadow-sm hover:shadow-2xl">
                  <CardContent className="p-10 flex flex-col gap-6 font-sans h-full">
                    <motion.div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[var(--p-amber-400)]/10 text-[var(--p-amber-400)] shadow-inner">
                      <Icon size={32} />
                    </motion.div>
                    <motion.div className="flex items-center justify-between font-sans">
                      <motion.h3 className="text-2xl font-bold font-display">{recipe.title}</motion.h3>
                      <Badge variant={recipe.difficulty === 'advanced' ? 'neutral' : 'teal'}>
                        {recipe.difficulty}
                      </Badge>
                    </motion.div>
                    <motion.p className="text-lg text-[var(--text-secondary)] leading-relaxed font-sans">
                      {recipe.description}
                    </motion.p>
                    <Link to={`/cookbook/${recipe.id}`} className="mt-auto pt-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--p-amber-400)] no-underline group-hover:gap-4 transition-all font-sans">
                      Read Pattern <ChevronRight size={18} />
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>
      <Footer />
    </motion.div>
  )
