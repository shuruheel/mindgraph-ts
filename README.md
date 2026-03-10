# mindgraph

[![npm](https://img.shields.io/npm/v/mindgraph)](https://www.npmjs.com/package/mindgraph)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

TypeScript client for the [MindGraph Cloud](https://mindgraph.cloud) API — a structured semantic memory graph for AI agents.

## Install

```bash
npm install mindgraph
```

## Quick Start

```typescript
import { MindGraph } from "mindgraph";

const graph = new MindGraph({
  baseUrl: "https://api.mindgraph.cloud",
  apiKey: "mg_...",
});

// Add a node
const node = await graph.addNode({
  label: "User prefers dark mode",
  node_type: "Preference",
});

// Search
const results = await graph.search("what does the user prefer?");

// Connect knowledge
await graph.addLink({
  from_uid: node.uid,
  to_uid: "user_abc",
  edge_type: "BelongsTo",
});
```

## API Reference

### Constructor

```typescript
new MindGraph({ baseUrl: string, apiKey?: string, jwt?: string })
```

### Reality Layer

| Method | Description |
|--------|-------------|
| `capture(req)` | Capture a source, snippet, or observation |
| `entity(req)` | Create, alias, resolve, or merge entities |
| `findOrCreateEntity(label, entityType?, agentId?)` | Convenience: create or find an entity by label |

### Epistemic Layer

| Method | Description |
|--------|-------------|
| `argue(req)` | Construct a full argument: claim + evidence + warrant + edges |
| `inquire(req)` | Add hypothesis, theory, paradigm, anomaly, assumption, or question |
| `structure(req)` | Add concept, pattern, mechanism, model, analogy, theorem, etc. |

### Intent Layer

| Method | Description |
|--------|-------------|
| `commit(req)` | Create a goal, project, or milestone |
| `deliberate(req)` | Open decisions, add options/constraints, resolve decisions |

### Action Layer

| Method | Description |
|--------|-------------|
| `procedure(req)` | Build flows, add steps, affordances, and controls |
| `risk(req)` | Assess risk or retrieve existing assessments |

### Memory Layer

| Method | Description |
|--------|-------------|
| `session(req)` | Open a session, record traces, or close a session |
| `journal(label, props, options?)` | Record a journal entry linked to an optional session |
| `distill(req)` | Create a summary that distills multiple source nodes |
| `memoryConfig(req)` | Set/get preferences and memory policies |

### Agent Layer

| Method | Description |
|--------|-------------|
| `plan(req)` | Create tasks, plans, plan steps, update status |
| `governance(req)` | Create policies, set safety budgets, request/resolve approvals |
| `execution(req)` | Track execution lifecycle and register agents |

### CRUD

| Method | Description |
|--------|-------------|
| `getNode(uid)` | Get a node by UID |
| `addNode({ label, node_type?, props?, agent_id? })` | Add a generic node |
| `updateNode(uid, { label?, summary?, confidence?, salience? })` | Update node fields |
| `deleteNode(uid)` | Tombstone a node and all connected edges |
| `addLink({ from_uid, to_uid, edge_type, agent_id? })` | Add a typed edge |
| `getEdges({ from_uid?, to_uid? })` | Get edges by source or target |

### Search

| Method | Description |
|--------|-------------|
| `search(query, { node_type?, layer?, limit? })` | Full-text search |
| `hybridSearch(query, { k?, node_types?, layer? })` | BM25 + vector search with rank fusion |

### Traversal

| Method | Description |
|--------|-------------|
| `reasoningChain(uid, maxDepth?)` | Follow epistemic edges from a node |
| `neighborhood(uid, maxDepth?)` | Get all nodes within N hops |

### Ingestion & Retrieval

| Method | Description |
|--------|-------------|
| `ingestChunk(req)` | Ingest a single text chunk (sync): stores, embeds, and runs LLM extraction |
| `ingestDocument(req)` | Ingest a full document (async): chunks text, returns job ID |
| `ingestSession(req)` | Ingest a session transcript (async): links to session, returns job ID |
| `retrieveContext(req)` | Retrieve semantically matched chunks + connected graph nodes/edges |
| `getJob(id)` | Get async job status and progress |
| `clearGraph()` | Clear all graph data |

### Lifecycle Shortcuts

| Method | Description |
|--------|-------------|
| `tombstone(uid, reason?, agentId?)` | Soft-delete a node |
| `restore(uid, agentId?)` | Restore a tombstoned node |

### Cross-cutting

| Method | Description |
|--------|-------------|
| `retrieve(req)` | Unified retrieval: text search, active goals, open questions, weak claims |
| `traverse(req)` | Graph traversal: chain, neighborhood, path, or subgraph |
| `evolve(req)` | Lifecycle mutations: update, tombstone, restore, decay, history |

### Health & Stats

| Method | Description |
|--------|-------------|
| `health()` | Health check |
| `stats()` | Graph-wide statistics |

### Management (Cloud only)

| Method | Description |
|--------|-------------|
| `signup(email, password)` | Create a new account |
| `login(email, password)` | Login and receive JWT |
| `createApiKey(name?)` | Create an API key |
| `listApiKeys()` | List all API keys |
| `revokeApiKey(id)` | Revoke an API key |
| `getUsage()` | Get usage statistics |

## Examples

See [`examples/`](examples/) for runnable demos, including a [research continuity](examples/research-continuity.ts) scenario showing cross-session memory retrieval.

## Error Handling

All methods throw `MindGraphError` on HTTP errors:

```typescript
import { MindGraphError } from "mindgraph";

try {
  await graph.getNode("nonexistent");
} catch (err) {
  if (err instanceof MindGraphError) {
    console.error(err.status, err.body);
  }
}
```

## License

MIT
