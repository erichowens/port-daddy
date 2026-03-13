export interface Feature {
  id: string;
  title: string;
  description: string;
  category: 'ports' | 'coordination' | 'security' | 'observability';
  cli: string;
  status: 'core' | 'new' | 'preview';
}

export const PRODUCT_FEATURES: Feature[] = [
  {
    id: 'atomic-ports',
    title: 'Atomic Port Assignment',
    description: 'Deterministic hashing ensures semantic identities like myapp:api always map to the same port across restarts and swarms.',
    category: 'ports',
    cli: 'pd claim <identity>',
    status: 'core'
  },
  {
    id: 'swarm-radio',
    title: 'Swarm Radio (Pub/Sub)',
    description: 'Low-latency SSE messaging for real-time inter-agent signaling. Speak to your swarm via named radio channels.',
    category: 'coordination',
    cli: 'pd pub <channel> <msg>',
    status: 'core'
  },
  {
    id: 'harbors',
    title: 'Cryptographic Harbors',
    description: 'Named permission namespaces with HMAC-signed capability tokens (JWT). Enforce security boundaries at the daemon level.',
    category: 'security',
    cli: 'pd harbor create <name>',
    status: 'new'
  },
  {
    id: 'reactive-pipelines',
    title: 'Reactive Pipelines',
    description: 'Event-driven orchestration. Trigger shell commands or spawn agents automatically when messages hit specific channels.',
    category: 'coordination',
    cli: 'pd orchestrator',
    status: 'new'
  },
  {
    id: 'time-travel',
    title: 'Time-Travel Debugging',
    description: 'A unified timeline that interleaves infrastructure events with agent notes and radio traffic for rapid diagnostics.',
    category: 'observability',
    cli: 'pd activity timeline',
    status: 'new'
  },
  {
    id: 'agent-salvage',
    title: 'Automatic Salvage',
    description: 'Dead agents leave their notes and progress in the resurrection queue. The next agent can "salvage" and resume the venture.',
    category: 'coordination',
    cli: 'pd salvage',
    status: 'core'
  },
  {
    id: 'distributed-locks',
    title: 'Distributed Locks',
    description: 'Prevent race conditions with named locks and automatic TTL expiry. Safe for CI/CD and multi-agent file access.',
    category: 'security',
    cli: 'pd with-lock <name>',
    status: 'core'
  },
  {
    id: 'local-dns',
    title: 'Local DNS Resolver',
    description: 'Access services via friendly hostnames like http://api.pd.local instead of magic port numbers.',
    category: 'ports',
    cli: 'pd dns register <name>',
    status: 'new'
  }
];
