import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--p-font-mono)',
  themeVariables: {
    primaryColor: '#00ff88',
    primaryTextColor: '#fff',
    primaryBorderColor: '#00ff88',
    lineColor: '#00ff88',
    secondaryColor: '#00b8ff',
    tertiaryColor: '#fff',
  }
})

interface MermaidProps {
  chart: string
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.contentLoaded()
      // Use a unique ID for each chart to prevent collisions
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
      mermaid.render(id, chart).then((result) => {
        if (ref.current) {
          ref.current.innerHTML = result.svg
        }
      })
    }
  }, [chart])

  return (
    <div 
      className="mermaid-container my-8 flex justify-center p-6 rounded-xl border" 
      style={{ background: 'var(--bg-overlay)', borderColor: 'var(--border-subtle)' }}
      ref={ref} 
    />
  )
}
