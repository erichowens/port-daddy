import React, { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: true,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'var(--p-font-mono)',
  themeVariables: {
    primaryColor: '#3aadad',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#3aadad',
    lineColor: '#3aadad',
    secondaryColor: '#56cccc',
    tertiaryColor: '#ffffff',
    mainBkg: 'var(--bg-overlay)',
    nodeBorder: 'var(--border-strong)',
    clusterBkg: 'var(--bg-surface)',
    clusterBorder: 'var(--border-subtle)',
    defaultLinkColor: 'var(--brand-primary)',
    titleColor: 'var(--text-primary)',
    edgeLabelBackground: 'var(--bg-surface)',
    nodeTextColor: 'var(--text-primary)'
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
      className="mermaid-container my-12 flex justify-center p-10 rounded-[32px] border border-dashed" 
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
      ref={ref} 
    />
  )
}
