export interface Feature {
  id: string;
  title: string;
  description: string;
  category: 'ports' | 'coordination' | 'security' | 'observability' | 'agents';
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
    id: 'always-on-avatars',
    title: 'Always-On Avatars',
    description: 'Persistent agent processes that live in background harbors, maintaining state and responding to signals 24/7.',
    category: 'agents',
    cli: 'pd spawn --avatar',
    status: 'new'
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
    id: 'background-teams',
    title: 'Background Teams',
    description: 'Orchestrate entire swarms that fix problems, deploy services, and manage infrastructure while you sleep.',
    category: 'agents',
    cli: 'pd orchestrator --team',
    status: 'new'
  },
  {
    id: 'remote-harbors',
    title: 'Remote Harbors (P2P)',
    description: 'Secure P2P tunneling between daemons. Connect local agents to remote swarms with zero-config DNS.',
    category: 'security',
    cli: 'pd tunnel connect <peer>',
    status: 'preview'
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
    id: 'shared-memory',
    title: 'Shared Embedding Memory',
    description: 'A global K/V store for your swarm, optimized for vector embeddings and shared context across agents.',
    category: 'coordination',
    cli: 'pd memory store',
    status: 'preview'
  }
];
