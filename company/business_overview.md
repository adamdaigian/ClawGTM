# Northstar Master Plan

## 1) Product Thesis

AI is eliminating technical barriers.

This shift has already transformed how software gets built, and the same collapse in technical friction is now happening in data work. AI is changing the role of the data practitioner from specialist to full-stack operator. Where work was previously split across data engineering, modeling, exploration, metric definition, analysis, and delivery, one practitioner can now own the full lifecycle with AI support.

Northstar is the app built to support that movement.

It provides a single workflow for full-stack data practice: shape data, build models, define metrics, explore questions, analyze results, and deliver business value without constant cross-functional handoffs.

AI in Northstar is deeply assistive, not autonomous by default.  
The goal is not to replace human judgment, but to make practitioners **10× faster and 10× more capable** by weaving AI into every meaningful interaction—generation, iteration, explanation, validation, and execution—while preserving human oversight.

Northstar functions as the operating surface for full-stack data work:
- Trusted data is unified, queryable, and semantically defined.
- Humans and AI collaborate across modeling, metrics, analysis, and decision framing.
- Decisions are explicitly recorded, actions are linked, and outcomes are measured against original intent.

Northstar is not a dashboarding tool and not a black-box agent.  
It is a **decision intelligence and coordination layer** built directly on trusted data, where logic, ownership, and causality remain transparent.

Autonomy is introduced progressively.  
Northstar may initiate low-risk actions with explicit approval gates, clear attribution, and full auditability. Higher-risk execution always requires human review.

---

## 2) Problem Statement

Modern teams do not struggle to produce charts—they struggle to **make and coordinate decisions**.

Most organizations face three persistent constraints:

- **Fragmented business data**, spread across warehouses, financial systems, and spreadsheets, with inconsistent definitions and ownership.
- **Slow decision cycles**, driven by pipeline dependencies, SQL bottlenecks, handoffs between roles, and repeated clarification of “what the numbers mean.”
- **Low decision leverage**, where significant analytical effort results in reports that are consumed passively, trusted unevenly, and rarely tied to concrete actions or outcomes.

Existing analytics tools primarily optimize for reporting and visualization.  
They help teams *see* data, but not *decide with it*.

As a result:
- Questions take too long to answer.
- Answers lack shared context and semantic trust.
- Decisions are made off-platform in meetings or documents.
- Actions and outcomes are disconnected from the analysis that informed them.

This creates a compounding failure mode: organizations invest heavily in data infrastructure but remain slow, reactive, and misaligned.

Northstar’s opportunity is to remove both technical friction **and coordination friction**—shrinking the time from question to confident decision and ensuring decisions, actions, and outcomes remain linked within a single system of record.

---

## 3) Target Users and Jobs-to-be-Done  
### Layered Ownership Model

Northstar is designed to bridge technical data teams and the finance organization during a period of rapid role convergence driven by AI.

As technical constraints diminish, ownership shifts upward in the stack—from infrastructure and pipelines toward semantics, analysis, and decision-making. Northstar assumes **layered ownership**, where different roles own different parts of the lifecycle.

### 3.1 Data Teams — Foundational Owners  
(Data leaders, analytics engineers, senior analysts)

- **Job:** Build and maintain reliable, scalable, and trusted data foundations.
- **Responsibilities:**
  - Own data connectivity, transformations, and materialized models.
  - Ensure correctness, performance, and lineage.
  - Partner with finance to surface data in semantically usable forms.
- **Outcome:** A stable analytical substrate that enables faster downstream decisions without constant intervention.

---

### 3.2 Finance Leaders — Semantic and Analytical Owners  
(CFOs, finance leaders, strategic finance)

- **Job:** Define business meaning and evaluate performance against financial reality.
- **Responsibilities:**
  - Own canonical metric definitions, assumptions, and financial logic.
  - Approve semantic changes that affect reporting or planning.
  - Use data to guide capital allocation and strategic tradeoffs.
- **Outcome:** Faster, more confident decisions grounded in consistent business truth.

Northstar is built to make this layer approachable and powerful without requiring deep technical fluency.

---

### 3.3 Decision-Making Operators  
(Growth, product, operations, GTM leaders)

- **Job:** Make tradeoffs and decisions within agreed semantic and financial constraints.
- **Responsibilities:**
  - Explore data and scenarios with AI assistance.
  - Propose decisions tied to shared metrics and assumptions.
- **Outcome:** Increased decision velocity without semantic drift.

---

### 3.4 Guided Contributors  
(Managers, functional leads, data-curious contributors)

- **Job:** Understand performance and ask better questions.
- **Responsibilities:**
  - Explore data safely using approved metrics and explanations.
- **Outcome:** Broader access to insight without compromising trust or governance.

---

## 4) Product Principles

### 4.1 Assistive AI everywhere, opaque AI nowhere  
AI is woven into every meaningful interaction. All AI outputs must be inspectable, explainable, and attributable. Black-box behavior is unacceptable.

### 4.2 Layered ownership over flat access  
Different layers have different owners:
- Data teams own foundations and models.
- Finance owns semantics and analytical definitions.
- Operators act within approved constraints.

The system must enforce these boundaries through permissions, approvals, and AI behavior.

### 4.3 Semantic clarity over artifact sprawl  
Canonical definitions matter more than dashboards. Reusable, governed metrics take precedence over one-off analyses.

### 4.4 Decisions are first-class objects  
Analysis exists to support decisions. Decisions must be explicitly captured, linked to metrics and assumptions, and tracked through outcomes.

### 4.5 Time-to-answer without trust erosion  
Speed matters, but never at the expense of correctness, lineage, or semantic consistency.

### 4.6 Progressive autonomy with explicit guardrails  
Low-risk actions may be initiated with approval gates and audit trails. Higher-risk execution always requires human review.

### 4.7 Human–agent collaboration by design  
The system must support both human-driven and agent-driven workflows with shared context and clearly defined authority.

---

## 5) Core Product Capabilities

### 5.1 Foundational Data Modeling and Materialization  
**Owner:** Data teams

AI-assisted SQL generation and refactoring with full visibility, lineage tracking, and safe iteration on models and materializations.

---

### 5.2 AI-Assisted Raw Data Exploration  
**Owners:** Data teams, operators (with guardrails)

Natural-language and SQL-based exploration with transparent execution, query traces, and permission-aware access.

---

### 5.3 Governed Metric Layer  
**Owner:** Finance (with data partnership)

Canonical metric definitions with ownership, approval states, versioning, and dependency tracking.

---

### 5.4 Business Context and Semantic Enrichment  
**Owner:** Finance

Definitions, assumptions, constraints, and intent attached to metrics and analyses to ground AI reasoning in business reality.

---

### 5.5 Observation, Visualization, and Review  
**Owners:** Humans and agents

Shared mechanisms for observing what is happening or has happened:
- Flexible visualizations grounded in governed metrics.
- Comparative and time-based views.
- Agent- and human-readable summaries.
- Saved views as durable diagnostic references.

Visualization is a **trigger for analysis**, not an end state.

---

### 5.6 Analysis and Review Artifacts  
**Owners:** Operators, data teams, finance

Narrative analysis combining metrics, queries, assumptions, and interpretation. Explicit separation between exploratory and reviewed analysis.

---

### 5.7 Decision Capture and Intent Definition  
**Owners:** Operators, finance

Explicit recording of decisions, rationale, alternatives considered, ownership, and approval state—linked to supporting analysis.

---

### 5.8 Decision-to-Outcome Tracking  
**Owner:** Finance

Tracking actions taken, measuring outcomes against original assumptions, and enabling retrospective evaluation of decision quality.

---

### 5.9 Low-Risk Action Initiation with Guardrails  
**Owners:** Operators (with approval), finance

Proposal, approval, execution, and auditability of low-risk actions in connected systems.

---

## 6) Success Metrics

Northstar succeeds if it reduces decision latency while increasing trust, alignment, and outcome accountability.

### Primary Metrics
- **Time to confident decision**
- **Decision coverage rate**
- **Cross-role weekly active usage (active creation/review/approval)**
- **Ad hoc analysis compression**

### Secondary Metrics
- **Metric reuse rate**
- **Semantic change stability**
- **AI-assisted workflow penetration**
- **Insight-to-action conversion rate**

Guardrail metrics (monitored, not optimized):
- Dashboard count
- Passive view volume
- Raw query volume without decisions
- Autonomous actions without approval

If metrics conflict: trust and semantic clarity win over speed.

---

## 7) Competitive Positioning

Northstar competes with modern analytics platforms by prioritizing **decision coordination** over report production.

Differentiation:
- Built for role convergence in AI-native organizations.
- Centers on semantic trust and actionability.
- Designed as shared infrastructure for humans and agents operating on common business context.

---

## 8) Risks and Mitigations

- **AI reduces trust** → enforce transparency, lineage, and review.
- **Semantic drift** → ownership, versioning, and approval gates.
- **Reversion to BI patterns** → optimize for decision workflows, not dashboards.
- **Scope creep into execution systems** → remain a coordination layer, not a system of record.

---

## 9) Long-Term Vision

Northstar becomes the operating model for data-driven mid-market companies: a self-operable, AI-native coordination layer where humans and agents decide, act, and measure outcomes continuously.

Expansion includes:
- Multi-domain decision workflows.
- Broader industry applicability with shared semantic trust.
- Deep integrations enabling evaluated, agent-driven execution.
