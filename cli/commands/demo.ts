/**
 * Demo Command — Interactive Storytelling
 * 
 * Simulates multi-agent coordination scenarios to demonstrate 
 * Port Daddy's value. Inspired by the Asciinema strategy.
 */

import { Command } from 'commander';

/**
 * Handle the demo command from the manual CLI dispatcher
 */
export async function handleDemo(subcommand?: string, options: any = {}) {
  switch (subcommand) {
    case 'port-conflict':
      console.log('\n🚀 Scenario: The Port Conflict Hell');
      console.log('------------------------------------');
      console.log('1. Agent A (Claude) starts a dev server on port 3000...');
      await delay(1000);
      console.log('2. Agent B (Cursor) tries to start a worker on port 3000...');
      await delay(1500);
      console.log('❌ Error: EADDRINUSE: address already in use :::3000');
      await delay(1000);
      console.log('\n🛡️  Port Daddy Solution:');
      console.log('Agent A: pd claim myapp:api  -> 3100 (deterministic)');
      console.log('Agent B: pd claim myapp:worker -> 3101 (deterministic)');
      await delay(1000);
      console.log('✅ Both agents run in parallel. Zero conflicts.');
      break;

    case 'coordination':
      console.log('\n🤝 Scenario: Agent Handoff');
      console.log('-------------------------');
      console.log('1. Agent A: "Building auth API..."');
      console.log('   $ pd begin "auth-build"');
      await delay(1000);
      console.log('2. Agent B: "Waiting for auth API to write frontend..."');
      console.log('   $ pd integration needs myapp:api "Waiting for endpoints"');
      await delay(1500);
      console.log('3. Agent A: "Auth ready!"');
      console.log('   $ pd integration ready myapp:api "Endpoints live at /api/v1/*"');
      await delay(1000);
      console.log('✅ Agent B detects the signal and begins implementation.');
      break;

    default:
      console.log('Usage: pd demo <port-conflict | coordination>');
      break;
  }
}

export function registerDemoCommand(program: Command) {
  const demo = program
    .command('demo')
    .description('Run interactive demonstrations of multi-agent coordination');

  demo
    .command('port-conflict')
    .description('Simulate a port conflict and its resolution')
    .action(async () => {
      console.log('\n🚀 Scenario: The Port Conflict Hell');
      console.log('------------------------------------');
      console.log('1. Agent A (Claude) starts a dev server on port 3000...');
      await delay(1000);
      console.log('2. Agent B (Cursor) tries to start a worker on port 3000...');
      await delay(1500);
      console.log('❌ Error: EADDRINUSE: address already in use :::3000');
      await delay(1000);
      console.log('\n🛡️  Port Daddy Solution:');
      console.log('Agent A: pd claim myapp:api  -> 3100 (deterministic)');
      console.log('Agent B: pd claim myapp:worker -> 3101 (deterministic)');
      await delay(1000);
      console.log('✅ Both agents run in parallel. Zero conflicts.');
    });

  demo
    .command('coordination')
    .description('Simulate agent-to-agent signaling')
    .action(async () => {
      console.log('\n🤝 Scenario: Agent Handoff');
      console.log('-------------------------');
      console.log('1. Agent A: "Building auth API..."');
      console.log('   $ pd begin "auth-build"');
      await delay(1000);
      console.log('2. Agent B: "Waiting for auth API to write frontend..."');
      console.log('   $ pd integration needs myapp:api "Waiting for endpoints"');
      await delay(1500);
      console.log('3. Agent A: "Auth ready!"');
      console.log('   $ pd integration ready myapp:api "Endpoints live at /api/v1/*"');
      await delay(1000);
      console.log('✅ Agent B detects the signal and begins implementation.');
    });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
