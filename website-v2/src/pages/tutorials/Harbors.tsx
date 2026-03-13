import { TutorialLayout } from '@/components/tutorials/TutorialLayout'
import { Link } from 'react-router-dom'

export function Harbors() {
  return (
    <TutorialLayout
      title="Harbors"
      description="Permission namespaces for multi-agent systems. Issue HMAC-signed capability tokens so agents can only touch what they're supposed to touch."
      number="12"
      total="12"
      level="Advanced"
      readTime="8 min read"
      prev={{ title: 'pd spawn', href: '/tutorials/pd-spawn' }}
    >
      <p>Harbors are the answer to "what happens when you have 20 agents running and one rogue agent starts claiming ports it shouldn't?" They provide cryptographic permission boundaries: agents without a valid harbor token simply can't perform operations outside their scope.</p>

      <h2>What Are Harbors?</h2>
      <p>A harbor is a named permission namespace. When you create a harbor, you define what operations are allowed inside it. When you issue a capability token for that harbor, any agent holding that token can perform those operations — and only those operations — within the harbor's scope.</p>
      <p>Tokens are HMAC-signed JWTs (HS256) with embedded JTI identifiers. Every grant is written to the audit trail. Tokens expire by default after 1 hour, but you can set any TTL.</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># The mental model:</span>
<span style={{ color: 'var(--code-comment)' }}>#</span>
<span style={{ color: 'var(--code-comment)' }}>#   Harbor = Permission Boundary</span>
<span style={{ color: 'var(--code-comment)' }}>#   Token  = Proof of permission, time-limited, signed</span>
<span style={{ color: 'var(--code-comment)' }}>#   Agent  = Must present token to perform scoped operations</span>
<span style={{ color: 'var(--code-comment)' }}>#</span>
<span style={{ color: 'var(--code-comment)' }}># An agent WITHOUT a harbor token is unrestricted (default behavior).</span>
<span style={{ color: 'var(--code-comment)' }}># An agent WITH a harbor token can ONLY do what the token permits.</span></code></pre>

      <h2>Creating a Harbor</h2>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># Create a harbor for the security review workflow</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd harbor create myapp:security-review \</span>
    <span style={{ color: 'var(--code-comment)' }}>--capabilities "code:read,notes:write,locks:acquire"</span>

<span style={{ color: 'var(--code-output)' }}>Harbor created: myapp:security-review
Capabilities: code:read, notes:write, locks:acquire
Status: active</span>

<span style={{ color: 'var(--code-comment)' }}># List all harbors</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd harbors</span>
<span style={{ color: 'var(--code-output)' }}>HARBOR                  CAPABILITIES                        AGENTS
myapp:security-review   code:read,notes:write,locks:acquire  0
myapp:deploy            ports:claim,tunnels:start             1</span></code></pre>

      <h2>Issuing Tokens</h2>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># Issue a token for a specific agent identity</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd harbor token myapp:security-review \</span>
    <span style={{ color: 'var(--code-comment)' }}>--for myapp:reviewer \</span>
    <span style={{ color: 'var(--code-comment)' }}>--ttl 2h</span>

<span style={{ color: 'var(--code-output)' }}>Token issued (expires in 2h):
etje JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Audit entry written:
  harbor: myapp:security-review
  agent:  myapp:reviewer
  caps:   code:read,notes:write,locks:acquire
  jti:    tok-a1b2c3d4
  exp:    2026-03-11T10:23:41.000Z</span>

<span style={{ color: 'var(--code-comment)' }}># Pass the token to the agent via environment variable</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>PD_HARBOR_TOKEN=eyJhbGci... \</span>
    <span style={{ color: 'var(--text-primary)' }}>pd spawn --backend claude --model claude-haiku-4-5 \</span>
    <span style={{ color: 'var(--text-primary)' }}>--identity myapp:reviewer \</span>
    <span style={{ color: 'var(--text-primary)' }}>-- "Review src/auth.ts for security vulnerabilities"</span></code></pre>

      <h2>Capability Reference</h2>
      <p>These are the scoped capabilities you can grant in a harbor token:</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># Port operations</span>
<span style={{ color: 'var(--text-primary)' }}>ports:claim       </span><span style={{ color: 'var(--code-comment)' }}># pd claim — assign a port</span>
<span style={{ color: 'var(--text-primary)' }}>ports:release     </span><span style={{ color: 'var(--code-comment)' }}># pd release — free a port</span>

<span style={{ color: 'var(--code-comment)' }}># Note and session operations</span>
<span style={{ color: 'var(--text-primary)' }}>notes:write       </span><span style={{ color: 'var(--code-comment)' }}># pd note — add session notes</span>
<span style={{ color: 'var(--text-primary)' }}>sessions:read     </span><span style={{ color: 'var(--code-comment)' }}># pd sessions — list sessions</span>

<span style={{ color: 'var(--code-comment)' }}># Distributed locks</span>
<span style={{ color: 'var(--text-primary)' }}>locks:acquire     </span><span style={{ color: 'var(--code-comment)' }}># pd lock acquire</span>
<span style={{ color: 'var(--text-primary)' }}>locks:release     </span><span style={{ color: 'var(--code-comment)' }}># pd lock release</span>

<span style={{ color: 'var(--code-comment)' }}># Pub/sub messaging</span>
<span style={{ color: 'var(--text-primary)' }}>messages:publish  </span><span style={{ color: 'var(--code-comment)' }}># pd msg publish</span>
<span style={{ color: 'var(--text-primary)' }}>messages:read     </span><span style={{ color: 'var(--code-comment)' }}># pd msg get</span>

<span style={{ color: 'var(--code-comment)' }}># Tunnel management</span>
<span style={{ color: 'var(--text-primary)' }}>tunnels:start     </span><span style={{ color: 'var(--code-comment)' }}># pd tunnel start</span>
<span style={{ color: 'var(--text-primary)' }}>tunnels:stop      </span><span style={{ color: 'var(--code-comment)' }}># pd tunnel stop</span>

<span style={{ color: 'var(--code-comment)' }}># Catch-all for reading code (advisory, not enforced at FS level)</span>
<span style={{ color: 'var(--text-primary)' }}>code:read         </span><span style={{ color: 'var(--code-comment)' }}># Signals this agent is allowed to read code</span></code></pre>

      <h2>Scoping Operations</h2>
      <p>When an agent presents a harbor token, every operation it performs is automatically scoped to that harbor's audit trail. Other agents and the dashboard can filter by harbor to see exactly what each scoped agent did.</p>
      <pre><code><span style={{ color: 'var(--code-comment)' }}># As an agent with a harbor token, all operations are scoped:</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>PD_HARBOR_TOKEN=eyJhbGci... pd note "Found XSS in /api/search"</span>
<span style={{ color: 'var(--code-output)' }}>Note added (harbor: myapp:security-review)
  session: sess-d4e5f6
  harbor:  myapp:security-review
  content: Found XSS in /api/search</span>

<span style={{ color: 'var(--code-comment)' }}># Attempting an operation outside the token's capabilities fails:</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>PD_HARBOR_TOKEN=eyJhbGci... pd msg deploy-queue publish "deploy now"</span>
<span style={{ color: 'var(--p-red-400)' }}>Error: Harbor token for myapp:security-review does not include messages:publish</span>

<span style={{ color: 'var(--code-comment)' }}># Revoking a token (by JTI)</span>
<span style={{ color: 'var(--code-prompt)' }}>$</span> <span style={{ color: 'var(--text-primary)' }}>pd harbor revoke tok-a1b2c3d4</span>
<span style={{ color: 'var(--code-output)' }}>Token tok-a1b2c3d4 revoked. Audit entry written.</span></code></pre>

      <h2>SDK Equivalent</h2>
      <pre><code><span style={{ color: 'var(--code-keyword)' }}>import</span> <span style={{ color: 'var(--text-primary)' }}>{'{ PortDaddy }'}</span> <span style={{ color: 'var(--code-keyword)' }}>from</span> <span style={{ color: 'var(--code-string)' }}>'port-daddy'</span><span style={{ color: 'var(--text-primary)' }}>;</span>

<span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>pd =</span> <span style={{ color: 'var(--code-keyword)' }}>new</span> <span style={{ color: 'var(--text-primary)' }}>PortDaddy();</span>

<span style={{ color: 'var(--code-comment)' }}>// Create a harbor</span>
<span style={{ color: 'var(--code-keyword)' }}>await</span> <span style={{ color: 'var(--text-primary)' }}>pd.createHarbor({'{'}</span>
  name:</span> <span style={{ color: 'var(--code-string)' }}>'myapp:security-review'</span><span style={{ color: 'var(--text-primary)' }}>,
  capabilities: [</span><span style={{ color: 'var(--code-string)' }}>'code:read'</span><span style={{ color: 'var(--text-primary)' }}>,</span> <span style={{ color: 'var(--code-string)' }}>'notes:write'</span><span style={{ color: 'var(--text-primary)' }}>,</span> <span style={{ color: 'var(--code-string)' }}>'locks:acquire'</span><span style={{ color: 'var(--text-primary)' }}>],
{'}'});</span>

<span style={{ color: 'var(--code-comment)' }}>// Issue a capability token</span>
<span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>token =</span> <span style={{ color: 'var(--code-keyword)' }}>await</span> <span style={{ color: 'var(--text-primary)' }}>pd.issueHarborToken({'{'}</span>
  harbor:</span> <span style={{ color: 'var(--code-string)' }}>'myapp:security-review'</span><span style={{ color: 'var(--text-primary)' }}>,
  forAgent:</span> <span style={{ color: 'var(--code-string)' }}>'myapp:reviewer'</span><span style={{ color: 'var(--text-primary)' }}>,
  ttl:</span> <span style={{ color: 'var(--code-string)' }}>'2h'</span><span style={{ color: 'var(--text-primary)' }}>,
{'}'});</span>

<span style={{ color: 'var(--code-comment)' }}>// The spawned agent receives the token and is automatically scoped</span>
<span style={{ color: 'var(--code-keyword)' }}>const</span> <span style={{ color: 'var(--text-primary)' }}>agent =</span> <span style={{ color: 'var(--code-keyword)' }}>await</span> <span style={{ color: 'var(--text-primary)' }}>pd.spawn({'{'}</span>
  backend:</span> <span style={{ color: 'var(--code-string)' }}>'claude'</span><span style={{ color: 'var(--text-primary)' }}>,
  model:</span> <span style={{ color: 'var(--code-string)' }}>'claude-haiku-4-5'</span><span style={{ color: 'var(--text-primary)' }}>,
  identity:</span> <span style={{ color: 'var(--code-string)' }}>'myapp:reviewer'</span><span style={{ color: 'var(--text-primary)' }}>,
  harborToken: token,
  prompt:</span> <span style={{ color: 'var(--code-string)' }}>'Review src/auth.ts for security vulnerabilities'</span><span style={{ color: 'var(--text-primary)' }}>,
{'}'});</span>

<span style={{ color: 'var(--code-keyword)' }}>await</span> <span style={{ color: 'var(--text-primary)' }}>agent.wait();</span></code></pre>

    </TutorialLayout>
  )
}
