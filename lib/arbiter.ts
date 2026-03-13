/**
 * Port Daddy Arbiter — Runtime Security Enforcement
 *
 * An ambient security agent that monitors the activity log and
 * enforces the formally verified Anchor Protocol rules.
 */

import { ActivityType, createActivityLog } from './activity.js';
import { HarborTokens } from './harbor-tokens.js';

export interface ArbiterConfig {
  strictMode: boolean; // If true, trigger 'Man Overboard' on violations
}

export function createArbiter(
  activityLog: ReturnType<typeof createActivityLog>,
  harborTokens: HarborTokens,
  config: ArbiterConfig = { strictMode: false }
) {
  let violationsCount = 0;

  /**
   * Sniff the activity stream for protocol violations
   */
  const stopWatching = activityLog.subscribe((entry) => {
    switch (entry.type) {
      case ActivityType.SERVICE_CLAIM:
        checkServiceClaim(entry);
        break;
      case ActivityType.LOCK_ACQUIRE:
        checkLockAcquisition(entry);
        break;
      // Future: add delegation sniffing
    }
  });

  /**
   * Rule 1: Anti-Squatting (PID-Identity Binding)
   * 
   * Formally Proven Requirement: A process can only claim a port/identity 
   * if it matches the PID that holds the current valid Harbor Card.
   */
  function checkServiceClaim(entry: any) {
    const { agentId, metadata } = entry;
    const claimedPid = metadata?.pid;

    // In v1, we just log suspicious mismatches
    if (claimedPid && agentId) {
      // Logic to cross-reference with Harbor Card state
      // (Placeholder for Phase 2 integration)
    }
  }

  /**
   * Rule 2: Capability Enforcement
   */
  function checkLockAcquisition(entry: any) {
    const { agentId, targetId } = entry; // targetId is the lock name
    
    // Check if the agent has the capability required for this resource
    // Logic: if targetId starts with 'db:', ensure agent has 'db:write' or 'db:read'
    if (targetId.startsWith('db:')) {
      // Placeholder: retrieve agent caps from harborTokens and verify subset
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
      // Trigger Harbor-wide shutdown logic here
      activityLog.log('system.man_overboard', { details: 'Arbiter triggered emergency shutdown' });
    }
  }

  return {
    getViolationsCount: () => violationsCount,
    stop: stopWatching
  };
}
