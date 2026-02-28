#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as p from '@clack/prompts';
import { generateWithLLM } from '../../clawgtm-orchestrator/src/llm-client.ts';
import { runOnboardingWorkflow } from '../../clawgtm-orchestrator/src/onboarding-orchestrator.ts';

// ============================================================================
// Types
// ============================================================================

interface WizardState {
  step: number;
  workspaceRoot: string;
  prereqsChecked: boolean;
  openclawConfigured: boolean;
  businessContext: BusinessContext | null;
  agentIdentities: AgentIdentities | null;
  completedAt: string | null;
}

interface BusinessContext {
  companyName: string;
  productDescription: string;
  targetCustomer: string;
  stage: string;
  objective: string;
  constraints: string[];
  differentiation: string;
  sourceFile: string | null;
}

interface AgentIdentities {
  org: string;
  agents: Record<string, { email: string; name: string; emoji?: string }>;
}

interface DetectedDoc {
  path: string;
  size: number;
  description: string;
}

// ============================================================================
// Prereqs Check (Step 0)
// ============================================================================

function checkNodeVersion(): { ok: boolean; version: string } {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  return { ok: major >= 22, version };
}

function checkPackageManager(): { name: string; available: boolean } {
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    return { name: 'pnpm', available: true };
  } catch {
    try {
      execSync('npm --version', { stdio: 'pipe' });
      return { name: 'npm', available: true };
    } catch {
      return { name: 'none', available: false };
    }
  }
}

function checkApiKey(): { provider: string | null; configured: boolean } {
  // Check environment variables
  if (process.env.OPENAI_API_KEY?.trim()) {
    return { provider: 'OpenAI', configured: true };
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return { provider: 'Anthropic', configured: true };
  }

  // Check OpenClaw config
  const configPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.models?.providers?.openai?.apiKey) {
        return { provider: 'OpenAI (via OpenClaw)', configured: true };
      }
      if (config.models?.providers?.anthropic?.apiKey) {
        return { provider: 'Anthropic (via OpenClaw)', configured: true };
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { provider: null, configured: false };
}

async function runPrereqsCheck(): Promise<boolean> {
  p.intro('🔍 Checking prerequisites...');

  const node = checkNodeVersion();
  const pm = checkPackageManager();
  const apiKey = checkApiKey();

  // Display results
  if (node.ok) {
    p.log.success(`Node.js ${node.version}`);
  } else {
    p.log.error(`Node.js ${node.version} (requires ≥22)`);
    p.log.info('Install Node.js 22+: https://nodejs.org or `nvm install 22`');
    return false;
  }

  if (pm.available) {
    p.log.success(`${pm.name} available`);
  } else {
    p.log.error('No package manager found');
    p.log.info('Install pnpm: `npm install -g pnpm`');
    return false;
  }

  if (apiKey.configured) {
    p.log.success(`API key configured (${apiKey.provider})`);
  } else {
    p.log.warn('No LLM API key found');
    
    const setupKey = await p.confirm({
      message: 'Would you like to configure an API key now?',
      initialValue: true,
    });

    if (p.isCancel(setupKey) || !setupKey) {
      p.log.error('API key required to continue.');
      p.log.info('Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable');
      return false;
    }

    const provider = await p.select({
      message: 'Select your LLM provider:',
      options: [
        { value: 'openai', label: 'OpenAI (GPT-4o)' },
        { value: 'anthropic', label: 'Anthropic (Claude) — recommended' },
      ],
    });

    if (p.isCancel(provider)) return false;

    const key = await p.password({
      message: `Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key:`,
    });

    if (p.isCancel(key) || !key) return false;

    // Save to .env file in current directory
    const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY';
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    
    if (!envContent.includes(envVar)) {
      fs.appendFileSync(envPath, `\n${envVar}=${key}\n`);
      p.log.success(`API key saved to .env`);
      p.log.info('Restart the wizard to use the new key, or run: source .env');
      
      // Set for current process
      process.env[envVar] = key;
    }
  }

  return true;
}

// ============================================================================
// OpenClaw Check (Step 1)
// ============================================================================

function checkOpenClawConfig(): boolean {
  const configPath = path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');
  if (!fs.existsSync(configPath)) return false;
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    // Check for valid model config
    return !!(config.agent?.model || config.models?.default);
  } catch {
    return false;
  }
}

async function runOpenClawCheck(): Promise<boolean> {
  const configured = checkOpenClawConfig();
  
  if (configured) {
    p.log.success('OpenClaw Gateway detected');
    return true;
  }

  p.log.warn('OpenClaw Gateway not configured');
  p.log.info('ClawGTM can run standalone, but OpenClaw integration enables more features.');
  
  const proceed = await p.confirm({
    message: 'Continue without OpenClaw? (You can set it up later)',
    initialValue: true,
  });

  return !p.isCancel(proceed) && proceed;
}

// ============================================================================
// Business Context (Step 3)
// ============================================================================

const DOC_PATTERNS = [
  { pattern: /MASTERPLAN\.md$/i, description: 'Product/business plan' },
  { pattern: /masterplan\.md$/i, description: 'Product/business plan' },
  { pattern: /README\.md$/i, description: 'Project overview' },
  { pattern: /readme\.md$/i, description: 'Project overview' },
  { pattern: /PITCH\.md$/i, description: 'Pitch deck notes' },
  { pattern: /OVERVIEW\.md$/i, description: 'Business overview' },
  { pattern: /business[_-]?overview\.md$/i, description: 'Business overview' },
  { pattern: /company[_-]?overview\.md$/i, description: 'Company overview' },
  { pattern: /product[_-]?spec\.md$/i, description: 'Product specification' },
];

function scanForBusinessDocs(rootDir: string): DetectedDoc[] {
  const docs: DetectedDoc[] = [];
  const searchDirs = [rootDir, path.join(rootDir, 'docs'), path.join(rootDir, 'company')];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (!stat.isFile() || !file.endsWith('.md')) continue;
      
      for (const { pattern, description } of DOC_PATTERNS) {
        if (pattern.test(file)) {
          docs.push({
            path: filePath,
            size: stat.size,
            description,
          });
          break;
        }
      }
    }
  }

  return docs;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractBusinessContext(content: string, sourceFile: string): Promise<BusinessContext> {
  const extractionPrompt = `Extract business context from the following document.
Return ONLY valid JSON (no markdown, no explanation) with these exact fields:
{
  "company_name": "string or null",
  "product_description": "2-3 sentence description or null",
  "target_customer": "who they serve, their pain points or null",
  "stage": "pre-seed/seed/series A/growth/etc or null",
  "objective": "primary growth goal or null",
  "constraints": ["array of constraints like budget, timeline, team size"],
  "differentiation": "what makes them unique or null"
}

If a field cannot be determined from the document, use null.

Document:
${content}`;

  const response = await generateWithLLM({
    role: 'Business Analyst',
    persona: 'You extract structured business information from documents. You return only valid JSON.',
    task: 'Extract business context into structured JSON format.',
    context: extractionPrompt,
    outputFormat: 'Valid JSON object only, no markdown code blocks.',
  });

  // Parse the JSON response
  let parsed: any;
  try {
    // Try to extract JSON from the response (handle markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    // Return empty context on parse failure
    return {
      companyName: 'Unknown',
      productDescription: '',
      targetCustomer: '',
      stage: '',
      objective: '',
      constraints: [],
      differentiation: '',
      sourceFile,
    };
  }

  return {
    companyName: parsed.company_name || 'Unknown',
    productDescription: parsed.product_description || '',
    targetCustomer: parsed.target_customer || '',
    stage: parsed.stage || '',
    objective: parsed.objective || '',
    constraints: parsed.constraints || [],
    differentiation: parsed.differentiation || '',
    sourceFile,
  };
}

async function runBusinessContextCapture(workspaceRoot: string): Promise<BusinessContext | null> {
  p.intro('📋 Business Context');

  // Scan for existing docs
  const detectedDocs = scanForBusinessDocs(workspaceRoot);

  let selectedDoc: string | null = null;
  let content: string | null = null;

  if (detectedDocs.length > 0) {
    p.log.info(`Found ${detectedDocs.length} potential business doc(s):`);
    
    const options = [
      ...detectedDocs.map(doc => ({
        value: doc.path,
        label: `${path.basename(doc.path)} (${formatFileSize(doc.size)}) — ${doc.description}`,
      })),
      { value: '__none__', label: "None of these — I'll provide something else" },
    ];

    const choice = await p.select({
      message: 'Which should we use as primary context?',
      options,
    });

    if (p.isCancel(choice)) return null;
    
    if (choice !== '__none__') {
      selectedDoc = choice as string;
      content = fs.readFileSync(selectedDoc, 'utf-8');
    }
  }

  // If no doc selected, offer alternatives
  if (!content) {
    const inputMethod = await p.select({
      message: 'How would you like to provide business context?',
      options: [
        { value: 'file', label: 'Point to a file path' },
        { value: 'paste', label: 'Paste text directly' },
        { value: 'interactive', label: 'Answer questions interactively' },
      ],
    });

    if (p.isCancel(inputMethod)) return null;

    if (inputMethod === 'file') {
      const filePath = await p.text({
        message: 'Path to your business overview:',
        placeholder: './MASTERPLAN.md',
        validate: (val) => {
          if (!val) return 'File path required';
          const resolved = path.resolve(workspaceRoot, val);
          if (!fs.existsSync(resolved)) return `File not found: ${resolved}`;
          return undefined;
        },
      });

      if (p.isCancel(filePath) || !filePath) return null;
      
      selectedDoc = path.resolve(workspaceRoot, filePath);
      content = fs.readFileSync(selectedDoc, 'utf-8');
      
    } else if (inputMethod === 'paste') {
      p.log.info('Paste your business overview below. Press Enter twice when done.');
      
      const pasted = await p.text({
        message: 'Business overview:',
        placeholder: 'Paste your company description, product info, target market, etc.',
      });

      if (p.isCancel(pasted) || !pasted) return null;
      content = pasted;
      
    } else {
      // Interactive prompts
      const companyName = await p.text({
        message: 'Company name:',
        placeholder: 'Acme Corp',
      });
      if (p.isCancel(companyName)) return null;

      const productDescription = await p.text({
        message: 'What does your company do? (1-2 sentences)',
        placeholder: 'AI-powered platform that helps teams...',
      });
      if (p.isCancel(productDescription)) return null;

      const targetCustomer = await p.text({
        message: 'Who is your ideal customer? (title, company type, pain point)',
        placeholder: 'VP Sales at B2B SaaS companies struggling with...',
      });
      if (p.isCancel(targetCustomer)) return null;

      const objective = await p.select({
        message: "What's your primary growth objective?",
        options: [
          { value: 'Launch/validate product-market fit', label: 'Launch/validate product-market fit' },
          { value: 'Increase qualified pipeline', label: 'Increase qualified pipeline' },
          { value: 'Improve conversion rates', label: 'Improve conversion rates' },
          { value: 'Expand into new segments', label: 'Expand into new segments' },
          { value: '__custom__', label: 'Custom...' },
        ],
      });
      if (p.isCancel(objective)) return null;

      let finalObjective = objective as string;
      if (objective === '__custom__') {
        const custom = await p.text({ message: 'Describe your objective:' });
        if (p.isCancel(custom)) return null;
        finalObjective = custom || '';
      }

      const constraints = await p.text({
        message: 'Any constraints? (budget, timeline, team size)',
        placeholder: 'Solo founder, bootstrapped, need results in 30 days',
      });

      return {
        companyName: companyName || 'Unknown',
        productDescription: productDescription || '',
        targetCustomer: targetCustomer || '',
        stage: '',
        objective: finalObjective,
        constraints: constraints ? [constraints] : [],
        differentiation: '',
        sourceFile: null,
      };
    }
  }

  // Extract context via LLM
  if (content) {
    const spinner = p.spinner();
    spinner.start('Analyzing document...');
    
    try {
      const context = await extractBusinessContext(content, selectedDoc || 'pasted');
      spinner.stop('Document analyzed');

      // Display extracted context
      p.log.message('');
      p.log.message('┌─────────────────────────────────────────────────┐');
      p.log.message(`│ Company:     ${context.companyName.padEnd(35)}│`);
      p.log.message(`│ Product:     ${(context.productDescription.slice(0, 35) || 'N/A').padEnd(35)}│`);
      p.log.message(`│ ICP:         ${(context.targetCustomer.slice(0, 35) || 'N/A').padEnd(35)}│`);
      p.log.message(`│ Stage:       ${(context.stage || 'N/A').padEnd(35)}│`);
      p.log.message(`│ Objective:   ${(context.objective.slice(0, 35) || 'N/A').padEnd(35)}│`);
      p.log.message('└─────────────────────────────────────────────────┘');
      p.log.message('');

      const confirm = await p.confirm({
        message: 'Does this look right?',
        initialValue: true,
      });

      if (p.isCancel(confirm)) return null;

      if (!confirm) {
        const clarification = await p.text({
          message: 'What should be different?',
          placeholder: 'Describe corrections...',
        });
        
        if (clarification && !p.isCancel(clarification)) {
          // Re-extract with clarification
          const revisedContent = `${content}\n\n---\nClarification from user: ${clarification}`;
          spinner.start('Re-analyzing with your clarifications...');
          const revised = await extractBusinessContext(revisedContent, selectedDoc || 'pasted');
          spinner.stop('Done');
          return revised;
        }
      }

      return context;
      
    } catch (error) {
      spinner.stop('Analysis failed');
      p.log.error(`Failed to analyze document: ${error}`);
      return null;
    }
  }

  return null;
}

// ============================================================================
// Workspace Setup (Step 2)
// ============================================================================

function createWorkspaceStructure(workspaceRoot: string): void {
  const dirs = [
    'company',
    'analysis',
    'narrative',
    'icp',
    'gtm',
    'metrics',
    '.clawgtm',
    '.clawgtm/runs',
  ];

  for (const dir of dirs) {
    const fullPath = path.join(workspaceRoot, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

function writeBusinessContext(workspaceRoot: string, context: BusinessContext): void {
  // Write markdown overview
  const markdown = `# Business Overview

## Company
**Name:** ${context.companyName}
**Stage:** ${context.stage || 'Not specified'}

## Product
${context.productDescription || 'Not specified'}

## Differentiation
${context.differentiation || 'Not specified'}

## Target Customer
${context.targetCustomer || 'Not specified'}

## Objective
${context.objective || 'Not specified'}

## Constraints
${context.constraints.length > 0 ? context.constraints.map(c => `- ${c}`).join('\n') : 'None specified'}

---
*Source: ${context.sourceFile || 'Manual entry'}*
*Generated by ClawGTM wizard*
`;

  fs.writeFileSync(path.join(workspaceRoot, 'company', 'business_overview.md'), markdown);

  // Write JSON for programmatic use
  fs.writeFileSync(
    path.join(workspaceRoot, 'company', 'context.json'),
    JSON.stringify(context, null, 2)
  );
}

// ============================================================================
// Agent Identity Setup (Step 4) - Simplified: Pre-defined personas, just ask for org slug
// ============================================================================

// Pre-defined agent personas (hardcoded)
const AGENT_PERSONAS = {
  researcher: { name: 'Scout', emoji: '🔍', purpose: 'Market research & competitive analysis' },
  narrative: { name: 'Story', emoji: '📖', purpose: 'Positioning & messaging' },
  growth: { name: 'Metric', emoji: '📊', purpose: 'Metrics & growth strategy' },
  hor: { name: 'Chief', emoji: '👔', purpose: 'Head of Revenue orchestration' },
} as const;

async function runAgentIdentitySetup(workspaceRoot: string, companyName?: string): Promise<AgentIdentities | null> {
  p.log.message('');
  p.log.message('Using pre-defined agent personas:');
  for (const [slug, info] of Object.entries(AGENT_PERSONAS)) {
    p.log.message(`  ${info.emoji} ${info.name} (${slug}) — ${info.purpose}`);
  }
  p.log.message('');

  // Derive default org slug from company name if available
  const defaultSlug = companyName 
    ? companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : undefined;

  const org = await p.text({
    message: 'Organization slug (used in agent emails):',
    placeholder: defaultSlug || 'acme',
    initialValue: defaultSlug,
    validate: (val) => {
      if (!val) return 'Organization slug required';
      if (!/^[a-z0-9-]+$/.test(val)) return 'Use lowercase letters, numbers, and hyphens only';
      return undefined;
    },
  });

  if (p.isCancel(org) || !org) return null;

  const agents: AgentIdentities = {
    org,
    agents: {
      researcher: { email: `scout@${org}`, name: 'Scout', emoji: '🔍' },
      narrative: { email: `story@${org}`, name: 'Story', emoji: '📖' },
      growth: { email: `metric@${org}`, name: 'Metric', emoji: '📊' },
      hor: { email: `chief@${org}`, name: 'Chief', emoji: '👔' },
    },
  };

  p.log.message('');
  p.log.success('Generated agent identities:');
  for (const [slug, info] of Object.entries(agents.agents)) {
    p.log.message(`  ✓ ${info.email} — ${info.name} ${(info as any).emoji || ''}`);
  }

  // Write to file
  fs.writeFileSync(
    path.join(workspaceRoot, '.clawgtm', 'agents.json'),
    JSON.stringify(agents, null, 2)
  );

  return agents;
}

// ============================================================================
// Run Workflow (Step 6)
// ============================================================================

async function runOnboardingWorkflowStep(workspaceRoot: string, context: BusinessContext): Promise<boolean> {
  const proceed = await p.confirm({
    message: 'Ready to run onboarding workflow?',
    initialValue: true,
  });

  if (p.isCancel(proceed) || !proceed) {
    p.log.info('Skipping workflow. Run later with: clawgtm onboard run');
    return false;
  }

  p.log.message('');
  p.log.message('This will generate:');
  p.log.message('  • Market analysis & competitive landscape');
  p.log.message('  • ICP definitions');
  p.log.message('  • Positioning & messaging framework');
  p.log.message('  • GTM strategy & channel plan');
  p.log.message('  • North star metrics tree');
  p.log.message('');

  const spinner = p.spinner();
  spinner.start('Running onboarding workflow...');

  try {
    const result = await runOnboardingWorkflow({
      objective: context.objective || 'Build GTM strategy',
      channelId: 'clawgtm-wizard',
      workspaceRoot,
    });

    spinner.stop('Onboarding workflow complete!');
    
    p.log.success(`Generated ${result.taskIds.length} artifacts`);
    p.log.message(`Run summary: ${result.summaryPath}`);
    
    return true;
  } catch (error) {
    spinner.stop('Workflow failed');
    p.log.error(`Error: ${error}`);
    return false;
  }
}

// ============================================================================
// Summary (Step 7)
// ============================================================================

function showSummary(workspaceRoot: string): void {
  p.outro(`🎉 ClawGTM onboarding complete!

Your GTM workspace: ${workspaceRoot}

Key artifacts to review:
  1. gtm/strategy.md — Your GTM strategy
  2. icp/core_icp.md — Target customer profile  
  3. narrative/positioning.md — How to talk about your product

Next steps:
  • Review generated artifacts and refine
  • Connect Slack: clawgtm auth slack --agent hor
  • Re-run workflow: clawgtm onboard run

Documentation: https://github.com/openclaw/ClawGTM#clawgtm-mode`);
}

// ============================================================================
// State Management
// ============================================================================

function loadWizardState(workspaceRoot: string): WizardState | null {
  const statePath = path.join(workspaceRoot, '.clawgtm', 'wizard-state.json');
  if (!fs.existsSync(statePath)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  } catch {
    return null;
  }
}

function saveWizardState(workspaceRoot: string, state: Partial<WizardState>): void {
  const statePath = path.join(workspaceRoot, '.clawgtm', 'wizard-state.json');
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const existing = loadWizardState(workspaceRoot) || {
    step: 0,
    workspaceRoot,
    prereqsChecked: false,
    openclawConfigured: false,
    businessContext: null,
    agentIdentities: null,
    completedAt: null,
  };
  
  fs.writeFileSync(statePath, JSON.stringify({ ...existing, ...state }, null, 2));
}

// ============================================================================
// Main Wizard Runner
// ============================================================================

export interface WizardOptions {
  skipInfra?: boolean;
  skipOAuth?: boolean;
  mock?: boolean;
  workspaceRoot?: string;
}

export async function runWizard(options: WizardOptions = {}): Promise<void> {
  const workspaceRoot = options.workspaceRoot || process.cwd();
  
  console.clear();
  p.intro('🦞 ClawGTM Onboarding Wizard');

  // Check for existing state
  const existingState = loadWizardState(workspaceRoot);
  if (existingState && existingState.step > 0 && !existingState.completedAt) {
    const resumeChoice = await p.select({
      message: 'Existing ClawGTM workspace detected.',
      options: [
        { value: 'resume', label: `Continue where you left off (Step ${existingState.step})` },
        { value: 'fresh', label: 'Start fresh (will overwrite existing)' },
        { value: 'run', label: 'Run workflow only (skip setup)' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (p.isCancel(resumeChoice) || resumeChoice === 'exit') {
      p.outro('Goodbye!');
      return;
    }

    if (resumeChoice === 'run' && existingState.businessContext) {
      await runOnboardingWorkflowStep(workspaceRoot, existingState.businessContext);
      showSummary(workspaceRoot);
      return;
    }
    
    if (resumeChoice === 'fresh') {
      // Reset state
      saveWizardState(workspaceRoot, { step: 0, completedAt: null });
    }
  }

  // Step 0: Prerequisites
  if (!options.skipInfra) {
    const prereqsOk = await runPrereqsCheck();
    if (!prereqsOk) {
      p.outro('Please fix the issues above and try again.');
      return;
    }
    saveWizardState(workspaceRoot, { step: 1, prereqsChecked: true });
  }

  // Step 1: OpenClaw check
  if (!options.skipInfra) {
    const openclawOk = await runOpenClawCheck();
    if (!openclawOk) {
      p.outro('Setup cancelled.');
      return;
    }
    saveWizardState(workspaceRoot, { step: 2, openclawConfigured: openclawOk });
  }

  // Step 2: Create workspace structure
  p.log.step('Creating workspace structure...');
  createWorkspaceStructure(workspaceRoot);
  p.log.success('Workspace directories created');
  saveWizardState(workspaceRoot, { step: 3 });

  // Step 3: Business context capture
  const businessContext = await runBusinessContextCapture(workspaceRoot);
  if (!businessContext) {
    p.outro('Setup cancelled. Your progress has been saved.');
    return;
  }
  writeBusinessContext(workspaceRoot, businessContext);
  p.log.success('Business context saved');
  saveWizardState(workspaceRoot, { step: 4, businessContext });

  // Step 4: Agent identity setup (uses company name for default org slug)
  const agentIdentities = await runAgentIdentitySetup(workspaceRoot, businessContext.companyName);
  saveWizardState(workspaceRoot, { step: 5, agentIdentities });

  // Step 5: OAuth (skip for now, default to mock)
  if (!options.skipOAuth) {
    p.log.info('Using mock mode for integrations. Connect later with:');
    p.log.message('  clawgtm auth gmail --agent researcher');
    p.log.message('  clawgtm auth slack --agent hor');
  }
  saveWizardState(workspaceRoot, { step: 6 });

  // Step 6: Run workflow
  const workflowRan = await runOnboardingWorkflowStep(workspaceRoot, businessContext);
  
  if (workflowRan) {
    saveWizardState(workspaceRoot, { step: 7, completedAt: new Date().toISOString() });
  }

  // Step 7: Summary
  showSummary(workspaceRoot);
}
