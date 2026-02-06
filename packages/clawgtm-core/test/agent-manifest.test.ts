import { describe, expect, it } from 'vitest';
import {
  assertAgentCanWrite,
  loadAgentManifest,
  normalizeArtifactPath,
} from '../src/agent-manifest.js';

describe('agent manifest loader and write scope', () => {
  it('loads canonical manifest', () => {
    const manifest = loadAgentManifest('clawgtm/agents.manifest.yaml');
    expect(manifest.agents).toHaveLength(11);
    expect(manifest.agents.find((agent) => agent.slug === 'partnerships')?.enabled).toBe(false);
  });

  it('allows authorized write', () => {
    const manifest = loadAgentManifest('clawgtm/agents.manifest.yaml');
    expect(() => assertAgentCanWrite(manifest, 'researcher', 'analysis/jtbd_framework.md')).not.toThrow();
  });

  it('blocks unauthorized write and traversal', () => {
    const manifest = loadAgentManifest('clawgtm/agents.manifest.yaml');
    expect(() => assertAgentCanWrite(manifest, 'narrative', 'analysis/jtbd_framework.md')).toThrow(
      /Write denied/,
    );
    expect(() => normalizeArtifactPath('../secrets.txt')).toThrow(/Invalid artifact path/);
  });
});
