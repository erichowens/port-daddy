# Port Daddy Roadmap & Future Ideas

This document captures the ambitious, industry-defining vision for Port Daddy as the definitive "Agentic OS" Control Plane. It outlines "things for later" and serves as a living synthesis of conceptual ideas.

## Core Philosophical Architecture

- **Data Structures for Swarms:** Avoid monolithic, mistake-prone trees for writing overlapping diffs. Instead, lean into *event-sourcing* and *pub/sub messaging*. Agents communicate intentions, acquire distributed locks for exclusive resources, and rely on Git (via `lib/worktree.ts`) as the ultimate concurrent data store. 
- **The "Shared Whiteboard" & Memory:** Rather than a giant key/value store, use a **Shared Neural Memory** (like an embedding-backed contextual ledger) and a semantic **Whiteboard** (via `SessionNotes`) for high-level state handoffs.
- **Values & Policy Models:** As swarms grow, a shared RL-style value model ensures agents align on quality (e.g., "is this code idiomatic?") while policy models guide immediate actions.

## 1. Network & Naming (The Local DNS Revolution)

- **Abstracting Port Numbers:** The dashboard and daemon should be accessible via `.local` addresses (e.g., `dashboard.pd.local`, `api.pd.local`) instead of numeric ports.
- **Harbor Addresses:** "Do harbors have addresses?" Yes! In V4, Remote Harbors will be addressable via the Anchor Protocol (Lighthouses). Locally, they should bind to subdomains (e.g., `harbor1.pd.local`).
- **Implementation:** Extend `lib/dns.ts` to hook into system DNS resolvers (`/etc/resolver/pd.local` on macOS) seamlessly.
- **Local DNS Proxy:** Build a tiny, `sudo`-powered reverse proxy on port 80/443 that routes traffic based on hostnames (e.g., `dashboard.pd.local` -> `:3144`), allowing users to drop port numbers entirely.

## 2. Infrastructure & Tooling

- **VHS Automation:** Integrate Charmbracelet's `vhs` for rich, scripted GIFs and tutorials. Wire `.tape` files to GitHub Actions to regenerate visual documentation automatically whenever code changes, establishing a visual "gold set".
- **Multi-Verse Harvesting:** Create background agents to continuously scan `.claude/worktrees/` to harvest unique features and divergent timelines into the main trunk.
- **Maritime Aesthetic Revival:** Reintroduce maritime signal flags to the CLI and tools. The aesthetic should be ambitious, industry-defining, clearly CUTE and CHARMING.

## 3. Dedicated Background Agents

To sustain development, Port Daddy needs its own "crew":
- **The Cartographer:** An agent responsible for maintaining this Roadmap and scanning the horizon for new ideas.
- **The Archivist:** An agent that tends to `README.md`, `McpPage.tsx`, and the documentation hub.
- **The Shipwright:** A background agent dedicated exclusively to fixing bugs and squashing regressions.
- **The Vibe Matcher:** An agent that ensures the "purring and beautiful" Tailwind UI remains coherent.

## 4. Website vs. Local Dashboard

- **Clarification of Roles:** The dashboard is the *local* Control Plane served by the daemon (`localhost:9876` -> `pd.local`). The website (currently in `website-v2/`) is the *public-facing* marketing and documentation hub hosted on Cloudflare. We need to clearly separate their visual identities and routing to prevent confusion.

## 5. The "Wild West" & Agentic Criminality (V4 Vision)

As swarms grow beyond local machines, we need a "Code of the Sea" for agents.

- **Float Plans & Manifests:** Agents must declare a "Float Plan" (what they intend to do) and a "Manifest" (what resources they need) before entering a Harbor.
- **Agentic Escrow:** Use Port Daddy locks as escrows. Payouts (messages, file access, tokens) are released only when a "Quality Judge" agent (The Arbiter) verifies the work meets the manifest criteria.
- **Agentic Piracy:** Any deviation from the Float Plan or unauthorized resource consumption is flagged as "Piracy", leading to automatic "Brig" isolation or salvage.
- **Agent OAuth:** Cryptographic identity verification for remote agents to prevent "hailing hacks" or spoofing.
- **Ephemeral Data Harbors (FUSE):** Attach ephemeral data storage to Harbors. When a venture ends, the FUSE drive is unmounted and the data is archived or shredded based on the manifest.

## 6. Secure Networking & P2P

- **Noise Protocol Tunnels:** V4 will prioritize P2P encrypted tunnels between Harbors, allowing agents to coordinate across the global internet as if they were on the same local network.

## 7. Formal Verification & Cryptographic Soundness

As Port Daddy evolves to support Agentic Escrows and secure P2P Harbors (V4), we must mathematically prove our security models. Relying purely on unit tests is insufficient for adversarial multi-agent networks.

### Proof of Protocol (The Design)
- **Tooling:** Use **ProVerif** or **Tamarin Prover** to formally verify the Port Daddy Anchor Protocol (the P2P handshake and JWT Harbor Card exchange).
- **Goal:** Mathematically prove that the protocol prevents man-in-the-middle (MITM) attacks, token replay, and unauthorized Harbor ingress.
- **Why?** Remote agents (especially untrusted ones) will attempt to forge identity tokens. We must prove our HS256/Asymmetric JWT rotation scheme is fundamentally sound.

### Proof of Implementation (The Code)
- **Tooling:** Explore **F*** (F-star) or **Dafny** for verifying critical cryptographic pathways (e.g., the JWT signing and validation logic).
- **Goal:** Prove memory safety, absence of timing side-channels, and strict algorithmic pinning (e.g., preventing CVE-2026-22817 style algorithm confusion attacks) in the compiled artifact.
- **Why?** A sound protocol can still be ruined by a flawed implementation.
