export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: 'coordination' | 'scaling' | 'resilience' | 'security';
  difficulty: 'intermediate' | 'advanced';
  icon: string;
  body: string;
}

export const COOKBOOK_RECIPES: Recipe[] = [
  {
    id: 'leader-election',
    title: 'Leader Election',
    description: 'Elect a leader among multiple identical agents using Port Daddy distributed locks.',
    category: 'coordination',
    difficulty: 'intermediate',
    icon: 'Shield',
    body: `
## The Problem
When you spawn a swarm of identical worker agents, they often need a "Leader" to coordinate tasks, consolidate results, or speak to external APIs that rate-limit concurrent connections. If they all try to be the leader, chaos ensues.

## The Port Daddy Solution
We use Port Daddy's **Distributed Locks** as a high-performance semaphore. Whichever agent acquires the lock first becomes the Leader.

### The Code

\`\`\`javascript
import { PortDaddy } from 'port-daddy/client';

const pd = new PortDaddy();
const AGENT_ID = process.env.AGENT_ID || 'worker-' + Math.random().toString(36).slice(2);

async function runWorker() {
  await pd.register({ name: 'Leader Election Node', type: 'worker' });
  const hb = pd.startHeartbeat(30000);

  try {
    console.log(\`[\${AGENT_ID}] Attempting to become leader...\`);
    
    // Acquire a lock with a TTL. The lock prevents other agents from entering.
    await pd.withLock('swarm-leader', async () => {
      console.log(\`[\${AGENT_ID}] 🚩 I AM THE LEADER!\`);
      
      // Perform leader-specific duties
      await performLeaderDuties();
      
    }, { ttl: 60000, owner: AGENT_ID });
    
  } catch (err) {
    if (err.message.includes('Resource locked')) {
      console.log(\`[\${AGENT_ID}] I am a follower. Standing by.\`);
      await performFollowerDuties();
    } else {
      throw err;
    }
  } finally {
    hb.stop();
    await pd.unregister();
  }
}

runWorker();
\`\`\`

## How it works
1. **Atomic Acquisition:** The SQLite WAL mode ensures that even if 50 agents hit the \`/locks/acquire\` endpoint at the exact same millisecond, only one gets the lock.
2. **Auto-Salvage:** If the leader agent crashes, the \`ttl\` (Time-to-Live) expires, and the lock is automatically released. Another follower can then step up and take the lock.
`
  },
  {
    id: 'p2p-webrtc',
    title: 'P2P WebRTC Handshake',
    description: 'Establish a direct peer-to-peer WebRTC connection between two agents using Port Daddy Inboxes as the signaling server.',
    category: 'coordination',
    difficulty: 'advanced',
    icon: 'Network',
    body: `
## The Problem
Agents on different machines (or different docker containers) need to stream high-bandwidth video or audio to each other. Routing this through Port Daddy would overwhelm the daemon. They need a direct P2P connection (WebRTC).

## The Port Daddy Solution
WebRTC requires a "Signaling Server" to exchange ICE candidates and SDP offers/answers. Port Daddy's **Agent Inbox** is the perfect secure signaling layer.

### The Code (Agent A: The Caller)

\`\`\`javascript
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// Send the offer to Agent B via Port Daddy Inbox
await pd.inboxSend('AGENT_B', {
  type: 'WEBRTC_OFFER',
  sdp: offer.sdp
});

// Listen for the answer
const unsubs = pd.subscribe('inbox:AGENT_A', (msg) => {
  if (msg.payload.type === 'WEBRTC_ANSWER') {
    peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: msg.payload.sdp
    }));
  }
});
\`\`\`

### The Code (Agent B: The Receiver)

\`\`\`javascript
// Listen to Inbox
pd.subscribe('inbox:AGENT_B', async (msg) => {
  if (msg.payload.type === 'WEBRTC_OFFER') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({
      type: 'offer',
      sdp: msg.payload.sdp
    }));
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // Send answer back to Agent A
    await pd.inboxSend('AGENT_A', {
      type: 'WEBRTC_ANSWER',
      sdp: answer.sdp
    });
  }
});
\`\`\`

## Why this is better
Unlike a public WebSocket server, the Agent Inbox ensures that only registered, authorized agents can hail each other. This prevents rogue nodes from initiating connections and fulfills the "Agentic Escrow" vision.
`
  },
  {
    id: 'ephemeral-ci-db',
    title: 'Ephemeral CI Database',
    description: 'Spin up an ephemeral PostgreSQL database for integration tests, isolated per CI runner.',
    category: 'resilience',
    difficulty: 'intermediate',
    icon: 'Activity',
    body: `
## The Problem
When multiple CI runners execute on the same host, they clash over port \`5432\` for their PostgreSQL test databases.

## The Port Daddy Solution
Use **Atomic Port Assignment** to dynamically assign a collision-free port for the database, inject it into the environment, and spin it down when the phase ends.

### The Code (Bash / CLI)

\`\`\`bash
#!/bin/bash
set -e

# 1. Claim a unique port for the database
DB_PORT=$(pd claim "ci:postgres:$GITHUB_RUN_ID" -q)

echo "Starting Postgres on port $DB_PORT..."

# 2. Start an ephemeral Postgres container
docker run --name "pg-$GITHUB_RUN_ID" -e POSTGRES_PASSWORD=secret -p "$DB_PORT:5432" -d postgres:alpine

# 3. Wait for the port to actually accept connections
pd wait "ci:postgres:$GITHUB_RUN_ID" --health-tcp

# 4. Run tests with the dynamic port injected
DATABASE_URL="postgres://postgres:secret@localhost:$DB_PORT/postgres" npm test

# 5. Cleanup
docker rm -f "pg-$GITHUB_RUN_ID"
pd release "ci:postgres:$GITHUB_RUN_ID"
\`\`\`

## The Magic
The semantic identity \`ci:postgres:$GITHUB_RUN_ID\` ensures that if this exact script is run twice for the same CI run, it will get the *same* port. If run for a different PR, it gets a *different* port. Zero collisions, infinite concurrency.
`
  },
  {
    id: 'agent-archetypes',
    title: 'Agent Archetypes & Topology',
    description: 'Standard coordination patterns: The Arbiter, The Ring, and Star Topology.',
    category: 'coordination',
    difficulty: 'intermediate',
    icon: 'Network',
    body: `
## Swarm Topologies

When building multi-agent systems, how they connect is just as important as what they do.

### 1. The Star Topology (Leader-Worker)
One "Orchestrator" agent holds the state and delegates sub-tasks to peripheral workers.
- **Port Daddy Pattern:** Orchestrator holds a Session, uses \`pd spawn\` to spin up workers, and listens to their individual Inboxes for results.

### 2. The Ring Topology (Relay)
Agents pass work sequentially. Agent A -> Agent B -> Agent C.
- **Port Daddy Pattern:** Agent A finishes work, publishes to \`channel:phase-1-done\`. Reactive Pipeline triggers Agent B. Agent B finishes, publishes to \`channel:phase-2-done\`.

### 3. The Arbiter (Quality Gate)
An agent whose sole job is to evaluate the work of other agents before releasing an Escrow (Lock).
- **Port Daddy Pattern:** Worker agent acquires a lock to work on a file. When finished, it signals the Arbiter. The Arbiter verifies the work. If passed, the Arbiter releases the lock. If failed, the Arbiter salvages the worker and resets the lock.
`
  }
];
