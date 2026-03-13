import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDaemonData } from '@/hooks/useDaemonData'
import { useActivityStream } from '@/hooks/useActivityStream'
import { useTimeline } from '@/hooks/useTimeline'
import { LiveOrchestrationGraph } from '@/components/viz/LiveOrchestrationGraph'
import { Graph3D } from '@/components/viz/Graph3D'
import { AgentCard } from '@/components/viz/AgentCard'
import { WorkflowsTable } from '@/components/viz/WorkflowsTable'
import { Badge } from '@/components/ui/Badge'
import { 
  Lock, Users, Terminal, Zap, Shield, AlertCircle, 
  Network, GitBranch, Search, MessageSquare, 
  History, Activity, LayoutGrid, Heart, 
  Skull, LifeBuoy, Anchor, Globe, Radio
} from 'lucide-react'

// --- Unified Timeline Component ---

function UnifiedTimeline() {
  const { activities: liveItems, connected } = useActivityStream({ limit: 50 });
  const { events: historyItems } = useTimeline({ limit: 100 });

  const allItems = React.useMemo(() => {
    const combined = [...liveItems];
    const liveIds = new Set(liveItems.map(i => i.id || `${i.timestamp}-${i.type}`));
    
    historyItems.forEach(item => {
      const id = item.id || `${item.timestamp}-${item.type}`;
      if (!liveIds.has(id)) {
        combined.push(item);
      }
    });

    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveItems, historyItems]);

  return (
    <motion.div className="flex flex-col h-full bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] overflow-hidden shadow-2xl font-sans">
      <motion.div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <motion.div className="flex items-center gap-2 font-sans">
          <History size={18} className="text-[var(--brand-primary)]" />
          <motion.h2 className="font-bold text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-sans">Swarm Radio / Timeline</motion.h2>
        </motion.div>
        <motion.div className="flex items-center gap-2 font-sans">
          <motion.div className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--status-success)] pulse-active' : 'bg-[var(--status-error)]'}`} />
          <motion.span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] font-sans">
            {connected ? 'Live' : 'Offline'}
          </motion.span>
        </motion.div>
      </motion.div>
      <motion.div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide font-sans">
        {allItems.map((item, idx) => (
          <TimelineItem key={item.id || idx} item={item} />
        ))}
        {allItems.length === 0 && (
          <motion.div className="py-20 text-center opacity-30 font-sans">
            <Anchor size={40} className="mx-auto mb-4" />
            <motion.p className="text-[10px] font-black uppercase tracking-widest font-sans">Scanning frequencies...</motion.p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function TimelineItem({ item }: { item: any }) {
  const isNote = item.source === 'note' || item.type === 'note';
  const isSalvage = item.type === 'agent.salvage' || item.type?.includes('salvage');
  const isDeath = item.type === 'agent.unregister' || item.type?.includes('dead');
  const isMsg = item.type === 'message.publish' || item.type?.includes('message');
  
  const Icon = isNote ? MessageSquare : isSalvage ? LifeBuoy : isDeath ? Skull : isMsg ? Radio : Zap;
  const color = isNote ? 'var(--p-amber-400)' : isSalvage ? 'var(--p-teal-400)' : isDeath ? 'var(--p-red-400)' : 'var(--brand-primary)';

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-4 group font-sans"
    >
      <motion.div className="flex flex-col items-center">
        <motion.div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-overlay)] group-hover:border-[var(--brand-primary)] transition-colors" style={{ color }}>
          <Icon size={14} />
        </motion.div>
        <motion.div className="w-px flex-1 bg-[var(--border-subtle)] my-1" />
      </motion.div>
      <motion.div className="flex-1 pb-4 font-sans">
        <motion.div className="flex items-center justify-between mb-1 font-sans">
          <motion.span className="text-[10px] font-black uppercase tracking-widest opacity-40 font-sans">{item.type}</motion.span>
          <motion.span className="text-[9px] font-mono opacity-30">{new Date(item.timestamp || item.createdAt).toLocaleTimeString()}</motion.span>
        </motion.div>
        <motion.div className={`text-sm leading-snug font-sans ${isNote ? 'italic text-[var(--text-secondary)] bg-[var(--bg-overlay)] p-3 rounded-2xl border border-[var(--border-subtle)]' : 'text-[var(--text-primary)] font-medium'}`}>
          {item.content || item.details || item.message || JSON.stringify(item.payload)}
        </motion.div>
        {item.agentId && (
          <motion.div className="mt-2 flex items-center gap-2 font-sans">
            <Badge variant="neutral" className="text-[8px] px-1.5 py-0 font-sans">AGENT: {item.agentId}</Badge>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Main Dashboard Page ---

export function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<'orchestration' | 'pipelines' | 'harbors'>('orchestration');
  const [view, setView] = React.useState<'2d' | '3d'>('2d');
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
  
  const { data: services, loading: servicesLoading, error: servicesError } = useDaemonData<any>('/services');
  const { data: agents } = useDaemonData<any>('/agents');
  const { data: locks } = useDaemonData<any>('/locks');
  const { data: status } = useDaemonData<any>('/status');
  const { data: sessions } = useDaemonData<any>('/sessions');

  const selectedAgent = React.useMemo(() => {
    return agents?.agents?.find((a: any) => a.id === selectedAgentId);
  }, [agents, selectedAgentId]);

  const isConnected = !servicesLoading && services && !servicesError;

  if (servicesLoading) {
    return (
      <motion.div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-base)] flex items-center justify-center font-sans">
        <motion.div className="flex flex-col items-center gap-6 opacity-50 font-sans">
          <Anchor size={64} className="animate-spin text-[var(--brand-primary)]" style={{ animationDuration: '3s' }} />
          <motion.h2 className="text-xl font-bold font-display uppercase tracking-widest">Hailing Harbor Master...</motion.h2>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden flex flex-col font-sans">
      {!isConnected && (
        <motion.div className="bg-[var(--p-amber-500)] text-black px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 z-50 font-sans">
          <AlertCircle size={14} />
          Local Daemon Not Detected. Showing Demo Swarm.
          <motion.a href="/docs#install" className="underline ml-4 hover:opacity-80 font-sans">Install Port Daddy to see your own swarm</motion.a>
        </motion.div>
      )}

      <motion.div className="flex-1 max-w-[1800px] mx-auto w-full p-6 lg:p-8 grid grid-rows-[auto_auto_1fr] gap-6 min-h-0 font-sans">
        
        {/* Header Stats */}
        <motion.header className="flex flex-col md:flex-row md:items-end justify-between gap-6 font-sans">
          <motion.div className="font-sans">
            <motion.div className="flex items-center gap-3 mb-2 font-sans">
              <Badge variant="teal" className="px-3 py-1 font-black font-sans">CONTROL PLANE v3.7.0</Badge>
              <motion.div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest font-sans">
                <motion.div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--status-success)] pulse-active' : 'bg-[var(--status-error)]'}`} />
                {isConnected ? 'Harbor Master Connected' : 'Simulated Environment'}
              </motion.div>
            </motion.div>
            <motion.h1 className="text-4xl font-bold tracking-tight font-display flex items-center gap-4">
              Swarm <motion.span className="text-[var(--brand-primary)]">Intelligence</motion.span>
            </motion.h1>
          </motion.div>

          <motion.div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-sans">
            <StatCard label="Services" value={services?.services?.length || 0} icon={Terminal} color="var(--p-teal-400)" />
            <StatCard label="Agents" value={agents?.agents?.length || 0} icon={Users} color="var(--p-amber-400)" />
            <StatCard label="Locks" value={locks?.locks?.length || 0} icon={Lock} color="var(--p-red-400)" />
            <StatCard label="Sessions" value={sessions?.sessions?.length || 0} icon={Anchor} color="var(--p-blue-400)" />
            <StatCard label="Uptime" value={status?.uptimeHuman || '0m'} icon={Zap} color="var(--p-green-400)" />
          </motion.div>
        </motion.header>

        {/* Tab Navigation */}
        <motion.div className="flex items-center justify-between font-sans">
          <motion.div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] w-fit font-sans">
            {[
              { id: 'orchestration', label: 'Network Map', icon: Network },
              { id: 'pipelines', label: 'Reactive Rules', icon: GitBranch },
              { id: 'harbors', label: 'Harbors & P2P', icon: Globe },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2.5 transition-all font-sans ${
                    isActive 
                      ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-sm border border-[var(--border-subtle)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--interactive-hover)]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </motion.button>
              )
            })}
          </motion.div>

          {activeTab === 'orchestration' && (
            <motion.div className="flex items-center gap-1 bg-[var(--bg-overlay)] p-1 rounded-xl border border-[var(--border-subtle)] shadow-xl font-sans">
              <motion.button 
                onClick={() => setView('2d')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all font-sans ${view === '2d' ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                2D Chart
              </motion.button>
              <motion.button 
                onClick={() => setView('3d')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all font-sans ${view === '3d' ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                3D Swarm
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {/* Layout Grid */}
        <motion.div className="grid lg:grid-cols-[1fr_450px] gap-8 min-h-0 font-sans">
          
          {/* Main Visualizer Area */}
          <motion.div className="flex flex-col gap-8 min-h-0 font-sans">
            <AnimatePresence mode="wait">
              {activeTab === 'orchestration' ? (
                <motion.div 
                  key="orchestration"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-default)] overflow-hidden shadow-2xl relative"
                >
                  {view === '2d' ? (
                    <LiveOrchestrationGraph 
                      services={services?.services || []} 
                      agents={agents?.agents || []} 
                      onSelectAgent={setSelectedAgentId}
                      selectedAgentId={selectedAgentId}
                    />
                  ) : (
                    <Graph3D 
                      services={services?.services || []} 
                      agents={agents?.agents || []} 
                    />
                  )}
                  
                  {selectedAgent && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute bottom-8 left-8 right-8 z-20 max-w-md mx-auto font-sans"
                    >
                      <AgentCard agent={selectedAgent} />
                      <motion.button 
                        onClick={() => setSelectedAgentId(null)}
                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] shadow-xl"
                      >
                        ×
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              ) : activeTab === 'pipelines' ? (
                <motion.div 
                  key="pipelines"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <WorkflowsTable />
                </motion.div>
              ) : (
                <motion.div 
                  key="harbors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-default)] p-10 flex flex-col items-center justify-center text-center opacity-40 font-sans"
                >
                  <Globe size={64} className="mb-6 text-[var(--brand-primary)]" />
                  <motion.h3 className="text-2xl font-bold font-display">Global Harbor Map</motion.h3>
                  <motion.p className="max-w-md mx-auto mt-2 font-sans">Connect to remote Port Daddy instances via Lighthouses and secure P2P tunnels. Coming in V4.</motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sub-panels Grid */}
            <motion.div className="grid grid-cols-2 gap-6 h-[220px] shrink-0 font-sans">
               <motion.div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] p-6 overflow-hidden flex flex-col shadow-lg font-sans">
                  <motion.h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 flex items-center gap-2 font-sans">
                    <Anchor size={14} /> Active Ventures (Sessions)
                  </motion.h3>
                  <motion.div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide font-sans">
                    {(sessions?.sessions || []).map((s: any) => (
                      <motion.div key={s.id} className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--brand-primary)] transition-colors font-sans">
                        <motion.div className="flex-1 truncate mr-4 font-sans">
                          <motion.div className="text-xs font-bold truncate group-hover:text-[var(--brand-primary)] transition-colors font-sans">{s.purpose}</motion.div>
                          <motion.div className="text-[9px] font-mono opacity-40 uppercase">{s.id.slice(0, 8)}</motion.div>
                        </motion.div>
                        <Badge variant={s.status === 'active' ? 'teal' : 'neutral'} className="text-[8px] font-sans">{s.status}</Badge>
                      </motion.div>
                    ))}
                    {(!sessions?.sessions || sessions.sessions.length === 0) && (
                      <motion.p className="text-[10px] text-center mt-8 opacity-30 italic font-sans">No active ventures in harbor</motion.p>
                    )}
                  </motion.div>
               </motion.div>
               <motion.div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] p-6 overflow-hidden flex flex-col shadow-lg font-sans">
                  <motion.h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 flex items-center gap-2 font-sans">
                    <Terminal size={14} /> Shore Services (Ports)
                  </motion.h3>
                  <motion.div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide font-sans">
                    {(services?.services || []).map((s: any) => (
                      <motion.div key={s.id} className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--brand-primary)] transition-colors font-sans">
                        <motion.div className="flex-1 truncate mr-4 font-sans">
                          <motion.div className="text-xs font-bold truncate group-hover:text-[var(--brand-primary)] transition-colors font-sans">{s.id}</motion.div>
                          <motion.div className="text-[9px] font-mono text-[var(--brand-primary)]">PORT {s.port}</motion.div>
                        </motion.div>
                        <motion.div className={`w-1.5 h-1.5 rounded-full ${s.status === 'healthy' ? 'bg-[var(--status-success)]' : 'bg-[var(--status-error)]'}`} />
                      </motion.div>
                    ))}
                  </motion.div>
               </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Sidebar: Unified Timeline */}
          <motion.aside className="h-full min-h-0 flex flex-col font-sans">
            <UnifiedTimeline />
          </motion.aside>

        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <motion.div className="px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm min-w-[110px] group hover:border-[var(--brand-primary)] transition-all font-sans">
      <motion.div className="flex items-center gap-2 mb-1 font-sans">
        <Icon size={12} style={{ color }} className="group-hover:scale-110 transition-transform" />
        <motion.span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] font-sans">{label}</motion.span>
      </motion.div>
      <motion.div className="text-xl font-bold font-mono group-hover:translate-x-1 transition-transform">{value}</motion.div>
    </motion.div>
  )
}
