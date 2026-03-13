import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Github, Twitter, Book, PlayCircle, ShieldCheck } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { theme } = useTheme()

  const footerMotion = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5 }
  }

  return (
    <motion.footer
      {...footerMotion}
      className="py-20 px-4 sm:px-6 lg:px-8 border-t relative overflow-hidden"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-base)' }}
    >
      {/* Decorative glow */}
      <motion.div 
        className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
        style={{ background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)' }} 
      />

      <motion.div className="max-w-7xl mx-auto relative z-10">
        <motion.div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand */}
          <motion.div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 no-underline mb-6 group">
              <motion.img
                src={theme === 'dark' ? '/pd_logo_darkmode.svg' : '/pd_logo.svg'}
                alt="Port Daddy"
                className="transition-transform group-hover:scale-110 group-hover:rotate-3"
                style={{ height: '48px', width: 'auto' }}
              />
              <motion.span 
                className="font-bold text-2xl tracking-tight font-display" 
                style={{ color: 'var(--text-primary)' }}
              >
                Port Daddy
              </motion.span>
            </Link>
            <motion.p 
              className="text-base max-w-xs mb-8 leading-relaxed font-sans" 
              style={{ color: 'var(--text-secondary)' }}
            >
              The unified orchestration layer for autonomous AI agent workflows. 
              Built for speed, safety, and scale.
            </motion.p>
            <motion.div className="flex items-center gap-4">
              <motion.a href="https://github.com/erichowens/port-daddy" target="_blank" rel="noopener noreferrer" 
                className="p-2.5 rounded-xl transition-all hover:bg-[var(--interactive-active)] hover:text-[var(--brand-primary)]" 
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <Github size={20} />
              </motion.a>
              <motion.a href="https://twitter.com/erichowens" target="_blank" rel="noopener noreferrer" 
                className="p-2.5 rounded-xl transition-all hover:bg-[var(--interactive-active)] hover:text-[var(--brand-primary)]" 
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <Twitter size={20} />
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Resources */}
          <motion.div>
            <motion.h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 font-sans" style={{ color: 'var(--text-muted)' }}>Resources</motion.h4>
            <motion.ul className="space-y-4 list-none p-0 m-0">
              <motion.li>
                <Link to="/docs" className="text-sm font-bold no-underline transition-colors flex items-center gap-2 font-sans" style={{ color: 'var(--text-secondary)' }}>
                  <Book size={14} className="opacity-40" />
                  Documentation
                </Link>
              </motion.li>
              <motion.li>
                <Link to="/tutorials" className="text-sm font-bold no-underline transition-colors flex items-center gap-2 font-sans" style={{ color: 'var(--text-secondary)' }}>
                  <PlayCircle size={14} className="opacity-40" />
                  Tutorials
                </Link>
              </motion.li>
              <motion.li>
                <Link to="/dashboard" className="text-sm font-bold no-underline transition-colors font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Live Dashboard
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          {/* Integration */}
          <motion.div>
            <motion.h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 font-sans" style={{ color: 'var(--text-muted)' }}>Integration</motion.h4>
            <motion.ul className="space-y-4 list-none p-0 m-0">
              <motion.li>
                <Link to="/mcp" className="text-sm font-bold no-underline transition-colors flex items-center gap-2 font-sans" style={{ color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={14} className="opacity-40" />
                  MCP Server
                </Link>
              </motion.li>
              <motion.li>
                <Link to="/integrations" className="text-sm font-bold no-underline transition-colors font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Ecosystem
                </Link>
              </motion.li>
              <motion.li>
                <Link to="/cookbook" className="text-sm font-bold no-underline transition-colors font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Cookbook
                </Link>
              </motion.li>
            </motion.ul>
          </motion.div>

          {/* Legal */}
          <motion.div>
            <motion.h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 font-sans" style={{ color: 'var(--text-muted)' }}>Legal</motion.h4>
            <motion.ul className="space-y-4 list-none p-0 m-0">
              <motion.li className="text-sm font-bold transition-colors font-sans" style={{ color: 'var(--text-secondary)' }}>
                MIT License
              </motion.li>
              <motion.li className="text-sm font-bold transition-colors font-sans" style={{ color: 'var(--text-secondary)' }}>
                © {currentYear} curiositech
              </motion.li>
            </motion.ul>
          </motion.div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div className="pt-10 border-t flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border-subtle)' }}>
          <motion.div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest opacity-40 font-sans" style={{ color: 'var(--text-muted)' }}>
            <motion.span>Built by Erich Owens</motion.span>
            <motion.span className="w-1 h-1 rounded-full bg-current" />
            <motion.span>v3.7.0 "The Control Plane"</motion.span>
          </motion.div>
          <motion.div className="flex items-center gap-6">
            <motion.div className="flex items-center gap-1.5 font-sans">
              <motion.div className="w-2 h-2 rounded-full bg-[var(--status-success)] pulse-active" />
              <motion.span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Daemon Stable</motion.span>
            </motion.div>
            <motion.div className="text-[10px] font-black uppercase tracking-widest font-sans" style={{ color: 'var(--text-muted)' }}>
              Built for agents, by agents
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.footer>
  )
}
