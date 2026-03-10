# Local LLMs and Agent Spawning: Research Report (2026)

*Research session: Port Daddy v3.5 sprint, 2026-03-10*

---

## The Case for Local Inference

Running 10 agents for one hour: cost comparison.

| Backend | Setup | Cost | Notes |
|---------|-------|------|-------|
| **Ollama (local)** | One-time install | ~$0.07 (electricity) | No API key, no rate limits |
| **mlx-lm (M4 Mac)** | pip install | ~$0.05 | Fastest on Apple Silicon |
| **Gemini Flash 2.0** | API key | ~$0.20 | Best free-tier option |
| **Claude Haiku** | API key | ~$0.40 | Best quality/cost for complex tasks |
| **GPT-4o-mini** | API key | ~$0.07 | Competitive pricing |
| **Groq free tier** | API key | $0 | 30 RPM limit, can't saturate |

For the PD target user (solo developer, agentic workflows), **Ollama + selective Claude Haiku** is the right default:
- Use Ollama for iteration/exploration (unlimited, instant)
- Use Claude Haiku for critical tasks (better reasoning, still cheap)
- Use Gemini Flash for long-context tasks (free 1M token context)

---

## Ollama: The Right Architecture

Ollama runs as a daemon (`ollama serve`) and exposes an OpenAI-compatible REST API at `localhost:11434`.

### Key Properties

- **Daemon mode**: One process, N concurrent agent requests
- **Model swapping**: Different models by name in the same request — no new process per model
- **OpenAI compatible**: Same code works against Ollama and any cloud API
- **Streaming**: Real-time token streaming via SSE
- **Context windows**: Up to 128K on capable models

### Feasibility on M4 Max 64GB RAM

| Setup | Feasibility |
|-------|-------------|
| 1 Ollama agent (7B model) | Trivial |
| 3 concurrent Ollama agents (7B) | Easy — ~12GB total |
| 5 concurrent Ollama agents (7B) | OK — ~20GB |
| 3 concurrent agents (13B model) | Good — ~24GB |
| 2 concurrent agents (70B, quantized) | Tight — ~40GB |

For `pd spawn --backend ollama`, the recommended default is `llama3.2:8b` (good instruction following, fast, 8GB VRAM).

### API Call Pattern

```typescript
// Not a subprocess — direct HTTP to Ollama daemon
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llama3.2:8b',
    messages: [{ role: 'user', content: task }],
    stream: false,
  })
});
```

No subprocess overhead. No startup time. Just HTTP.

---

## mlx-lm: Apple Silicon Native

For M-series Macs, `mlx-lm` provides native MLX-accelerated inference:

```bash
pip install mlx-lm
mlx_lm.generate --model mlx-community/Llama-3.2-8B-Instruct-4bit --prompt "Task here"
```

**Performance on M4 Max**: 50-80 tokens/sec (vs ~30 tokens/sec for Ollama on same hardware)

**Tradeoff**: Python-only, no built-in server mode (need mlx-lm server add-on), less ecosystem than Ollama. Best for batch workloads where you want maximum throughput.

For `pd spawn`, Ollama is the better default (daemon mode, OpenAI compat). mlx-lm is a future optimization.

---

## CRITICAL: Don't Spawn the `claude` CLI

The plan explicitly calls out this trap. Benchmarks:

| Method | Tokens Used | Latency | Notes |
|--------|-------------|---------|-------|
| **Direct SDK** | 1x | Fast | No overhead |
| **`claude` CLI subprocess** | ~7x | Slow | MCP re-init, system prompts, shell overhead |

The `claude` CLI is designed for interactive human use. It loads MCP servers, renders markdown, manages conversation history in CLAUDE.md format — none of which is useful for a spawned agent.

**Use `@anthropic-ai/sdk` directly** for Claude backend:

```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const message = await client.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [{ role: 'user', content: task }],
});
```

---

## Aider: The Right Subprocess

Aider IS a good subprocess target because it's designed for it:

- **Git-native**: Makes commits per step, easy to audit
- **Spawn-friendly**: Accepts `--yes` flag for non-interactive mode
- **Output capture**: Structured stdout/stderr, easily logged as PD notes
- **OSS, no API key needed** (when using Ollama backend)

```bash
aider --yes --no-stream --model ollama/llama3.2:8b src/auth.ts src/middleware.ts \
  --message "Refactor authentication to use JWT instead of sessions"
```

Each commit Aider makes can be captured as a PD note (via git log parsing), giving a clean audit trail.

---

## Gemini: The Free Tier Story

Google Gemini Flash 2.0 has a genuinely useful free tier as of 2026:
- 1M tokens/request context window
- 15 RPM on free tier
- $0 for development workloads

For `pd spawn --backend gemini`:
- Use `@google/generative-ai` npm package
- Default model: `gemini-2.0-flash-exp`
- Best use case: Long-context analysis (reading entire codebases)

---

## Spawner Architecture

The `lib/spawner.ts` module should follow the factory pattern used throughout PD:

```typescript
export function createSpawner(deps: SpawnerDeps) {
  return {
    spawn(spec: SpawnSpec): Promise<SpawnedAgent>,
    list(): SpawnedAgent[],
    kill(agentId: string): Promise<void>,
    send(agentId: string, message: string): Promise<void>,
  };
}
```

### `SpawnSpec` interface

```typescript
interface SpawnSpec {
  backend: 'ollama' | 'claude' | 'gemini' | 'aider' | 'custom';
  model?: string;          // e.g., 'llama3.2:8b', 'claude-haiku-4-5-20251001'
  identity?: string;       // PD semantic identity: 'project:stack:context'
  purpose?: string;        // Human-readable task description
  task: string;            // The actual prompt / task
  files?: string[];        // Files to pass to aider
  workdir?: string;        // Working directory (default: cwd)
  env?: Record<string, string>;
  timeout?: number;        // ms, default 300000 (5 min)
}
```

### `SpawnedAgent` handle

```typescript
interface SpawnedAgent {
  agentId: string;
  backend: string;
  model: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  pid?: number;            // For subprocess backends (aider, custom)
  startedAt: Date;
  completedAt?: Date;
  output?: string;
  error?: string;

  // Methods
  send(message: string): Promise<string>;  // Continue conversation
  kill(): Promise<void>;
  on(event: 'output', handler: (chunk: string) => void): void;
}
```

---

## pd watch: The Ambient Kernel

`pd watch` is the missing primitive for always-on agents:

```bash
# Run a script whenever a message arrives on a channel
pd watch build-results --exec './scripts/analyze-build.sh'

# With environment variable injection
pd watch deploy-complete --exec 'pd spawn --backend claude --model claude-haiku -- "Verify deployment health"'

# Oneshot (exit after first message)
pd watch feature-complete --exec './notify.sh' --once
```

### Environment variables available to `--exec` script

```
PD_MESSAGE          # Full message JSON
PD_MESSAGE_CONTENT  # Message content field
PD_CHANNEL          # Channel name
PD_TIMESTAMP        # ISO timestamp
PD_SEQUENCE         # Message sequence number
```

### SSE Reconnect Logic (Required for Persistent Operation)

The watcher process subscribes to `/msg/:channel/subscribe` (SSE). Reconnect loop:

```typescript
async function watchWithReconnect(channel: string, handler: (msg: Message) => void) {
  while (true) {
    try {
      await subscribeSSE(channel, handler);
    } catch (err) {
      // Connection dropped — wait 2s, reconnect
      await sleep(2000);
    }
  }
}
```

This is the same reconnect pattern used by every production SSE client. It should be added to `lib/client.ts`.

---

## References

- Ollama: https://ollama.ai — daemon mode docs
- mlx-lm: https://github.com/ml-explore/mlx-examples/tree/main/llms/mlx_lm
- Aider: https://aider.chat — `--yes --no-stream` flags
- Google Generative AI SDK: https://ai.google.dev/gemini-api/docs
- Anthropic SDK: https://docs.anthropic.com/en/api/getting-started
- Cost comparison methodology: direct API pricing pages, March 2026
