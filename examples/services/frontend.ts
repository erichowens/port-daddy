#!/usr/bin/env npx tsx
/**
 * Example Frontend Server
 *
 * A minimal static file server with live reload simulation.
 * Demonstrates frontend dev servers in orchestration.
 *
 * Usage:
 *   PORT=3000 npx tsx frontend.ts
 *   # Or with Port Daddy:
 *   pd up demo-frontend
 */

import http from 'http';

const PORT = parseInt(process.env.PORT || '3000', 10);
const API_URL = process.env.API_URL || 'http://localhost:3001';

const html = `<!DOCTYPE html>
<html>
<head>
  <title>Port Daddy Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #1a365d; }
    button { padding: 0.5rem 1rem; margin: 0.25rem; cursor: pointer; }
    #items { margin-top: 1rem; }
    .item { padding: 0.5rem; background: #f0f4f8; margin: 0.25rem 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Port Daddy Demo</h1>
  <p>API: <code id="api-url">${API_URL}</code></p>
  <div>
    <button onclick="addItem()">Add Item</button>
    <button onclick="refresh()">Refresh</button>
  </div>
  <div id="items">Loading...</div>
  <script>
    const API = '${API_URL}';

    async function refresh() {
      const container = document.getElementById('items');
      try {
        const res = await fetch(API + '/items');
        const data = await res.json();
        container.replaceChildren(); // Clear safely
        if (data.items.length === 0) {
          const p = document.createElement('p');
          p.textContent = 'No items yet. Click "Add Item" to create one.';
          container.appendChild(p);
        } else {
          data.items.forEach(function(item) {
            const div = document.createElement('div');
            div.className = 'item';
            div.textContent = item.name + ' (id: ' + item.id + ')';
            container.appendChild(div);
          });
        }
      } catch (e) {
        container.replaceChildren();
        const p = document.createElement('p');
        p.style.color = 'red';
        p.textContent = 'API unreachable';
        container.appendChild(p);
      }
    }

    async function addItem() {
      try {
        await fetch(API + '/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Item ' + Date.now() })
        });
        refresh();
      } catch (e) {
        alert('Failed to add item: ' + e.message);
      }
    }

    refresh();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});

server.listen(PORT, () => {
  console.log(`[frontend] Listening on port ${PORT}`);
  console.log(`[frontend] Open: http://localhost:${PORT}`);
  console.log(`[frontend] Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[frontend] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[frontend] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[frontend] SIGINT received, shutting down...');
  server.close(() => {
    console.log('[frontend] Closed');
    process.exit(0);
  });
});
