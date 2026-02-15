#!/usr/bin/env node

/**
 * Agent Coordination Example
 *
 * Demonstrates how multiple Claude agents can coordinate work using Port Daddy's
 * pub/sub system. This pattern is useful for:
 *
 * - Build coordination (agent announces when build completes)
 * - Test distribution (agents claim test suites to avoid duplication)
 * - Bug fix handoff (agent announces fixed issue, others can verify)
 * - Resource locking (agents coordinate access to shared files)
 *
 * Run this example with:
 *   node examples/agent-coordination.js
 */

const PORT_DADDY = process.env.PORT_DADDY_URL || 'http://localhost:9876';

// Helper to make API calls
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${PORT_DADDY}${path}`, opts);
  return res.json();
}

// =============================================================================
// SCENARIO: Multi-agent build coordination
// =============================================================================
//
// Three agents are working on a monorepo:
// - Agent A: Working on the API service
// - Agent B: Working on the frontend
// - Agent C: Integration testing (needs both API + frontend running)
//
// Agent C needs to wait for both A and B to complete their builds before
// running integration tests.

async function simulateMultiAgentBuild() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SCENARIO: Multi-Agent Build Coordination');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const BUILD_CHANNEL = 'builds:monorepo';

  // --- Agent A starts working on API ---
  console.log('[Agent A] Starting API build...');
  await api('POST', `/msg/${BUILD_CHANNEL}`, {
    payload: {
      agent: 'agent-a',
      service: 'api',
      status: 'building',
      branch: 'feature/auth'
    },
    sender: 'agent-a'
  });

  // --- Agent B starts working on frontend ---
  console.log('[Agent B] Starting frontend build...');
  await api('POST', `/msg/${BUILD_CHANNEL}`, {
    payload: {
      agent: 'agent-b',
      service: 'frontend',
      status: 'building',
      branch: 'feature/auth'
    },
    sender: 'agent-b'
  });

  // --- Agent C subscribes and waits ---
  console.log('[Agent C] Waiting for both builds to complete...');
  console.log('           Subscribed to channel:', BUILD_CHANNEL);

  // Simulate Agent A completing
  await new Promise(r => setTimeout(r, 500));
  console.log('[Agent A] API build complete!');
  await api('POST', `/msg/${BUILD_CHANNEL}`, {
    payload: {
      agent: 'agent-a',
      service: 'api',
      status: 'complete',
      port: 3200,
      healthUrl: 'http://localhost:3200/health'
    },
    sender: 'agent-a'
  });

  // Simulate Agent B completing
  await new Promise(r => setTimeout(r, 300));
  console.log('[Agent B] Frontend build complete!');
  await api('POST', `/msg/${BUILD_CHANNEL}`, {
    payload: {
      agent: 'agent-b',
      service: 'frontend',
      status: 'complete',
      port: 3201,
      healthUrl: 'http://localhost:3201'
    },
    sender: 'agent-b'
  });

  // Agent C checks all messages
  const messages = await api('GET', `/msg/${BUILD_CHANNEL}?limit=10`);
  const completeServices = messages.messages
    .filter(m => m.payload.status === 'complete')
    .map(m => m.payload.service);

  console.log('[Agent C] Received build completion notices for:', completeServices);

  if (completeServices.includes('api') && completeServices.includes('frontend')) {
    console.log('[Agent C] All dependencies ready! Starting integration tests...');
    await api('POST', `/msg/${BUILD_CHANNEL}`, {
      payload: {
        agent: 'agent-c',
        service: 'integration-tests',
        status: 'running',
        dependsOn: ['api', 'frontend']
      },
      sender: 'agent-c'
    });
  }

  // Cleanup
  await api('DELETE', `/msg/${BUILD_CHANNEL}`);
}

// =============================================================================
// SCENARIO: Bug fix handoff
// =============================================================================
//
// Agent A finds a bug, Agent B fixes it, Agent A verifies the fix.

async function simulateBugFixHandoff() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SCENARIO: Bug Fix Handoff');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const BUG_CHANNEL = 'bugs:project-x';

  // Agent A discovers a bug
  console.log('[Agent A] Found a bug! Publishing to bug channel...');
  const bugReport = await api('POST', `/msg/${BUG_CHANNEL}`, {
    payload: {
      type: 'bug_report',
      severity: 'high',
      file: 'src/auth/login.ts',
      line: 142,
      description: 'Password validation allows empty strings',
      reproducible: true
    },
    sender: 'agent-a'
  });
  console.log('           Bug ID:', bugReport.id);

  // Agent B picks up the bug
  await new Promise(r => setTimeout(r, 200));
  console.log('[Agent B] Saw bug report, acquiring lock...');

  const lock = await api('POST', `/locks/bug-${bugReport.id}`, {
    owner: 'agent-b',
    ttl: 600000 // 10 minutes
  });

  if (lock.success) {
    console.log('[Agent B] Lock acquired, working on fix...');

    // Agent B publishes fix
    await new Promise(r => setTimeout(r, 400));
    console.log('[Agent B] Fix committed! Notifying...');
    await api('POST', `/msg/${BUG_CHANNEL}`, {
      payload: {
        type: 'fix_submitted',
        bugId: bugReport.id,
        fixedBy: 'agent-b',
        commit: 'abc123',
        file: 'src/auth/login.ts',
        description: 'Added non-empty password validation'
      },
      sender: 'agent-b'
    });

    // Release the lock
    await api('DELETE', `/locks/bug-${bugReport.id}`, { owner: 'agent-b' });
    console.log('[Agent B] Released bug lock');
  }

  // Agent A verifies the fix
  await new Promise(r => setTimeout(r, 200));
  console.log('[Agent A] Verifying fix...');
  await api('POST', `/msg/${BUG_CHANNEL}`, {
    payload: {
      type: 'fix_verified',
      bugId: bugReport.id,
      verifiedBy: 'agent-a',
      status: 'resolved'
    },
    sender: 'agent-a'
  });
  console.log('[Agent A] Fix verified! Bug resolved.');

  // Cleanup
  await api('DELETE', `/msg/${BUG_CHANNEL}`);
}

// =============================================================================
// SCENARIO: Test distribution
// =============================================================================
//
// Multiple agents divide test suites to run in parallel.

async function simulateTestDistribution() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SCENARIO: Distributed Test Execution');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const TEST_CHANNEL = 'tests:distribution';
  const testSuites = ['unit', 'integration', 'e2e', 'performance', 'security'];

  // Coordinator publishes available test suites
  console.log('[Coordinator] Publishing available test suites...');
  await api('POST', `/msg/${TEST_CHANNEL}`, {
    payload: {
      type: 'test_suites_available',
      suites: testSuites,
      branch: 'main',
      commit: 'def456'
    },
    sender: 'coordinator'
  });

  // Agents claim test suites using locks
  const agents = ['agent-1', 'agent-2', 'agent-3'];
  const claimed = {};

  for (const agent of agents) {
    for (const suite of testSuites) {
      const lock = await api('POST', `/locks/test-${suite}`, {
        owner: agent,
        ttl: 300000 // 5 minutes
      });

      if (lock.success) {
        claimed[suite] = agent;
        console.log(`[${agent}] Claimed test suite: ${suite}`);

        // Announce claim
        await api('POST', `/msg/${TEST_CHANNEL}`, {
          payload: {
            type: 'suite_claimed',
            suite,
            agent,
            estimatedDuration: '2m'
          },
          sender: agent
        });
        break; // Move to next agent
      }
    }
  }

  // Simulate test completion
  await new Promise(r => setTimeout(r, 300));

  for (const [suite, agent] of Object.entries(claimed)) {
    console.log(`[${agent}] Completed ${suite} tests ✓`);
    await api('POST', `/msg/${TEST_CHANNEL}`, {
      payload: {
        type: 'suite_complete',
        suite,
        agent,
        passed: Math.floor(Math.random() * 50) + 10,
        failed: 0,
        duration: Math.floor(Math.random() * 60) + 30
      },
      sender: agent
    });

    // Release lock
    await api('DELETE', `/locks/test-${suite}`, { owner: agent });
  }

  // Summary
  console.log('\n[Coordinator] All claimed test suites complete!');
  const results = await api('GET', `/msg/${TEST_CHANNEL}?limit=20`);
  const completions = results.messages.filter(m => m.payload.type === 'suite_complete');
  const totalPassed = completions.reduce((sum, m) => sum + m.payload.passed, 0);
  console.log(`           Total tests passed: ${totalPassed}`);

  // Cleanup
  await api('DELETE', `/msg/${TEST_CHANNEL}`);
}

// =============================================================================
// SCENARIO: File coordination
// =============================================================================
//
// Agents coordinate access to shared files (like .CLAUDE_LOCK but automatic)

async function simulateFileCoordination() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  SCENARIO: File Coordination');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const FILE_CHANNEL = 'files:project';

  // Agent A wants to edit auth module
  console.log('[Agent A] Requesting access to auth module...');

  const authLock = await api('POST', '/locks/file:src-auth', {
    owner: 'agent-a',
    ttl: 300000,
    metadata: {
      files: ['src/auth/index.ts', 'src/auth/middleware.ts'],
      reason: 'Implementing OAuth2 flow'
    }
  });

  if (authLock.success) {
    console.log('[Agent A] ✓ Acquired auth module lock');
    await api('POST', `/msg/${FILE_CHANNEL}`, {
      payload: {
        type: 'files_locked',
        agent: 'agent-a',
        files: ['src/auth/index.ts', 'src/auth/middleware.ts'],
        reason: 'Implementing OAuth2 flow',
        expiresIn: '5 minutes'
      },
      sender: 'agent-a'
    });
  }

  // Agent B tries to edit the same files
  await new Promise(r => setTimeout(r, 100));
  console.log('[Agent B] Trying to access auth module...');

  const agentBLock = await api('POST', '/locks/file:src-auth', {
    owner: 'agent-b',
    ttl: 300000
  });

  if (!agentBLock.success) {
    console.log('[Agent B] ✗ Lock held by', agentBLock.holder);
    console.log('[Agent B] Will work on different files instead...');

    // Agent B gets a different file
    const apiLock = await api('POST', '/locks/file:src-api', {
      owner: 'agent-b',
      ttl: 300000
    });

    if (apiLock.success) {
      console.log('[Agent B] ✓ Acquired api module lock instead');
    }
  }

  // Agent A finishes and releases
  await new Promise(r => setTimeout(r, 300));
  console.log('[Agent A] Done with auth module, releasing lock...');
  await api('DELETE', '/locks/file:src-auth', { owner: 'agent-a' });
  await api('POST', `/msg/${FILE_CHANNEL}`, {
    payload: {
      type: 'files_released',
      agent: 'agent-a',
      files: ['src/auth/index.ts', 'src/auth/middleware.ts'],
      changes: 'Added OAuth2 provider integration'
    },
    sender: 'agent-a'
  });

  // Agent B releases
  await api('DELETE', '/locks/file:src-api', { owner: 'agent-b' });

  // Cleanup
  await api('DELETE', `/msg/${FILE_CHANNEL}`);
}

// =============================================================================
// Run all scenarios
// =============================================================================

async function main() {
  console.log('╔═════════════════════════════════════════════════════════════════╗');
  console.log('║         Port Daddy Agent Coordination Examples                  ║');
  console.log('║                                                                  ║');
  console.log('║  These patterns show how Claude agents coordinate using         ║');
  console.log('║  pub/sub messaging and distributed locks.                       ║');
  console.log('╚═════════════════════════════════════════════════════════════════╝');

  try {
    // Check if Port Daddy is running
    const health = await api('GET', '/health');
    if (!health.status) {
      console.error('Port Daddy is not running. Start it with: port-daddy start');
      process.exit(1);
    }
    console.log('\n✓ Port Daddy is running (PID:', health.pid + ')');

    // Run scenarios
    await simulateMultiAgentBuild();
    await simulateBugFixHandoff();
    await simulateTestDistribution();
    await simulateFileCoordination();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  All scenarios completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nKey patterns demonstrated:');
    console.log('  1. Build coordination - agents signal completion via pub/sub');
    console.log('  2. Bug fix handoff - locks prevent duplicate work');
    console.log('  3. Test distribution - agents claim work via locks');
    console.log('  4. File coordination - prevent edit conflicts');
    console.log('\nView activity log: port-daddy log');
    console.log('');

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
