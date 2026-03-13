export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  content: string;
  tags: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 'formal-verification-anchor-v3',
    slug: 'formal-verification-anchor-protocol',
    title: 'Formal Verification of the Anchor Protocol: Proving Security in the Wild West of Agents',
    date: '2026-03-12',
    author: 'Port Daddy Engineering',
    excerpt: 'How we used ProVerif to mathematically prove the secrecy and authentication properties of our new multi-hop identity protocol.',
    tags: ['Security', 'Formal Methods', 'ProVerif', 'Anchor Protocol'],
    content: `
# Formal Verification of the Anchor Protocol: Proving Security in the Wild West of AI Agents

**Meta Description:** Discover how Port Daddy uses ProVerif to mathematically prove the security of the Anchor Protocol, ensuring safe identity and delegation in multi-agent swarms.

---

Ever spent hours debugging a multi-agent swarm only to find that a "zombie" process was squatting on a port and intercepting your messages? In the decentralized "Wild West" of local agentic coordination, identity is often the first casualty. Traditional testing is great for finding bugs, but it can't prove that a protocol is fundamentally sound against a malicious adversary.

Today, we are excited to share the results of the formal verification of the **Anchor Protocol** (v3.7.0). Using **ProVerif**, we have mathematically proven that our identity framework is immune to impersonation, algorithm confusion, and unauthorized delegation.

In this post, you'll learn:
- How **Symbolic Analysis** transforms security audits into mathematical proofs.
- Why **Algorithm Pinning** is the only way to kill JWT-switching attacks (CVE-2026-22817) for good.
- How to verify complex **Multi-hop Delegation Chains** using ProVerif.

---

## ⚓ Section 1: The Anchor Handshake

The Anchor Protocol manages the lifecycle of a "Harbor Card"—a cryptographically signed identity token that proves an agent's authority within a specific namespace.

### The Problem: Bearer Token Fragility
Standard Bearer tokens ([RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750)) are easily stolen. If an attacker intercepts a token, they become the agent. Our goal was to ensure that even if the attacker controls the network channel (the "Dolev-Yao" adversary model), they cannot forge new tokens or escalate their privileges.

### The Mermaid Model: Anchor Flow
\`\`\`mermaid
sequenceDiagram
    participant A as Agent
    participant D as Daemon (Root of Trust)
    participant H as Harbor (Verifier)
    
    Note over A,D: Phase 1: Issuance
    A->>D: Request Identity (AgentID, HarborID)
    D->>D: Generate JTI & Store in DB
    D->>A: Harbor Card (JWT signed via Ed25519)
    
    Note over A,H: Phase 2: Verification
    A->>H: Present Card
    H->>H: Pin Alg: EdDSA (Ignore 'alg' header)
    H->>H: Verify Signature & Expiry
    H->>A: Access Granted
\`\`\`

**Key Takeaway:**
By using **Symbolic Analysis**, we treat cryptography as a set of formal algebraic rules. We ask the prover: *"Is there any possible world where H accepts a token that D never issued?"* If the answer is no, the protocol is sound.

---

## 🔐 Section 2: Defending Against Algorithm Confusion

A common pitfall in JWT implementations is trusting the \`alg\` header. If your verifier sees \`{ "alg": "none" }\`, it might skip verification. This is the root cause of **CVE-2026-22817**.

### The Defense: Strict Algorithmic Pinning
Our implementation in [\`lib/harbor-tokens.ts\`](https://github.com/erichowens/port-daddy/blob/main/lib/harbor-tokens.ts) explicitly ignores the header and pins the algorithm to **HS256** (Phase 1) or **EdDSA** (Phase 2).

**ProVerif Model Snippet:**
\`\`\`proverif
(* A flawed "generic" verifier that trusts the header (vulnerable) *)
reduc forall m: bitstring, k: key; verify_generic(m, hs256_alg, hs256(m, k), k) = true;
      forall m: bitstring, k: key; verify_generic(m, none_alg, m, k) = true.

(* The SECURE Harbor (Port Daddy) - It PINNS to HS256 and ignores the header *)
let SecureHarbor(k: key) =
  in(c, (alg_header: alg_type, msg: bitstring, signature: bitstring));
  if check_hs256(msg, k, signature) = true then
    event Accepted().
\`\`\`

**Verification Result:** ProVerif proves that the \`Accepted\` event is unreachable for an attacker using the \`none\` algorithm, even if the verifier supports multiple algorithms internally.

---

## ⛓️ Section 3: Advanced Multi-hop Delegation

The heart of Port Daddy v4 is **Agent-to-Agent (A2A) Delegation**. This allows Agent A to delegate a *restricted subset* of its capabilities to Agent B without involving the Daemon for every hop. This is inspired by the design of **Biscuits** ([biscuitsec.org](https://www.biscuitsec.org/)) and **Macaroons** ([Google Research](https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/)).

### The Delegation Chain
\`\`\`mermaid
graph LR
    D[Daemon] -- signs --> A[Agent A]
    A -- delegates subset --> B[Agent B]
    B -- delegates subset --> C[Agent C]
    C -- presents chain --> H[Harbor]
    H -- verifies D -> A -> B -> C --> Result[OK]
\`\`\`

### Proven Properties:
1.  **Transitive Trust:** The Harbor can verify the entire chain back to the Daemon.
2.  **Capability Attenuation:** Agent B cannot have more permissions than Agent A.
3.  **Integrity:** An attacker cannot inject themselves into the middle of the chain.

The ProVerif query we proved:
\`\`\`proverif
query b: id, cap: capability, a: id;
  event(Accepted(b, harbor_id, cap)) ==> 
    (event(IssuedRoot(a, harbor_id, cap)) && event(Delegated(a, b, cap)))
    || event(IssuedRoot(b, harbor_id, cap)).
\`\`\`
**Result: TRUE.** The chain is mathematically secure.

---

## 📊 Summary of Findings

| Property | Phase | Result | Citation |
| :--- | :--- | :--- | :--- |
| **Secrecy of Master Keys** | v1/v2 | **PROVEN** | [RFC 8032](https://datatracker.ietf.org/doc/html/rfc8032) |
| **Strong Authentication** | v1/v2/v3 | **PROVEN** | [Anchor-FV-2026] |
| **Capability Attenuation** | v3 | **PROVEN** | [arXiv:2602.11865](https://arxiv.org/abs/2602.11865) |
| **Alg-Switching Protection** | v1 | **PROVEN** | [CVE-2026-22817] |

---

## 🛠️ Complete Implementation Example

You can run our simplified Phase 2 (Asymmetric) verification model today.

\`\`\`proverif
(* Port Daddy: Harbor Card v2 (Asymmetric) *)
type skey. type pkey.
fun pk(skey): pkey.
fun sign(bitstring, skey): bitstring.
reduc forall m: bitstring, k: skey; check_sign(m, pk(k), sign(m, k)) = true.

free master_sk: skey [private].
query attacker(master_sk).

process
  new msg: bitstring;
  out(c, pk(master_sk));
  out(c, (msg, sign(msg, master_sk)))
\`\`\`

---

## 🏁 Conclusion

By combining **Formal Verification** with a modern developer experience, Port Daddy is moving identity from "hope-based security" to "math-based security." The Anchor Protocol ensures that your agents are exactly who they say they are, even in the most chaotic P2P environments.

**Call to Action:**
- Read the full [Formal Verification Report](https://github.com/erichowens/port-daddy/blob/main/docs/reports/FORMAL_VERIFICATION_ANCHOR_V3.md).
- Run the models yourself in the [\`/analyses\`](https://github.com/erichowens/port-daddy/tree/main/analyses) directory.
- Join our [GitHub Discussions](https://github.com/erichowens/port-daddy/discussions) to talk about the v4 roadmap.

---

### References & Further Reading
1.  **Blanchet, B.** (2016). *ProVerif: An Automatic Security Protocol Verifier*. [Inria](https://proverif.inria.fr/).
2.  **Kobeissi, N., et al.** (2017). *A Formal Analysis of the Signal Messaging Protocol*.
3.  **RFC 8032**: *Edwards-Curve Digital Signature Algorithm (EdDSA)*. [IETF](https://datatracker.ietf.org/doc/html/rfc8032).
4.  **Google Research**: *Macaroons: Cookies with Contextual Caveats*.
5.  **arXiv:2509.13597**: *Agentic JWT: A Standard for Multi-Agent Identity*.
    `
  }
];
