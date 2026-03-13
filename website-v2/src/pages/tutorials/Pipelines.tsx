}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Pipelines() {
  return (
    <TutorialLayout
      title="Reactive Pipelines"
      description="Turn Port Daddy into an event-driven DAG. Auto-spawn agents or trigger scripts when pub/sub events fire."
      number="14"
      total="16"
      level="Advanced"
      readTime="12 min read"
      prev={{ title: 'Live Dashboard', href: '/tutorials/dashboard' }}
      next={{ title: 'Time-Travel Debugging', href: '/tutorials/time-travel' }}
    >
      <motion.p className="font-sans">Port Daddy isn't just a static registry. It includes a reactive Orchestrator Engine that lets you build Directed Acyclic Graphs (DAGs) of agentic workflows.</motion.p>

      <motion.h2 className="font-display">The Orchestrator Engine</motion.h2>
      <motion.p className="font-sans">Instead of manually running <motion.code className="font-mono">pd spawn</motion.code>, you can define rules that listen to pub/sub channels and automatically trigger actions when messages arrive.</motion.p>
      
      <motion.p className="font-sans">You can manage these rules via the "Agentic Pipelines" tab in the <Link to="/tutorials/dashboard">Live Dashboard</Link>, or via the CLI.</motion.p>

      <motion.h2 className="font-display">Creating a Rule</motion.h2>
      <motion.p className="font-sans">A rule consists of a <motion.strong className="font-sans">trigger</motion.strong> (a channel pattern) and an <motion.strong className="font-sans">action</motion.strong> (spawning an agent or executing a shell command).</motion.p>
      
      <CodeBlock
        code={`# Add a rule that triggers a Linter Agent whenever code changes
$ pd orchestrator add-rule \\
    --name "Auto-Linter" \\
    --channel "fs:changed" \\
    --action spawn \\
    --payload '{ "backend": "claude", "model": "claude-haiku-4-5", "task": "Lint the changed files in {{msg}}" }'`}
      />

      <motion.p className="font-sans">Notice the <motion.code className="font-mono">{'{'}{'{'}msg{'}'}{'}'}</motion.code> template variable? The Orchestrator automatically injects the payload of the pub/sub message into the spawn task or shell command.</motion.p>

      <motion.h2 className="font-display">Example: A Self-Healing CI Pipeline</motion.h2>
      <motion.p className="font-sans">Using the Orchestrator, you can build a fully autonomous, self-healing CI loop:</motion.p>

      <motion.ol>
        <motion.li className="font-sans">A file-watcher script publishes to <motion.code className="font-mono">code:changed</motion.code>.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Rule 1:</motion.strong> Listens to <motion.code className="font-mono">code:changed</motion.code> and runs the test suite via <motion.code className="font-mono">exec</motion.code>.</motion.li>
        <motion.li className="font-sans">The test script publishes either <motion.code className="font-mono">test:passed</motion.code> or <motion.code className="font-mono">test:failed</motion.code>.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Rule 2:</motion.strong> Listens to <motion.code className="font-mono">test:failed</motion.code> and <motion.code className="font-mono">spawn</motion.code>s a Debugger Agent, passing the error logs in the message.</motion.li>
        <motion.li className="font-sans">The Debugger Agent fixes the code, saving the file, which triggers step 1 again.</motion.li>
      </motion.ol>

      <motion.p className="font-sans">This entire loop is managed by Port Daddy's internal engine, visible and stoppable from the dashboard at any time.</motion.p>
    </TutorialLayout>
  )
