}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function TimeTravel() {
  return (
    <TutorialLayout
      title="Time-Travel Debugging"
      description="Scrub through history. Correlate infrastructure events with agent session notes to diagnose complex swarm failures."
      number="15"
      total="16"
      level="Advanced"
      readTime="10 min read"
      prev={{ title: 'Reactive Pipelines', href: '/tutorials/pipelines' }}
      next={{ title: 'Remote Harbors (Preview)', href: '/tutorials/remote-harbors' }}
    >
      <motion.p className="font-sans">When a single script fails, you read the stack trace. When a swarm of 10 autonomous agents fails, the "stack trace" is spread across 10 different memory banks, 3 database locks, and a dozen file claims.</motion.p>

      <motion.h2 className="font-display">The Correlation Engine</motion.h2>
      <motion.p className="font-sans">Port Daddy solves this with the <motion.strong className="font-sans">Correlation Engine</motion.strong>. It interleaves two entirely different types of data into a single, unified chronological timeline:</motion.p>
      
      <motion.ul>
        <motion.li className="font-sans"><motion.strong className="font-sans">Infrastructure Events:</motion.strong> (From the <motion.code className="font-mono">ActivityLog</motion.code>) When ports are claimed, locks are acquired, and daemons restart.</motion.li>
        <motion.li className="font-sans"><motion.strong className="font-sans">Cognitive Events:</motion.strong> (From <motion.code className="font-mono">SessionNotes</motion.code>) The inner monologues and progress reports written by the AI agents themselves.</motion.li>
      </motion.ul>

      <motion.h2 className="font-display">Using History Mode in the Dashboard</motion.h2>
      <motion.p className="font-sans">Open the <Link to="/tutorials/dashboard">Live Dashboard</Link> and click the <motion.strong className="font-sans">History</motion.strong> toggle on the Live Pulse feed.</motion.p>
      
      <motion.p className="font-sans">You will see a timeline that looks like this:</motion.p>
      <CodeBlock
        code={`[10:14:02] [claim.port]        Agent 'db-migrator' claimed port 5432
[10:14:05] [lock.acquire]      Agent 'db-migrator' acquired lock 'schema'
[10:14:06] [note: planning]    db-migrator: "Reviewing schema changes for User table"
[10:14:15] [note: in_progress] db-migrator: "Applying ALTER TABLE..."
[10:14:18] [claim.port]        Agent 'api-worker' claimed port 3000
[10:14:20] [note: testing]     api-worker: "Starting integration tests"
[10:14:21] [note: error]       api-worker: "FATAL: User table locked by migration"
[10:14:22] [agent.stale]       Agent 'api-worker' died unexpectedly`}
      />

      <motion.h2 className="font-display">Diagnosing the Deadlock</motion.h2>
      <motion.p className="font-sans">By looking at the interleaved timeline, the failure is instantly obvious. The <motion.code className="font-mono">api-worker</motion.code> started its integration tests <em>while</em> the <motion.code className="font-mono">db-migrator</motion.code> still held the <motion.code className="font-mono">schema</motion.code> lock and was executing the <motion.code className="font-mono">ALTER TABLE</motion.code> statement.</motion.p>

      <motion.p className="font-sans">Without Port Daddy, you would have seen the <motion.code className="font-mono">api-worker</motion.code> fail with a generic database timeout, and you would have no idea that another agent was migrating the database at that exact millisecond.</motion.p>

      <motion.h2 className="font-display">The Fix</motion.h2>
      <motion.p className="font-sans">The solution is to use Port Daddy's <Link to="/tutorials/session-phases">Integration Signals</Link>. The <motion.code className="font-mono">api-worker</motion.code> should have used <motion.code className="font-mono">pd integration wait db-migrator</motion.code> before starting its tests.</motion.p>
    </TutorialLayout>
  )
