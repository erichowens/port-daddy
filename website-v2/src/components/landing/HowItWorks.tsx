import { motion } from 'framer-motion'

interface Step {
  number: string
  title: string
  description: string
  code: string[]
  color: string
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Register & Claim',
    description:
      'Start a session. Port Daddy gives you a port, an agent ID, and checks if any dead agents left work for you to inherit.',
    code: [
      '$ pd begin --identity myapp:api \\',
      '    --purpose "Refactor auth"',
      '',
      '[pd] Session started · agent-7f3a',
      '  Port 3001 assigned',
      '  No dead agents in myapp:*',
    ],
    color: 'var(--p-teal-400)',
  },
  {
    number: '02',
    title: 'Coordinate',
    description:
      'Claim files, post notes, acquire locks, and exchange pub/sub messages — all with the same daemon, no extra infrastructure.',
    code: [
      '$ pd files claim src/auth/*.ts',
      '✓ Claimed · no conflicts',
      '',
      '$ pd note "JWT middleware done"',
      '✓ Note recorded · 12:04:38',
      '',
      '$ pd msg myapp:events publish \\',
      '    "auth-api ready"',
    ],
    color: 'var(--p-amber-400)',
  },
  {
    number: '03',
    title: 'Finish or Salvage',
    description:
      "When done, pd done releases everything cleanly. If a crash happens, the resurrection queue preserves the work — another agent picks up exactly where you left off.",
    code: [
      '$ pd done',
      '[pd] Complete · 8 notes · 4 files released',
      '',
      '# Or, for the next agent:',
      '$ pd salvage',
      '  Dead: agent-9c2b (myapp:frontend)',
      '  Last note: "Login form 70% done"',
      '$ pd salvage claim agent-9c2b',
    ],
    color: 'var(--p-green-500)',
  },
]

export function HowItWorks() {
  return (
    <motion.section
      className="py-20 px-4 sm:px-6 lg:px-8 font-sans"
      style={{ background: 'var(--bg-surface)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div className="max-w-7xl mx-auto font-sans">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 font-sans"
        >
          <motion.h2 className="text-4xl sm:text-5xl font-bold mb-6 font-display" style={{ color: 'var(--text-primary)' }}>
            Three commands to coordinate <motion.span className="text-[var(--brand-primary)]">Anything</motion.span>
          </motion.h2>
          <motion.p className="text-xl max-w-2xl mx-auto leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            Port Daddy wraps every agent session. Register, do your work, then finish — or let the next agent
            pick up if something goes wrong.
          </motion.p>
        </motion.div>

        {/* Steps — horizontal connector line on desktop */}
        <motion.div className="relative font-sans">
          {/* Connector line */}
          <motion.div
            className="hidden lg:block absolute top-8 left-0 right-0 h-px"
            style={{ background: 'var(--border-default)', zIndex: 0 }}
          />

          <motion.div className="grid lg:grid-cols-3 gap-12 lg:gap-8 relative font-sans">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="flex flex-col gap-6 font-sans"
              >
                {/* Step number circle */}
                <motion.div className="relative z-10 flex items-center gap-4 font-sans">
                  <motion.div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-mono font-bold text-xl flex-shrink-0"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: `2px solid ${step.color}`,
                      color: step.color,
                      boxShadow: `0 0 20px color-mix(in srgb, ${step.color} 30%, transparent)`,
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {step.number}
                  </motion.div>
                  <motion.div className="lg:hidden font-sans">
                    <motion.h3 className="text-xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </motion.h3>
                  </motion.div>
                </motion.div>

                <motion.div className="hidden lg:block font-sans">
                  <motion.h3 className="text-2xl font-bold mb-2 font-display" style={{ color: 'var(--text-primary)' }}>
                    {step.title}
                  </motion.h3>
                </motion.div>

                <motion.p className="font-sans text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.description}
                </motion.p>

                {/* Code block */}
                <motion.div
                  className="rounded-2xl p-6 font-mono text-xs leading-relaxed flex-1 shadow-inner relative overflow-hidden"
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--border-default)',
                    borderTop: `2px solid ${step.color}`,
                  }}
                  whileHover={{ borderColor: step.color }}
                >
                  {step.code.map((line, li) => {
                    if (line === '') return <motion.div key={li} className="h-3" />
                    const isComment = line.startsWith('#')
                    const isOutput = !line.startsWith('$') && !isComment
                    return (
                      <motion.div key={li} className="flex gap-2 font-mono">
                        {isComment ? (
                          <motion.span style={{ color: 'var(--code-comment)' }} className="italic opacity-60 font-mono">{line}</motion.span>
                        ) : isOutput ? (
                          <motion.span style={{ color: 'var(--code-output)' }} className="opacity-80 font-mono">
                            {line.includes('⚓') || line.includes('✓') ? (
                              <motion.span style={{ color: step.color }} className="font-mono">{line}</motion.span>
                            ) : line.includes('Dead:') || line.includes('Last note:') ? (
                              <motion.span style={{ color: 'var(--status-warning)' }} className="font-mono">{line}</motion.span>
                            ) : <motion.span className="font-mono">{line}</motion.span>}
                          </motion.span>
                        ) : (
                          <motion.span className="font-mono">
                            <motion.span style={{ color: 'var(--code-prompt)' }} className="opacity-40 font-mono">{line.slice(0, 2)}</motion.span>
                            <motion.span style={{ color: 'var(--text-primary)' }} className="font-mono">{line.slice(2)}</motion.span>
                          </motion.span>
                        )}
                      </motion.div>
                    )
                  })}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  )
}
