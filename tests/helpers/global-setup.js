/**
 * Jest Global Setup — Ephemeral Daemon
 *
 * Starts a fresh daemon before all integration tests.
 * Writes connection info to a temp file that tests read.
 */

import { startEphemeralDaemon } from './ephemeral-daemon.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const STATE_FILE = join(tmpdir(), 'port-daddy-test-state.json');

export default async function globalSetup() {
  const daemon = await startEphemeralDaemon();

  // Write connection info for test files and teardown to read
  writeFileSync(STATE_FILE, JSON.stringify({
    sockPath: daemon.sockPath,
    dbPath: daemon.dbPath,
    tmpDir: daemon.tmpDir,
    pid: daemon.pid
  }));
}
