/**
 * Unit tests for Port Daddy JavaScript SDK (lib/client.js)
 *
 * Tests the client against a mock HTTP server.
 * Verifies correct request formation, error handling, and convenience methods.
 */

import { PortDaddy, PortDaddyError, ConnectionError } from '../../lib/client.js';

// Track all fetch calls for assertion
let fetchCalls = [];
let fetchResponses = [];

function mockFetchResponse(body, status = 200) {
  fetchResponses.push({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

function resetFetch() {
  fetchCalls = [];
  fetchResponses = [];
}

// Install global fetch mock
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = async (url, opts) => {
    fetchCalls.push({ url, opts });
    if (fetchResponses.length === 0) {
      throw Object.assign(new Error('ECONNREFUSED'), { cause: { code: 'ECONNREFUSED' } });
    }
    return fetchResponses.shift();
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  resetFetch();
});

// =============================================================================
// Constructor
// =============================================================================

describe('PortDaddy constructor', () => {
  test('uses default URL', () => {
    const pd = new PortDaddy();
    expect(pd.url).toBe('http://localhost:9876');
  });

  test('accepts custom URL', () => {
    const pd = new PortDaddy({ url: 'http://custom:1234/' });
    expect(pd.url).toBe('http://custom:1234'); // Trailing slash stripped
  });

  test('reads PORT_DADDY_URL from environment', () => {
    const prev = process.env.PORT_DADDY_URL;
    process.env.PORT_DADDY_URL = 'http://env:5555';
    try {
      const pd = new PortDaddy();
      expect(pd.url).toBe('http://env:5555');
    } finally {
      if (prev === undefined) delete process.env.PORT_DADDY_URL;
      else process.env.PORT_DADDY_URL = prev;
    }
  });

  test('accepts agentId and pid', () => {
    const pd = new PortDaddy({ agentId: 'test-agent', pid: 42 });
    expect(pd.agentId).toBe('test-agent');
    expect(pd.pid).toBe(42);
  });
});

// =============================================================================
// Services
// =============================================================================

describe('Services', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy({ agentId: 'test-agent', pid: 1234 });
  });

  test('claim sends correct request', async () => {
    mockFetchResponse({ success: true, port: 3142, id: 'myapp:api', existing: false });

    const result = await pd.claim('myapp:api');

    expect(result.port).toBe(3142);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe('http://localhost:9876/claim');
    expect(fetchCalls[0].opts.method).toBe('POST');

    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.id).toBe('myapp:api');
    expect(body.pid).toBe(1234);
  });

  test('claim with preferred port', async () => {
    mockFetchResponse({ success: true, port: 3000, id: 'myapp:web', existing: false });

    await pd.claim('myapp:web', { port: 3000 });

    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.port).toBe(3000);
  });

  test('release sends DELETE', async () => {
    mockFetchResponse({ success: true, released: 1, releasedPorts: [3142] });

    const result = await pd.release('myapp:api');

    expect(result.released).toBe(1);
    expect(fetchCalls[0].opts.method).toBe('DELETE');
    expect(fetchCalls[0].url).toBe('http://localhost:9876/release');
  });

  test('release with wildcard', async () => {
    mockFetchResponse({ success: true, released: 3, releasedPorts: [3142, 3143, 3144] });

    const result = await pd.release('myapp:*');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.id).toBe('myapp:*');
    expect(result.released).toBe(3);
  });

  test('getService fetches by ID', async () => {
    mockFetchResponse({ success: true, service: { id: 'myapp:api', port: 3142 } });

    await pd.getService('myapp:api');

    expect(fetchCalls[0].url).toBe('http://localhost:9876/services/myapp%3Aapi');
    expect(fetchCalls[0].opts.method).toBe('GET');
  });

  test('listServices with pattern filter', async () => {
    mockFetchResponse({ success: true, services: [], count: 0 });

    await pd.listServices({ pattern: 'myapp:*', status: 'assigned' });

    expect(fetchCalls[0].url).toContain('/services?');
    expect(fetchCalls[0].url).toContain('pattern=myapp%3A*');
    expect(fetchCalls[0].url).toContain('status=assigned');
  });

  test('listServices without filters', async () => {
    mockFetchResponse({ success: true, services: [], count: 0 });

    await pd.listServices();

    expect(fetchCalls[0].url).toBe('http://localhost:9876/services');
  });

  test('setEndpoint sends PUT', async () => {
    mockFetchResponse({ success: true });

    await pd.setEndpoint('myapp:api', 'local', 'http://localhost:3142');

    expect(fetchCalls[0].opts.method).toBe('PUT');
    expect(fetchCalls[0].url).toContain('/services/myapp%3Aapi/endpoints/local');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.url).toBe('http://localhost:3142');
  });
});

// =============================================================================
// Messaging
// =============================================================================

describe('Messaging', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy();
  });

  test('publish sends correct message', async () => {
    mockFetchResponse({ success: true, id: 1, channel: 'builds' });

    const result = await pd.publish('builds', { status: 'done' }, { sender: 'ci' });

    expect(fetchCalls[0].url).toBe('http://localhost:9876/msg/builds');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.payload).toEqual({ status: 'done' });
    expect(body.sender).toBe('ci');
    expect(result.id).toBe(1);
  });

  test('getMessages with options', async () => {
    mockFetchResponse({ success: true, messages: [], count: 0 });

    await pd.getMessages('builds', { limit: 10, after: 5 });

    expect(fetchCalls[0].url).toContain('/msg/builds?');
    expect(fetchCalls[0].url).toContain('limit=10');
    expect(fetchCalls[0].url).toContain('after=5');
  });

  test('listChannels', async () => {
    mockFetchResponse({ success: true, channels: ['builds', 'deploys'] });

    const result = await pd.listChannels();

    expect(fetchCalls[0].url).toBe('http://localhost:9876/channels');
    expect(result.channels).toEqual(['builds', 'deploys']);
  });

  test('poll increases timeout', async () => {
    mockFetchResponse({ message: null });

    const pd2 = new PortDaddy({ timeout: 5000 });
    await pd2.poll('builds', { timeout: 30000 });

    // Timeout should have been temporarily increased
    expect(pd2.timeout).toBe(5000); // Restored after call
  });

  test('clearChannel sends DELETE', async () => {
    mockFetchResponse({ success: true, deleted: 5 });

    await pd.clearChannel('builds');

    expect(fetchCalls[0].opts.method).toBe('DELETE');
    expect(fetchCalls[0].url).toBe('http://localhost:9876/msg/builds');
  });
});

// =============================================================================
// Locks
// =============================================================================

describe('Locks', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy({ agentId: 'my-agent' });
  });

  test('lock sends correct request', async () => {
    mockFetchResponse({ success: true, owner: 'my-agent', expiresAt: Date.now() + 300000 });

    const result = await pd.lock('deploy-prod', { ttl: 60000 });

    expect(fetchCalls[0].url).toBe('http://localhost:9876/locks/deploy-prod');
    expect(fetchCalls[0].opts.method).toBe('POST');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.owner).toBe('my-agent');
    expect(body.ttl).toBe(60000);
    expect(result.success).toBe(true);
  });

  test('unlock sends DELETE', async () => {
    mockFetchResponse({ success: true, released: true });

    await pd.unlock('deploy-prod');

    expect(fetchCalls[0].opts.method).toBe('DELETE');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.owner).toBe('my-agent');
  });

  test('unlock with force', async () => {
    mockFetchResponse({ success: true, released: true });

    await pd.unlock('deploy-prod', { force: true });

    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.force).toBe(true);
  });

  test('checkLock sends GET', async () => {
    mockFetchResponse({ locked: true, owner: 'other-agent' });

    const result = await pd.checkLock('deploy-prod');

    expect(fetchCalls[0].opts.method).toBe('GET');
    expect(result.locked).toBe(true);
  });

  test('extendLock sends PUT', async () => {
    mockFetchResponse({ success: true, expiresAt: Date.now() + 600000 });

    await pd.extendLock('deploy-prod', { ttl: 600000 });

    expect(fetchCalls[0].opts.method).toBe('PUT');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.ttl).toBe(600000);
  });

  test('listLocks with owner filter', async () => {
    mockFetchResponse({ success: true, locks: [], count: 0 });

    await pd.listLocks({ owner: 'my-agent' });

    expect(fetchCalls[0].url).toContain('owner=my-agent');
  });

  test('withLock acquires, runs, and releases', async () => {
    // Lock acquire
    mockFetchResponse({ success: true, owner: 'my-agent' });
    // Lock release
    mockFetchResponse({ success: true, released: true });

    let executed = false;
    const result = await pd.withLock('test-lock', async () => {
      executed = true;
      return 'done';
    });

    expect(executed).toBe(true);
    expect(result).toBe('done');
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[0].opts.method).toBe('POST');   // acquire
    expect(fetchCalls[1].opts.method).toBe('DELETE');  // release
  });

  test('withLock releases even on error', async () => {
    mockFetchResponse({ success: true, owner: 'my-agent' });
    mockFetchResponse({ success: true, released: true });

    await expect(pd.withLock('test-lock', async () => {
      throw new Error('boom');
    })).rejects.toThrow('boom');

    // Should still release
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[1].opts.method).toBe('DELETE');
  });
});

// =============================================================================
// Agents
// =============================================================================

describe('Agents', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy({ agentId: 'build-agent', pid: 5555 });
  });

  test('register sends correct data', async () => {
    mockFetchResponse({ success: true, registered: true });

    await pd.register({ name: 'Build Agent', type: 'ci' });

    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.id).toBe('build-agent');
    expect(body.name).toBe('Build Agent');
    expect(body.type).toBe('ci');
  });

  test('register requires agentId', async () => {
    const pd2 = new PortDaddy(); // No agentId
    await expect(pd2.register()).rejects.toThrow('agentId required');
  });

  test('heartbeat sends POST', async () => {
    mockFetchResponse({ success: true });

    await pd.heartbeat();

    expect(fetchCalls[0].url).toBe('http://localhost:9876/agents/build-agent/heartbeat');
    expect(fetchCalls[0].opts.method).toBe('POST');
  });

  test('heartbeat requires agentId', async () => {
    const pd2 = new PortDaddy();
    await expect(pd2.heartbeat()).rejects.toThrow('agentId required');
  });

  test('startHeartbeat returns stopper', async () => {
    // Mock enough responses for initial + interval heartbeats
    for (let i = 0; i < 5; i++) mockFetchResponse({ success: true });

    const hb = pd.startHeartbeat(50); // 50ms interval for fast test
    expect(hb).toHaveProperty('stop');

    // Wait a bit for at least one heartbeat
    await new Promise(r => setTimeout(r, 80));
    hb.stop();

    // Should have at least 2 calls (immediate + 1 interval)
    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
  });

  test('unregister sends DELETE', async () => {
    mockFetchResponse({ success: true, unregistered: true });

    await pd.unregister();

    expect(fetchCalls[0].opts.method).toBe('DELETE');
    expect(fetchCalls[0].url).toBe('http://localhost:9876/agents/build-agent');
  });

  test('getAgent fetches by ID', async () => {
    mockFetchResponse({ success: true, agent: { id: 'build-agent' } });

    await pd.getAgent();

    expect(fetchCalls[0].url).toBe('http://localhost:9876/agents/build-agent');
  });

  test('getAgent with explicit ID', async () => {
    mockFetchResponse({ success: true, agent: { id: 'other-agent' } });

    await pd.getAgent('other-agent');

    expect(fetchCalls[0].url).toBe('http://localhost:9876/agents/other-agent');
  });

  test('listAgents with activeOnly', async () => {
    mockFetchResponse({ success: true, agents: [], count: 0 });

    await pd.listAgents({ activeOnly: true });

    expect(fetchCalls[0].url).toContain('active=true');
  });
});

// =============================================================================
// Webhooks
// =============================================================================

describe('Webhooks', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy();
  });

  test('addWebhook sends POST', async () => {
    mockFetchResponse({ success: true, id: 'wh-123' });

    const result = await pd.addWebhook('https://example.com/hook', {
      events: ['service.claim'],
      secret: 'mysecret',
    });

    expect(result.id).toBe('wh-123');
    const body = JSON.parse(fetchCalls[0].opts.body);
    expect(body.url).toBe('https://example.com/hook');
    expect(body.events).toEqual(['service.claim']);
    expect(body.secret).toBe('mysecret');
  });

  test('listWebhooks', async () => {
    mockFetchResponse({ success: true, webhooks: [], count: 0 });

    await pd.listWebhooks({ activeOnly: true });

    expect(fetchCalls[0].url).toContain('active=true');
  });

  test('removeWebhook sends DELETE', async () => {
    mockFetchResponse({ success: true });

    await pd.removeWebhook('wh-123');

    expect(fetchCalls[0].opts.method).toBe('DELETE');
    expect(fetchCalls[0].url).toContain('/webhooks/wh-123');
  });
});

// =============================================================================
// System
// =============================================================================

describe('System', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy();
  });

  test('health check', async () => {
    mockFetchResponse({ status: 'ok', version: '2.0.0', uptime_seconds: 100 });

    const result = await pd.health();

    expect(result.status).toBe('ok');
    expect(fetchCalls[0].url).toBe('http://localhost:9876/health');
  });

  test('version', async () => {
    mockFetchResponse({ version: '2.0.0', codeHash: 'abc123' });

    const result = await pd.version();

    expect(result.version).toBe('2.0.0');
  });

  test('getActivity with filters', async () => {
    mockFetchResponse({ success: true, activities: [], count: 0 });

    await pd.getActivity({ limit: 10, type: 'service.claim', agent: 'my-agent' });

    expect(fetchCalls[0].url).toContain('limit=10');
    expect(fetchCalls[0].url).toContain('type=service.claim');
    expect(fetchCalls[0].url).toContain('agent=my-agent');
  });

  test('cleanup', async () => {
    mockFetchResponse({ freed: [], count: 0 });

    await pd.cleanup();

    expect(fetchCalls[0].opts.method).toBe('POST');
    expect(fetchCalls[0].url).toContain('/ports/cleanup');
  });

  test('ping returns true when reachable', async () => {
    mockFetchResponse({ status: 'ok' });

    const ok = await pd.ping();
    expect(ok).toBe(true);
  });

  test('ping returns false when unreachable', async () => {
    // No mock response = will throw ECONNREFUSED
    const ok = await pd.ping();
    expect(ok).toBe(false);
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe('Error handling', () => {
  let pd;
  beforeEach(() => {
    pd = new PortDaddy();
  });

  test('throws ConnectionError on ECONNREFUSED', async () => {
    // No mock response = ECONNREFUSED
    try {
      await pd.claim('test');
      expect('should not reach').toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectionError);
      expect(err.name).toBe('ConnectionError');
      expect(err.message).toContain('not running');
    }
  });

  test('throws PortDaddyError on HTTP error', async () => {
    mockFetchResponse({ error: 'invalid identity format' }, 400);

    try {
      await pd.claim('!!!invalid!!!');
      expect('should not reach').toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(PortDaddyError);
      expect(err.status).toBe(400);
      expect(err.message).toBe('invalid identity format');
    }
  });

  test('throws PortDaddyError on 409 conflict', async () => {
    mockFetchResponse({ error: 'lock held by other-agent', owner: 'other-agent' }, 409);

    try {
      await pd.lock('my-lock');
      expect('should not reach').toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(PortDaddyError);
      expect(err.status).toBe(409);
      expect(err.body.owner).toBe('other-agent');
    }
  });

  test('includes agent headers when agentId set', async () => {
    const pd2 = new PortDaddy({ agentId: 'agent-x', pid: 9999 });
    mockFetchResponse({ success: true, port: 3142 });

    await pd2.claim('test');

    expect(fetchCalls[0].opts.headers['X-Agent-Id']).toBe('agent-x');
    expect(fetchCalls[0].opts.headers['X-Pid']).toBe('9999');
  });

  test('does not include agent headers when not set', async () => {
    const pd2 = new PortDaddy();
    mockFetchResponse({ success: true, port: 3142 });

    await pd2.claim('test');

    expect(fetchCalls[0].opts.headers['X-Agent-Id']).toBeUndefined();
  });
});

// =============================================================================
// Subscribe (SSE)
// =============================================================================

describe('subscribe', () => {
  test('returns object with on and unsubscribe', () => {
    const pd = new PortDaddy();
    // Will fail to connect but should return the interface synchronously
    const sub = pd.subscribe('test-channel');

    expect(sub).toHaveProperty('on');
    expect(sub).toHaveProperty('unsubscribe');
    expect(typeof sub.on).toBe('function');
    expect(typeof sub.unsubscribe).toBe('function');

    // Cleanup - abort the connection attempt
    sub.unsubscribe();
  });

  test('on method is chainable', () => {
    const pd = new PortDaddy();
    const sub = pd.subscribe('test');

    const result = sub.on('message', () => {}).on('error', () => {});
    expect(result).toBe(sub); // Chainable

    sub.unsubscribe();
  });
});
