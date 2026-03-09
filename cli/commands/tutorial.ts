/**
 * Interactive Port Daddy Tutorial
 *
 * Walks through 13 lessons covering: ports, orchestration, sessions, notes,
 * pub/sub, locks, agents, webhooks, tunnels, changelog, DNS, salvage,
 * and agent inbox.
 *
 * Usage: pd tutorial
 */

import http from 'node:http';
import { createInterface } from 'node:readline';

const BASE = process.env.PORT_DADDY_URL ?? 'http://localhost:9876';

// ── State ─────────────────────────────────────────────────────────────────────

interface TutorialState {
  serviceId?: string;
  sessionId?: string;
  lockName?: string;
  agentId?: string;
  webhookId?: string;
  channelName?: string;
  dnsIdentity?: string;
  salvageAgentId?: string;
  inboxSenderAgent?: string;
  inboxReceiverAgent?: string;
}

const state: TutorialState = {};

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c: Buffer) => { raw += c.toString(); });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BLUE   = '\x1b[34m';

function header(title: string, lesson: number, total: number): void {
  console.log('');
  console.log(`${BOLD}${CYAN}${'─'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${CYAN}  Lesson ${lesson} of ${total}: ${title}${RESET}`);
  console.log(`${BOLD}${CYAN}${'─'.repeat(60)}${RESET}`);
  console.log('');
}

function ok(msg: string): void {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function info(msg: string): void {
  console.log(`  ${BLUE}i${RESET} ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ${YELLOW}!${RESET} ${msg}`);
}

function err(msg: string): void {
  console.log(`  ${RED}✗${RESET} ${msg}`);
}

function code(snippet: string): void {
  const lines = snippet.trim().split('\n');
  for (const line of lines) {
    console.log(`    ${DIM}${line}${RESET}`);
  }
}

async function pause(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.question(`\n  ${DIM}Press Enter to continue...${RESET}`, () => {
      rl.close();
      resolve();
    });
  });
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

async function cleanup(): Promise<void> {
  console.log(`\n${BOLD}Cleaning up tutorial resources...${RESET}`);

  if (state.inboxReceiverAgent) {
    await request('DELETE', `/agents/${state.inboxReceiverAgent}/inbox`).catch(() => {});
    await request('DELETE', `/agents/${state.inboxReceiverAgent}`).catch(() => {});
    ok(`Unregistered inbox receiver agent: ${state.inboxReceiverAgent}`);
    state.inboxReceiverAgent = undefined;
  }

  if (state.inboxSenderAgent) {
    await request('DELETE', `/agents/${state.inboxSenderAgent}`).catch(() => {});
    ok(`Unregistered inbox sender agent: ${state.inboxSenderAgent}`);
    state.inboxSenderAgent = undefined;
  }

  if (state.salvageAgentId) {
    await request('DELETE', `/agents/${state.salvageAgentId}`).catch(() => {});
    await request('DELETE', `/salvage/${state.salvageAgentId}`).catch(() => {});
    ok(`Cleaned up salvage agent: ${state.salvageAgentId}`);
    state.salvageAgentId = undefined;
  }

  if (state.agentId) {
    await request('DELETE', `/agents/${state.agentId}`).catch(() => {});
    ok(`Unregistered agent: ${state.agentId}`);
    state.agentId = undefined;
  }

  if (state.webhookId) {
    await request('DELETE', `/webhooks/${state.webhookId}`).catch(() => {});
    ok(`Removed webhook: ${state.webhookId}`);
    state.webhookId = undefined;
  }

  if (state.lockName) {
    await request('DELETE', `/locks/${state.lockName}`).catch(() => {});
    ok(`Released lock: ${state.lockName}`);
    state.lockName = undefined;
  }

  if (state.sessionId) {
    await request('DELETE', `/sessions/${state.sessionId}`).catch(() => {});
    ok(`Deleted session: ${state.sessionId}`);
    state.sessionId = undefined;
  }

  if (state.channelName) {
    await request('DELETE', `/msg/${state.channelName}`).catch(() => {});
    ok(`Cleared channel: ${state.channelName}`);
    state.channelName = undefined;
  }

  if (state.dnsIdentity) {
    await request('DELETE', `/dns/${state.dnsIdentity}`).catch(() => {});
    ok(`Removed DNS record: ${state.dnsIdentity}`);
    state.dnsIdentity = undefined;
  }

  if (state.serviceId) {
    await request('DELETE', `/release/${state.serviceId}`).catch(() => {});
    ok(`Released service: ${state.serviceId}`);
    state.serviceId = undefined;
  }

  console.log('');
}

// ── Lessons ───────────────────────────────────────────────────────────────────

async function lesson01_claimPort(): Promise<void> {
  header('Claiming a Port', 1, 13);
  info('Port Daddy gives every service a stable, deterministic port.');
  info('The same identity always resolves to the same port on this machine.');
  console.log('');

  const id = `tutorial:demo:${Date.now()}`;
  code(`POST /claim/${id}`);

  const { status, data } = await request('POST', `/claim/${id}`);
  const resp = data as { port?: number; id?: string };

  if (status === 200 && resp.port) {
    state.serviceId = id;
    ok(`Claimed port ${resp.port} for "${id}"`);
    info('Try it: pd claim myapp:api -- always the same port, every time.');
  } else {
    err('Failed to claim port. Is the daemon running? (pd start)');
  }
  await pause();
}

async function lesson02_listServices(): Promise<void> {
  header('Listing Services', 2, 13);
  info('See all claimed ports across projects.');
  console.log('');

  code(`GET /services`);
  const { status, data } = await request('GET', '/services');
  const resp = data as { services?: unknown[] };

  if (status === 200) {
    const count = resp.services?.length ?? 0;
    ok(`Found ${count} claimed service(s).`);
    info('Try it: pd find -- or pd find myapp:*');
  } else {
    err('Could not list services.');
  }
  await pause();
}

async function lesson03_sessions(): Promise<void> {
  header('Sessions: Coordination Journals', 3, 13);
  info('Sessions replace .CLAUDE_LOCK files with a structured, queryable system.');
  info('Each session tracks purpose, claimed files, and an immutable note timeline.');
  console.log('');

  code(`POST /sessions  { purpose: "Tutorial demo session" }`);
  const { status, data } = await request('POST', '/sessions', {
    purpose: 'Tutorial demo session',
  });
  const resp = data as { id?: string };

  if (status === 201 && resp.id) {
    state.sessionId = resp.id;
    ok(`Session created: ${resp.id}`);
    info('Try it: pd session start "Building auth"');
  } else {
    err('Failed to create session.');
  }
  await pause();
}

async function lesson04_notes(): Promise<void> {
  header('Notes: Immutable Timeline', 4, 13);
  info('Notes are append-only records attached to a session.');
  info('They create an audit trail that survives agent crashes.');
  console.log('');

  if (!state.sessionId) {
    warn('No session active -- skipping notes lesson.');
    await pause();
    return;
  }

  code(`POST /sessions/${state.sessionId}/notes  { content: "Tutorial note", type: "note" }`);
  const { status } = await request('POST', `/sessions/${state.sessionId}/notes`, {
    content: 'Starting the tutorial walkthrough',
    type: 'note',
  });

  if (status === 201) {
    ok('Note added to session.');
    info('Try it: pd note "Finished OAuth integration" --type commit');
  } else {
    err('Failed to add note.');
  }
  await pause();
}

async function lesson05_pubSub(): Promise<void> {
  header('Pub/Sub: Real-Time Signaling', 5, 13);
  info('Publish messages to channels; subscribers receive them in real-time.');
  info('Great for signaling between concurrent agents (build complete, ready, etc.).');
  console.log('');

  const channel = `tutorial-channel-${Date.now()}`;
  state.channelName = channel;

  code(`POST /msg/${channel}  { content: "Build complete!" }`);
  const { status } = await request('POST', `/msg/${channel}`, {
    content: 'Build complete!',
    meta: { from: 'tutorial' },
  });

  if (status === 200 || status === 201) {
    ok(`Published to channel: ${channel}`);
    info('Try it: pd pub build:api \'{"status":"ready"}\' && pd sub build:*');
  } else {
    err('Failed to publish message.');
  }
  await pause();
}

async function lesson06_locks(): Promise<void> {
  header('Distributed Locks', 6, 13);
  info('Locks provide exclusive access to shared resources.');
  info('Use them for database migrations, deployments, or any one-at-a-time operation.');
  console.log('');

  const lockName = `tutorial-lock-${Date.now()}`;
  state.lockName = lockName;

  code(`POST /locks/${lockName}  { ttl: 30000 }`);
  const { status, data } = await request('POST', `/locks/${lockName}`, { ttl: 30000 });
  const resp = data as { acquired?: boolean };

  if (status === 200 && resp.acquired) {
    ok(`Acquired lock: ${lockName}`);
    info('Try it: pd lock db-migrations && npx prisma migrate dev && pd unlock db-migrations');
    info('SDK: await pd.withLock("db-migrations", async () => { ... })');
  } else {
    err('Failed to acquire lock.');
  }
  await pause();
}

async function lesson07_agents(): Promise<void> {
  header('Agent Registry', 7, 13);
  info('Register your agent so others can see you, track your heartbeat,');
  info('and salvage your work if you crash.');
  console.log('');

  const agentId = `tutorial-agent-${Date.now()}`;
  state.agentId = agentId;

  code(`POST /agents  { id: "${agentId}", type: "tutorial", purpose: "Running the tutorial" }`);
  const { status } = await request('POST', '/agents', {
    id: agentId,
    type: 'tutorial',
    purpose: 'Running the interactive tutorial',
  });

  if (status === 200 || status === 201) {
    ok(`Registered agent: ${agentId}`);
    info('Try it: pd agent register --agent my-agent --identity myapp:api --purpose "Building auth"');
  } else {
    err('Failed to register agent.');
  }
  await pause();
}

async function lesson08_webhooks(): Promise<void> {
  header('Webhooks', 8, 13);
  info('Webhooks deliver Port Daddy events to external URLs.');
  info('Useful for CI/CD triggers, Slack notifications, or custom dashboards.');
  console.log('');

  code(`POST /webhooks  { url: "https://example.com/hook", events: ["claim","release"] }`);
  const { status, data } = await request('POST', '/webhooks', {
    url: 'https://example.com/tutorial-webhook',
    events: ['claim', 'release'],
    secret: 'tutorial-secret',
  });
  const resp = data as { id?: string };

  if (status === 201 && resp.id) {
    state.webhookId = resp.id;
    ok(`Registered webhook: ${resp.id}`);
    info('Try it: pd webhook add https://example.com/hook --events claim,release');
  } else {
    warn('Webhook registration returned unexpected status -- continuing tutorial.');
  }
  await pause();
}

async function lesson09_tunnels(): Promise<void> {
  header('Tunnels: Share Your Local Server', 9, 13);
  info('Tunnels expose your local dev server to the internet.');
  info('Use them for webhook testing, demos, or mobile device testing.');
  console.log('');

  code(`GET /tunnel/providers`);
  const { status, data } = await request('GET', '/tunnel/providers');
  const resp = data as { providers?: Record<string, boolean> };

  if (status === 200 && resp.providers) {
    const available = Object.entries(resp.providers)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (available.length > 0) {
      ok(`Available tunnel providers: ${available.join(', ')}`);
    } else {
      info('No tunnel providers found. Install ngrok or cloudflared to use tunnels.');
    }
    info('Try it: pd tunnel start myapp:api --provider cloudflared');
  } else {
    err('Could not check tunnel providers.');
  }
  await pause();
}

async function lesson10_changelog(): Promise<void> {
  header('Changelog', 10, 13);
  info('Record meaningful work against semantic identities.');
  info('Entries roll up: myapp:api:auth -> myapp:api -> myapp.');
  console.log('');

  code(`POST /changelog  { identity: "tutorial:demo", summary: "Completed tutorial", type: "chore" }`);
  const { status } = await request('POST', '/changelog', {
    identity: 'tutorial:demo',
    summary: 'Completed Port Daddy interactive tutorial',
    type: 'chore',
  });

  if (status === 201 || status === 200) {
    ok('Changelog entry created.');
    info('Try it: pd changelog add myapp:api "Added JWT auth" --type feature');
    info('SDK: await pd.addChangelog({ identity: "myapp:api", summary: "...", type: "feature" })');
  } else {
    err('Failed to create changelog entry.');
  }
  await pause();
}

async function lesson11_dns(): Promise<void> {
  header('Local DNS: Semantic Names for Ports', 11, 13);
  info('Claim a port with --dns to get a .local hostname.');
  info('Access your service at myapp-api.local instead of localhost:3847.');
  console.log('');

  const dnsId = `tutorial-dns-${Date.now()}`;
  state.dnsIdentity = dnsId;

  code(`POST /claim/${dnsId}  (with DNS registration)`);
  const { status, data } = await request('POST', `/claim/${dnsId}`, { dns: true });
  const resp = data as { port?: number; hostname?: string };

  if (status === 200 && resp.port) {
    ok(`Claimed port ${resp.port} for "${dnsId}"`);
    if (resp.hostname) {
      ok(`DNS registered: ${resp.hostname}`);
    } else {
      info('DNS registration requires avahi-daemon on Linux or mDNS on macOS.');
    }
    info('Try it: pd claim myapp:api --dns');
  } else {
    err('Failed to claim with DNS. Continuing anyway.');
  }
  await pause();
}

async function lesson12_salvage(): Promise<void> {
  header('Agent Salvage (Resurrection)', 12, 13);
  info('When an agent dies, Port Daddy preserves its session context.');
  info('Another agent can claim the dead agent\'s work and continue.');
  console.log('');

  code(`GET /salvage  (check for dead agents)`);
  const { status, data } = await request('GET', '/salvage');
  const resp = data as { entries?: unknown[] };

  if (status === 200) {
    const count = resp.entries?.length ?? 0;
    ok(`Salvage queue: ${count} dead agent(s) awaiting recovery.`);
    if (count > 0) {
      info('Run: pd salvage claim <agent-id>  to continue a dead agent\'s work.');
    } else {
      info('No dead agents right now. Good health all around!');
    }
    info('Try it: pd salvage --project myapp');
    info('SDK: const { entries } = await pd.salvage({ project: "myapp" })');
  } else {
    err('Could not query salvage queue.');
  }
  await pause();
}

async function lesson13_inbox(): Promise<void> {
  header('Agent Inbox: Direct Messaging', 13, 13);
  info('Every registered agent has a personal inbox.');
  info('Any caller can send; only registered agents can receive.');
  info('Use DMs for targeted handoffs. Use pub/sub for broadcasts.');
  console.log('');

  const ts = Date.now();
  const aliceId = `alice-${ts}`;
  const bobId   = `bob-${ts}`;
  state.inboxSenderAgent   = aliceId;
  state.inboxReceiverAgent = bobId;

  // Step 1 — Register Alice
  info(`Step 1: Register Alice (${aliceId})`);
  code(`POST /agents  { id: "${aliceId}", type: "tutorial" }`);
  const r1 = await request('POST', '/agents', { id: aliceId, type: 'tutorial', purpose: 'Inbox demo sender' });
  if (r1.status === 200 || r1.status === 201) {
    ok(`Registered ${aliceId}`);
  } else {
    err(`Failed to register ${aliceId}`);
  }

  // Step 2 — Register Bob
  info(`Step 2: Register Bob (${bobId})`);
  code(`POST /agents  { id: "${bobId}", type: "tutorial" }`);
  const r2 = await request('POST', '/agents', { id: bobId, type: 'tutorial', purpose: 'Inbox demo receiver' });
  if (r2.status === 200 || r2.status === 201) {
    ok(`Registered ${bobId}`);
  } else {
    err(`Failed to register ${bobId}`);
  }

  console.log('');

  // Step 3 — Alice sends Bob a message
  info('Step 3: Alice sends Bob a message');
  code(`POST /agents/${bobId}/inbox
  { content: "Hello from Alice!", from: "${aliceId}", type: "message" }`);
  const r3 = await request('POST', `/agents/${bobId}/inbox`, {
    content: 'Hello from Alice!',
    from: aliceId,
    type: 'message',
  });
  if (r3.status === 200 || r3.status === 201) {
    ok('Message delivered to Bob\'s inbox.');
  } else {
    err('Failed to send message.');
  }

  console.log('');

  // Step 4 — Check stats
  info('Step 4: Check Bob\'s inbox stats');
  code(`GET /agents/${bobId}/inbox/stats`);
  const r4 = await request('GET', `/agents/${bobId}/inbox/stats`);
  const stats = r4.data as { total?: number; unread?: number };
  if (r4.status === 200) {
    ok(`Stats: total=${stats.total ?? '?'}, unread=${stats.unread ?? '?'}`);
  } else {
    err('Could not retrieve inbox stats.');
  }

  console.log('');

  // Step 5 — Read inbox
  info('Step 5: Bob reads his inbox');
  code(`GET /agents/${bobId}/inbox`);
  const r5 = await request('GET', `/agents/${bobId}/inbox`);
  const inboxData = r5.data as { messages?: Array<{ id: string; from?: string; content: string; type: string }> };
  if (r5.status === 200 && inboxData.messages) {
    for (const msg of inboxData.messages) {
      ok(`Message from ${msg.from ?? 'unknown'}: "${msg.content}" [${msg.type}]`);
    }
  } else {
    err('Could not read inbox.');
  }

  console.log('');

  // Step 6 — Mark all read
  info('Step 6: Bob marks all messages as read');
  code(`PUT /agents/${bobId}/inbox/read-all`);
  const r6 = await request('PUT', `/agents/${bobId}/inbox/read-all`);
  if (r6.status === 200) {
    ok('All messages marked as read.');
  } else {
    err('Failed to mark all read.');
  }

  console.log('');

  // Step 7 — Clear inbox
  info('Step 7: Bob clears his inbox');
  code(`DELETE /agents/${bobId}/inbox`);
  const r7 = await request('DELETE', `/agents/${bobId}/inbox`);
  const clearData = r7.data as { deleted?: number };
  if (r7.status === 200) {
    ok(`Inbox cleared. Deleted ${clearData.deleted ?? 0} message(s).`);
  } else {
    err('Failed to clear inbox.');
  }

  console.log('');

  // Step 8 — Unregister both
  info(`Step 8: Unregister Alice and Bob`);
  await request('DELETE', `/agents/${aliceId}`);
  await request('DELETE', `/agents/${bobId}`);
  state.inboxSenderAgent   = undefined;
  state.inboxReceiverAgent = undefined;
  ok(`Unregistered ${aliceId}`);
  ok(`Unregistered ${bobId}`);

  console.log('');
  info('SDK equivalents:');
  code(`await pd.inboxSend('bob', 'Hello!', { from: 'alice', type: 'message' });
const { messages } = await pd.inboxList('bob', { unreadOnly: true });
const { total, unread } = await pd.inboxStats('bob');
await pd.inboxMarkAllRead('bob');
const { deleted } = await pd.inboxClear('bob');`);

  await pause();
}

// ── Summary ───────────────────────────────────────────────────────────────────

function summary(): void {
  console.log('');
  console.log(`${BOLD}${GREEN}${'═'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${GREEN}  Tutorial Complete!${RESET}`);
  console.log(`${BOLD}${GREEN}${'═'.repeat(60)}${RESET}`);
  console.log('');
  console.log(`  You have now seen all 13 Port Daddy features:`);
  console.log('');
  console.log(`  ${DIM} 1.${RESET} Port claiming          — stable, deterministic ports`);
  console.log(`  ${DIM} 2.${RESET} Service listing        — pd find`);
  console.log(`  ${DIM} 3.${RESET} Sessions              — structured coordination journals`);
  console.log(`  ${DIM} 4.${RESET} Notes                 — immutable, append-only timeline`);
  console.log(`  ${DIM} 5.${RESET} Pub/Sub               — real-time broadcast signaling`);
  console.log(`  ${DIM} 6.${RESET} Distributed locks     — exclusive resource access`);
  console.log(`  ${DIM} 7.${RESET} Agent registry        — heartbeats and identity`);
  console.log(`  ${DIM} 8.${RESET} Webhooks              — external event delivery`);
  console.log(`  ${DIM} 9.${RESET} Tunnels               — share localhost with the world`);
  console.log(`  ${DIM}10.${RESET} Changelog             — hierarchical work history`);
  console.log(`  ${DIM}11.${RESET} Local DNS             — semantic .local hostnames`);
  console.log(`  ${DIM}12.${RESET} Agent salvage         — dead agent resurrection`);
  console.log(`  ${DIM}13.${RESET} Agent inbox           — targeted direct messaging`);
  console.log('');
  console.log(`  ${BOLD}Next steps:${RESET}`);
  console.log(`  ${DIM}$${RESET} pd session start "My next task"`);
  console.log(`  ${DIM}$${RESET} pd note "Started work on ..." --type note`);
  console.log(`  ${DIM}$${RESET} pd agent register --agent my-id --purpose "..."`);
  console.log(`  ${DIM}$${RESET} pd inbox send <agent-id> "Hello!"`);
  console.log('');
  console.log(`  Full CLI reference: pd --help`);
  console.log(`  SDK reference:      https://github.com/curiositech/port-daddy/blob/main/docs/sdk.md`);
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runTutorial(): Promise<void> {
  console.log('');
  console.log(`${BOLD}${CYAN}Port Daddy Interactive Tutorial${RESET}`);
  console.log(`${DIM}This tutorial walks through all 13 features of Port Daddy.${RESET}`);
  console.log(`${DIM}Press Enter to advance through each lesson.${RESET}`);
  console.log(`${DIM}Ctrl+C at any time to quit (cleanup runs automatically).${RESET}`);
  console.log('');

  // Graceful exit on Ctrl+C
  process.on('SIGINT', async () => {
    console.log('');
    warn('Tutorial interrupted.');
    await cleanup();
    process.exit(0);
  });

  try {
    await lesson01_claimPort();
    await lesson02_listServices();
    await lesson03_sessions();
    await lesson04_notes();
    await lesson05_pubSub();
    await lesson06_locks();
    await lesson07_agents();
    await lesson08_webhooks();
    await lesson09_tunnels();
    await lesson10_changelog();
    await lesson11_dns();
    await lesson12_salvage();
    await lesson13_inbox();
  } finally {
    await cleanup();
  }

  summary();
}
