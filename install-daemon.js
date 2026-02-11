#!/usr/bin/env node

/**
 * Port Daddy Daemon Installer
 *
 * Usage:
 *   node install-daemon.js install   - Install and start Port Daddy daemon
 *   node install-daemon.js uninstall - Stop and uninstall Port Daddy daemon
 *   node install-daemon.js status    - Check daemon status
 */

import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLIST_FILE = join(__dirname, 'com.erichowens.port-daddy.plist');
const LAUNCH_AGENTS = join(homedir(), 'Library', 'LaunchAgents');
const INSTALLED_PLIST = join(LAUNCH_AGENTS, 'com.erichowens.port-daddy.plist');

function runCommand(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status
  };
}

function install() {
  console.log('📦 Installing Port Daddy daemon...');

  // Copy plist to LaunchAgents
  try {
    copyFileSync(PLIST_FILE, INSTALLED_PLIST);
    console.log('✅ Copied plist to LaunchAgents');
  } catch (err) {
    console.error('❌ Failed to copy plist:', err.message);
    return;
  }

  // Load the daemon
  const load = runCommand('launchctl', ['load', INSTALLED_PLIST]);
  if (load.status === 0) {
    console.log('✅ Port Daddy daemon loaded successfully');
    console.log('🚀 Service will auto-start on login');
    console.log('\nTest with: curl http://localhost:9876/health');
  } else {
    console.error('❌ Failed to load daemon:', load.stderr);
  }
}

function uninstall() {
  console.log('🗑️  Uninstalling Port Daddy daemon...');

  if (!existsSync(INSTALLED_PLIST)) {
    console.log('ℹ️  Port Daddy daemon is not installed');
    return;
  }

  // Unload the daemon
  const unload = runCommand('launchctl', ['unload', INSTALLED_PLIST]);
  if (unload.status === 0) {
    console.log('✅ Port Daddy daemon unloaded');
  } else {
    console.warn('⚠️  Failed to unload daemon:', unload.stderr);
  }

  // Remove plist
  try {
    unlinkSync(INSTALLED_PLIST);
    console.log('✅ Removed plist from LaunchAgents');
  } catch (err) {
    console.error('❌ Failed to remove plist:', err.message);
  }
}

function status() {
  console.log('🔍 Checking Port Daddy status...\n');

  // Check if installed
  if (existsSync(INSTALLED_PLIST)) {
    console.log('✅ Daemon installed at:', INSTALLED_PLIST);
  } else {
    console.log('❌ Daemon not installed');
    return;
  }

  // Check if loaded
  const list = runCommand('launchctl', ['list']);
  const isLoaded = list.stdout.includes('com.erichowens.port-daddy');

  if (isLoaded) {
    console.log('✅ Daemon is loaded (should be running)');
  } else {
    console.log('❌ Daemon is not loaded');
  }

  // Check if responding
  const health = runCommand('curl', ['-s', 'http://localhost:9876/health']);
  if (health.status === 0 && health.stdout.includes('"status":"ok"')) {
    console.log('✅ Service is responding on port 9876');
    console.log('\nHealth:', health.stdout);
  } else {
    console.log('❌ Service is not responding');
  }
}

// Parse command
const command = process.argv[2];

switch (command) {
  case 'install':
    install();
    break;
  case 'uninstall':
    uninstall();
    break;
  case 'status':
    status();
    break;
  default:
    console.log(`
Port Daddy Daemon Installer

Usage:
  node install-daemon.js install   - Install and start daemon
  node install-daemon.js uninstall - Stop and uninstall daemon
  node install-daemon.js status    - Check daemon status
    `);
}
