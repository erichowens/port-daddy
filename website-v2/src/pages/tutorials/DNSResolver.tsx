}
import { motion } from "framer-motion"
import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { CodeBlock } from '@/components/ui/CodeBlock'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function DNSResolver() {
  return (
    <TutorialLayout
      title="DNS Resolution"
      description="Access your dev services by hostname instead of port numbers. Map myapp-api.local to your running service with a single command."
      number="6"
      total="12"
      level="Intermediate"
      readTime="10 min read"
      prev={{ title: 'Tunnel Magic', href: '/tutorials/tunnel' }}
      next={{ title: 'Session Phases', href: '/tutorials/session-phases' }}
    >
      <motion.h2 className="font-display">What is Port Daddy DNS?</motion.h2>
      <motion.p className="font-sans">Port Daddy maintains a local DNS registry that maps semantic service identities to hostnames. Instead of remembering that your API is on <motion.code className="font-mono">localhost:3100</motion.code> and your frontend on <motion.code className="font-mono">localhost:5173</motion.code>, you register each service with a hostname and access them by name.</motion.p>
      <motion.p className="font-sans">The registry lives in the Port Daddy daemon and can optionally write to your operating system's <motion.code className="font-mono">/etc/hosts</motion.code> file. Once that's done, any tool on your machine -- curl, your browser, other services -- can reach <motion.code className="font-mono">myapp-api.local</motion.code> without knowing the port number.</motion.p>
      <motion.p className="font-sans">This is especially useful in multi-service and multi-agent workflows where services depend on each other by address. Agents can hardcode <motion.code className="font-mono">http://myapp-api.local</motion.code> instead of passing port numbers through environment variables.</motion.p>

      <motion.h2 className="font-display">Prerequisites</motion.h2>
      <motion.p className="font-sans">You'll need Port Daddy installed and the daemon running. If you haven't done this yet, see the <Link to="/tutorials/getting-started">Getting Started</Link> tutorial.</motion.p>
      
      <CodeBlock
        code={`# Check that the daemon is running
$ pd status
Port Daddy daemon running on localhost:9876
Uptime: 2h 14m`}
      />

      <motion.p className="font-sans">If the daemon isn't running, start it:</motion.p>
      <CodeBlock
        code={`$ pd start
[pd] Port Daddy daemon started on localhost:9876`}
      />

      <motion.h2 className="font-display">Register Your First DNS Record</motion.h2>
      <motion.p className="font-sans">The simplest way to register a DNS record is to add <motion.code className="font-mono">--dns</motion.code> when claiming a port. Port Daddy derives a hostname from the service identity automatically.</motion.p>
      
      <CodeBlock
        code={`$ pd claim myapp:api --dns
Port 3100 assigned to myapp:api
DNS: myapp-api.local`}
      />

      <motion.p className="font-sans">The derived hostname replaces colons with hyphens and appends <motion.code className="font-mono">.local</motion.code>. So <motion.code className="font-mono">myapp:api</motion.code> becomes <motion.code className="font-mono">myapp-api.local</motion.code>.</motion.p>
      <motion.p className="font-sans">You can also register a DNS record separately from port claiming, and supply a custom hostname:</motion.p>
      
      <CodeBlock
        code={`$ pd dns register myapp:api --hostname myapp-api.local
DNS record registered: myapp-api.local -> 127.0.0.1:3100 (myapp:api)`}
      />

      <motion.p className="font-sans">Verify the record was stored:</motion.p>
      <CodeBlock
        code={`$ pd dns list
HOSTNAME               ADDRESS          SERVICE
myapp-api.local        127.0.0.1:3100   myapp:api`}
      />

      <motion.div className="bg-[var(--bg-glass-teal)] border border-[var(--brand-primary)] p-6 rounded-2xl my-8 text-sm leading-relaxed" style={{ backdropFilter: 'blur(12px)' }}>
        <motion.strong className="text-[var(--text-primary)] font-bold uppercase tracking-widest text-xs block mb-2">Architectural Note</motion.strong>
        <motion.p className="m-0" style={{ color: 'var(--text-secondary)' }}>
          DNS records in Port Daddy's registry are separate from OS-level resolution. The record is stored in the daemon, but your browser and curl won't use it until you run <motion.code className="font-mono">pd dns sync</motion.code> (covered below).
        </motion.p>
      </motion.div>

      <motion.h2 className="font-display">Register Multiple Services</motion.h2>
      <motion.p className="font-sans">For a typical web application with a backend API, frontend, and background job runner, you'd register all three at once:</motion.p>
      
      <CodeBlock
        code={`$ pd claim myapp:api --dns
Port 3100 assigned to myapp:api
DNS: myapp-api.local

$ pd claim myapp:frontend --dns
Port 3101 assigned to myapp:frontend
DNS: myapp-frontend.local

$ pd claim myapp:jobs --dns
Port 3102 assigned to myapp:jobs
DNS: myapp-jobs.local`}
      />

      <motion.p className="font-sans">Now check the registry:</motion.p>
      <CodeBlock
        code={`$ pd dns list
HOSTNAME                  ADDRESS          SERVICE
myapp-api.local           127.0.0.1:3100   myapp:api
myapp-frontend.local      127.0.0.1:3101   myapp:frontend
myapp-jobs.local          127.0.0.1:3102   myapp:jobs`}
      />

      <motion.p className="font-sans">All three services are now registered. The port assignments are stable -- if another agent or process calls <motion.code className="font-mono">pd claim myapp:api</motion.code>, it gets back port 3100 again. The DNS entry stays consistent.</motion.p>

      <motion.h2 className="font-display">Enable OS-Level Resolution with /etc/hosts</motion.h2>
      <motion.p className="font-sans">Port Daddy's internal registry isn't visible to your OS by default. To make hostnames like <motion.code className="font-mono">myapp-api.local</motion.code> work in curl, your browser, and other services, you need to write them to <motion.code className="font-mono">/etc/hosts</motion.code>.</motion.p>
      <motion.p className="font-sans">Port Daddy manages a clearly delimited section of <motion.code className="font-mono">/etc/hosts</motion.code> and never touches the rest of the file.</motion.p>

      <motion.h3 className="font-display">Step 1: Set up the managed section</motion.h3>
      <motion.p className="font-sans">This adds Port Daddy's managed block to <motion.code className="font-mono">/etc/hosts</motion.code>. It requires <motion.code className="font-mono">sudo</motion.code> because <motion.code className="font-mono">/etc/hosts</motion.code> is root-owned.</motion.p>
      <CodeBlock
        code={`$ sudo pd dns setup
Backup created: /etc/hosts.portdaddy-backup-1741654320
Port Daddy section added to /etc/hosts`}
      />

      <motion.h3 className="font-display">Step 2: Sync DNS records to /etc/hosts</motion.h3>
      <CodeBlock
        code={`$ pd dns sync
Synced 3 record(s) to /etc/hosts
  myapp-api.local
  myapp-frontend.local
  myapp-jobs.local`}
      />
      <motion.p className="font-sans">This command does not require sudo -- Port Daddy only writes within its own managed section.</motion.p>

      <motion.h3 className="font-display">Step 3: Verify</motion.h3>
      <CodeBlock
        code={`$ pd dns status
DNS registry: 3 record(s)
/etc/hosts: synced (3 entries)
Last sync: just now`}
      />

      <motion.h3 className="font-display">What /etc/hosts looks like before and after</motion.h3>
      <motion.p className="font-sans"><motion.strong className="font-sans">Before:</motion.strong></motion.p>
      <CodeBlock
        code={`127.0.0.1   localhost
255.255.255.255  broadcasthost
::1         localhost`}
      />

      <motion.p className="font-sans"><motion.strong className="font-sans">After:</motion.strong></motion.p>
      <CodeBlock
        code={`127.0.0.1   localhost
255.255.255.255  broadcasthost
::1         localhost

# === PORT DADDY DNS (managed, do not edit) ===
127.0.0.1   myapp-api.local
127.0.0.1   myapp-frontend.local
127.0.0.1   myapp-jobs.local
# === END PORT DADDY DNS ===`}
      />

      <motion.div className="bg-[var(--badge-amber-bg)] border-l-4 border-[var(--badge-amber-border)] p-4 rounded-r-md my-6 text-sm text-[var(--text-secondary)]">
        <motion.strong className="text-[var(--text-primary)] font-bold">Do not edit the managed section by hand.</motion.strong> Any changes between the Port Daddy markers will be overwritten the next time <motion.code className="font-mono">pd dns sync</motion.code> runs.
      </motion.div>

      <motion.h3 className="font-display">Test it with curl</motion.h3>
      <CodeBlock
        code={`$ curl http://myapp-api.local:3100/health
{"status":"ok","service":"myapp:api"}`}
      />

      <motion.div className="bg-[var(--badge-green-bg)] border-l-4 border-[var(--badge-green-border)] p-4 rounded-r-md my-6 text-sm text-[var(--text-secondary)]">
        <motion.strong className="text-[var(--text-primary)] font-bold text-lg block mb-1">It works!</motion.strong>
        Your service is now accessible by hostname from any tool on your machine. Other services in the same project can call <motion.code className="font-mono">http://myapp-api.local:3100</motion.code> instead of hard-coding a port number.
      </motion.div>

      <motion.h2 className="font-display">Check DNS Status</motion.h2>
      <motion.p className="font-sans">Two commands give you visibility into the DNS state:</motion.p>
      
      <CodeBlock
        code={`$ pd dns status
DNS registry: 3 record(s)
/etc/hosts: synced (3 entries)
Last sync: 4 minutes ago

$ pd dns resolver
Resolver mode: /etc/hosts
Managed section: present
Records in registry: 3
Records synced to /etc/hosts: 3
Drift: none`}
      />

      <motion.p className="font-sans"><motion.code className="font-mono">pd dns resolver</motion.code> tells you whether the registry and <motion.code className="font-mono">/etc/hosts</motion.code> are in sync. If you see drift (records in the registry not in <motion.code className="font-mono">/etc/hosts</motion.code>), run <motion.code className="font-mono">pd dns sync</motion.code> to reconcile.</motion.p>

      <motion.h2 className="font-display">SDK Usage</motion.h2>
      <motion.p className="font-sans">All DNS operations are available in the JavaScript SDK for use in agent code and scripts:</motion.p>
      
      <CodeBlock
        language="typescript"
        code={`const pd = new PortDaddy();

// Claim a port with DNS registration in one call
const { port } = await pd.claim('myapp:api');
await pd.dnsRegister('myapp:api', { hostname: 'myapp-api.local' });

// List all registered DNS records
const records = await pd.dnsList();
// [{ hostname: 'myapp-api.local', address: '127.0.0.1', port: 3100, service: 'myapp:api' }]

// Set up the /etc/hosts managed section (requires sudo context)
await pd.dnsSetup();

// Write registry to /etc/hosts
await pd.dnsSync();

// Check current status
const status = await pd.dnsStatus();
// { records: 3, synced: 3, lastSync: '2026-03-10T...' }

// Remove a record
await pd.dnsRemove('myapp:api');`}
      />

      <motion.p className="font-sans">The SDK is useful when you want DNS registration to be part of your service startup script. Register the hostname, claim the port, then signal other agents that the service is ready.</motion.p>

      <motion.h2 className="font-display">Troubleshooting</motion.h2>

      <motion.h3 className="font-display">Permission error when running pd dns setup</motion.h3>
      <CodeBlock
        code={`$ pd dns setup
Error: permission denied writing to /etc/hosts
Hint: run with sudo: sudo pd dns setup`}
      />
      <motion.p className="font-sans"><motion.code className="font-mono">/etc/hosts</motion.code> is owned by root on macOS and Linux. The <motion.code className="font-mono">setup</motion.code> command needs sudo once to create the managed section. After that, <motion.code className="font-mono">pd dns sync</motion.code> can update the section without sudo because Port Daddy manages write access to its own block.</motion.p>

      <motion.h3 className="font-display">Hostname conflict -- record already exists</motion.h3>
      <CodeBlock
        code={`$ pd dns register myapp:api --hostname myapp-api.local
Error: hostname myapp-api.local is already registered (by myapp:api-v2)`}
      />
      
      <motion.p className="font-sans">Remove the conflicting record first, then re-register:</motion.p>
      <CodeBlock
        code={`$ pd dns remove myapp-api.local
Record removed: myapp-api.local

$ pd dns register myapp:api --hostname myapp-api.local
DNS record registered: myapp-api.local -> 127.0.0.1:3100 (myapp:api)`}
      />

      <motion.h3 className="font-display">Hostname not resolving in browser after sync</motion.h3>
      <motion.p className="font-sans">Browsers cache DNS responses. After running <motion.code className="font-mono">pd dns sync</motion.code>, if a hostname still doesn't resolve in your browser:</motion.p>
      <motion.ol>
        <motion.li className="font-sans">Verify the entry is in <motion.code className="font-mono">/etc/hosts</motion.code>: <motion.code className="font-mono">grep -A 10 "PORT DADDY" /etc/hosts</motion.code></motion.li>
        <motion.li className="font-sans">Restart your browser completely (quit and reopen, not just a new tab)</motion.li>
        <motion.li className="font-sans">On macOS, flush the DNS cache: <motion.code className="font-mono">sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder</motion.code></motion.li>
      </motion.ol>

      <motion.h3 className="font-display">Drift between registry and /etc/hosts</motion.h3>
      <CodeBlock
        code={`$ pd dns resolver
Drift detected: 2 record(s) in registry not in /etc/hosts

$ pd dns sync
Synced 2 new record(s) to /etc/hosts`}
      />
      <motion.p className="font-sans">Drift happens when you register new DNS records after the last sync. Running <motion.code className="font-mono">pd dns sync</motion.code> always brings them back into agreement.</motion.p>

      <motion.h3 className="font-display">Verify /etc/hosts entries directly</motion.h3>
      <CodeBlock
        code={`$ grep -A 20 "PORT DADDY" /etc/hosts
# === PORT DADDY DNS (managed, do not edit) ===
127.0.0.1   myapp-api.local
127.0.0.1   myapp-frontend.local
127.0.0.1   myapp-jobs.local
# === END PORT DADDY DNS ===`}
      />

      <motion.h2 className="font-display">Cleanup</motion.h2>
      <motion.p className="font-sans">When you're done with a project or want to remove DNS records:</motion.p>
      
      <CodeBlock
        code={`# Remove one specific record from the registry
$ pd dns remove myapp:api
Record removed: myapp-api.local (myapp:api)

# Sync the change to /etc/hosts
$ pd dns sync
Synced 2 record(s) to /etc/hosts (1 removed)

# Or remove everything: all records + the managed /etc/hosts section
$ sudo pd dns teardown
Backup created: /etc/hosts.portdaddy-backup-1741654987
Port Daddy section removed from /etc/hosts
3 DNS records cleared from registry`}
      />

      <motion.p className="font-sans">A backup of <motion.code className="font-mono">/etc/hosts</motion.code> is created automatically before any modifications. The backup filename includes a timestamp so you can restore a specific version if needed:</motion.p>
      
      <CodeBlock
        code={`# Restore from backup if something went wrong
$ sudo cp /etc/hosts.portdaddy-backup-1741654987 /etc/hosts`}
      />

    </TutorialLayout>
  )
