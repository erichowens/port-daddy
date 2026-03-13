export interface Blueprint {
  id: string;
  title: string;
  description: string;
  hero: string;
  templatePath: string;
}

export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'ai-ci-pipeline',
    title: 'Autonomous CI/CD',
    description: 'A self-healing build pipeline that spawns Debugger agents on test failure.',
    hero: 'pipeline',
    templatePath: 'templates/ai-ci-pipeline',
  },
  {
    id: 'swarm-researcher',
    title: 'Deep Research Swarm',
    description: 'Coordinated web scraping and synthesis using distributed locks and inboxes.',
    hero: 'research',
    templatePath: 'templates/swarm-researcher',
  },
  {
    id: 'multiplayer-dev-env',
    title: 'Multiplayer Localhost',
    description: 'Link multiple developers laptops into a single shared service mesh via Lighthouses.',
    hero: 'multiplayer',
    templatePath: 'templates/multiplayer-dev-env',
  },
  {
    id: 'event-driven-ops',
    title: 'Autonomous SRE',
    description: 'An operations swarm that responds to production incidents via webhooks and auto-rollbacks.',
    hero: 'ops',
    templatePath: 'templates/event-driven-ops',
  }
];
