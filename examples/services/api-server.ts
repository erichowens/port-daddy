#!/usr/bin/env npx tsx
/**
 * Example API Server
 *
 * A minimal Express API for demonstrating Port Daddy orchestration.
 *
 * Usage:
 *   PORT=3001 npx tsx api-server.ts
 *   # Or let Port Daddy assign the port:
 *   pd up demo-api
 */

import express from 'express';

const PORT = process.env.PORT || 3001;
const app = express();

app.use(express.json());

// Simple in-memory data store
const items: Array<{ id: number; name: string; createdAt: Date }> = [];
let nextId = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// CRUD endpoints
app.get('/items', (req, res) => {
  res.json({ items, count: items.length });
});

app.post('/items', (req, res) => {
  const item = {
    id: nextId++,
    name: req.body.name || `Item ${nextId}`,
    createdAt: new Date(),
  };
  items.push(item);
  res.status(201).json(item);
});

app.get('/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(item);
});

app.delete('/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  items.splice(index, 1);
  res.status(204).send();
});

const server = app.listen(PORT, () => {
  console.log(`[api-server] Listening on port ${PORT}`);
  console.log(`[api-server] Health: http://localhost:${PORT}/health`);
  console.log(`[api-server] Items:  http://localhost:${PORT}/items`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[api-server] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[api-server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[api-server] SIGINT received, shutting down...');
  server.close(() => {
    console.log('[api-server] Closed');
    process.exit(0);
  });
});
