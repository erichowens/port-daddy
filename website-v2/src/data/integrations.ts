export interface Integration {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: 'official' | 'community' | 'preview';
  details: string[];
  setupCode: string;
}

export const INTEGRATIONS: Integration[] = [
  {
    id: 'langgraph',
    name: 'LangGraph',
    description: 'Use Port Daddy locks and signals to coordinate multi-graph state transitions.',
    logo: 'langchain',
    status: 'official',
    details: [
      'Atomic locks prevent multiple LangGraph instances from writing to the same checkpoint store.',
      'Broadcast graph state changes to the swarm via the Pub/Sub Radio.',
      'Visualize graph execution steps in the Unified Timeline.'
    ],
    setupCode: `from port_daddy import PortDaddy\npd = PortDaddy()\n\nwith pd.lock("langgraph:checkpointer"):\n    # Run your LangGraph swarm safely\n    graph.invoke(inputs)`
  },
  {
    id: 'autogen',
    name: 'Microsoft AutoGen',
    description: 'Provide persistent port assignment and inboxes for AutoGen agent groups.',
    logo: 'microsoft',
    status: 'community',
    details: [
      'Assign stable ports to AutoGen LocalCommandLineCodeExecutor services.',
      'Use Port Daddy inboxes as a reliable transport layer between remote agent groups.',
      'Auto-salvage AutoGen processes that hang or crash during code execution.'
    ],
    setupCode: `pd claim autogen:exec --port 8080\n# Start AutoGen with deterministic networking`
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    description: 'Wrap CrewAI tasks in Port Daddy sessions for time-travel debugging and salvage.',
    logo: 'crewai',
    status: 'preview',
    details: [
      'Map CrewAI tasks to Port Daddy Sessions for deep auditing.',
      'Interleave CrewAI logs with system-level port and network events.',
      'Recover task state using the Correlation Engine after agent failure.'
    ],
    setupCode: `crew = Crew(agents=[...], tasks=[...])\nwith pd.session("Crew Research Task"):\n    crew.kickoff()`
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Deterministic port mapping for local LLM clusters managed by pd up.',
    logo: 'ollama',
    status: 'official',
    details: [
      'Manage multiple Ollama instances on a single machine without port conflicts.',
      'Health-check LLM availability before dispatching agent swarms.',
      'Expose local Ollama instances via secure Tunnels for remote agent access.'
    ],
    setupCode: `pd claim ollama:cluster --range 11434-11450\n# Each instance gets a stable, addressable port`
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Automatic tunnel generation for remote visual testing of local agent work.',
    logo: 'playwright',
    status: 'official',
    details: [
      'Agents can spawn Playwright browsers and expose the UI via pd tunnel.',
      'Capture screenshots of agent failures and link them to Timeline events.',
      'Shared port registry ensures Playwright tests always know where services are running.'
    ],
    setupCode: `const { port } = await pd.claim('webapp:preview');\nawait page.goto(\`http://localhost:\${port}\`);`
  }
];
