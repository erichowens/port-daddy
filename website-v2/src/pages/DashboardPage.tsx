import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDaemonData } from '@/hooks/useDaemonData'
import { useActivityStream } from '@/hooks/useActivityStream'
import { useTimeline } from '@/hooks/useTimeline'
import { LiveOrchestrationGraph } from '@/components/viz/LiveOrchestrationGraph'
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
    <motion.div className="flex flex-col h-full bg-[var(--bg-surface)] rounded-[40px] border border-[var(--border-default)] overflow-hidden shadow-2xl font-sans">
      <motion.div className="px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--bg-overlay)]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 font-sans">
        <motion.div className="flex items-center gap-3 font-sans">
          <History size={20} className="text-[var(--brand-primary)]" />
          <motion.h2 className="font-bold text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-sans">Swarm Radio / Timeline</motion.h2>
        </motion.div>
        <motion.div className="flex items-center gap-2 font-sans">
          <motion.div className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--status-success)] pulse-active' : 'bg-[var(--status-error)]'}`} />
          <motion.span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] font-sans">
            {connected ? 'Live' : 'Offline'}
          </motion.span>
        </motion.div>
      </motion.div>
      <motion.div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide font-sans">
        {allItems.map((item, idx) => (
          <TimelineItem key={item.id || idx} item={item} />
        ))}
        {allItems.length === 0 && (
          <motion.div className="py-24 text-center opacity-30 font-sans">
            <Anchor size={48} className="mx-auto mb-6 text-[var(--brand-primary)]" />
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
      className="flex gap-5 group font-sans"
    >
      <motion.div className="flex flex-col items-center">
        <motion.div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-overlay)] group-hover:border-[var(--brand-primary)] transition-all group-hover:shadow-lg" 
          style={{ color }}
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon size={16} />
        </motion.div>
        <motion.div className="w-px flex-1 bg-[var(--border-subtle)] my-2 opacity-50" />
      </motion.div>
      <motion.div className="flex-1 pb-6 font-sans">
        <motion.div className="flex items-center justify-between mb-2 font-sans">
          <motion.span className="text-[10px] font-black uppercase tracking-widest opacity-40 font-sans">{item.type}</motion.span>
          <motion.span className="text-[9px] font-mono opacity-30">{new Date(item.timestamp || item.createdAt).toLocaleTimeString()}</motion.span>
        </motion.div>
        <motion.div className={`text-base leading-relaxed font-sans ${isNote ? 'italic text-[var(--text-secondary)] bg-[var(--bg-overlay)] p-4 rounded-3xl border border-[var(--border-subtle)] shadow-inner' : 'text-[var(--text-primary)] font-semibold'}`}>
          {item.content || item.details || item.message || (item.payload && JSON.stringify(item.payload))}
        </motion.div>
        {item.agentId && (
          <motion.div className="mt-3 flex items-center gap-2 font-sans">
            <Badge variant="teal" className="text-[8px] px-2 py-0.5 font-sans font-black uppercase">AGENT: {item.agentId}</Badge>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Main Dashboard Page ---

export function DashboardPage() {
  const [activeTab, setActiveTab] = React.useState<'orchestration' | 'pipelines' | 'harbors'>('orchestration');
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
        <motion.div className="flex flex-col items-center gap-8 opacity-50 font-sans">
          <Anchor size={80} className="animate-spin text-[var(--brand-primary)]" style={{ animationDuration: '4s' }} />
          <motion.h2 className="text-2xl font-bold font-display uppercase tracking-[0.3em] animate-pulse">Hailing Harbor Master...</motion.h2>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div className="min-h-screen pt-[var(--nav-height)] bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden flex flex-col font-sans">
      {!isConnected && (
        <motion.div className="bg-[var(--p-amber-500)] text-black px-6 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 z-50 font-sans shadow-xl">
          <AlertCircle size={16} />
          Local Daemon Not Detected. Showing Demo Swarm.
          <motion.a href="/docs#install" className="underline ml-4 hover:opacity-80 font-sans" whileHover={{ scale: 1.05 }}>Install Port Daddy to see your own swarm</motion.a>
        </motion.div>
      )}

      <motion.div className="flex-1 max-w-[1900px] mx-auto w-full p-8 lg:p-12 grid grid-rows-[auto_auto_1fr] gap-8 min-h-0 font-sans">
        
        {/* Header Stats */}
        <motion.header className="flex flex-col md:flex-row md:items-end justify-between gap-10 font-sans">
          <motion.div className="font-sans">
            <motion.div className="flex items-center gap-4 mb-4 font-sans">
              <Badge variant="teal" className="px-4 py-1.5 font-black font-sans text-xs tracking-widest shadow-lg">CONTROL PLANE v3.7.0</Badge>
              <motion.div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest font-sans">
                <motion.div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[var(--status-success)] pulse-active' : 'bg-[var(--status-error)]'}`} />
                {isConnected ? 'Harbor Master Connected' : 'Simulated Environment'}
              </motion.div>
            </motion.div>
            <motion.h1 className="text-5xl lg:text-6xl font-bold tracking-tight font-display flex items-center gap-6">
              Swarm <motion.span className="text-[var(--brand-primary)]">Intelligence</motion.span>
            </motion.h1>
          </motion.div>

          <motion.div className="grid grid-cols-2 sm:grid-cols-5 gap-4 font-sans">
            <StatCard label="Services" value={services?.services?.length || 0} icon={Terminal} color="var(--p-teal-400)" />
            <StatCard label="Agents" value={agents?.agents?.length || 0} icon={Users} color="var(--p-amber-400)" />
            <StatCard label="Locks" value={locks?.locks?.length || 0} icon={Lock} color="var(--p-red-400)" />
            <StatCard label="Sessions" value={sessions?.sessions?.length || 0} icon={Anchor} color="var(--p-blue-400)" />
            <StatCard label="Uptime" value={status?.uptimeHuman || '0m'} icon={Zap} color="var(--p-green-400)" />
          </motion.div>
        </motion.header>

        {/* Tab Navigation */}
        <motion.div className="flex items-center justify-between font-sans border-b border-[var(--border-subtle)] pb-6">
          <motion.div className="flex items-center gap-3 p-2 rounded-[24px] bg-[var(--bg-overlay)] border border-[var(--border-subtle)] w-fit font-sans shadow-inner">
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
                  className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all font-sans ${
                    isActive 
                      ? 'bg-[var(--bg-surface)] text-[var(--brand-primary)] shadow-xl border border-[var(--border-subtle)]' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                  whileHover={!isActive ? { scale: 1.02 } : {}}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={16} />
                  {tab.label}
                </motion.button>
              )
            })}
          </motion.div>
        </motion.div>

        {/* Layout Grid */}
        <motion.div className="grid lg:grid-cols-[1fr_500px] gap-10 min-h-0 font-sans">
          
          {/* Main Visualizer Area */}
          <motion.div className="flex flex-col gap-10 min-h-0 font-sans">
            <AnimatePresence mode="wait">
              {activeTab === 'orchestration' ? (
                <motion.div 
                  key="orchestration"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 bg-[var(--bg-surface)] rounded-[48px] border border-[var(--border-default)] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.2)] relative"
                >
                  <LiveOrchestrationGraph 
                    services={services?.services || []} 
                    agents={agents?.agents || []} 
                    onSelectAgent={setSelectedAgentId}
                    selectedAgentId={selectedAgentId}
                  />
                  
                  {selectedAgent && (
                    <motion.div 
                      initial={{ opacity: 0, y: 40, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute bottom-10 left-10 right-10 z-20 max-w-lg mx-auto font-sans"
                    >
                      <AgentCard agent={selectedAgent} />
                      <motion.button 
                        onClick={() => setSelectedAgentId(null)}
                        className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] shadow-2xl z-30 transition-colors"
                        whileHover={{ scale: 1.1, rotate: 90 }}
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
                  className="flex-1 bg-[var(--bg-surface)] rounded-[48px] border border-[var(--border-default)] p-16 flex flex-col items-center justify-center text-center opacity-40 font-sans shadow-2xl"
                >
                  <Globe size={80} className="mb-10 text-[var(--brand-primary)]" />
                  <motion.h3 className="text-3xl font-bold font-display mb-4">Global Harbor Map</motion.h3>
                  <motion.p className="max-w-md mx-auto text-xl font-sans leading-relaxed">Connect to remote Port Daddy instances via Lighthouses and secure P2P tunnels. <br /><Badge variant="neutral" className="mt-4">COMING IN V4.0</Badge></motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sub-panels Grid */}
            <motion.div className="grid grid-cols-2 gap-10 h-[260px] shrink-0 font-sans">
               <motion.div className="bg-[var(--bg-surface)] rounded-[40px] border border-[var(--border-default)] p-8 overflow-hidden flex flex-col shadow-2xl font-sans">
                  <motion.h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 flex items-center gap-3 font-sans">
                    <Anchor size={16} className="text-[var(--p-blue-400)]" /> Active Ventures (Sessions)
                  </motion.h3>
                  <motion.div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide font-sans">
                    {(sessions?.sessions || []).map((s: any) => (
                      <motion.div key={s.id} className="p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--brand-primary)] transition-all font-sans" whileHover={{ x: 4 }}>
                        <motion.div className="flex-1 truncate mr-6 font-sans">
                          <motion.div className="text-sm font-bold truncate group-hover:text-[var(--brand-primary)] transition-colors font-sans">{s.purpose}</motion.div>
                          <motion.div className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">{s.id.slice(0, 12)}</motion.div>
                        </motion.div>
                        <Badge variant={s.status === 'active' ? 'teal' : 'neutral'} className="text-[9px] font-sans font-black uppercase">{s.status}</Badge>
                      </motion.div>
                    ))}
                    {(!sessions?.sessions || sessions.sessions.length === 0) && (
                      <motion.p className="text-[11px] text-center mt-12 opacity-30 italic font-sans">No active ventures in harbor</motion.p>
                    )}
                  </motion.div>
               </motion.div>
               <motion.div className="bg-[var(--bg-surface)] rounded-[40px] border border-[var(--border-default)] p-8 overflow-hidden flex flex-col shadow-2xl font-sans">
                  <motion.h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6 flex items-center gap-3 font-sans">
                    <Terminal size={16} className="text-[var(--p-teal-400)]" /> Shore Services (Ports)
                  </motion.h3>
                  <motion.div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide font-sans">
                    {(services?.services || []).map((s: any) => (
                      <motion.div key={s.id} className="p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-subtle)] flex items-center justify-between group hover:border-[var(--brand-primary)] transition-all font-sans" whileHover={{ x: 4 }}>
                        <motion.div className="flex-1 truncate mr-6 font-sans">
                          <motion.div className="text-sm font-bold truncate group-hover:text-[var(--brand-primary)] transition-colors font-sans">{s.id}</motion.div>
                          <motion.div className="text-[10px] font-mono text-[var(--brand-primary)] font-black uppercase tracking-widest">PORT {s.port}</motion.div>
                        </motion.div>
                        <motion.div className={`w-2 h-2 rounded-full ${s.status === 'healthy' ? 'bg-[var(--status-success)] shadow-[0_0_8px_var(--status-success)]' : 'bg-[var(--status-error)] shadow-[0_0_8px_var(--status-error)]'}`} />
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
    <motion.div className="px-6 py-5 rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm min-w-[130px] group hover:border-[var(--brand-primary)] transition-all font-sans hover:shadow-2xl" whileHover={{ y: -4 }}>
      <motion.div className="flex items-center gap-3 mb-2 font-sans">
        <Icon size={14} style={{ color }} className="group-hover:scale-125 transition-transform" />
        <motion.span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] font-sans">{label}</motion.span>
      </motion.div>
      <motion.div className="text-3xl font-bold font-mono group-hover:translate-x-1 transition-transform tracking-tighter">{value}</motion.div>
    </motion.div>
  )
}
