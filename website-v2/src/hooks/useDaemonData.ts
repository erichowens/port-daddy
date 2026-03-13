import { useState, useEffect } from 'react'

export function useDaemonData<T>(path: string, interval = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:9876${path}`, { 
          signal: controller.signal 
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    const timer = setInterval(fetchData, interval);

    return () => {
      mounted = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [path, interval]);

  return { data, error, loading };
}
