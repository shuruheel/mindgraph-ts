# MindGraph TypeScript SDK — Examples

## research-continuity.ts

**What it demonstrates:** An AI research agent that evaluates vector databases across two sessions, using MindGraph as persistent structured memory. Session 2 retrieves goals, open questions, and findings from Session 1 — then uses that context to drive new observations and a final decision.

**Why it matters:** Without structured memory, an agent resuming a task would re-research everything from scratch. With MindGraph, the agent picks up exactly where it left off: it knows what questions are still open, what claims have been established, and what the original goal was. Retrieved context directly shapes Session 2 behavior — open questions become targeted follow-up research, prior claims inform the final recommendation.

### Prerequisites

- Node.js 18+ or Bun
- `npm install mindgraph` (or `bun install`)
- A MindGraph API key ([get one here](https://mindgraph.cloud))

### Run

```bash
export MINDGRAPH_URL="https://api.mindgraph.cloud"
export MINDGRAPH_API_KEY="mg_..."
npx tsx examples/research-continuity.ts
```

### What to look for

1. **Resume context block** (Session 2) — the agent prints retrieved goals, open questions, and prior findings before doing anything new.
2. **Retrieval drives behavior** — each open question from Session 1 gets a targeted new observation in Session 2. The decision summary references the original goal. The distill summary synthesizes findings from both sessions.
3. **Structured knowledge** — sources, observations, claims with evidence, open questions, decisions with options, and a final distillation. Each node type carries semantic meaning the agent can query later.

### SDK methods used

| Layer | Methods |
|-------|---------|
| Reality | `capture({ action: "source" })`, `capture({ action: "observation" })` |
| Epistemic | `argue({ claim, evidence })`, `inquire({ action: "open_question" })` |
| Intent | `commit({ action: "goal" })`, `deliberate({ open_decision / add_option / resolve })` |
| Memory | `session({ open / close })`, `journal()`, `distill()` |
| Cross-cutting | `retrieve({ action: "active_goals" / "open_questions" })`, `search()` |
