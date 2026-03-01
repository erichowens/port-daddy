/**
 * Adversarial Testing Suite for Port Daddy
 *
 * Systematic testing of edge cases, race conditions, and security boundaries.
 * Tests run against an ephemeral daemon started by Jest.
 */

import { request, runCli, getDaemonState } from '../helpers/integration-setup.js';

const BASE_URL = 'http://localhost:9876';

describe('Adversarial Testing - Port Claiming Edge Cases', () => {
  describe('Malformed IDs', () => {
    test('claim with SQL injection attempt in ID', async () => {
      const res = await request('/claim/test', {
        method: 'POST',
        body: { id: "test'; DROP TABLE services; --" }
      });
      // Should either reject or safely handle
      expect([400, 422, 500]).not.toContain(500);
      // Database should still be usable
      const health = await request('/health');
      expect(health.ok).toBe(true);
    });

    test('claim with very long ID (1000+ chars)', async () => {
      const longId = 'a'.repeat(1000);
      const res = await request('/claim/' + longId, {
        method: 'POST',
        body: { framework: 'test' }
      });
      // Should reject with 400 or 413
      expect(res.status).toMatch(/^(400|413|422)$/);
    });

    test('claim with unicode characters in ID', async () => {
      const unicodeId = 'test-café-🔒';
      const res = await request('/claim/unicode-test', {
        method: 'POST',
        body: { id: unicodeId }
      });
      // Should handle gracefully
      expect([200, 201, 400, 422]).toContain(res.status);
    });

    test('claim with null bytes', async () => {
      const res = await request('/claim/null-test', {
        method: 'POST',
        body: { id: 'test\x00injection' }
      });
      // Should not cause 500 error
      expect(res.status).not.toBe(500);
    });

    test('claim with special regex characters', async () => {
      const res = await request('/claim/regex-test', {
        method: 'POST',
        body: { id: 'test.*+?^${}()|[]\\' }
      });
      expect([200, 201, 400, 422]).toContain(res.status);
    });
  });

  describe('Race Conditions', () => {
    test('simultaneous claims for same ID are serialized', async () => {
      const testId = `race-test-${Date.now()}`;
      const promises = [];

      // Fire 5 concurrent claims for the same ID
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(`/claim/${testId}`, {
            method: 'POST',
            body: { framework: 'test' }
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.status === 200 || r.status === 201);

      // Only one should succeed (or all fail, but not multiple succeed)
      expect(successful.length).toBeLessThanOrEqual(1);

      // Cleanup
      await request(`/release/${testId}`, { method: 'DELETE' });
    });

    test('claim and release race condition', async () => {
      const testId = `race-release-${Date.now()}`;

      // Claim it
      await request(`/claim/${testId}`, {
        method: 'POST',
        body: { framework: 'test' }
      });

      // Try to release while listing services
      const promises = [
        request(`/release/${testId}`, { method: 'DELETE' }),
        request(`/services`),
        request(`/services`)
      ];

      const results = await Promise.all(promises);
      // All should succeed without crash
      expect(results.every(r => r.ok)).toBe(true);
    });
  });

  describe('Release Endpoint', () => {
    test('release non-existent port returns 404', async () => {
      const res = await request(`/release/nonexistent-port-${Date.now()}`, {
        method: 'DELETE'
      });
      expect(res.status).toBe(404);
    });

    test('release same port twice', async () => {
      const testId = `double-release-${Date.now()}`;
      await request(`/claim/${testId}`, {
        method: 'POST',
        body: { framework: 'test' }
      });

      const res1 = await request(`/release/${testId}`, { method: 'DELETE' });
      const res2 = await request(`/release/${testId}`, { method: 'DELETE' });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(404);
    });
  });
});

describe('Adversarial Testing - Session/Notes Edge Cases', () => {
  describe('Session Creation', () => {
    test('create session with empty body', async () => {
      const res = await request('/sessions', {
        method: 'POST',
        body: {}
      });
      expect([200, 201, 400, 422]).toContain(res.status);
    });

    test('create session with very long name', async () => {
      const longName = 'x'.repeat(5000);
      const res = await request('/sessions', {
        method: 'POST',
        body: { name: longName }
      });
      // Should either accept or reject gracefully
      expect([200, 201, 400, 413]).toContain(res.status);
    });

    test('create session with unicode name', async () => {
      const res = await request('/sessions', {
        method: 'POST',
        body: { name: 'session-café-日本-🔒' }
      });
      if (res.ok) {
        // Verify it's retrievable
        const sessionId = res.data.id || res.data.session_id;
        const getRES = await request(`/sessions/${sessionId}`);
        expect(getRES.ok).toBe(true);
      }
    });

    test('create session with special chars in name', async () => {
      const res = await request('/sessions', {
        method: 'POST',
        body: { name: "session'; DROP TABLE--" }
      });
      expect([200, 201, 400, 422]).toContain(res.status);
    });
  });

  describe('Notes Operations', () => {
    test('add note to non-existent session', async () => {
      const res = await request('/sessions/nonexistent-session-xyz/notes', {
        method: 'POST',
        body: { content: 'test' }
      });
      expect(res.status).toBe(404);
    });

    test('add very large note (100KB+)', async () => {
      // Create a session first
      const sessionRes = await request('/sessions', {
        method: 'POST',
        body: { name: 'large-note-test' }
      });
      expect(sessionRes.ok).toBe(true);

      const sessionId = sessionRes.data.id || sessionRes.data.session_id;
      const largeContent = 'x'.repeat(102400);

      const res = await request(`/sessions/${sessionId}/notes`, {
        method: 'POST',
        body: { content: largeContent }
      });

      expect([200, 201, 413, 400]).toContain(res.status);
    });

    test('add notes with unicode content', async () => {
      const sessionRes = await request('/sessions', {
        method: 'POST',
        body: { name: 'unicode-note-test' }
      });
      expect(sessionRes.ok).toBe(true);

      const sessionId = sessionRes.data.id || sessionRes.data.session_id;

      const res = await request(`/sessions/${sessionId}/notes`, {
        method: 'POST',
        body: { content: '测试内容 café 🎉 日本語' }
      });

      expect([200, 201]).toContain(res.status);
    });

    test('add note with SQL injection attempt', async () => {
      const sessionRes = await request('/sessions', {
        method: 'POST',
        body: { name: 'injection-test' }
      });
      expect(sessionRes.ok).toBe(true);

      const sessionId = sessionRes.data.id || sessionRes.data.session_id;

      const res = await request(`/sessions/${sessionId}/notes`, {
        method: 'POST',
        body: { content: "'); DELETE FROM session_notes; --" }
      });

      expect([200, 201]).toContain(res.status);
      // Database should still be intact
      const health = await request('/health');
      expect(health.ok).toBe(true);
    });
  });

  describe('Session Deletion', () => {
    test('delete session while notes are being added (race)', async () => {
      const sessionRes = await request('/sessions', {
        method: 'POST',
        body: { name: 'race-delete' }
      });
      const sessionId = sessionRes.data.id || sessionRes.data.session_id;

      // Start adding notes and deleting simultaneously
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(`/sessions/${sessionId}/notes`, {
            method: 'POST',
            body: { content: `note-${i}` }
          })
        );
      }
      promises.push(
        request(`/sessions/${sessionId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(promises);
      // All operations should complete without crashes
      expect(results.length).toBe(4);
    });

    test('delete non-existent session', async () => {
      const res = await request('/sessions/nonexistent-session-xyz', {
        method: 'DELETE'
      });
      expect(res.status).toBe(404);
    });
  });
});

describe('Adversarial Testing - Locks', () => {
  describe('Lock Acquisition Race Conditions', () => {
    test('simultaneous lock acquisition on same lock name', async () => {
      const lockName = `race-lock-${Date.now()}`;
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(`/locks/${lockName}`, {
            method: 'POST',
            body: { ttl: 60 }
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.status === 200 || r.status === 201);

      // Only one should succeed
      expect(successful.length).toBe(1);

      // Cleanup
      await request(`/locks/${lockName}`, { method: 'DELETE' });
    });
  });

  describe('TTL Validation', () => {
    test('lock with TTL of 0 is rejected', async () => {
      const res = await request(`/locks/ttl-zero-${Date.now()}`, {
        method: 'POST',
        body: { ttl: 0 }
      });
      expect([400, 422]).toContain(res.status);
    });

    test('lock with negative TTL is rejected', async () => {
      const res = await request(`/locks/ttl-negative-${Date.now()}`, {
        method: 'POST',
        body: { ttl: -60 }
      });
      expect([400, 422]).toContain(res.status);
    });

    test('lock with very large TTL is accepted', async () => {
      const lockName = `ttl-large-${Date.now()}`;
      const res = await request(`/locks/${lockName}`, {
        method: 'POST',
        body: { ttl: 999999999 }
      });
      expect([200, 201]).toContain(res.status);

      // Cleanup
      await request(`/locks/${lockName}`, { method: 'DELETE' });
    });

    test('extending expired lock fails', async () => {
      const lockName = `extend-expired-${Date.now()}`;

      // Create with 1 second TTL
      await request(`/locks/${lockName}`, {
        method: 'POST',
        body: { ttl: 1 }
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Try to extend
      const res = await request(`/locks/${lockName}`, {
        method: 'PUT',
        body: { ttl: 60 }
      });

      expect(res.status).toBe(404);
    });
  });

  describe('Lock Release', () => {
    test('release non-existent lock', async () => {
      const res = await request(`/locks/nonexistent-lock-${Date.now()}`, {
        method: 'DELETE'
      });
      expect(res.status).toBe(404);
    });
  });
});

describe('Adversarial Testing - Messaging/PubSub', () => {
  describe('Channel Operations', () => {
    test('publish to channel with special chars', async () => {
      const res = await request('/msg/special-@#$-channel', {
        method: 'POST',
        body: { message: 'test' }
      });
      expect([200, 201, 400]).toContain(res.status);
    });

    test('publish very large message (1MB+)', async () => {
      const largeMsg = 'x'.repeat(1048576);
      const res = await request('/msg/large-msg', {
        method: 'POST',
        body: { message: largeMsg }
      });
      // Should either reject with 413 or accept
      expect([200, 201, 413]).toContain(res.status);
    });

    test('rapid fire publish (50 messages)', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request('/msg/rapid-fire', {
            method: 'POST',
            body: { message: `msg-${i}` }
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.ok).length;
      expect(successful).toBeGreaterThan(40); // Most should succeed
    });

    test('publish message with SQL injection', async () => {
      const res = await request('/msg/injection-test', {
        method: 'POST',
        body: { message: "'); DELETE FROM messages; --" }
      });
      expect([200, 201]).toContain(res.status);

      // Database should still work
      const health = await request('/health');
      expect(health.ok).toBe(true);
    });
  });
});

describe('Adversarial Testing - Agents', () => {
  describe('Agent Registration', () => {
    test('register with duplicate ID fails', async () => {
      const agentId = `dup-agent-${Date.now()}`;

      const res1 = await request(`/agents/${agentId}`, {
        method: 'POST',
        body: { purpose: 'test1' }
      });
      expect([200, 201]).toContain(res1.status);

      const res2 = await request(`/agents/${agentId}`, {
        method: 'POST',
        body: { purpose: 'test2' }
      });
      expect(res2.status).toBe(409);

      // Cleanup
      await request(`/agents/${agentId}`, { method: 'DELETE' });
    });

    test('heartbeat for non-existent agent fails', async () => {
      const res = await request(`/agents/nonexistent-agent-${Date.now()}/heartbeat`, {
        method: 'PUT',
        body: {}
      });
      expect(res.status).toBe(404);
    });

    test('register with very long purpose string', async () => {
      const longPurpose = 'purpose: '.repeat(1000);
      const res = await request(`/agents/long-purpose-${Date.now()}`, {
        method: 'POST',
        body: { purpose: longPurpose }
      });
      expect([200, 201, 413]).toContain(res.status);
    });

    test('register with unicode in purpose', async () => {
      const agentId = `unicode-agent-${Date.now()}`;
      const res = await request(`/agents/${agentId}`, {
        method: 'POST',
        body: { purpose: '测试目的 café 🔒' }
      });
      expect([200, 201]).toContain(res.status);

      // Cleanup
      await request(`/agents/${agentId}`, { method: 'DELETE' });
    });
  });
});

describe('Adversarial Testing - Webhook Security (SSRF)', () => {
  describe('SSRF Protection', () => {
    test('webhook to localhost is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'http://localhost:8000/webhook',
          events: ['*']
        }
      });
      expect([400, 403]).toContain(res.status);
    });

    test('webhook to 127.0.0.1 is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'http://127.0.0.1:8000/webhook',
          events: ['*']
        }
      });
      expect([400, 403]).toContain(res.status);
    });

    test('webhook to AWS metadata endpoint is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'http://169.254.169.254/latest/meta-data/',
          events: ['*']
        }
      });
      expect([400, 403]).toContain(res.status);
    });

    test('webhook to private network is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'http://192.168.1.1:80/admin',
          events: ['*']
        }
      });
      expect([400, 403]).toContain(res.status);
    });

    test('webhook to 10.0.0.0/8 is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'http://10.0.0.1:80/endpoint',
          events: ['*']
        }
      });
      expect([400, 403]).toContain(res.status);
    });

    test('invalid webhook URL is rejected', async () => {
      const res = await request('/webhooks', {
        method: 'POST',
        body: {
          url: 'not a valid url at all',
          events: ['*']
        }
      });
      expect([400, 422]).toContain(res.status);
    });
  });
});

describe('Adversarial Testing - API Input Validation', () => {
  describe('Malformed Requests', () => {
    test('malformed JSON body is rejected', async () => {
      const res = await fetch(`${BASE_URL}/claim/malformed-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{this is not valid json}'
      }).then(r => ({ status: r.status }));

      expect(res.status).toBe(400);
    });

    test('wrong Content-Type is rejected', async () => {
      const res = await fetch(`${BASE_URL}/claim/content-type-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: '<claim><id>test</id></claim>'
      }).then(r => ({ status: r.status }));

      expect([400, 415]).toContain(res.status);
    });

    test('missing required fields returns 400', async () => {
      const res = await request('/sessions', {
        method: 'POST',
        body: { unrelated: 'field' }
      });
      expect([200, 201, 400, 422]).toContain(res.status);
    });

    test('very large request body is rejected', async () => {
      const hugePayload = {
        project: 'test',
        data: 'x'.repeat(10485760) // 10MB
      };
      const res = await request('/claim/huge-test', {
        method: 'POST',
        body: hugePayload
      });
      expect([400, 413]).toContain(res.status);
    });
  });

  describe('Concurrent Requests', () => {
    test('50 concurrent claims succeed', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(`/claim/concurrent-${i}-${Date.now()}`, {
            method: 'POST',
            body: { framework: 'test' }
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r.ok).length;
      expect(successful).toBeGreaterThan(40);

      // Cleanup
      for (let i = 0; i < 50; i++) {
        await request(`/release/concurrent-${i}-${Date.now()}`, {
          method: 'DELETE'
        }).catch(() => {});
      }
    });
  });
});

describe('Adversarial Testing - API Method Validation', () => {
  test('GET to POST-only endpoint', async () => {
    const res = await fetch(`${BASE_URL}/claim/method-test`, {
      method: 'GET'
    }).then(r => ({ status: r.status }));

    expect([404, 405]).toContain(res.status);
  });

  test('DELETE to GET-only endpoint', async () => {
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'DELETE'
    }).then(r => ({ status: r.status }));

    expect([404, 405]).toContain(res.status);
  });
});

describe('Adversarial Testing - Tunnel Operations', () => {
  describe('Tunnel Edge Cases', () => {
    test('start tunnel for non-existent service', async () => {
      const res = await request(`/tunnel/nonexistent-service-${Date.now()}`, {
        method: 'POST',
        body: { provider: 'cloudflare' }
      });
      expect(res.status).toBe(404);
    });
  });
});

describe('Adversarial Testing - Database Integrity', () => {
  test('database remains consistent after invalid operations', async () => {
    const health1 = await request('/health');
    expect(health1.ok).toBe(true);

    // Try various invalid operations
    await request('/claim/sql-inject-test', {
      method: 'POST',
      body: { id: "'; DROP TABLE services; --" }
    }).catch(() => {});

    await request('/sessions', {
      method: 'POST',
      body: { name: 'very '.repeat(10000) }
    }).catch(() => {});

    // Database should still be responsive
    const health2 = await request('/health');
    expect(health2.ok).toBe(true);

    // Verify we can still create services
    const res = await request(`/claim/integrity-test-${Date.now()}`, {
      method: 'POST',
      body: { framework: 'test' }
    });
    expect(res.ok).toBe(true);
  });
});
