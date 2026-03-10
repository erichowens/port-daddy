/**
 * Watch Module — Ambient Agent Kernel
 *
 * Subscribe to a Port Daddy pub/sub channel and run a shell command
 * on each message. Supports SSE reconnect loop.
 *
 * Usage:
 *   const { watch } = createWatch();
 *   const handle = watch('my-channel', { exec: './handle-message.sh' });
 *   // Later:
 *   handle.stop();
 */

import http from 'node:http';
import { spawn } from 'node:child_process';

// =============================================================================
// Types
// =============================================================================

export interface WatchOptions {
  exec: string;        // shell command to run when message arrives
  once?: boolean;      // exit after first message
  daemonize?: boolean; // run in background (future — not yet implemented)
}

export interface WatchHandle {
  stop(): void;
}

// =============================================================================
// Module factory
// =============================================================================

export function createWatch() {
  /**
   * Subscribe to a channel and run `exec` on each message.
   *
   * Uses Node.js `http` module for streaming SSE (not fetch).
   * Reconnects automatically after disconnect unless `once` and already fired.
   */
  function watch(channel: string, opts: WatchOptions): WatchHandle {
    const { exec, once = false } = opts;

    let stopped = false;
    let fired = false;
    let currentReq: http.ClientRequest | null = null;

    const pdUrl = process.env.PORT_DADDY_URL || 'http://localhost:9876';
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(pdUrl);
    } catch {
      parsedUrl = new URL('http://localhost:9876');
    }

    function connect(): void {
      if (stopped) return;
      if (once && fired) return;

      const path = `/msg/${encodeURIComponent(channel)}/subscribe`;

      const reqOpts: http.RequestOptions = {
        method: 'GET',
        path,
        headers: { Accept: 'text/event-stream' },
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port, 10) || 9876,
      };

      const req = http.request(reqOpts, (res) => {
        let buffer = '';

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();

          // Process complete lines
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice('data:'.length).trim();
            if (!dataStr || dataStr === '[HEARTBEAT]') continue;

            // Parse the message
            let messageContent = dataStr;
            let messagePayload: Record<string, unknown> | null = null;
            try {
              messagePayload = JSON.parse(dataStr) as Record<string, unknown>;
              const payload = messagePayload.payload;
              if (typeof payload === 'string') {
                messageContent = payload;
              } else if (payload !== null && payload !== undefined) {
                messageContent = JSON.stringify(payload);
              }
            } catch {
              // Use raw string as content
            }

            // Fire the exec command
            fired = true;

            const env: NodeJS.ProcessEnv = {
              ...process.env,
              PD_MESSAGE: dataStr,
              PD_MESSAGE_CONTENT: messageContent,
              PD_CHANNEL: channel,
              PD_TIMESTAMP: new Date().toISOString(),
            };

            const child = spawn(exec, [], {
              shell: true,
              stdio: 'inherit',
              env,
            });

            child.on('error', (err) => {
              process.stderr.write(`[pd watch] exec error: ${err.message}\n`);
            });

            if (once) {
              stopped = true;
              // Destroy the connection after firing
              req.destroy();
              return;
            }
          }
        });

        res.on('end', () => {
          if (stopped) return;
          if (once && fired) return;
          // Reconnect after 2s
          setTimeout(connect, 2000);
        });

        res.on('error', () => {
          if (stopped) return;
          if (once && fired) return;
          setTimeout(connect, 2000);
        });
      });

      req.on('error', () => {
        if (stopped) return;
        if (once && fired) return;
        // Reconnect after 2s
        setTimeout(connect, 2000);
      });

      req.end();
      currentReq = req;
    }

    // Start connecting
    connect();

    return {
      stop(): void {
        stopped = true;
        if (currentReq) {
          try { currentReq.destroy(); } catch {}
          currentReq = null;
        }
      },
    };
  }

  return { watch };
}
