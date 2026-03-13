import * as React from 'react'
import { motion } from 'framer-motion'
import { SailorAgent } from './SailorAgent'

interface Node {
  id: string
  type: 'service' | 'agent' | 'core'
  label: string
  status?: 'healthy' | 'unhealthy' | 'active' | 'idle' | 'dead'
  port?: number
}

interface LiveOrchestrationGraphProps {
  services: any[]
  agents: any[]
  onSelectAgent?: (id: string) => void
  selectedAgentId?: string | null
}

export function LiveOrchestrationGraph({ 
  services = [], 
  agents = [], 
  onSelectAgent,
  selectedAgentId 
}: LiveOrchestrationGraphProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({ 
          width: containerRef.current.clientWidth || 800, 
          height: containerRef.current.clientHeight || 600 
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  function getPos(node: any, i: number, total: number) {
    if (node.id === 'core') return { x: cx, y: cy };
    const safeTotal = total || 1;
    const angle = (i / safeTotal) * 2 * Math.PI + 0.5;
    const r = node.type === 'service' ? 160 : 280;
    return { 
      x: cx + r * Math.cos(angle), 
      y: cy + r * Math.sin(angle) 
    };
  }

  const serviceNodes = services.map(s => ({ id: `svc:${s.id}`, type: 'service' as const, label: s.id, status: s.status, port: s.port }));
  const agentNodes = agents.map(a => ({ id: `agt:${a.id}`, type: 'agent' as const, label: a.id, status: a.healthAssessment?.liveness }));

  return (
    <motion.div ref={containerRef} className="w-full h-full min-h-[500px] relative overflow-hidden font-sans bg-[var(--bg-base)]">
      <svg
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full absolute inset-0 pointer-events-none"
      >
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection Lines */}
        {serviceNodes.map((node, i) => {
          const pos = getPos(node, i, serviceNodes.length);
          return (
            <motion.line
              key={`line-${node.id}`}
              x1={cx} y1={cy} x2={pos.x} y2={pos.y}
              stroke="var(--brand-primary)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.15"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          );
        })}
      </svg>

      {/* Core Node */}
      <motion.div
        className="absolute flex items-center justify-center pointer-events-auto"
        style={{ 
          left: cx, top: cy, transform: 'translate(-50%, -50%)',
          width: 120, height: 120,
          borderRadius: '100%',
          background: 'var(--bg-overlay)',
          border: '3px solid var(--brand-primary)',
          boxShadow: '0 0 40px rgba(58, 173, 173, 0.2)'
        }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <motion.div className="text-center font-sans">
          <motion.div className="font-mono font-black text-2xl text-[var(--brand-primary)]">PORT</motion.div>
          <motion.div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">DADDY</motion.div>
        </motion.div>
      </motion.div>

      {/* Service Nodes */}
      {serviceNodes.map((node, i) => {
        const pos = getPos(node, i, serviceNodes.length);
        const isHealthy = node.status === 'healthy';
        return (
          <motion.div
            key={node.id}
            className="absolute p-4 rounded-3xl border-2 flex flex-col items-center gap-1 shadow-lg pointer-events-auto cursor-pointer"
            style={{ 
              left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)',
              background: 'var(--bg-overlay)',
              borderColor: isHealthy ? 'var(--p-teal-400)' : 'var(--p-red-400)'
            }}
            whileHover={{ scale: 1.1, y: -5 }}
          >
            <motion.div className="text-[10px] font-black uppercase tracking-widest font-sans">{node.label}</motion.div>
            <motion.div className="text-sm font-mono font-bold text-[var(--brand-primary)]">{node.port}</motion.div>
            {!isHealthy && <motion.div className="w-2 h-2 rounded-full bg-[var(--p-red-500)] animate-pulse" />}
          </motion.div>
        )
      })}

      {/* Agent Nodes (Sailors) */}
      {agentNodes.map((node, i) => {
        const pos = getPos(node, i, agentNodes.length);
        const agentId = node.id.replace('agt:', '');
        const isSelected = selectedAgentId === agentId;
        const expression = node.status === 'dead' ? 'dead' : isSelected ? 'thinking' : 'happy';
        
        return (
          <motion.div
            key={node.id}
            className="absolute pointer-events-auto cursor-pointer"
            style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
            onClick={() => onSelectAgent?.(agentId)}
          >
            <SailorAgent 
              size={isSelected ? 100 : 70} 
              expression={expression}
              color={isSelected ? 'var(--brand-primary)' : 'var(--p-amber-400)'}
            />
            <motion.div 
              className={`mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-center shadow-md font-sans transition-colors ${isSelected ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]'}`}
            >
              {node.label.slice(0, 12)}
            </motion.div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
