# Example Services

Toy services for demonstrating Port Daddy orchestration.

## Services

| Service | Port | Description |
|---------|------|-------------|
| `demo-api` | 3001 | Express REST API with in-memory store |
| `demo-worker` | - | Background worker that polls the API |
| `demo-frontend` | 3000 | Static HTML page that talks to the API |

## Manual Start

```bash
# Terminal 1: API server
PORT=3001 npx tsx api-server.ts

# Terminal 2: Worker
API_URL=http://localhost:3001 npx tsx worker.ts

# Terminal 3: Frontend
PORT=3000 API_URL=http://localhost:3001 npx tsx frontend.ts
```

## Port Daddy Orchestration

### Register services once

```bash
# Register the API server
pd scan examples/services --name demo-api

# Or manually (if scan doesn't detect it)
pd claim demo-api --port 3001 --dir examples/services --command "npx tsx api-server.ts"
```

### Start/stop services

```bash
# Start all
pd up demo-api
pd up demo-frontend

# Check status
pd status demo-api
pd services

# Stop all
pd down demo-api
pd down demo-frontend
```

### Service Dependencies

The worker needs the API to be running. Use the SDK to handle dependencies:

```typescript
import { PortDaddy } from 'port-daddy';

const pd = new PortDaddy();

// Wait for API to be healthy before starting dependent services
await pd.waitForService('demo-api', { timeout: 30000 });
console.log('API is ready, starting worker...');
```

## What These Demonstrate

1. **Simple service registration** — `pd scan` detects framework and registers
2. **Port assignment** — Port Daddy assigns stable ports across sessions
3. **Health checks** — All services expose `/health` for monitoring
4. **Graceful shutdown** — Services handle SIGTERM cleanly
5. **Service dependencies** — Worker depends on API
6. **Orchestration** — Start/stop groups of services together
