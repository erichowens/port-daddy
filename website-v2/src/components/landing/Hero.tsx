import * as React from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import * as Tabs from '@radix-ui/react-tabs'
import { useTheme } from '@/lib/theme'
import { Copy, Check, Terminal, Zap, Shield, History } from 'lucide-react'
import { MaritimeSignalRow } from '@/components/viz/MaritimeFlags'

const RAINBOW_SEGMENTS = [
  '#4285f4', '#34a853', '#fbbc04', '#fa7b17', '#ea4335', '#a142f4', '#24c1e0'
]

function CopyButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.button
      onClick={handleCopy}
      className={`p-1.5 rounded-md transition-all hover:bg-[var(--interactive-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {copied ? <Check size={14} className="text-[var(--status-success)]" /> : <Copy size={14} />}
    </motion.button>
  )
}

const CHANGELOG_ITEMS = [
  { version: 'v3.7.0', label: 'Harbors', badge: 'new', text: 'Permission namespaces with HMAC-signed tokens.', color: 'var(--p-teal-400)', icon: Shield },
  { version: 'v3.7.0', label: 'pd spawn', badge: 'new', text: 'Launch AI agents with coordination auto-wired.', color: 'var(--p-amber-400)', icon: Zap },
  { version: 'v3.7.0', label: 'Timeline', badge: 'new', text: 'Unified Swarm Radio merging infra logs and agent notes.', color: 'var(--p-blue-400)', icon: History },
]

const INSTALL_TABS = [
  { id: 'brew', label: 'Homebrew', commands: ['brew tap erichowens/port-daddy', 'brew install port-daddy'], full: 'brew tap erichowens/port-daddy && brew install port-daddy' },
  { id: 'npm', label: 'npm / npx', commands: ['npm install -g port-daddy'], full: 'npm install -g port-daddy' },
]

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

export function Hero() {
  const [activeTab, setActiveTab] = React.useState('brew')
  const [activePanel, setActivePanel] = React.useState<'changelog' | 'tutorials'>('changelog')
  const { theme } = useTheme()
  const { scrollY } = useScroll()
  
  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const rotate = useTransform(scrollY, [0, 1000], [0, 45])

  return (
    <motion.section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center overflow-hidden py-24 font-sans"
      style={{ paddingTop: 'calc(var(--nav-height) + 4rem)' }}
    >
      {/* Background elements */}
      <motion.div 
        style={{ y: y1, rotate }}
        className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none opacity-20"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div className="w-full h-full" style={{ background: 'radial-gradient(circle, var(--p-teal-500) 0%, transparent 70%)' }} />
      </motion.div>

      <motion.div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
        <motion.div className="flex flex-col items-center text-center gap-8 mb-20 font-sans">

          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-6 relative">
             <motion.div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-4 items-center">
                <MaritimeSignalRow size={32} />
             </motion.div>
            <motion.img
              src={theme === 'dark' ? '/pd_logo_darkmode.svg' : '/pd_logo.svg'}
              alt="Port Daddy"
              style={{ height: '240px', width: 'auto' }}
              animate={{ y: [0, -10, 0], rotate: [0, -1, 1, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div className="flex flex-col items-center font-sans">
              <motion.div className="flex gap-0 mb-4 h-1 w-[220px] rounded-full overflow-hidden opacity-80">
                {RAINBOW_SEGMENTS.map((color, i) => (
                  <motion.div key={i} className="flex-1" style={{ background: color }} />
                ))}
              </motion.div>
              <motion.div className="flex gap-3 items-center font-sans">
                <Badge variant="teal" className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest font-sans">v3.7.0 · The Control Plane</Badge>
                <motion.div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(58,173,173,0.1)] border border-[rgba(58,173,173,0.2)] font-sans">
                  <motion.div className="w-2 h-2 rounded-full bg-[var(--p-teal-400)] pulse-active" />
                  <motion.span className="text-[10px] font-black uppercase tracking-widest text-[var(--p-teal-300)] font-sans">DNS Active</motion.span>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }} className="max-w-4xl mx-auto font-sans">
            <motion.h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8 font-display" style={{ color: 'var(--text-primary)', lineHeight: 1.05 }}>
              Port Authority <br />
              <motion.span className="relative inline-block">
                <motion.span className="text-[var(--brand-primary)]">for AI Agents</motion.span>
                <motion.span className="absolute bottom-2 left-0 h-1 bg-[var(--brand-primary)] opacity-30 w-full" initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ duration: 1, delay: 1.2 }} />
              </motion.span>
            </motion.h1>
            <motion.p className="text-xl sm:text-2xl mx-auto leading-relaxed font-sans max-w-[850px]" style={{ color: 'var(--text-secondary)' }}>
              The unified orchestration layer for autonomous AI agent workflows. 
              Atomic port assignment, session coordination, and automatic salvage.
            </motion.p>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="flex flex-col items-center gap-10 font-sans">
            <motion.div className="flex flex-wrap justify-center gap-5 font-sans">
              <Button size="lg" className="px-10 py-7 text-lg shadow-2xl relative overflow-hidden group font-sans" onClick={() => document.getElementById('install')?.scrollIntoView({ behavior: 'smooth' })}>
                <motion.span className="relative z-10">Get Started</motion.span>
              </Button>
              <Link to="/docs" className="no-underline font-sans">
                <Button variant="ghost" size="lg" className="px-10 py-7 text-lg font-sans">Read the Docs</Button>
              </Link>
            </motion.div>
            
            <motion.div className="flex flex-wrap justify-center gap-12 px-10 py-6 rounded-[32px] backdrop-blur-xl bg-[var(--bg-glass)] border border-[var(--border-subtle)] shadow-2xl font-sans">
              {[
                { num: '3,700+', label: 'tests passing' },
                { num: '60+', label: 'frameworks' },
                { num: '∞', label: 'possibilities' },
              ].map((stat, i) => (
                <motion.div key={stat.label} className="text-center group font-sans" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + (i * 0.1) }}>
                  <motion.div className="text-3xl font-bold font-mono group-hover:scale-110 transition-transform text-[var(--brand-primary)] tracking-tighter font-mono">{stat.num}</motion.div>
                  <motion.div className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 opacity-60 font-sans text-[var(--text-muted)]">{stat.label}</motion.div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div className="grid lg:grid-cols-2 gap-16 max-w-6xl mx-auto pt-10 font-sans">
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.3 }} id="install" className="flex flex-col font-sans">
            <motion.h3 className="text-xl font-bold font-display flex items-center gap-2 mb-6" style={{ color: 'var(--text-primary)' }}>
              <Terminal size={20} className="text-[var(--brand-primary)]" />
              Quick Install
            </motion.h3>
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col font-sans">
              <Tabs.List className="flex gap-1 p-1.5 rounded-2xl mb-4 bg-[var(--bg-overlay)] border border-[var(--border-subtle)] font-sans shadow-inner">
                {INSTALL_TABS.map(tab => (
                  <Tabs.Trigger key={tab.id} value={tab.id} className={`flex-1 px-4 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all font-sans ${activeTab === tab.id ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {tab.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {INSTALL_TABS.map(tab => (
                <Tabs.Content key={tab.id} value={tab.id} className="flex-1 font-sans">
                  <motion.div className="rounded-3xl p-8 font-mono text-[13px] h-full relative group shadow-inner bg-[var(--code-bg)] border border-[var(--border-default)]">
                    <CopyButton text={tab.full} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100" />
                    {tab.commands.map((cmd, i) => (
                      <motion.div key={i} className="leading-relaxed mb-1.5 flex gap-3 font-mono">
                        <motion.span className="opacity-40 select-none text-[var(--code-prompt)] font-mono">$</motion.span>
                        <motion.span className="text-[var(--text-primary)] font-mono">{cmd}</motion.span>
                      </motion.div>
                    ))}
                  </motion.div>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-col font-sans">
            <motion.div className="flex gap-2 mb-6 font-sans">
              <motion.button onClick={() => setActivePanel('changelog')} className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all font-sans border ${activePanel === 'changelog' ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)] border-[var(--border-default)] shadow-sm' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                What's New in v3.7.0
              </motion.button>
            </motion.div>
            <motion.div className="flex-1 flex flex-col gap-3 font-sans">
              {CHANGELOG_ITEMS.map((item) => (
                <motion.div key={item.label} className="rounded-3xl p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:bg-[var(--interactive-hover)] transition-all font-sans shadow-sm hover:shadow-xl group">
                  <motion.div className="flex items-center gap-4 mb-3 font-sans">
                    <motion.div className="p-2 rounded-xl bg-[var(--bg-overlay)] text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-colors"><item.icon size={18} /></motion.div>
                    <motion.span className="text-lg font-bold font-display">{item.label}</motion.span>
                    <Badge variant="teal" className="ml-auto font-sans">new</Badge>
                  </motion.div>
                  <motion.p className="text-sm font-sans leading-relaxed text-[var(--text-secondary)]">{item.text}</motion.p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
