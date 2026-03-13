import { useState, useEffect } from 'react'

export function useTimeline(options: { limit?: number; agentId?: string; sessionId?: string; interval?: number } = {}) {
  const { limit = 50, agentId, sessionId, interval = 5000 } = options;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function fetchTimeline() {
      try {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (agentId) params.append('agent', agentId);
        if (sessionId) params.append('session', sessionId);

        const res = await fetch(`http://localhost:9876/activity/timeline?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        if (mounted) {
          setEvents(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTimeline();
    const timer = setInterval(fetchTimeline, interval);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [limit, agentId, sessionId, interval]);

  return { events, loading, error };
}
