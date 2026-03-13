})
import { motion } from "framer-motion"
import * as React from 'react'
import { motion } from 'framer-motion'

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
  const containerRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });

  React.useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setDimensions({ 
        width: clientWidth || 800, 
        height: clientHeight || 600 
      });
    }
  }, []);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  function getPos(node: any, i: number, total: number) {
    if (node.id === 'core') return { x: cx, y: cy };
    
    // Default fallback if total is 0 to avoid NaN
    const safeTotal = total || 1;
    const angle = (i / safeTotal) * 2 * Math.PI + 0.5;
    
    // Services are closer to core, agents are further
    const r = node.type === 'service' ? 180 : 320;
    return { 
      x: cx + r * Math.cos(angle), 
      y: cy + r * Math.sin(angle) 
    };
  }

  const nodes: Node[] = [
    { id: 'core', type: 'core', label: 'Port Daddy' },
    ...services.map(s => ({ id: `svc:${s.id}`, type: 'service' as const, label: s.id, status: s.status, port: s.port })),
    ...agents.map(a => ({ id: `agt:${a.id}`, type: 'agent' as const, label: a.id, status: a.healthAssessment?.liveness }))
  ];

  const serviceNodes = nodes.filter(n => n.type === 'service');
  const agentNodes = nodes.filter(n => n.type === 'agent');

  return (
    <motion.div className="w-full h-full min-h-[500px] relative overflow-hidden font-sans">
      <svg
        ref={containerRef}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Lines */}
        <g>
          {serviceNodes.map((node, i) => {
            const pos = getPos(node, i, serviceNodes.length);
            return (
              <motion.line
                key={`line-${node.id}`}
                x1={cx} y1={cy} x2={pos.x || cx} y2={pos.y || cy}
                stroke="var(--brand-primary)"
                strokeWidth="1"
                opacity="0.2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.2 }}
                transition={{ duration: 1 }}
              />
            );
          })}
        </g>

        {/* Core */}
        <g>
          <motion.circle
            cx={cx || 0} cy={cy || 0} r={80}
            fill="url(#coreGlow)"
            animate={{ r: [80, 100, 80] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <circle cx={cx || 0} cy={cy || 0} r={40} fill="var(--bg-overlay)" stroke="var(--brand-primary)" strokeWidth="2" />
          <text x={cx || 0} y={(cy || 0) + 5} textAnchor="middle" fill="var(--brand-primary)" className="font-mono font-black text-xl pointer-events-none">PD</text>
        </g>

        {/* Service Nodes */}
        {serviceNodes.map((node, i) => {
          const pos = getPos(node, i, serviceNodes.length);
          const isHealthy = node.status === 'healthy';
          const x = pos.x || 0;
          const y = pos.y || 0;
          
          return (
            <motion.g key={node.id} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}>
              <circle 
                cx={x} cy={y} r={30} 
                fill="var(--bg-overlay)" 
                stroke={isHealthy ? 'var(--p-teal-400)' : 'var(--p-red-400)'} 
                strokeWidth="2" 
              />
              <motion.circle
                cx={x} cy={y} r={35}
                fill="none"
                stroke={isHealthy ? 'var(--p-teal-400)' : 'var(--p-red-400)'}
                strokeWidth="1"
                animate={{ r: [35, 45], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <text x={x} y={y - 40} textAnchor="middle" fill="var(--text-primary)" className="font-mono text-[10px] font-bold uppercase pointer-events-none">{node.label}</text>
              <text x={x} y={y + 5} textAnchor="middle" fill={isHealthy ? 'var(--p-teal-400)' : 'var(--p-red-400)'} className="font-mono text-[10px] font-bold pointer-events-none">{node.port}</text>
            </motion.g>
          );
        })}

        {/* Agent Nodes */}
        {agentNodes.map((node, i) => {
          const pos = getPos(node, i, agentNodes.length);
          const agentId = node.id.replace('agt:', '');
          const isSelected = selectedAgentId === agentId;
          const x = pos.x || 0;
          const y = pos.y || 0;
          
          return (
            <motion.g 
              key={node.id} 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="cursor-pointer"
              onClick={() => onSelectAgent?.(agentId)}
            >
              <rect 
                x={x - 40} y={y - 15} width={80} height={30} rx={8}
                fill={isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)'} 
                stroke={isSelected ? 'var(--brand-primary)' : 'var(--p-amber-400)'} 
                strokeWidth={isSelected ? 3 : 1} 
              />
              <text 
                x={x} y={y + 4} 
                textAnchor="middle" 
                fill={isSelected ? 'var(--bg-base)' : 'var(--text-secondary)'} 
                className={`font-mono text-[9px] truncate px-2 pointer-events-none ${isSelected ? 'font-bold' : ''}`}
              >
                {node.label.slice(0, 12)}
              </text>
              <motion.circle 
                cx={x - 30} cy={y - 15} r={isSelected ? 5 : 4} 
                fill={isSelected ? 'var(--bg-base)' : 'var(--p-amber-400)'}
                animate={isSelected ? { scale: [1, 1.2, 1] } : { opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.g>
          );
        })}
      </svg>
    </motion.div>
  )
