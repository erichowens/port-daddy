import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { Link } from 'react-router-dom'

export function Watch() {
  return (
    <TutorialLayout
      title="pd watch"
      description="Subscribe to a pub/sub channel and execute a script on every message. The primitive that makes AI agents always-on."
      number="10"
      total="12"
      level="Intermediate"
      readTime="6 min read"
      prev={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
      next={{ title: 'pd spawn', href: '/tutorials/pd-spawn' }}
    >
      <p><code>pd watch</code> turns any script into an ambient agent trigger. It opens a persistent SSE connection to a Port Daddy pub/sub channel and executes a shell command on every message — no polling, no cron jobs, no manual wiring.</p>

      <h2>What pd watch Does</h2>
      <p><code>pd watch</code> subscribes to a channel over Server-Sent Events. When a message arrives, it sets environment variables and execs your script. When Port Daddy restarts or the connection drops, <code>pd watch</code> reconnects automatically with exponential backoff.</p>
      <p>This is the "always-on agent" primitive. A watcher is a lightweight persistent process — not a daemon, just a process that runs a script every time something happens. You can have as many watchers as you have scripts.</p>

      <h2>Basic Usage</h2>
      <pre><code><span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd watch build-results --exec './analyze.sh'</span>
<span style={{ color: 'var(--code-output)' }}>Watching channel: build-results
Connected. Waiting for messages...</span>

<span style={{ color: 'var(--code-comment)' }}># In another terminal, publish a message:</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd msg build-results publish '{"{"}"status":"failed","job":"test-suite"{"}"}'</span>

<span style={{ color: 'var(--code-comment)' }}># Back in the watcher terminal:</span>
<span style={{ color: 'var(--code-output)' }}>Message received on build-results
Running: ./analyze.sh
Exit code: 0</span></code></pre>
      <p>The <code>--exec</code> flag is a shell command string. It can be any executable: a bash script, a Python script, a Node.js process, or even a direct <code>curl</code> call to another service.</p>

      <h2>Environment Variables</h2>
      <p>When your script runs, Port Daddy sets these environment variables:</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># Inside your --exec script, these are available:</span>
<span style={{ color: 'var(--code-output)' }}>PD_CHANNEL=build-results        # Which channel fired
PD_MESSAGE={"{"}"status":"failed"{"}"}  # Full JSON message content
PD_MESSAGE_CONTENT={"{"}"status":"failed"{"}"}  # Alias for PD_MESSAGE
PD_TIMESTAMP=2026-03-11T08:23:41.000Z  # ISO 8601 timestamp</span></code></pre>
      <p>Your script can parse <code>PD_MESSAGE</code> with <code>jq</code>, Python's <code>json</code>, or Node's <code>JSON.parse</code>. The message is whatever was published to the channel.</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># analyze.sh — reads PD_MESSAGE, routes to the right handler</span>
<span style={{ color: 'var(--code-prompt)' }}>#!/bin/bash</span>
<span style={{ color: 'var(--text-primary)' }}>STATUS=$(echo "$PD_MESSAGE" | jq -r .status)

</span><span style={{ color: 'var(--code-keyword)' }}>if</span><span style={{ color: 'var(--text-primary)' }}> [ "$STATUS" = "failed" ]; </span><span style={{ color: 'var(--code-keyword)' }}>then</span><span style={{ color: 'var(--text-primary)' }}>
  echo "Build failed — filing issue"
  gh issue create --title "Build failed: $(echo $PD_MESSAGE | jq -r .job)"
</span><span style={{ color: 'var(--code-keyword)' }}>fi</span></code></pre>

      <h2>Real-World Pattern: CI Notifier</h2>
      <p>Here's a full pattern: a CI system publishes build results to a channel, and a watcher agent automatically creates GitHub issues on failures and posts Slack messages on success.</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># Start the watcher (runs forever, reconnects on disconnect)</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd watch ci-results --exec './ci-notifier.sh' &amp;</span>

<span style={{ color: 'var(--code-comment)' }}># ci-notifier.sh</span>
<span style={{ color: 'var(--text-primary)' }}>STATUS=$(echo "$PD_MESSAGE" | jq -r .status)
BRANCH=$(echo "$PD_MESSAGE" | jq -r .branch)
JOB=$(echo "$PD_MESSAGE" | jq -r .job)

</span><span style={{ color: 'var(--code-keyword)' }}>if</span><span style={{ color: 'var(--text-primary)' }}> [ "$STATUS" = "failed" ]; </span><span style={{ color: 'var(--code-keyword)' }}>then</span><span style={{ color: 'var(--text-primary)' }}>
  gh issue create \
    --title "CI failure: $JOB on $BRANCH" \
    --body "$PD_MESSAGE"
</span><span style={{ color: 'var(--code-keyword)' }}>elif</span><span style={{ color: 'var(--text-primary)' }}> [ "$STATUS" = "passed" ]; </span><span style={{ color: 'var(--code-keyword)' }}>then</span><span style={{ color: 'var(--text-primary)' }}>
  curl -s -X POST "$SLACK_WEBHOOK" \
    -d '{"{"}"text":"Build passed: $BRANCH ($JOB)"{"}"}'
</span><span style={{ color: 'var(--code-keyword)' }}>fi</span>

<span style={{ color: 'var(--code-comment)' }}># From CI, publish results:</span>
<span style={{ color: 'var(--code-prompt)' }>$</span> <span style={{ color: 'var(--text-primary)' }}>pd msg ci-results publish \
  '{"{"}"status":"failed","job":"test-suite","branch":"feature-auth"{"}"}'</span></code></pre>

      <h2>Auto-Reconnect</h2>
      <p>The SSE connection will eventually drop — Port Daddy restarts, network blips, macOS wakes from sleep. <code>pd watch</code> handles this automatically:</p>
      <pre><code><span style={{ color: 'var(--code-output)' }}>Watching channel: ci-results
Connected. Waiting for messages...
Message received. Running: ./ci-notifier.sh

[Connection lost]
Reconnecting in 1s...
Reconnecting in 2s...
Reconnecting in 4s...
Connected. Waiting for messages...</span></code></pre>
      <p>Backoff is exponential (1s, 2s, 4s, 8s...) with a maximum delay of 30 seconds. The watcher will keep trying indefinitely until the connection is restored.</p>

      <h2>SDK Equivalent</h2>
      <pre><code><span style={{ color: 'var(--code-keyword)' }}>import</span> <span style={{ color: 'var(--text-primary)' }}>{'{ PortDaddy }'}</span> <span style={{ color: 'var(--code-keyword)' }}>from</span> <span style={{ color: 'var(--code-string)' }}>'port-daddy'</span><span style={{ color: 'var(--text-primary)' }}>;
<span style={{ color: 'var(--code-keyword)' }}>import</span> <span style={{ color: 'var(--text-primary)' }}>{'{ execSync }'}</span> <span style={{ color: 'var(--code-keyword)' }}>from</span> <span style={{ color: 'var(--code-string)' }}>'child_process'</span><span style={{ color: 'var(--text-primary)' }}>;

<span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>pd =</span> <span style={{ color: 'var(--code-keyword)' }}>new</span> <span style={{ color: 'var(--text-primary)' }}>PortDaddy();

<span style={{ color: 'var(--code-comment)' }}>// Watch a channel and handle messages in-process</span>
<span style={{ color: 'var(--code-keyword)' }}>for await</span> <span style={{ color: 'var(--text-primary)' }}>(</span><span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>message</span> <span style={{ color: 'var(--code-keyword)' }}>of</span> <span style={{ color: 'var(--text-primary)' }}>pd.watch(</span><span style={{ color: 'var(--code-string)' }}>'ci-results'</span><span style={{ color: 'var(--text-primary)' }}>)) {'{'}</span>
  <span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>data = JSON.parse(message.content);
  </span><span style={{ color: 'var(--code-keyword)' }}>if</span> <span style={{ color: 'var(--text-primary)' }}>(data.status ===</span> <span style={{ color: 'var(--code-string)' }}>'failed'</span><span style={{ color: 'var(--text-primary)' }}>) {'{'}</span>
    <span style={{ color: 'var(--code-comment)' }}>// Run your handler directly in Node.js</span>
    <span style={{ color: 'var(--code-keyword)' }}>await</span> <span style={{ color: 'var(--text-primary)' }}>handleFailure(data);
  {'}'}
{'}'}</span></code></pre>

    </TutorialLayout>
  )
}