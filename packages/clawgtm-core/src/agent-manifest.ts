import { readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_AGENT_SLUGS = [
  'headofrevenue',
  'researcher',
  'narrative',
  'vibe_marketer',
  'performance_marketer',
  'aeo_geo',
  'growth_analyst',
  'gtm_engineer',
  'bdr',
  'revops',
  'partnerships',
] as const;

const CANONICAL_OUTPUT_PATHS = new Set([
  'analysis/market_landscape.md',
  'analysis/competitive_matrix.md',
  'analysis/icp_summary.md',
  'analysis/jtbd_framework.md',
  'narrative/positioning.md',
  'narrative/messaging_framework.md',
  'narrative/value_props.md',
  'gtm/strategy.md',
  'gtm/channel_plan.md',
  'gtm/experiment_backlog.md',
  'metrics/north_star_tree.md',
  'metrics/metrics_dictionary.md',
  'metrics/weekly_scorecard.md',
  'revops/funnel_definition.md',
  'revops/lifecycle_stages.md',
  'revops/crm_schema.md',
  'sales/outreach_sequences.md',
  'sales/talk_tracks.md',
  'sales/objection_log.md',
  'partners/partner_landscape.md',
  'partners/activation_playbooks.md',
]);

export interface AgentDefinition {
  slug: string;
  role_name: string;
  display_name: string;
  enabled: boolean;
  groups: string[];
  output_paths: string[];
}

export interface AgentManifest {
  version: number;
  org_domain: string;
  agents: AgentDefinition[];
}

export function loadAgentManifest(manifestPath: string): AgentManifest {
  const raw = readFileSync(manifestPath, 'utf8');
  const manifest = parseAgentManifestYaml(raw);
  validateAgentManifest(manifest);
  return manifest;
}

export function validateAgentManifest(manifest: AgentManifest): void {
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error('Manifest version must be an integer >= 1.');
  }
  if (!manifest.org_domain || manifest.org_domain.length < 3) {
    throw new Error('Manifest org_domain must be provided.');
  }

  const slugs = manifest.agents.map((agent) => agent.slug);
  const unique = new Set(slugs);
  if (unique.size !== slugs.length) {
    throw new Error('Agent manifest contains duplicate agent slugs.');
  }

  for (const required of REQUIRED_AGENT_SLUGS) {
    if (!unique.has(required)) {
      throw new Error(`Agent manifest missing required agent slug: ${required}`);
    }
  }

  for (const agent of manifest.agents) {
    if (!agent.slug || !agent.role_name || !agent.display_name) {
      throw new Error(`Agent ${agent.slug || '<unknown>'} is missing required fields.`);
    }
    if (!Array.isArray(agent.groups) || agent.groups.length === 0) {
      throw new Error(`Agent ${agent.slug} must have at least one group.`);
    }
    for (const outputPath of agent.output_paths) {
      if (!CANONICAL_OUTPUT_PATHS.has(outputPath)) {
        throw new Error(`Agent manifest has non-canonical output path: ${outputPath}`);
      }
    }
  }
}

export function assertAgentCanWrite(
  manifest: AgentManifest,
  agentSlug: string,
  artifactRelativePath: string,
): void {
  const normalized = normalizeArtifactPath(artifactRelativePath);
  const agent = manifest.agents.find((candidate) => candidate.slug === agentSlug);
  if (!agent) {
    throw new Error(`Unknown agent slug: ${agentSlug}`);
  }
  if (!agent.enabled) {
    throw new Error(`Agent ${agentSlug} is disabled.`);
  }
  if (!agent.output_paths.includes(normalized)) {
    throw new Error(
      `Write denied. Agent ${agentSlug} cannot write ${normalized}. Allowed: ${agent.output_paths.join(', ')}`,
    );
  }
}

export function normalizeArtifactPath(artifactRelativePath: string): string {
  const normalized = path.posix.normalize(artifactRelativePath.replaceAll('\\', '/'));
  if (normalized.startsWith('../') || normalized.startsWith('/')) {
    throw new Error(`Invalid artifact path: ${artifactRelativePath}`);
  }
  return normalized;
}

function parseAgentManifestYaml(raw: string): AgentManifest {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+#.*$/, ''))
    .filter((line) => line.trim().length > 0);

  let version = 0;
  let orgDomain = '';
  const agents: AgentDefinition[] = [];
  let currentAgent: AgentDefinition | null = null;
  let currentListKey: 'output_paths' | null = null;

  for (const line of lines) {
    if (line.startsWith('version:')) {
      version = Number(line.split(':')[1]?.trim() ?? '0');
      continue;
    }
    if (line.startsWith('org_domain:')) {
      orgDomain = stripQuotes(line.split(':').slice(1).join(':').trim());
      continue;
    }
    if (line.trim() === 'agents:') {
      continue;
    }
    if (line.startsWith('  - slug:')) {
      if (currentAgent) {
        agents.push(currentAgent);
      }
      currentAgent = {
        slug: stripQuotes(line.split(':').slice(1).join(':').trim()),
        role_name: '',
        display_name: '',
        enabled: false,
        groups: [],
        output_paths: [],
      };
      currentListKey = null;
      continue;
    }
    if (!currentAgent) {
      continue;
    }

    if (line.startsWith('    role_name:')) {
      currentAgent.role_name = stripQuotes(line.split(':').slice(1).join(':').trim());
      currentListKey = null;
      continue;
    }
    if (line.startsWith('    display_name:')) {
      currentAgent.display_name = stripQuotes(line.split(':').slice(1).join(':').trim());
      currentListKey = null;
      continue;
    }
    if (line.startsWith('    enabled:')) {
      currentAgent.enabled = line.endsWith('true');
      currentListKey = null;
      continue;
    }
    if (line.startsWith('    groups:')) {
      currentAgent.groups = parseInlineArray(line.split(':').slice(1).join(':').trim());
      currentListKey = null;
      continue;
    }
    if (line.startsWith('    output_paths:')) {
      currentListKey = 'output_paths';
      continue;
    }
    if (line.startsWith('      - ') && currentListKey === 'output_paths') {
      currentAgent.output_paths.push(stripQuotes(line.replace('      - ', '').trim()));
    }
  }

  if (currentAgent) {
    agents.push(currentAgent);
  }

  return {
    version,
    org_domain: orgDomain,
    agents,
  };
}

function parseInlineArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    throw new Error(`Expected inline array syntax [a, b], received: ${raw}`);
  }
  const values = trimmed
    .slice(1, -1)
    .split(',')
    .map((value) => stripQuotes(value.trim()))
    .filter(Boolean);

  return values;
}

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
}
