import * as React from 'react'
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Clock, BookOpen, ChevronRight, Home, Layout, List } from 'lucide-react'

import { Footer } from '@/components/layout/Footer'

interface TutorialLayoutProps {
  title: string
  description: string
  number: string
  total: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  readTime: string
  children: React.ReactNode
  prev?: { title: string; href: string }
  next?: { title: string; href: string }
}

export function TutorialLayout({
  title,
  description,
  number,
  total,
  level,
  readTime,
  children,
  prev,
  next
}: TutorialLayoutProps) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  const isHome = useLocation().pathname === '/'

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen font-sans flex flex-col" 
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'var(--nav-height)' }}
    >
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-[var(--brand-primary)] z-[60] origin-left"
        style={{ scaleX, top: 'var(--nav-height)' }}
      />

      {/* Hero */}
      <motion.section
        className="py-20 px-4 sm:px-6 lg:px-8 border-b relative overflow-hidden shrink-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <motion.div 
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
          style={{ background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)' }} 
        />
        
        <motion.div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
          <motion.nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mb-8 font-sans" style={{ color: 'var(--text-muted)' }}>
            <Link to="/" className="hover:text-[var(--text-primary)] transition-colors no-underline flex items-center gap-1.5 font-sans">
              <Home size={12} />
              Home
            </Link>
            <ChevronRight size={12} className="opacity-40" />
            <Link to="/tutorials" className="hover:text-[var(--text-primary)] transition-colors no-underline flex items-center gap-1.5 font-sans">
              <BookOpen size={12} />
              Academy
            </Link>
            <ChevronRight size={12} className="opacity-40" />
            <motion.span style={{ color: 'var(--brand-primary)' }} className="flex items-center gap-1.5 font-sans font-black">
              <Layout size={12} />
              Lesson {number}
            </motion.span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <motion.div className="flex items-center gap-3 mb-6 font-sans">
              <Badge variant={level === 'Beginner' ? 'teal' : level === 'Intermediate' ? 'amber' : 'neutral'}>
                {level}
              </Badge>
              <motion.div className="h-[1px] w-8 bg-[var(--border-strong)] opacity-30" />
              <motion.span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 font-mono">
                Port Daddy v3.7.0
              </motion.span>
            </motion.div>

            <motion.h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight font-display" style={{ color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {title}
            </motion.h1>
            <motion.p className="text-xl sm:text-2xl max-w-3xl leading-relaxed mb-10 mx-auto font-sans" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </motion.p>

            <motion.div className="flex flex-wrap items-center justify-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] font-sans" style={{ color: 'var(--text-muted)' }}>
              <motion.div className="flex items-center gap-2.5">
                <Clock size={16} className="text-[var(--brand-primary)]" />
                {readTime}
              </motion.div>
              <motion.div className="flex items-center gap-2.5">
                <List size={16} className="text-[var(--brand-primary)]" />
                Lesson {number} of {total}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Content */}
      <motion.div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 relative font-sans">
        <motion.article className="prose dark:prose-invert max-w-none tutorial-content leading-relaxed text-lg font-sans" style={{ color: 'var(--text-secondary)' }}>
          {children}
        </motion.article>

        {/* Navigation */}
        <motion.div className="mt-24 pt-12 border-t font-sans" style={{ borderColor: 'var(--border-subtle)' }}>
          <motion.div className="grid sm:grid-cols-2 gap-8 font-sans">
            {prev ? (
              <Link
                to={prev.href}
                className="group block p-8 rounded-3xl transition-all no-underline"
                style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)' }}
              >
                <motion.div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-50 font-sans" style={{ color: 'var(--text-muted)' }}>Previous Lesson</motion.div>
                <motion.div className="text-xl font-bold flex items-center gap-3 transition-transform group-hover:-translate-x-2 font-display" style={{ color: 'var(--text-primary)' }}>
                  ← {prev.title}
                </motion.div>
              </Link>
            ) : <motion.div />}

            {next ? (
              <Link
                to={next.href}
                className="group block p-8 rounded-3xl transition-all text-right no-underline shadow-xl shadow-transparent hover:shadow-[var(--brand-primary)]/5"
                style={{ border: '2px solid var(--brand-primary)', background: 'var(--bg-surface)' }}
              >
                <motion.div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-60 font-sans" style={{ color: 'var(--brand-primary)' }}>Next Lesson</motion.div>
                <motion.div className="text-xl font-bold flex items-center justify-end gap-3 transition-transform group-hover:translate-x-2 font-display" style={{ color: 'var(--text-primary)' }}>
                  {next.title} <ChevronRight size={24} className="text-[var(--brand-primary)]" />
                </motion.div>
              </Link>
            ) : (
              <motion.div className="col-span-full p-16 rounded-[48px] flex flex-col items-center justify-center text-center gap-8 border border-dashed shadow-2xl relative overflow-hidden font-sans mx-auto w-full max-w-3xl" style={{ borderColor: 'var(--brand-primary)', background: 'var(--bg-overlay)' }}>
                 <motion.div 
                   className="absolute inset-0 opacity-5 pointer-events-none"
                   animate={{ rotate: 360 }}
                   transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
                 >
                    <BookOpen size={600} />
                 </motion.div>
                 
                 <motion.div className="relative z-10 flex flex-col items-center gap-6">
                    <Badge variant="teal" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">Academy Complete</Badge>
                    <motion.h3 className="text-4xl font-bold font-display m-0" style={{ color: 'var(--text-primary)' }}>You've mastered the basics!</motion.h3>
                    <motion.p className="text-lg font-medium max-w-md font-sans" style={{ color: 'var(--text-secondary)' }}>
                      The harbor is now open. Dispatch your swarms and begin the venture.
                    </motion.p>
                    <Link to="/docs" className="no-underline">
                      <motion.div 
                        className="px-10 py-5 rounded-2xl bg-[var(--brand-primary)] text-[var(--bg-base)] font-bold shadow-xl shadow-[var(--brand-primary)]/20 transition-all font-sans"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        View Documentation Reference
                      </motion.div>
                    </Link>
                 </motion.div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>

      <Footer />

      {/* CSS for better tutorial typography */}
      <style dangerouslySetInnerHTML={{ __html: `
        .tutorial-content h2 {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 4rem;
          margin-bottom: 1.5rem;
          font-family: var(--p-font-display);
          letter-spacing: -0.02em;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0.5rem;
        }
        .tutorial-content h3 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 3rem;
          margin-bottom: 1rem;
          font-family: var(--p-font-display);
        }
        .tutorial-content p {
          margin-bottom: 1.5rem;
          line-height: 1.8;
          font-family: var(--p-font-sans);
        }
        .tutorial-content ul, .tutorial-content ol {
          margin-bottom: 2rem;
          padding-left: 1.5rem;
          font-family: var(--p-font-sans);
        }
        .tutorial-content li {
          margin-bottom: 0.75rem;
        }
        .tutorial-content pre {
          background: var(--bg-surface) !important;
          padding: 1.5rem !important;
          margin: 2.5rem 0 !important;
          border-radius: 1.5rem !important;
          border: 1px solid var(--border-subtle) !important;
        }
        .tutorial-content code {
          background: var(--interactive-active);
          color: var(--brand-primary);
          padding: 0.2rem 0.4rem;
          border-radius: 0.4rem;
          font-weight: 600;
          font-family: var(--p-font-mono);
        }
        .tutorial-content pre code {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          color: inherit !important;
          font-weight: inherit !important;
        }
        .tutorial-content strong {
          color: var(--text-primary);
          font-weight: 700;
        }
      `}} />
    </motion.div>
  )
}
