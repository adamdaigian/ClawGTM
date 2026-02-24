import OpenAI from 'openai';
import { loadConfig } from '../../../src/config/config.ts';

// Resolve OpenAI API key from OpenClaw config or environment
function resolveOpenAIApiKey(): string {
  // Try to load OpenClaw config
  try {
    const cfg = loadConfig();
    
    // Check for explicit API key in config providers
    const providerConfig = cfg.models?.providers?.openai;
    if (providerConfig && typeof providerConfig === 'object' && 'apiKey' in providerConfig) {
      const apiKey = (providerConfig as { apiKey?: string }).apiKey?.trim();
      if (apiKey) {
        console.log('[LLM] Using API key from OpenClaw config (models.providers.openai.apiKey)');
        return apiKey;
      }
    }
  } catch (e) {
    // Config loading failed, fall back to env var
    console.log('[LLM] OpenClaw config not found, checking environment');
  }

  // Fall back to environment variable
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) {
    console.log('[LLM] Using API key from OPENAI_API_KEY environment variable');
    return envKey;
  }

  throw new Error(
    'No OpenAI API key found. Set up OpenClaw with `openclaw onboard` or set OPENAI_API_KEY environment variable.'
  );
}

// Lazy-initialize the OpenAI client
let _openai: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = resolveOpenAIApiKey();
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

export interface AgentPrompt {
  role: string;
  persona: string;
  task: string;
  context: string;
  outputFormat: string;
}

export async function generateWithLLM(prompt: AgentPrompt): Promise<string> {
  const openai = getOpenAIClient();
  
  const systemPrompt = `You are ${prompt.role}, a member of an autonomous GTM team called ClawGTM.

${prompt.persona}

Your task: ${prompt.task}

Output format:
${prompt.outputFormat}

Be thorough, specific, and actionable. Use real market data and insights where possible.
Do NOT include any preamble or explanation - output ONLY the requested document in markdown format.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt.context },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content ?? '';
}

// Agent personas
export const AGENT_PERSONAS = {
  researcher: `You are the Researcher agent - a world-class market analyst and competitive intelligence expert.
You excel at:
- Deep market analysis and sizing
- Competitive landscape mapping
- Customer pain point identification
- Jobs-to-be-Done framework development
- Synthesizing complex information into actionable insights

You are rigorous, thorough, and always cite your reasoning.`,

  narrative: `You are the Narrative agent - a senior Product Marketing Manager and messaging strategist.
You excel at:
- Crafting compelling positioning statements
- Developing value propositions that resonate
- Building messaging frameworks that drive conversion
- Creating detailed ICP (Ideal Customer Profile) documents
- Translating technical capabilities into business value

You write with clarity and persuasion, always grounded in customer insights.`,

  headofrevenue: `You are the Head of Revenue agent - a strategic revenue leader and GTM architect.
You excel at:
- Building comprehensive go-to-market strategies
- Channel prioritization and resource allocation
- Experiment design and prioritization
- Connecting market insights to revenue execution
- Balancing short-term wins with long-term growth

You think strategically but act tactically, always focused on measurable outcomes.`,

  growth_analyst: `You are the Growth Analyst agent - a metrics-obsessed growth strategist.
You excel at:
- Defining north star metrics and KPI hierarchies
- Building metrics dictionaries that align teams
- Identifying leading indicators of success
- Creating measurement frameworks

You believe what gets measured gets managed, and you make sure the right things get measured.`,
};

// Output format templates
export const OUTPUT_FORMATS = {
  market_opportunities: `# Market Opportunities

## Market Size & Dynamics
- TAM / SAM / SOM estimates with reasoning
- Growth rate and trajectory
- Key market drivers

## Opportunity Areas
- Underserved segments (with evidence)
- Emerging needs
- Timing advantages

## Market Risks
- Potential headwinds
- Regulatory considerations
- Technology shifts`,

  competitors: `# Competitive Landscape

## Direct Competitors
For each competitor:
- Company overview
- Positioning & messaging
- Strengths & weaknesses
- Pricing model
- Target customer

## Indirect Competitors / Alternatives
- Current solutions buyers use
- DIY / status quo options

## Competitive Gaps
- Unmet needs in market
- Positioning white space`,

  pain_points: `# Customer Pain Points

## Primary Pain Points
For each (at least 3-5):
- Pain description
- Who experiences it (role/persona)
- Current workarounds
- Cost of the problem
- Evidence / reasoning

## Secondary Pain Points
- Related frustrations
- Adjacent problems`,

  jtbd_framework: `# Jobs-to-be-Done Framework

## Job (primary job statement)
When [situation], I want to [motivation], so I can [expected outcome].

## Situation (triggering context)
- What circumstances trigger the need?
- What events precede the job?

## Desired outcome
- Functional outcome
- Measurable success criteria

## Current solutions
- How do people solve this today?
- What tools/processes do they use?

## Frictions
- What makes current solutions painful?
- Where do they fall short?

## Emotional & social jobs
- How do buyers want to feel?
- How do they want to be perceived?

## Purchase triggers
- What tips someone from "aware" to "active buyer"?
- What events accelerate purchase?

## Success criteria
- How will buyers measure success?
- What outcomes matter most?

## Switching forces
- **Push:** What pushes them away from current solution?
- **Pull:** What pulls them toward new solution?
- **Anxiety:** What fears slow them down?
- **Habit:** What inertia keeps them stuck?`,

  current_solutions: `# Current Solutions Analysis

## Solution Categories
For each category:
- Solution type
- Representative products/approaches
- Strengths
- Limitations
- Typical buyer

## Solution Comparison Matrix
| Solution | Cost | Complexity | Effectiveness | Gaps |
|----------|------|------------|---------------|------|

## Why Current Solutions Fail
- Key unmet needs
- Friction points
- Evolution of requirements`,

  positioning: `# Positioning & Value Proposition

## Primary Value Proposition
[One sentence that captures the core value]

## Positioning Statement
For [target customer] who [need/opportunity], [product] is a [category] that [key benefit]. Unlike [alternatives], we [key differentiator].

## Value Pillars
### Pillar 1: [Name]
- What it is
- Why it matters
- Proof points

### Pillar 2: [Name]
- What it is
- Why it matters
- Proof points

### Pillar 3: [Name]
- What it is
- Why it matters
- Proof points

## Key Differentiators
- What makes us uniquely able to deliver?
- What can we claim that competitors can't?

## Positioning Guardrails
- What we ARE
- What we ARE NOT
- Language to use
- Language to avoid`,

  messaging_framework: `# Messaging Framework

## Core Message Architecture

### Headline Message
[Primary message - 10 words or less]

### Supporting Messages
- Message 1: [Supports pillar 1]
- Message 2: [Supports pillar 2]
- Message 3: [Supports pillar 3]

## Proof Points
- Quantified benefits
- Customer evidence
- Technical differentiation

## Objection Themes
| Objection | Response Framework |
|-----------|-------------------|

## Message by Audience
| Audience | Primary Message | Key Proof Points |
|----------|-----------------|------------------|`,

  icp: `# ICP: [Persona Name]

## Overview
- Title / Role
- Company type & size
- Industry vertical

## Demographics
- Reporting structure
- Team size
- Budget authority

## Pain Points
- Primary frustrations (with specifics)
- Day-to-day challenges
- Strategic concerns

## Goals & Motivations
- What success looks like
- Career motivations
- Business objectives

## Buying Behavior
- Research process
- Decision criteria
- Buying triggers
- Common objections

## Channels & Watering Holes
- Where they spend time online
- Events & communities
- Content preferences
- Trusted sources

## Messaging That Resonates
- Key themes
- Language patterns
- Proof points that matter`,

  gtm_strategy: `# GTM Strategy

## Executive Summary
[2-3 paragraph overview of the revenue growth strategy]

## Strategic Foundations
- Target market definition
- Ideal customer profile summary
- Competitive positioning

## Go-to-Market Motion
- Primary motion: [PLG / Sales-Led / Hybrid]
- Rationale for motion choice
- Motion mechanics

## Channel Prioritization
| Channel | Priority | Rationale | Investment Level |
|---------|----------|-----------|------------------|

## Key Bets
- Bet 1: [Description, rationale, risk]
- Bet 2: [Description, rationale, risk]
- Bet 3: [Description, rationale, risk]

## 90-Day Priorities
1. [Priority with success criteria]
2. [Priority with success criteria]
3. [Priority with success criteria]

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|

## Success Metrics
- North star metric
- Leading indicators
- Guardrail metrics`,

  channel_plan: `# Channel Plan

## Channel Overview
| Channel | Stage | Investment | Expected CAC | Timeline to Results |
|---------|-------|------------|--------------|---------------------|

## Channel Details

### [Channel 1]
- Strategy
- Tactics
- Resources required
- Success metrics
- 30/60/90 day milestones

### [Channel 2]
- Strategy
- Tactics
- Resources required
- Success metrics
- 30/60/90 day milestones

## Resource Allocation
- Headcount by channel
- Budget by channel
- Tool/platform needs`,

  experiment_backlog: `# GTM Experiment Backlog

## Active Experiments
| ID | Experiment | Hypothesis | Success Criteria | Owner | Status |
|----|------------|------------|------------------|-------|--------|

## Prioritized Backlog
| Priority | Experiment | Hypothesis | Effort | Impact | ICE Score |
|----------|------------|------------|--------|--------|-----------|

## Experiment Details
For top 5 experiments:
- Hypothesis: If we [action], then [outcome] because [rationale]
- Success criteria: [Measurable outcome]
- Effort: [S/M/L]
- Duration: [Timeframe]
- Dependencies: [What's needed]`,
};
