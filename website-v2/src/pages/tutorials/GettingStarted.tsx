}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { motion } from 'framer-motion'

export function GettingStarted() {
  return (
    <TutorialLayout
      title="Your First 5 Minutes with Port Daddy"
      description="Welcome to the end of lsof -i :3000 diagnostics and port conflict nightmares."
      number="1"
      total="12"
      level="Beginner"
      readTime="8 min read"
      next={{ title: 'Multi-Agent Orchestration', href: '/tutorials/multi-agent' }}
    >
      <motion.p className="font-sans">In the next five minutes, you'll have Port Daddy running, claim your first stable port, and never manually track port numbers again.</motion.p>

      <motion.h2 className="font-display">1. Installation</motion.h2>
      <motion.p className="font-sans">Port Daddy is a global daemon. The easiest way to install it is via Homebrew or npm:</motion.p>

      <CodeBlock
        code={`# Via Homebrew
$ brew tap erichowens/port-daddy
$ brew install port-daddy

# Or via npm
$ npm install -g port-daddy`}
      />

      <motion.p className="font-sans">Verify the installation by checking the version:</motion.p>
      <CodeBlock code={`$ pd --version\n[pd] Port Daddy v3.7.0`} />

      <motion.h2 className="font-display">2. Starting the Daemon</motion.h2>
      <motion.p className="font-sans">Port Daddy runs as a lightweight background process. Start it with:</motion.p>
      <CodeBlock
        code={`$ pd start
[pd] Daemon started on localhost:9876 (pid: 12345)`}
      />
      <motion.p className="font-sans">You only need to run this once per boot. If you want it to start automatically on macOS or Linux, run:</motion.p>
      <CodeBlock code={`$ pd install`} />

      <motion.h2 className="font-display">3. Your First Claim</motion.h2>
      <motion.p className="font-sans">A <motion.strong className="font-sans">claim</motion.strong> is how you ask Port Daddy for a port. Instead of saying "give me port 3000", you give your service a <motion.strong className="font-sans">Semantic Identity</motion.strong>.</motion.p>
      <CodeBlock
        code={`$ pd claim myapp:api
Port 3100 assigned to myapp:api`}
      />
      <motion.p className="font-sans">Run that command again. And again. It will <motion.strong className="font-sans">always</motion.strong> return port 3100. This is the core magic of Port Daddy: stable, deterministic ports based on identity, not availability.</motion.p>

      <motion.h2 className="font-display">4. The "pd learn" Tutorial</motion.h2>
      <motion.p className="font-sans">Port Daddy has a built-in interactive tutorial. It will guide you through more complex coordination tasks like locks and messaging.</motion.p>
      <CodeBlock
        code={`$ pd learn
Welcome to the Port Daddy interactive guide!
Step 1: Let's create a session...`}
      />

      <motion.h2 className="font-display">5. Auto-Start & System Integration</motion.h2>
      <motion.p className="font-sans">To keep the daemon purring in the background across reboots, use the platform-native install commands:</motion.p>

      <CodeBlock
        code={`# macOS (LaunchAgent)
$ pd install
[pd] Created ~/Library/LaunchAgents/com.erichowens.port-daddy.plist

# Linux (systemd)
$ pd install
[pd] Created ~/.config/systemd/user/port-daddy.service

# Remove auto-start
$ pd uninstall`}
      />

      <motion.h2 className="font-display">Troubleshooting Your First 5 Minutes</motion.h2>

      <motion.h3 className="font-display">"Daemon won't start"</motion.h3>
      <motion.p className="font-sans">Check if something is already listening on 9876:</motion.p>
      <CodeBlock
        code={`$ lsof -i :9876

# If an old daemon is stuck:
$ pkill -f "port-daddy.*server"

# Try again:
$ pd start`}
      />

      <motion.h3 className="font-display">"Why is my port different from a teammate's?"</motion.h3>
      <motion.p className="font-sans">Port assignment is machine-local. If you both claim <motion.code className="font-mono">myapp:api</motion.code>, you might get 3100 and they get 3104. That's normal and good -- it means you're not fighting over the same port.</motion.p>

      <motion.h3 className="font-display">"Can I request a specific port?"</motion.h3>
      <CodeBlock code={`$ pd claim myapp:api --port 3000`} />
      <motion.p className="font-sans">But this breaks the "stable port" contract if you move machines. Try to avoid it.</motion.p>

      <motion.h3 className="font-display">"Does Port Daddy work with Docker?"</motion.h3>
      <motion.p className="font-sans">Absolutely. If your dev server runs in a container, just claim a port outside:</motion.p>
      <CodeBlock
        code={`$ PORT=$(pd claim myapp -q)
$ docker run -p 127.0.0.1:\${PORT}:3000 myapp:dev`}
      />
      <motion.p className="font-sans">Now your container is accessible on the stable port. Note how we escaped the dollar sign in the tutorial source to ensure the variable interpolation happens in your shell, not in the documentation renderer.</motion.p>

      <motion.h2 className="font-display">The Big Picture</motion.h2>
      <motion.p className="font-sans">Port Daddy replaces three separate tools:</motion.p>
      <motion.ul>
        <motion.li className="font-sans"><motion.strong className="font-sans">Docker Compose</motion.strong> -- Use <motion.code className="font-mono">pd up/down</motion.code> instead</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Manual port tracking</motion.strong> -- Use semantic identities instead</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Manual coordination</motion.strong> -- Use sessions, locks, and pub/sub instead</motion.li>
      </motion.ul>
      <motion.p className="font-sans">One daemon. Many projects. Zero port conflicts.</motion.p>
      <motion.p className="font-sans">You'll never <motion.code className="font-mono">lsof -i :3000</motion.code> again.</motion.p>
    </TutorialLayout>
  )
}
