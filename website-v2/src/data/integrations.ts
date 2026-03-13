export interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: 'official' | 'community' | 'preview';
  details: string[];
  setupCode: string;
  category: 'LLM' | 'Framework' | 'IDE' | 'Infrastructure';
}

export const INTEGRATIONS: Integration[] = [
  {
    id: 'gemini-cli',
    name: 'Gemini CLI Extension',
    description: 'A native extension for Gemini that teaches the model how to manage its own harbors and ports.',
    logo: 'google',
    status: 'official',
    category: 'LLM',
    details: [
      'Built-in "Agent Skill" that injects the Port Daddy CLI manual into the model context.',
      'Native tools for pd claim, pd harbor, and pd activity directly in the chat.',
      'Self-healing automation: Gemini can automatically call pd salvage when it detects a failed sub-agent.'
    ],
    setupCode: `pd extension install gemini\n# Gemini now understands its harbor environment.`
  },
  {
    id: 'claude-skill',
    name: 'Claude Agent Skill',
    description: 'The definitive toolset for Claude agents to coordinate in high-fidelity war rooms.',
    logo: 'anthropic',
    status: 'official',
    category: 'LLM',
    details: [
      'Deep MCP (Model Context Protocol) integration for token-efficient coordination.',
      'Progressive disclosure: Claude only sees the essential tools until pd_discover() is called.',
      'Audit log injection: Claude can read the append-only SQLite log to understand swarm history.'
    ],
    setupCode: `pd mcp install\n# Claude code is now harbor-aware.`
  },
  {
    id: 'langgraph',
    name: 'LangGraph',
    description: 'Use Port Daddy locks and signals to coordinate multi-graph state transitions.',
    logo: 'langchain',
    status: 'official',
    category: 'Framework',
    details: [
      'Atomic locks prevent multiple LangGraph instances from writing to the same checkpoint store.',
      'Broadcast graph state changes to the swarm via the Pub/Sub Radio.',
      'Visualize graph execution steps in the Unified Timeline.'
    ],
    setupCode: `from port_daddy import PortDaddy\npd = PortDaddy()\n\nwith pd.lock("langgraph:checkpointer"):\n    # Run your LangGraph swarm safely\n    graph.invoke(inputs)`
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    description: 'Wrap CrewAI tasks in Port Daddy sessions for time-travel debugging and salvage.',
    logo: 'crewai',
    status: 'preview',
    category: 'Framework',
    details: [
      'Map CrewAI tasks to Port Daddy Sessions for deep auditing.',
      'Interleave CrewAI logs with system-level port and network events.',
      'Recover task state using the Correlation Engine after agent failure.'
    ],
    setupCode: `crew = Crew(agents=[...], tasks=[...])\nwith pd.session("Crew Research Task"):\n    crew.kickoff()`
  },
  {
    id: 'vscode',
    name: 'VS Code Extension',
    description: 'Visualize your harbor and manage port claims directly from your IDE sidebar.',
    logo: 'vscode',
    status: 'community',
    category: 'IDE',
    details: [
      'Real-time HUD integration in the VS Code sidebar.',
      'Visual indicator for port conflicts and service health.',
      'Click-to-terminal: Open an agent session directly from the GUI.'
    ],
    setupCode: `code --install-extension erichowens.port-daddy`
  }
];
