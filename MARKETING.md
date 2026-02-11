# Port Daddy - Marketing Materials

## Tagline

**"Stop fighting over ports. Start shipping faster."**

## Hero Copy (Website Above-the-Fold)

### Headline
**Port Daddy: Zero-Conflict Port Assignment for Developers**

### Subheadline
The authoritative port manager for multi-agent development. One command, one port, infinite projects.

### CTA Button
**Get Started →** (links to installation)

### Hero Features (3 columns)
- ⚡ **Atomic Assignment** - No race conditions, ever
- 🔄 **Auto-Cleanup** - Process tracking removes stale ports
- 🌍 **Universal** - Works with any framework, any AI agent

---

## Problem-Solution Framework

### The Pain
**Before Port Daddy:**
```
❌ Port 3000 already in use
❌ Manually track which project uses what
❌ 5+ Claude rounds negotiating ports
❌ Forgotten cleanup → port chaos
❌ Multiple agents → race conditions
```

### The Relief
**After Port Daddy:**
```
✅ PORT=$(get-port my-app) && npm run dev
✅ Automatic port assignment in <10ms
✅ Process dies → port freed automatically
✅ Works across Claude, Cursor, Aider, Cody
✅ Same project → same port, always
```

---

## Value Propositions

### For Solo Developers
**"Finally, localhost that just works"**

Juggling 5+ projects at once? Port Daddy assigns ports automatically and cleans up after you. No more `lsof -i :3000 | grep LISTEN` commands.

### For Multi-Agent Users
**"Your AI agents, coordinated"**

Running Claude + Cursor + Aider simultaneously? Port Daddy provides atomic port assignment across all sessions. Zero conflicts, zero wasted tokens.

### For Teams
**"Standardize port management across your team"**

One daemon, one protocol, every developer's machine. Stop Slack messages about "what port is staging running on?"

---

## Key Messages

### Message 1: Simplicity
**"Three commands. Infinite projects."**
- `get-port` → Request a port
- `release-port` → Free a port
- `list-ports` → See what's running

That's the entire API. No config files, no yaml, no setup scripts.

### Message 2: Intelligence
**"It knows when processes die"**

Port Daddy tracks PIDs. When your dev server crashes, it automatically frees the port. No manual cleanup, ever.

### Message 3: Universality
**"Works with everything"**

Next.js, Flask, Rails, Go, Rust, Phoenix, Spring Boot—if it runs on localhost, Port Daddy manages it.

---

## Social Media Copy

### Twitter/X Thread

**Tweet 1:**
Tired of "port 3000 already in use" errors?

Port Daddy: authoritative port assignment for developers.

One command → zero conflicts → infinite projects.

[GitHub link] 🧵

**Tweet 2:**
How it works:

Before starting ANY dev server:
```
PORT=$(get-port my-project)
npm run dev -- --port $PORT
```

Port Daddy assigns ports atomically (SQLite), tracks processes, and cleans up automatically.

**Tweet 3:**
Perfect for multi-agent development:

• Claude session → port 3100
• Cursor session → port 3101
• Aider session → port 3102

All coordinated automatically. Zero race conditions.

**Tweet 4:**
Benefits:
⚡ <10ms port assignment
🔄 Auto-cleanup dead processes
🎯 Same project → same port
🌍 Works with 20+ frameworks
🤖 AI agent coordination

Install: [link]

### LinkedIn Post

**Headline:**
We built Port Daddy to solve a simple problem: port conflicts in multi-agent development.

**Body:**
When you're running Claude, Cursor, and Aider simultaneously across 10+ projects, manual port coordination breaks down fast.

Port Daddy provides atomic port assignment via a background service. Request a port → get a port → ship your feature. No conflicts, no negotiation, no wasted agent tokens.

Key features:
• Atomic assignment (SQLite transactions)
• Process tracking (auto-cleanup)
• Universal (Next.js to Spring Boot)
• Open source

Built for developers who ship fast.

[GitHub link]

### Hacker News Post

**Title:**
Port Daddy – Atomic port assignment for localhost development

**Submission Text:**
I built Port Daddy after wasting too many Claude sessions negotiating port conflicts.

It's a simple background service (Express + SQLite) that assigns ports atomically and tracks PIDs for automatic cleanup. Works with any framework, any language, any AI coding agent.

Three commands: `get-port`, `release-port`, `list-ports`.

Perfect for multi-agent workflows (Claude + Cursor + Aider) or just juggling lots of localhost projects.

Would love feedback from the HN community.

### Reddit r/programming Post

**Title:**
[Project] Port Daddy - Stop fighting over localhost ports

**Body:**
Hey r/programming,

I got tired of manually coordinating ports across multiple dev projects, especially when using AI coding agents like Claude and Cursor simultaneously.

Built Port Daddy: a background service that assigns ports atomically and auto-cleans up dead processes.

**Usage:**
```bash
PORT=$(get-port my-app) && npm run dev -- --port $PORT
```

**Features:**
- Atomic assignment (no race conditions)
- Process tracking (PIDs monitored, stale ports freed)
- Universal (Next.js, Flask, Rails, Go, Rust, etc.)
- ~40MB memory, <10ms latency
- Works with git worktrees

GitHub: [link]

Feedback welcome!

---

## Website Landing Page Structure

### Hero Section
- **Headline:** Port Daddy: Zero-Conflict Port Assignment
- **Subheadline:** Stop fighting over ports. Start shipping faster.
- **CTA:** Get Started | View Demo
- **Hero Image:** Terminal window showing clean port assignment
- **Trust Signal:** "Used by developers running 20+ concurrent projects"

### Problem Section
- **Headline:** The Localhost Port Problem
- **Visual:** Split screen Before/After
  - Before: Red error messages, manual coordination, stale assignments
  - After: Green success, automatic assignment, clean state

### Solution Section
- **Headline:** How Port Daddy Works
- **Architecture Diagram:**
  ```
  Your Project → Port Daddy (9876) → SQLite → Assigned Port
  ```
- **Key Points:**
  - Atomic assignment (no race conditions)
  - Process tracking (auto-cleanup)
  - Project persistence (same port for same project)

### Features Grid
**4x2 Grid:**
1. ⚡ **Atomic Assignment** - SQLite ACID transactions
2. 🔄 **Auto-Cleanup** - Monitors PIDs, frees dead ports
3. 🎯 **Persistence** - Same project, same port
4. 🌍 **Universal** - Any framework, any language
5. 🤖 **AI Agent Ready** - Claude, Cursor, Aider coordination
6. 🚀 **Zero Config** - One daemon, three commands
7. 📊 **Lightweight** - 40MB RAM, <10ms latency
8. 🔒 **Secure** - Localhost only, no remote access

### Framework Support Section
- **Headline:** Works With Everything You Build
- **Logo Grid:** Next.js, React, Vue, Flask, Django, Rails, Go, Rust, Phoenix, Spring Boot, .NET, etc.
- **Code Examples:** Tabbed interface showing integration code

### Use Cases Section
**Three columns:**

1. **Solo Developer**
   - "Juggle 10+ projects effortlessly"
   - Automatic port assignment
   - Never think about ports again

2. **Multi-Agent User**
   - "Coordinate Claude + Cursor + Aider"
   - Zero race conditions
   - Token-efficient development

3. **Team Standardization**
   - "One daemon, every machine"
   - Consistent port management
   - Reduced team friction

### Testimonials Section
*(To be collected)*

### Pricing/Availability
**Free & Open Source**
- MIT License
- Self-hosted (runs on your machine)
- No cloud dependencies
- No usage limits

### Installation Section
- **Step 1:** Download or clone
- **Step 2:** Run installer
- **Step 3:** Start using

### FAQ Section
**Q: Does this work on Windows?**
A: Currently macOS/Linux. Windows support via WSL or native port coming soon.

**Q: What if Port Daddy goes down?**
A: It's a local daemon with auto-restart via launchd/systemd. Uptime is excellent.

**Q: Can I use this with Docker?**
A: Yes! Use environment variables to pass ports to containers.

**Q: How do I uninstall?**
A: `node install-daemon.js uninstall` - clean removal, no traces.

**Q: Is this better than just using different ports manually?**
A: Manual coordination breaks down at scale, especially with multiple agents. Port Daddy is atomic and automatic.

### CTA Footer
- **Headline:** Ready to stop fighting over ports?
- **CTA Button:** Install Port Daddy →
- **Secondary CTA:** View GitHub | Read Docs
- **Social Proof:** GitHub stars, npm downloads (when available)

---

## Email Drip Campaign (for mailing list)

### Email 1: Welcome (Day 0)
**Subject:** Welcome to Port Daddy - Here's How to Get Started

**Body:**
Thanks for installing Port Daddy!

Here's what you need to know:

**The Basics:**
```bash
PORT=$(get-port my-app) && npm run dev -- --port $PORT
```

That's it. Port Daddy assigns ports automatically and cleans up dead processes.

**Quick Tips:**
1. Same project always gets same port (if available)
2. `list-ports` shows what's running
3. Works across all AI coding agents

Questions? Hit reply.

Happy coding,
Erich

### Email 2: Power User Tips (Day 3)
**Subject:** 3 Port Daddy tricks you probably didn't know

**Body:**
Hey,

You've been using Port Daddy for a few days. Here are some power user tips:

**1. Request Specific Ports**
```bash
get-port my-app 3221  # Tries to assign 3221
```

**2. Git Worktrees**
Each worktree gets its own port automatically:
```bash
cd worktree-feature-a && PORT=$(get-port feature-a) && npm run dev
cd worktree-feature-b && PORT=$(get-port feature-b) && npm run dev
```

**3. Docker Integration**
```bash
export FRONTEND_PORT=$(get-port frontend)
docker-compose up
```

Any other tricks you've discovered? Reply and share!

Erich

### Email 3: Framework Spotlight (Day 7)
**Subject:** Port Daddy + [Your Framework]

**Body:**
*(Personalized based on detected usage or generic)*

Port Daddy works great with Next.js. Here's the optimal setup:

**package.json:**
```json
{
  "scripts": {
    "dev": "PORT=$(get-port ${npm_package_name}) && next dev --port $PORT"
  }
}
```

Now `npm run dev` automatically gets a port. No conflicts, ever.

**Bonus:** This works with Vercel's local dev too!

Questions? Just reply.

Erich

---

## Product Hunt Launch Copy

### Tagline
Zero-conflict port assignment for multi-agent development

### First Comment (by creator)
Hey Product Hunt! 👋

I built Port Daddy after wasting too many Claude sessions negotiating port conflicts across multiple projects.

**What it is:**
A background service that assigns ports atomically and tracks processes for automatic cleanup.

**Why it matters:**
When you're running Claude + Cursor + Aider across 10+ projects, manual port coordination breaks down. Port Daddy provides atomic assignment via SQLite transactions—no race conditions, no forgotten cleanup.

**Three commands:**
- `get-port my-app` → Request port
- `release-port my-app` → Free port
- `list-ports` → See active assignments

**Works with:**
Next.js, Flask, Rails, Go, Rust, Phoenix, Spring Boot—any localhost dev server.

Open source, self-hosted, <40MB memory.

Would love your feedback!

### Gallery Images
1. **Hero:** Terminal showing clean port assignment
2. **Before/After:** Split screen of port conflicts vs smooth sailing
3. **Architecture:** Diagram showing how it works
4. **Multi-Agent:** Multiple terminals coordinated via Port Daddy
5. **Framework Support:** Logo grid of supported frameworks

---

## Press Kit

### Boilerplate Description
Port Daddy is an open-source port assignment service for developers. It eliminates localhost port conflicts through atomic assignment and automatic process tracking. Built for multi-agent development workflows and available on macOS and Linux.

### Key Stats
- <10ms port assignment latency
- ~40MB memory footprint
- Supports 20+ frameworks
- 3 CLI commands
- SQLite-based (ACID transactions)
- Auto-cleanup every 5 minutes

### Founder Bio
Erich Owens is a developer who got tired of port conflicts while running multiple AI coding agents simultaneously. Port Daddy was built to solve this specific pain point and has since evolved into a universal port management solution.

### Contact
- GitHub: [link]
- Email: [your email]
- Twitter: [@yourusername]

---

## App Store Question

**Q: Do I sell in app store?**

**A: No, don't sell in the Mac App Store. Here's why:**

### Reasons NOT to use Mac App Store:

1. **Developer Tools Audience**
   - Your target users are developers who are comfortable with Terminal
   - They prefer Homebrew, GitHub, or npm installs
   - App Store sandboxing would limit Port Daddy's functionality (can't track arbitrary PIDs, limited filesystem access)

2. **Installation Method**
   - Port Daddy is a daemon that runs via launchd
   - Requires terminal commands (`get-port`, `release-port`)
   - Mac App Store apps can't easily provide CLI tools in PATH
   - Developers expect `brew install` for dev tools, not App Store

3. **Pricing Model**
   - Best distributed as free/open-source with optional paid support
   - App Store takes 30% cut
   - Developer tools thrive on GitHub stars, not App Store downloads

4. **Update Cycle**
   - Homebrew allows instant updates via `brew upgrade`
   - App Store review takes days/weeks for each update
   - Bug fixes need to ship immediately for dev tools

5. **Sandboxing Limitations**
   - App Store apps are heavily sandboxed
   - Port Daddy needs to monitor arbitrary processes (`ps -p <pid>`)
   - Needs to bind to localhost:9876
   - Sandbox would break core functionality

### Better Distribution Strategies:

1. **Homebrew Formula** (primary)
   ```bash
   brew install port-daddy
   ```
   - Industry standard for dev tools
   - Easy install/update/uninstall
   - No sandboxing limitations

2. **NPM Package** (alternative)
   ```bash
   npm install -g port-daddy
   ```
   - Familiar to JS/Node developers
   - Auto-installs dependencies

3. **GitHub Releases** (manual)
   - Download tarball
   - Run install script
   - For users who want full control

4. **Docker Container** (future)
   - For users who want isolation
   - Can run on any platform

### Monetization Options (if desired):

Instead of App Store sales, consider:

1. **Open Core Model**
   - Free: Basic port assignment
   - Paid: Enterprise features (team sync, analytics dashboard, Slack integration)

2. **GitHub Sponsors**
   - Accept donations from users who find it valuable
   - No strings attached, just appreciation

3. **Support Contracts**
   - Offer paid support for teams
   - Custom integrations
   - Priority bug fixes

4. **SaaS Add-On** (overkill for now)
   - Cloud-hosted port registry for distributed teams
   - Multi-machine coordination
   - Analytics dashboard

### Recommendation:

**Ship it as open source via GitHub + Homebrew.**

- Build community through GitHub stars
- Accept contributions
- Establish credibility in dev tools space
- Monetize later if there's demand

The developer tools market rewards open source, community-driven projects far more than App Store sales.

---

## Cover Art Specifications

### Hero Image (Website Header)
- **Dimensions:** 1920x1080px (16:9)
- **Style:** Clean, modern, developer-focused
- **Elements:**
  - Terminal window showing `PORT=$(get-port my-app)`
  - Glowing port number (3100)
  - Minimalist tech aesthetic
  - Teal/blue color scheme
  - No faces, no characters
- **Format:** PNG with transparency or dark background
- **Tools:** FLUX.1-dev, Midjourney, or custom illustration

### Open Graph Image (Social Media)
- **Dimensions:** 1200x630px
- **Must Include:**
  - Port Daddy logo/wordmark
  - Tagline: "Stop fighting over ports"
  - Visual: Terminal snippet
- **Format:** PNG or JPG

### GitHub Social Preview
- **Dimensions:** 1280x640px
- **Same content as Open Graph**

### Favicon/Icon
- **Dimensions:** 512x512px
- **Simple icon:** Anchor ⚓ or port/harbor symbol
- **Works at small sizes:** 16x16, 32x32, 64x64
- **Format:** ICO or PNG

---

**Ready to ship this marketing machine?**

All copy is practical, benefit-focused, and speaks to the actual pain points developers face. No fluff, just results.
