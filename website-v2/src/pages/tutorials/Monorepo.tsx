import { motion } from 'framer-motion'
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'

export function Monorepo() {
  return (
    <TutorialLayout
      title="Port Daddy in a 50-Service Monorepo"
      description="Scan your entire monorepo, start the full stack in dependency order, and finally stop juggling 15 terminal tabs."
      number="3"
      total="12"
      level="Advanced"
      readTime="14 min read"
      prev={{ title: 'Multi-Agent Orchestration', href: '/tutorials/multi-agent' }}
      next={{ title: 'Debugging with Port Daddy', href: '/tutorials/debugging' }}
    >
      <motion.p className="text-lg leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
        You work at PaymentCo. Fifteen services. Three databases. Two message queues. A search engine. And every developer on the team has a different way of starting it all -- a shell script here, a Docker Compose there, and the new hire is still waiting for someone to tell them which port the API runs on.
      </motion.p>

      <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>The Monorepo Port Nightmare</motion.h2>
      <motion.p className="mb-6 font-sans">Here is what monorepo development looks like without orchestration:</motion.p>
      
      <CodeBlock
        code={`Monday:
  "API is on 3000, frontend on 3001, worker on 3002"

Tuesday:
  "Wait, Dave changed the API to 4000 in his branch"
  "The worker is failing because it's hardcoded to call localhost:3000"

Wednesday:
  "Docker Compose is fighting with my local postgres"
  "Who left a zombie redis-server on port 6379?"

Thursday:
  "I just need the frontend. Why am I starting all 15 services?"
  "Elasticsearch is eating 4GB of RAM and I'm not even using search"

Friday:
  "I give up. I'm just going to work on the mobile app."`}
      />

      <motion.p className="mt-8 mb-4 font-sans font-bold" style={{ color: 'var(--text-primary)' }}>The core problems are always the same:</motion.p>
      <motion.ul className="space-y-3 list-none p-0 mb-8 font-sans">
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Port collisions</motion.strong> -- Teams pick random ports, commit them to config, and break each other</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Merge conflicts</motion.strong> -- Two PRs change the same <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">.env</motion.code> file with different port numbers</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Docker zombies</motion.strong> -- Containers from last week still holding ports hostage</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Startup ordering</motion.strong> -- The API crashes because postgres isn't ready yet</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>All-or-nothing</motion.strong> -- No way to start just the services you need</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">✓</motion.span> 
          <motion.span className="font-sans"><motion.strong className="font-sans" style={{ color: 'var(--text-primary)' }}>Log chaos</motion.strong> -- 15 services dumping to the same terminal with no way to tell them apart</motion.span>
        </motion.li>
      </motion.ul>
      <motion.p className="font-sans">Port Daddy solves every single one of these. Let's walk through it.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-12 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Scanning Your Monorepo</motion.h2>
      <motion.p className="mb-6 font-sans">First, let Port Daddy understand what you're working with. The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">pd scan</motion.code> command recursively walks your directory tree and detects every service it finds:</motion.p>
      
      <CodeBlock
        code={`$ cd ~/code/paymentco
$ pd scan

Scanning /Users/you/code/paymentco...
Found 15 services in 3.2s

  services/api           Next.js (App Router)     needs: [postgres, redis]
  services/admin         Next.js                  needs: [api]
  services/dashboard     Vite + React             needs: [api]
  services/worker        Node.js (custom)         needs: [postgres, redis, nats]
  services/scheduler     Node.js (custom)         needs: [postgres, redis]
  services/webhooks      Express                  needs: [postgres, nats]
  services/search-sync   Node.js (custom)         needs: [postgres, elasticsearch]
  services/email         Fastify                  needs: [redis, nats]
  services/auth          Express                  needs: [postgres, redis]
  services/billing       NestJS                   needs: [postgres, redis, nats]
  services/notifications Hono                     needs: [redis, nats]
  infra/postgres         PostgreSQL 16            standalone
  infra/redis            Redis 7                  standalone
  infra/nats             NATS                     standalone
  infra/elasticsearch    Elasticsearch 8          standalone

Wrote .portdaddyrc (15 services, 23 dependencies)`}
      />

      <motion.p className="mt-8 mb-6 font-sans">Port Daddy detects 60+ frameworks -- Next.js, Express, Fastify, NestJS, Hono, Django, Rails, Spring Boot, Go, Rust, and many more. It reads <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">package.json</motion.code>, <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">Cargo.toml</motion.code>, <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">go.mod</motion.code>, <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">requirements.txt</motion.code>, and other manifest files to determine the framework and its default start command.</motion.p>
      <motion.p className="mb-6 font-sans">The generated <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">.portdaddyrc</motion.code> captures your entire architecture:</motion.p>
      
      <CodeBlock
        language="json"
        filename=".portdaddyrc"
        code={`{
  "project": "paymentco",
  "services": {
    "postgres": {
      "cmd": "pg_ctl -D /usr/local/var/postgresql@16 start",
      "health": "pg_isready -h localhost -p \${PORT}",
      "shutdownCmd": "pg_ctl -D /usr/local/var/postgresql@16 stop"
    },
    "redis": {
      "cmd": "redis-server --port \${PORT}",
      "health": "redis-cli -p \${PORT} ping"
    },
    "nats": {
      "cmd": "nats-server -p \${PORT}",
      "health": "curl -sf http://localhost:\${PORT}/healthz"
    },
    "elasticsearch": {
      "cmd": "elasticsearch -E http.port=\${PORT}",
      "health": "curl -sf http://localhost:\${PORT}/_cluster/health",
      "healthTimeout": 30
    },
    "api": {
      "cmd": "npm run dev -- --port \${PORT}",
      "cwd": "services/api",
      "needs": ["postgres", "redis"],
      "healthPath": "/health"
    },
    "dashboard": {
      "cmd": "npm run dev -- --port \${PORT}",
      "cwd": "services/dashboard",
      "needs": ["api"],
      "healthPath": "/"
    }
  }
}`}
      />

      <motion.p className="mt-8 font-sans">Notice there are zero hardcoded ports anywhere. Every <code>{"${PORT}"}</code> reference is filled in dynamically by Port Daddy at start time. Commit this file to your repo -- every developer gets the same config.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Starting the Whole Stack</motion.h2>
      <motion.p className="mb-6 font-sans">Now the moment of truth. One command to start everything:</motion.p>
      
      <CodeBlock
        code={`$ pd up

[paymentco] Starting 15 services...

  [postgres]        Starting on port 5532...
  [redis]           Starting on port 6479...
  [nats]            Starting on port 4322...
  [elasticsearch]   Starting on port 9300...

  [postgres]        Health check passed (0.3s)
  [redis]           Health check passed (0.1s)
  [nats]            Health check passed (0.2s)
  [elasticsearch]   Health check passed (8.4s)

  [auth]            Starting on port 3100...
  [api]             Starting on port 3101...
  [worker]          Starting on port 3102...
  [scheduler]       Starting on port 3103...
  [webhooks]        Starting on port 3104...
  [billing]         Starting on port 3105...
  [search-sync]     Starting on port 3106...
  [email]           Starting on port 3107...
  [notifications]   Starting on port 3108...

  [auth]            Health check passed (1.2s)
  [api]             Health check passed (2.1s)
  [worker]          Health check passed (0.8s)
  [billing]         Health check passed (1.9s)

  [admin]           Starting on port 3109...
  [dashboard]       Starting on port 3110...

  [admin]           Health check passed (1.4s)
  [dashboard]       Health check passed (1.1s)

All 15 services healthy. Total startup: 14.3s`}
      />

      <motion.p className="mt-8 mb-4 font-sans">What just happened:</motion.p>
      <motion.ol className="space-y-3 list-decimal pl-6 mb-8 font-sans">
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Dependency resolution</motion.strong> -- Port Daddy built a directed acyclic graph (DAG) from the <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">needs</motion.code> fields</motion.li>
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Parallel startup</motion.strong> -- Independent services (postgres, redis, nats, elasticsearch) started simultaneously</motion.li>
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Health gate</motion.strong> -- Services that depend on infra waited until health checks passed</motion.li>
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Second wave</motion.strong> -- API-level services started after infra was healthy</motion.li>
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Third wave</motion.strong> -- Frontend services started after the API was healthy</motion.li>
        <motion.li className="font-sans"><motion.strong style={{ color: 'var(--text-primary)' }}>Port injection</motion.strong> -- Every service received its deterministic port via <code>{"${PORT}"}</code></motion.li>
      </motion.ol>
      <motion.p className="font-sans">Compare this to your old <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">start-everything.sh</motion.code> script that was 200 lines of <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">sleep 5</motion.code> calls and hardcoded ports.</motion.p>

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>Intelligent Dependency Management</motion.h2>
      <motion.p className="mb-6 font-sans">The <motion.code className="font-mono bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded">needs</motion.code> field is the heart of the orchestrator. Port Daddy resolves the full dependency graph before starting anything:</motion.p>
      
      <CodeBlock
        language="json"
        code={`{
  "api": {
    "needs": ["postgres", "redis"]
  },
  "dashboard": {
    "needs": ["api"]
  },
  "billing": {
    "needs": ["postgres", "redis", "nats"]
  }
}`}
      />

      <motion.p className="mt-8 font-sans">From this, Port Daddy computes the start order:</motion.p>
      <CodeBlock
        code={`Wave 1: postgres, redis, nats, elasticsearch  (no dependencies)
Wave 2: api, auth, worker, scheduler, webhooks, billing, search-sync, email, notifications
Wave 3: admin, dashboard  (depend on api)`}
      />

      <motion.p className="mt-8 font-sans">Within each wave, services start in parallel. Between waves, Port Daddy waits for every health check to pass before moving on.</motion.p>
      <motion.p className="mb-6 font-sans">If you create a circular dependency, Port Daddy catches it immediately:</motion.p>
      
      <CodeBlock
        code={`$ pd up
Error: Circular dependency detected: api -> billing -> api
Fix the "needs" chain in .portdaddyrc before starting.`}
      />

      <motion.h2 className="text-3xl font-bold mt-16 mb-6 font-display" style={{ color: 'var(--text-primary)' }}>What's Next</motion.h2>
      <motion.ul className="space-y-3 list-none p-0 mb-12 font-sans">
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">⚓</motion.span> 
          <motion.span className="font-sans"><Link to="/tutorials/debugging" className="font-bold underline font-sans">Debugging</Link> -- When services crash, health checks fail, or ports go missing</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">⚓</motion.span> 
          <motion.span className="font-sans"><Link to="/tutorials/multi-agent" className="font-bold underline font-sans">Multi-Agent Orchestration</Link> -- Add AI agents coordinating on top of your running stack</motion.span>
        </motion.li>
        <motion.li className="flex gap-3 font-sans">
          <motion.span className="text-[var(--brand-primary)] font-sans">⚓</motion.span> 
          <motion.span className="font-sans"><Link to="/tutorials/tunnel" className="font-bold underline font-sans">Tunnel Magic</Link> -- Share your running monorepo with external testers via public URLs</motion.span>
        </motion.li>
      </motion.ul>
      
      <motion.p className="font-sans text-lg italic opacity-60">The hardest part of running a monorepo was never the code. It was getting the infrastructure to cooperate. That problem is now solved.</motion.p>
    </TutorialLayout>
  )
}
