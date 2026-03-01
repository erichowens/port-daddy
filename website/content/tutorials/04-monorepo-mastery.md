# Port Daddy in a 50-Service Monorepo

It's Monday morning. You're on the payments team for a company with a massive monorepo: Next.js frontend, FastAPI backend, Python workers, Redis cache, Postgres database, Elasticsearch indexing, Grafana monitoring, and a dozen microservices you can't even name.

Your task: start the entire stack with one command and not lose your mind.

Before Port Daddy: 15 terminal windows, six hours of manual setup, at least three services broken because they're on the wrong port.

With Port Daddy: `pd up`

One command. Entire stack. Dependency order. Health checks. Color-coded logs.

## The Monorepo Port Nightmare

In a large monorepo, port conflicts are inevitable. Each team picks their own ports:

- Frontend team uses 3000
- Backend API uses 3001
- Admin panel uses 3002
- Payment service uses 3003
- Webhook handler uses 3004
- ...
- Someone's on 3020 and you forgot who

Then:
- You merge branches and suddenly port 3000 is claimed twice
- A Docker container from yesterday is still consuming a port
- You restart your machine and all the port assignments change
- New team member gets completely different ports and their config doesn't work

Port Daddy makes this deterministic and automatic.

## Scanning Your Monorepo

Port Daddy detects all your frameworks automatically. Run this in your monorepo root:

```bash
cd your-huge-monorepo/
pd scan
```

Port Daddy walks the entire directory tree, finds every `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, etc., and generates a `.portdaddyrc` configuration:

```json
{
  "project": "mycompany",
  "services": {
    "frontend": {
      "cmd": "cd apps/frontend && npm run dev -- --port ${PORT}",
      "healthPath": "/"
    },
    "admin": {
      "cmd": "cd apps/admin && npm run dev -- --port ${PORT}",
      "healthPath": "/health",
      "needs": ["api"]
    },
    "api": {
      "cmd": "cd services/backend && fastapi run app.py --port ${PORT}",
      "healthPath": "/health",
      "needs": ["postgres", "redis"]
    },
    "postgres": {
      "cmd": "docker run --rm -p ${PORT}:5432 postgres:15",
      "healthPath": "N/A",
      "noPort": false,
      "healthCheck": "pg_isready"
    },
    "redis": {
      "cmd": "docker run --rm -p ${PORT}:6379 redis:latest",
      "noPort": false,
      "healthCheck": "redis-cli ping"
    },
    "payments-worker": {
      "cmd": "cd workers/payments && npm run dev",
      "noPort": true,
      "needs": ["api"]
    },
    "elasticsearch": {
      "cmd": "docker run --rm -p ${PORT}:9200 elasticsearch:8.0",
      "noPort": false,
      "healthCheck": "curl -s http://localhost:${PORT}"
    },
    "grafana": {
      "cmd": "docker run --rm -p ${PORT}:3000 grafana/grafana",
      "noPort": false,
      "healthCheck": "curl -s http://localhost:${PORT}/health"
    }
  }
}
```

The `needs` field describes dependency order. Port Daddy starts:
1. postgres, redis, elasticsearch (no dependencies)
2. api (depends on postgres, redis)
3. frontend, admin (depend on api)
4. payments-worker (depends on api)
5. grafana (monitoring, no dependencies)

If a service fails health checks, dependent services don't start.

## Starting the Whole Stack

```bash
pd up
```

You see (with color-coded output):

```
Starting 8 services in dependency order...

[14:23:01] postgres        Starting...
[14:23:05] postgres        ✅ Healthy (pg_isready)
[14:23:06] redis           Starting...
[14:23:08] redis           ✅ Healthy (redis-cli ping)
[14:23:09] elasticsearch   Starting...
[14:23:15] elasticsearch   ✅ Healthy
[14:23:16] api             Starting...
[14:23:22] api             ✅ Healthy (GET /health -> 200)
[14:23:23] frontend        Starting...
[14:23:28] frontend        ✅ Healthy (GET / -> 200)
[14:23:28] admin           Starting...
[14:23:32] admin           ✅ Healthy (GET /health -> 200)
[14:23:33] payments-worker Starting...
[14:23:36] payments-worker ✅ Running (no health check)
[14:23:37] grafana         Starting...
[14:23:42] grafana         ✅ Healthy

All services ready!

Service URLs:
  Frontend:    http://localhost:3100
  Admin:       http://localhost:3101
  API:         http://localhost:3102
  Postgres:    localhost:3103
  Redis:       localhost:3104
  Elasticsearch: http://localhost:3105
  Grafana:     http://localhost:3106
```

Every service is on a stable, deterministic port. Open http://localhost:3100 and you're in the frontend.

## Intelligent Dependency Management

The `needs` field prevents the classic "API won't start because database isn't ready" problem:

```json
{
  "services": {
    "postgres": {
      "cmd": "docker run -p ${PORT}:5432 postgres:15",
      "healthPath": "N/A"
    },
    "api": {
      "cmd": "npm run dev",
      "needs": ["postgres"],
      "healthPath": "/health"
    },
    "frontend": {
      "cmd": "npm run dev",
      "needs": ["api"]
    }
  }
}
```

When you run `pd up`:
1. postgres starts first
2. Port Daddy waits for postgres to be healthy (pg_isready returns success)
3. api starts
4. Port Daddy waits for api to be healthy (/health returns 200)
5. frontend starts
6. Done

No race conditions. No "wait, is the API ready yet?" polling.

## Starting Individual Services

You don't always want the whole stack. Start just what you need:

```bash
# Start frontend + its dependencies (api, postgres, redis)
pd up --service frontend

# Just the API
pd up --service api
# (Automatically starts postgres and redis too)

# Multiple services at once
pd up --service api --service payments-worker
```

This is massive in a big monorepo. Instead of starting all 50 services, start only what you're working on.

## Custom Health Checks

Not all services have HTTP health endpoints. Configure custom checks:

```json
{
  "services": {
    "postgres": {
      "cmd": "docker run -p ${PORT}:5432 postgres:15",
      "healthCheck": "pg_isready -h localhost -p ${PORT}"
    },
    "redis": {
      "cmd": "docker run -p ${PORT}:6379 redis:latest",
      "healthCheck": "redis-cli -p ${PORT} ping"
    },
    "custom-worker": {
      "cmd": "npm run worker",
      "healthCheck": "curl -s http://localhost:${PORT}/alive | jq .ok"
    }
  }
}
```

Custom checks run every 2 seconds until they return success (exit code 0).

## Environment Variables and Service Discovery

Port Daddy injects environment variables into each service:

```json
{
  "services": {
    "api": {
      "cmd": "npm run dev",
      "env": {
        "DATABASE_URL": "postgresql://localhost:${PORT_postgres}/mydb",
        "REDIS_URL": "redis://localhost:${PORT_redis}",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

Your API can now do:

```javascript
const dbUrl = process.env.DATABASE_URL;
// → postgresql://localhost:3103/mydb

const redisUrl = process.env.REDIS_URL;
// → redis://localhost:3104
```

No hardcoding ports. Everything is discoverable.

## Logs with Color and Prefixes

All services log to your terminal with color-coded prefixes:

```
[14:23:22] api             GET /api/users -> 200 (45ms)
[14:23:23] api             POST /api/users -> 201 (120ms)
[14:23:24] frontend        Compiled successfully
[14:23:25] payments-worker Processing batch 42 (1200 items)
[14:23:26] api             ERROR: DatabaseError
[14:23:27] frontend        Updated component Checkout
```

Logs are separated by service, colored by status (green for success, red for errors), and prefixed with timestamps.

You can grep by service:

```bash
# Just API logs
pd up | grep "api"

# Just errors
pd up | grep "ERROR"
```

## Stopping the Stack

```bash
pd down
```

This sends SIGTERM to each service in reverse dependency order:

1. frontend (no dependents, stops first)
2. admin (no dependents)
3. payments-worker (depends on api, but safe to stop)
4. api (no services depend on it now)
5. elasticsearch, postgres, redis (no dependents)
6. grafana

Services have 10 seconds to shut down gracefully. If they don't, SIGKILL is sent.

```bash
[14:35:01] Stopping 8 services in reverse dependency order...
[14:35:01] frontend        SIGTERM
[14:35:01] admin           SIGTERM
[14:35:01] api             SIGTERM
[14:35:01] payments-worker SIGTERM
[14:35:02] frontend        ✅ Stopped
[14:35:02] admin           ✅ Stopped
[14:35:03] api             ✅ Stopped
[14:35:03] payments-worker ✅ Stopped
[14:35:05] postgres        SIGTERM
[14:35:05] redis           SIGTERM
[14:35:06] postgres        ✅ Stopped
[14:35:06] redis           ✅ Stopped
All services stopped.
```

## Real Monorepo Example

Here's a real `.portdaddyrc` for a 15-service system:

```json
{
  "project": "paymentco",
  "services": {
    "postgres": {
      "cmd": "docker run --rm -e POSTGRES_DB=paymentco -e POSTGRES_PASSWORD=dev -p ${PORT}:5432 postgres:15",
      "healthCheck": "pg_isready -h localhost -p ${PORT}"
    },
    "redis": {
      "cmd": "docker run --rm -p ${PORT}:6379 redis:latest",
      "healthCheck": "redis-cli -p ${PORT} ping"
    },
    "nats": {
      "cmd": "docker run --rm -p ${PORT}:4222 nats:latest",
      "healthCheck": "nc -zv localhost ${PORT}"
    },
    "api": {
      "cmd": "cd services/api && fastapi run app.py --port ${PORT}",
      "healthPath": "/health",
      "needs": ["postgres", "redis", "nats"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:dev@localhost:${PORT_postgres}/paymentco",
        "REDIS_URL": "redis://localhost:${PORT_redis}",
        "NATS_URL": "nats://localhost:${PORT_nats}"
      }
    },
    "frontend": {
      "cmd": "cd apps/web && npm run dev -- --port ${PORT}",
      "healthPath": "/",
      "needs": ["api"],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:${PORT_api}"
      }
    },
    "admin": {
      "cmd": "cd apps/admin && npm run dev -- --port ${PORT}",
      "healthPath": "/health",
      "needs": ["api"]
    },
    "stripe-webhook": {
      "cmd": "cd services/webhooks && npm run dev -- --port ${PORT}",
      "healthPath": "/health",
      "needs": ["api"],
      "noPort": false
    },
    "payment-worker": {
      "cmd": "cd workers/payment && npm run dev",
      "noPort": true,
      "needs": ["api"]
    },
    "batch-processor": {
      "cmd": "cd workers/batch && npm run dev",
      "noPort": true,
      "needs": ["api"]
    },
    "report-generator": {
      "cmd": "cd services/reporting && python main.py",
      "noPort": true,
      "needs": ["postgres"]
    },
    "elasticsearch": {
      "cmd": "docker run --rm -e discovery.type=single-node -p ${PORT}:9200 docker.elastic.co/elasticsearch/elasticsearch:8.5.0",
      "healthCheck": "curl -s http://localhost:${PORT}/_cluster/health | jq .status | grep -q green"
    },
    "kibana": {
      "cmd": "docker run --rm -e ELASTICSEARCH_HOSTS=http://localhost:${PORT_elasticsearch} -p ${PORT}:5601 docker.elastic.co/kibana/kibana:8.5.0",
      "healthPath": "/api/status",
      "needs": ["elasticsearch"]
    },
    "grafana": {
      "cmd": "docker run --rm -e GF_SECURITY_ADMIN_PASSWORD=admin -p ${PORT}:3000 grafana/grafana:latest",
      "healthPath": "/health",
      "env": {
        "PROMETHEUS_URL": "http://localhost:${PORT_prometheus}"
      }
    },
    "prometheus": {
      "cmd": "docker run --rm -p ${PORT}:9090 prom/prometheus:latest",
      "healthPath": "/-/healthy",
      "needs": ["api"]
    }
  }
}
```

Run it:

```bash
pd up
# Entire ecosystem ready in ~45 seconds
```

Start just the critical path for frontend work:

```bash
pd up --service frontend
# Only starts: postgres, redis, nats, api, frontend
# Skip: workers, webhooks, monitoring
# Total startup: ~20 seconds
```

## Branch-Specific Configs

Different team members working on different features? Port Daddy can include git branch in the identity:

```bash
pd up --branch
# Services become: myapp:api:main, myapp:web:feature-auth, etc.
# Each branch gets its own port space
```

This way, if teammate A is on `feature-auth` and teammate B is on `main`, they don't compete for ports.

## Health Monitoring

Check health of all services:

```bash
pd health
# api       ✅ 200 OK (45ms)
# frontend  ✅ 200 OK (12ms)
# postgres  ✅ Ready
# redis     ✅ Ready
```

## Sharing Your Config

Commit `.portdaddyrc` to version control without port fields:

```json
{
  "project": "mycompany",
  "services": {
    "api": {
      "cmd": "npm run dev",
      "healthPath": "/health"
    }
  }
}
```

Every developer gets the same service definitions. Port Daddy assigns deterministic ports based on the identity hash. Your teammate's `api` service runs on port 3100 (same as yours, because the identity is the same).

## What's Next

You've mastered monorepo orchestration. Explore:

1. **[Multi-Agent Orchestration](02-multi-agent-orchestration.md)** — Run agents in this monorepo
2. **[Debugging](05-debugging-with-port-daddy.md)** — Finding services that won't start
3. **[Tunneling](03-tunnel-magic.md)** — Exposing monorepo services to the internet

The big win: Every developer runs the same stack, every service on the same port, every time. No "it works on my machine" nonsense.

One command. Entire ecosystem. Zero ambiguity.
