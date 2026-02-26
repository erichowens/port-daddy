/**
 * CLI Resurrection Commands
 *
 * Self-healing agent system commands for discovering and
 * reclaiming work from stale or dead agents.
 */

import { status as maritimeStatus } from '../../lib/maritime.js';
import { pdFetch, PORT_DADDY_URL } from '../utils/fetch.js';
import { CLIOptions, isQuiet, isJson } from '../types.js';
import type { PdFetchResponse } from '../utils/fetch.js';

interface StaleAgent {
  id: string;
  name: string;
  purpose: string | null;
  sessionId: string | null;
  lastHeartbeat: number;
  staleSince: number;
  status: 'stale' | 'dead' | 'resurrecting';
  notes?: string[];
}

/**
 * Handle `pd salvage` command
 * Lists agents pending resurrection with their context
 */
export async function handleSalvage(subcommand: string | undefined, args: string[], options: CLIOptions): Promise<void> {
  if (subcommand === 'help') {
    console.error('Usage: port-daddy salvage [subcommand] [options]');
    console.error('');
    console.error('Salvage work from dead/stale agents');
    console.error('');
    console.error('Subcommands:');
    console.error('  (none)                          Show all pending resurrections');
    console.error('  claim <agent-id>                Claim an agent\'s work');
    console.error('  complete <old-id> <new-id>      Mark resurrection complete');
    console.error('  abandon <agent-id>              Return agent to queue');
    console.error('  dismiss <agent-id>              Remove from queue (reviewed)');
    console.error('');
    console.error('Options:');
    console.error('  --all                           Show all queue entries (not just pending)');
    console.error('  --limit <n>                     Limit number of results');
    process.exit(0);
  }

  switch (subcommand) {
    case 'claim': {
      const agentId = args[0];
      if (!agentId) {
        console.error('Usage: pd salvage claim <agent-id>');
        process.exit(1);
      }

      const res: PdFetchResponse = await pdFetch(`${PORT_DADDY_URL}/resurrection/claim/${encodeURIComponent(agentId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAgentId: options.agent || `cli-${process.pid}` })
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(maritimeStatus('error', (data.error as string) || 'Failed to claim agent'));
        process.exit(1);
      }

      if (isJson(options)) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log(maritimeStatus('success', `Claimed ${agentId} for resurrection`));
      const context = data.context as { sessionId?: string; purpose?: string; notes?: string[] } | undefined;
      if (context) {
        console.log('');
        console.log('Context:');
        if (context.sessionId) console.log(`  Session: ${context.sessionId}`);
        if (context.purpose) console.log(`  Purpose: ${context.purpose}`);
        if (context.notes?.length) {
          console.log('  Notes:');
          for (const note of context.notes) {
            console.log(`    - ${note.slice(0, 80)}${note.length > 80 ? '...' : ''}`);
          }
        }
      }
      break;
    }

    case 'complete': {
      const oldAgentId = args[0];
      const newAgentId = args[1];

      if (!oldAgentId || !newAgentId) {
        console.error('Usage: pd salvage complete <old-agent-id> <new-agent-id>');
        process.exit(1);
      }

      const res: PdFetchResponse = await pdFetch(`${PORT_DADDY_URL}/resurrection/complete/${encodeURIComponent(oldAgentId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAgentId })
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(maritimeStatus('error', (data.error as string) || 'Failed to complete resurrection'));
        process.exit(1);
      }

      if (isJson(options)) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(maritimeStatus('success', `Resurrection complete: ${oldAgentId} -> ${newAgentId}`));
      }
      break;
    }

    case 'abandon': {
      const agentId = args[0];
      if (!agentId) {
        console.error('Usage: pd salvage abandon <agent-id>');
        process.exit(1);
      }

      const res: PdFetchResponse = await pdFetch(`${PORT_DADDY_URL}/resurrection/abandon/${encodeURIComponent(agentId)}`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(maritimeStatus('error', (data.error as string) || 'Failed to abandon resurrection'));
        process.exit(1);
      }

      if (isJson(options)) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`Returned ${agentId} to resurrection queue`);
      }
      break;
    }

    case 'dismiss': {
      const agentId = args[0];
      if (!agentId) {
        console.error('Usage: pd salvage dismiss <agent-id>');
        process.exit(1);
      }

      const res: PdFetchResponse = await pdFetch(`${PORT_DADDY_URL}/resurrection/${encodeURIComponent(agentId)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        console.error(maritimeStatus('error', (data.error as string) || 'Failed to dismiss'));
        process.exit(1);
      }

      if (isJson(options)) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`Dismissed ${agentId} from resurrection queue`);
      }
      break;
    }

    default: {
      // List pending resurrections
      const endpoint = options.all ? '/resurrection' : '/resurrection/pending';
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', String(options.limit));

      const res: PdFetchResponse = await pdFetch(`${PORT_DADDY_URL}${endpoint}${params.toString() ? '?' + params : ''}`);
      const data = await res.json();

      if (!res.ok) {
        console.error(maritimeStatus('error', (data.error as string) || 'Failed to list resurrections'));
        process.exit(1);
      }

      if (isJson(options)) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      const agents = data.agents as StaleAgent[];

      if (agents.length === 0) {
        if (!isQuiet(options)) {
          console.log(maritimeStatus('ready', 'No agents awaiting resurrection'));
        }
        return;
      }

      console.log('');
      console.log('\u2693 Salvage Report');
      console.log('\u2500'.repeat(60));
      console.log('');

      for (const agent of agents) {
        const statusIcon = agent.status === 'dead' ? '\u2620' : agent.status === 'resurrecting' ? '\u21bb' : '\u26a0';
        const ago = formatAge(Date.now() - agent.staleSince);

        console.log(`${statusIcon} ${agent.name || agent.id} (${agent.status}, ${ago})`);
        if (agent.purpose) console.log(`  Purpose: ${agent.purpose}`);
        if (agent.sessionId) console.log(`  Session: ${agent.sessionId}`);
        if (agent.notes?.length) {
          console.log('  Notes:');
          for (const note of agent.notes.slice(0, 3)) {
            console.log(`    - ${note.slice(0, 60)}${note.length > 60 ? '...' : ''}`);
          }
          if (agent.notes.length > 3) {
            console.log(`    ... and ${agent.notes.length - 3} more`);
          }
        }
        console.log(`  Salvage: pd salvage claim ${agent.id}`);
        console.log('');
      }

      console.log(`${data.count} agent(s) in resurrection queue`);
    }
  }
}

/**
 * Format age in human-readable form
 */
function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
