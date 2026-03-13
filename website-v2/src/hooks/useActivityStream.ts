import { useState, useEffect } from 'react'

interface Activity {
  id: number;
  type: string;
  agentId: string | null;
  targetId: string | null;
  details: string | null;
  timestamp: number;
  metadata?: Record<string, any> | null;
}

interface UseActivityStreamOptions {
  limit?: number;
  url?: string;
}

export function useActivityStream(options: UseActivityStreamOptions = {}) {
  const { limit = 50, url = 'http://localhost:9876/activity/subscribe' } = options;
  const [activities, setActivities] = useState<Activity[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = (e) => {
      setConnected(false);
      setError('Connection failed');
      console.error('SSE Error:', e);
    };

    eventSource.onmessage = (event) => {
      try {
        const activity = JSON.parse(event.data);
        setActivities((prev) => {
          const next = [activity, ...prev];
          return next.slice(0, limit);
        });
      } catch (err) {
        console.error('Failed to parse activity:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [url, limit]);

  return { activities, connected, error };
}
