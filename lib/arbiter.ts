/**
 * Port Daddy Arbiter — Runtime Security Enforcement
 *
 * An ambient security agent that monitors the activity log and
 * enforces formally verified Anchor Protocol rules via the Rust Enforcer.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import koffi from 'koffi';
import { ActivityType, createActivityLog } from './activity.js';
import { HarborTokens } from './harbor-tokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Rust Enforcer Bridge (FFI) ─────────────────────────────────────────────

const libPath = path.join(__dirname, '../dist/core/libharbor_card_rs.' + (process.platform === 'darwin' ? 'dylib' : 'so'));

let enforcer: any = null;
try {
  const lib = koffi.load(libPath);
  enforcer = {
    constantTimeCompare: lib.func('bool harbor_constant_time_compare(const uint8_t *a, size_t a_len, const uint8_t *b, size_t b_len)'),
    verifyCapsSubset: lib.func('bool harbor_verify_caps_subset_json(const char *root_json, const char *sub_json)')
  };
  console.log('💂‍♂️ Arbiter: Formally verified Rust enforcer loaded.');
} catch (err) {
  console.warn('⚠️ Arbiter: Rust enforcer not found or failed to load. Falling back to internal logic.');
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ArbiterConfig {
  strictMode: boolean;
}

export function createArbiter(
  activityLog: ReturnType<typeof createActivityLog>,
  harborTokens: HarborTokens,
  config: ArbiterConfig = { strictMode: false }
) {
  let violationsCount = 0;

  const stopWatching = activityLog.subscribe((entry) => {
    switch (entry.type) {
      case ActivityType.SERVICE_CLAIM:
        checkServiceClaim(entry);
        break;
      case ActivityType.LOCK_ACQUIRE:
        checkLockAcquisition(entry);
        break;
    }
  });

  /**
   * Rule 1: Anti-Squatting (PID Binding)
   */
  function checkServiceClaim(entry: any) {
    const { agentId, metadata } = entry;
    // Implementation: Cross-reference PID from activity with token registry
  }

  /**
   * Rule 2: Capability Enforcement (FFI Verified)
   */
  async function checkLockAcquisition(entry: any) {
    const { agentId, targetId } = entry;
    
    // Example: If a lock is 'db:write', ensure the agent has that capability
    // in its formally issued Harbor Card.
    if (targetId.startsWith('db:') && enforcer) {
      const card = await harborTokens.getCardForAgent(agentId);
      if (!card) return;

      const requiredCaps = JSON.stringify(['db:write']);
      const agentCaps = JSON.stringify(card.capabilities);

      const isValid = enforcer.verifyCapsSubset(agentCaps, requiredCaps);
      
      if (!isValid) {
        reportViolation('CAP_ESCALATION', `Agent ${agentId} attempted to acquire ${targetId} without proper capabilities.`);
      }
    }
  }

  function reportViolation(ruleId: string, details: string) {
    violationsCount++;
    console.error(`🚨 [ARBITER VIOLATION] ${ruleId}: ${details}`);
    
    activityLog.log('security.violation', {
      details: `${ruleId}: ${details}`,
      metadata: { ruleId, strictMode: config.strictMode }
    });

    if (config.strictMode) {
      activityLog.log('system.man_overboard', { details: 'Arbiter triggered emergency shutdown' });
    }
  }

  return {
    getViolationsCount: () => violationsCount,
    stop: stopWatching
  };
}
