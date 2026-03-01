# Share Your Local Dev Server in 30 Seconds

It's Wednesday at 4:45pm. Your client calls: "Can you show me the checkout flow? I need to approve it before tomorrow's demo."

In the old world:
1. Deploy to staging (10 minutes)
2. Wait for CI/CD (5 minutes)
3. Test on staging (3 minutes)
4. Find bugs in staging (15 minutes)
5. Feel frustrated that you already fixed them locally

In the Port Daddy world:
```bash
pd tunnel start myapp:web
# Public URL: https://myapp-web-12345.ngrok.io
```

Share that URL with your client. They see your latest code running locally on your machine. No deployment. No staging environment. No waiting.

This is the power of tunneling: **Your local dev server becomes globally accessible.**

## Why You Need Tunnels

### Use Case 1: Client/Stakeholder Review

Your boss asks: "Can I see the new design?"

```bash
pd tunnel start myapp:frontend
# Share the URL in Slack
# They see it live, click around, provide feedback
# You iterate in real-time
```

### Use Case 2: Webhook Testing

Your API needs to receive webhooks from Stripe, GitHub, or Twilio. They can't send to `localhost:3000` (they need a public IP).

```bash
pd tunnel start myapp:api
# Register the tunnel URL with Stripe: https://myapp-api-xxxx.ngrok.io/webhooks/stripe
# Webhooks now go directly to your laptop
# You see the exact payload, debug in real-time
```

### Use Case 3: Mobile Testing

You're building for iOS. Need to test against your local API.

```bash
pd tunnel start myapp:api
# On your iPhone, hit https://myapp-api-xxxx.ngrok.io/health
# Works perfectly
```

### Use Case 4: Cross-Device Testing

Design team on another Mac? Share your UI without deploying:

```bash
pd tunnel start myapp:frontend
# Share the URL with design team
# They see responsive design, animations, everything
# On their machine, in their browser
```

### Use Case 5: CI/CD Integration Testing

Your CI pipeline needs to test against your API:

```bash
# Local dev
pd claim myapp:api
pd tunnel start myapp:api
# Pass https://myapp-api-xxxx.ngrok.io to CI pipeline
# CI can now POST to your local API for integration tests
```

## How It Works

Port Daddy automatically detects which tunnel provider you have installed and uses it:

- **ngrok** (most popular)
- **cloudflared** (Cloudflare Tunnel, free for personal use)
- **localtunnel** (simple, lightweight)

Check which providers you have:

```bash
pd tunnel providers
# Available tunnel providers:
# ✅ ngrok
# ⚠️  cloudflared (not installed)
# ❌ localtunnel (not installed)
```

## Installing a Tunnel Provider

### ngrok (Recommended)

```bash
# Homebrew
brew install ngrok

# Then create a free account and authenticate
ngrok config add-authtoken YOUR_TOKEN
# (from https://dashboard.ngrok.com/auth/your-authtoken)
```

ngrok gives you stable subdomains on the free tier and advanced features on paid plans.

### cloudflared

```bash
# Homebrew
brew install cloudflare/cloudflare/cloudflared

# No auth needed for personal use
cloudflared --version
```

Cloudflared is free and unlimited, but subdomains are randomized each tunnel.

### localtunnel

```bash
# npm
npm install -g localtunnel

# No auth needed
lt --version
```

Lightweight and simple, but less reliable than ngrok or cloudflared.

## Starting a Tunnel

First, claim a port for your service:

```bash
PORT=$(pd claim myapp:frontend -q)
npm run dev -- --port $PORT
```

Then, in another terminal, start the tunnel:

```bash
pd tunnel start myapp:frontend
# ✅ Tunnel started (ngrok)
# 🌐 Public URL: https://myapp-frontend-k8h9.ngrok.io
# 🔗 Local: http://localhost:3100
```

That URL is now live on the internet. Anyone can access it.

### Tunnel Status

```bash
# Check tunnel status
pd tunnel status myapp:frontend
# Status: active
# Provider: ngrok
# Local: http://localhost:3100
# Public: https://myapp-frontend-k8h9.ngrok.io
# Traffic: 12 requests, 2.3 MB

# List all active tunnels
pd tunnel list
# myapp:frontend -> https://myapp-frontend-k8h9.ngrok.io
# myapp:api -> https://myapp-api-j7x2.ngrok.io
```

### Stopping a Tunnel

```bash
pd tunnel stop myapp:frontend
# ✅ Tunnel stopped, URL is dead
```

## Real Scenarios

### Scenario 1: Show Work to Client at 11pm

```bash
# You've been working for 8 hours, it's 11pm
# Client sees the design in staging, wants to see YOUR changes

pd claim myapp:web
npm run dev
# In another terminal:
pd tunnel start myapp:web

# Share tunnel URL in Slack
# Client clicks it, sees your work
# "Love it! Ship it."

# Next morning, your code is already done and reviewed
```

### Scenario 2: Webhook Debugging

You're integrating Stripe payments. Stripe needs to send webhooks back to your server:

```bash
# Start your API locally
PORT=$(pd claim myapp:api -q)
npm run dev -- --port $PORT

# Start tunnel
pd tunnel start myapp:api
# Public URL: https://myapp-api-abc.ngrok.io

# Register webhook with Stripe:
# https://myapp-api-abc.ngrok.io/webhooks/stripe

# Now in your code, test webhook:
curl -X POST https://myapp-api-abc.ngrok.io/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"event":"charge.succeeded","amount":1999}'

# Your local terminal shows:
# [10:47:23] POST /webhooks/stripe
# [10:47:23] Event: charge.succeeded
# [10:47:23] Amount: $19.99
# [10:47:23] Debug: processing...
```

### Scenario 3: Mobile Testing

```bash
# Start frontend locally
pd claim myapp:frontend
npm run dev

# Start tunnel
pd tunnel start myapp:frontend
# Public URL: https://myapp-web-abc.ngrok.io

# On your phone (same WiFi or any network):
# Open browser, go to https://myapp-web-abc.ngrok.io
# See responsive design in real-time
# Click buttons, scroll, test interactions
# Any changes you make locally appear instantly
```

### Scenario 4: Cross-Team Integration

Frontend team and backend team in different offices:

```bash
# Backend team
pd claim myapp:api
npm run dev

pd tunnel start myapp:api
# Share: https://myapp-api-xyz.ngrok.io

# Frontend team
# In their code:
const API_URL = process.env.API_URL || 'https://myapp-api-xyz.ngrok.io';
fetch(`${API_URL}/health`);

# Works! They can test without deploying your backend
```

## JavaScript SDK Integration

Programmatically start and manage tunnels:

```javascript
import { PortDaddy } from 'port-daddy/client';

const pd = new PortDaddy();

// Start a tunnel
const tunnel = await pd.startTunnel('myapp:api', {
  provider: 'ngrok', // or 'cloudflared', 'localtunnel'
});

console.log('Public URL:', tunnel.publicUrl);
// Output: Public URL: https://myapp-api-xxxx.ngrok.io

// Get tunnel status
const status = await pd.getTunnelStatus('myapp:api');
console.log('Traffic:', status.traffic);

// Stop tunnel
await pd.stopTunnel('myapp:api');
```

Full CI/CD integration example:

```javascript
import { PortDaddy } from 'port-daddy/client';
import { spawn } from 'child_process';

const pd = new PortDaddy();

async function testWithLocalTunnel() {
  // Start API locally
  const port = await pd.claim('myapp:api');
  const server = spawn('npm', ['run', 'dev'], {
    env: { ...process.env, PORT: port.port },
  });

  // Wait for API to be healthy
  await pd.wait('myapp:api');

  // Start tunnel to share with CI
  const tunnel = await pd.startTunnel('myapp:api');
  console.log('API accessible at:', tunnel.publicUrl);

  // Pass tunnel URL to integration tests
  process.env.API_URL = tunnel.publicUrl;
  const tests = spawn('npm', ['run', 'test:integration']);

  tests.on('exit', async (code) => {
    // Cleanup
    await pd.stopTunnel('myapp:api');
    await pd.release('myapp:api');
    server.kill();
    process.exit(code);
  });
}

testWithLocalTunnel().catch(console.error);
```

## Security Considerations

### URLs Are Public

Anyone with the tunnel URL can access your API. Be careful what you expose:

```bash
# Dangerous: exposing a real database
pd tunnel start myapp:api
# Now https://myapp-api-xxxx.ngrok.io/admin is live

# Better: use authentication
# Add API key requirement to tunnel endpoints
# Or use ngrok's built-in auth module
```

### Credential Handling

Don't commit tunnel URLs or credentials:

```javascript
// Bad: hardcoding a tunnel URL
const API_URL = 'https://myapp-api-k8h9.ngrok.io';

// Good: use environment variables
const API_URL = process.env.API_URL || 'http://localhost:3100';

// In CI:
export API_URL=https://myapp-api-k8h9.ngrok.io
npm run test
```

### Tunnel Logs

ngrok shows all traffic on its dashboard. Don't tunnel sensitive data you wouldn't log anyway:

```bash
# View ngrok traffic
ngrok config edit
# (Opens dashboard at localhost:4040)
```

### Rate Limiting

Free ngrok has rate limits. Production traffic will exceed them. For long-lived needs, use a paid plan or cloudflared.

## Tunnel Configuration

Advanced options:

```bash
# Use a specific provider
pd tunnel start myapp:api --provider cloudflared

# Request a region (ngrok paid feature)
pd tunnel start myapp:api --region us-west

# Use a reserved subdomain (ngrok paid feature)
pd tunnel start myapp:api --subdomain myapp-api
```

In code:

```javascript
await pd.startTunnel('myapp:api', {
  provider: 'ngrok',
  region: 'us-west',
  subdomain: 'myapp-api', // requires ngrok paid plan
});
```

## Troubleshooting

### "Tunnel won't start"

Check your provider installation:

```bash
pd tunnel providers
# If ngrok shows ❌, install it:
brew install ngrok
ngrok config add-authtoken YOUR_TOKEN
```

### "Public URL shows 502 Bad Gateway"

Your local service isn't responding. Check:

```bash
# Is your service running?
pd health myapp:api
# Status: ✅ healthy (200 OK)

# Is the port correct?
curl http://localhost:3100
# Should return your app, not "connection refused"
```

### "Tunnel works but webhooks don't arrive"

Verify the URL is correct:

```bash
curl https://myapp-api-xxxx.ngrok.io/health
# Should return success

# Check ngrok logs
ngrok config edit  # Opens localhost:4040
```

## What's Next

You've learned how to share your local dev server. Now explore:

1. **[Debugging](05-debugging-with-port-daddy.md)** — Use tunnel logs for forensic debugging
2. **[Monorepo Mastery](04-monorepo-mastery.md)** — Tunneling multiple services at once
3. **[Multi-Agent Orchestration](02-multi-agent-orchestration.md)** — Agents sharing tunneled services

The magic: Your laptop becomes as accessible as a cloud server, instantly, with zero deployment friction.
