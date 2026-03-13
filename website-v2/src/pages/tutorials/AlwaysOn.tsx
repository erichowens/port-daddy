
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function AlwaysOn() {
  return (
    <TutorialLayout
      title="The Always-On Agent Pattern"
      description="The kernel of the reactive swarm. Build agents that never sleep, subscribe to triggers, and dispatch specialized swarms when conditions are met."
      number="10"
      total="17"
      level="Advanced"
      readTime="15 min read"
      prev={{ title: 'Sugar Commands', href: '/tutorials/sugar' }}
      next={{ title: 'pd spawn', href: '/tutorials/pd-spawn' }}
    >
      <motion.p className="font-sans">In a mature Port Daddy ecosystem, agents shouldn't just be triggered by humans. The most powerful swarms are <motion.strong className="font-sans">ambient</motion.strong>—they listen to the infra, the logs, and each other, and decide when to spin up specialized units.</motion.p>

      <motion.h2 className="font-display">The Architecture of a Kernel Agent</motion.h2>
      <motion.p className="font-sans">An "Always-On" agent (or Kernel Agent) has a specific structural requirement: it must maintain a persistent, self-healing connection to the Port Daddy pub/sub bus.</motion.p>
      
      <motion.ol>
        <motion.li className="font-sans"><motion.strong className="font-sans">Subscription:</motion.strong> Subscribes to a broad pattern (e.g., <motion.code className="font-mono">myapp:*</motion.code>).</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Reconnect Loop:</motion.strong> Automatically re-establishes the SSE connection if the daemon restarts.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Dispatch Logic:</motion.strong> Evaluates incoming messages and calls <motion.code className="font-mono">pd spawn</motion.code> or <motion.code className="font-mono">pd orchestrator</motion.code>.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Context Persistence:</motion.strong> Records its own decisions as Session Notes for auditability.</motion.li>
      </motion.ol>

      <motion.h2 className="font-display">Building an Always-On Agent</motion.h2>
      <motion.p className="font-sans">Using the Port Daddy SDK, a Kernel Agent looks like this:</motion.p>

      <CodeBlock
        language="typescript"
        code={`import { PortDaddy } from 'port-daddy';

const pd = new PortDaddy({ identity: 'kernel:main' });

async function main() {
  await pd.begin({ purpose: 'Ambient swarm coordination' });

  // 1. Subscribe to the event bus
  const stream = pd.watch('myapp:*');

  console.log('Kernel Agent active. Monitoring myapp:*');

  // 2. Process events in real-time
  for await (const message of stream) {
    console.log(\`Received [\${message.channel}]:\`, message.payload);

    // 3. Dispatch specialized agents based on triggers
    if (message.channel === 'myapp:deploy:failed') {
      await pd.spawn({
        identity: 'agent:debugger',
        backend: 'claude',
        task: \`Investigate deployment failure: \${JSON.stringify(message.payload)}\`
      });
    }

    if (message.channel === 'myapp:build:success') {
      await pd.note('Build successful. Dispatching security scanner.');
      await pd.spawn({
        identity: 'agent:scanner',
        backend: 'ollama',
        task: 'Run vuln-check on the latest build artifact.'
      });
    }
  }
}

main().catch(async (err) => {
  console.error('Kernel crashed:', err);
  // Port Daddy heartbeat will fail, marking this for salvage
});`}
      />

      <motion.h2 className="font-display">Reliability via the Reconnect Loop</motion.h2>
      <motion.p className="font-sans">The <motion.code className="font-mono">pd.watch()</motion.code> method in the SDK (and <motion.code className="font-mono">pd watch</motion.code> in the CLI) handles the SSE reconnection logic for you. It uses exponential backoff to ensure that if the daemon is busy or restarting, the Kernel Agent waits and reconnects without losing its place in the event stream.</motion.p>

      <motion.h2 className="font-display">The "Always-On" Command</motion.h2>
      <motion.p className="font-sans">If you don't want to write a custom script, the Port Daddy CLI provides a built-in "Always-On" primitive:</motion.p>
      
      <CodeBlock
        code={`$ pd watch "myapp:*" --exec "./dispatch-logic.sh"
Watching myapp:*...
Connected. Waiting for messages...`}
      />

      <motion.p className="font-sans">The <motion.code className="font-mono">--exec</motion.code> script receives the message channel and payload as environment variables (<motion.code className="font-mono">PD_CHANNEL</motion.code> and <motion.code className="font-mono">PD_MESSAGE</motion.code>), allowing you to build reactive pipelines with simple bash or python scripts.</motion.p>

      <motion.h2 className="font-display">Why it Matters</motion.h2>
      <motion.p className="font-sans">The Always-On pattern moves your swarm from <motion.strong className="font-sans">Sequential</motion.strong> (A then B then C) to <motion.strong className="font-sans">Event-Driven</motion.strong>. It allows for complex, branching logic that can recover from errors autonomously.</motion.p>
    </TutorialLayout>
  )
