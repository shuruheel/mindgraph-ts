/**
 * Research Continuity Example
 * ============================
 *
 * Demonstrates MindGraph's core value: persistent structured memory that lets
 * an agent resume research across sessions without starting from scratch.
 *
 * Scenario: Evaluate vector databases (Pinecone, Weaviate, Qdrant) for a
 * RAG-based AI assistant. Session 1 captures initial findings. Session 2
 * retrieves that context and uses it to drive a final decision.
 *
 * No LLM calls — all research data is hardcoded so you can inspect the
 * graph operations without needing an LLM key. In a real agent, each
 * capture/argue/inquire call would use LLM-generated content.
 *
 * Usage:
 *   export MINDGRAPH_URL="https://api.mindgraph.cloud"
 *   export MINDGRAPH_API_KEY="mg_..."
 *   npx tsx examples/research-continuity.ts
 */

import { MindGraph } from "../src/index.js";

const url = process.env.MINDGRAPH_URL || "https://api.mindgraph.cloud";
const apiKey = process.env.MINDGRAPH_API_KEY;
if (!apiKey) {
  console.error("Error: set MINDGRAPH_API_KEY environment variable");
  process.exit(1);
}

const graph = new MindGraph({ baseUrl: url, apiKey });

// Helper: the server returns search results as { node, score } but the TS
// type expects flat SearchResult. Handle both shapes.
function nodeLabel(r: any): string {
  return r.node?.label ?? r.label;
}

async function main() {
  // ================================================================
  // SESSION 1: Initial Research
  // ================================================================
  console.log("=".repeat(60));
  console.log("SESSION 1: Initial Research");
  console.log("=".repeat(60));

  // Open a session to group all activity
  const s1 = (await graph.session({
    action: "open",
    label: "Vector DB evaluation — initial research",
  })) as any;
  const session1Uid: string = s1.uid;
  console.log(`  Opened session: ${session1Uid}`);

  // --- Define research goal (Intent layer) ---
  const goal = (await graph.commit({
    action: "goal",
    label: "Evaluate vector databases for RAG assistant",
    summary:
      "Compare Pinecone, Weaviate, and Qdrant on cost, latency, " +
      "filtering, managed vs self-hosted, and ecosystem fit.",
  })) as any;
  const goalUid: string = goal.uid;
  console.log(`  Created goal: ${goal.label}`);

  // --- Capture sources (Reality layer) ---
  // A real agent would fetch these from the web; we record them as sources.
  const srcPinecone = (await graph.capture({
    action: "source",
    label: "Pinecone documentation & benchmarks",
    summary:
      "Official Pinecone docs covering serverless architecture, " +
      "pricing tiers, metadata filtering, and published p99 latency numbers.",
  })) as any;

  const srcWeaviate = (await graph.capture({
    action: "source",
    label: "Weaviate documentation & community benchmarks",
    summary:
      "Weaviate docs on hybrid search, HNSW tuning, module ecosystem, " +
      "and self-hosted vs cloud pricing.",
  })) as any;

  const srcQdrant = (await graph.capture({
    action: "source",
    label: "Qdrant documentation & ANN benchmarks",
    summary:
      "Qdrant docs on payload filtering, quantization, gRPC API, " +
      "and published ann-benchmarks results.",
  })) as any;
  console.log("  Captured 3 sources");

  // --- Record observations ---
  const obsPineconeCost = (await graph.capture({
    action: "observation",
    label: "Pinecone serverless costs scale with reads",
    summary:
      "Pinecone serverless charges per read unit. At 1M queries/month " +
      "the cost is ~$70/mo for 1M vectors, but jumps to ~$280/mo at 5M queries.",
  })) as any;

  const obsWeaviateHybrid = (await graph.capture({
    action: "observation",
    label: "Weaviate supports native hybrid search",
    summary:
      "Weaviate combines BM25 keyword search with vector search in a " +
      "single query via its hybrid search operator, eliminating the need " +
      "for a separate keyword index.",
  })) as any;

  const obsQdrantFiltering = (await graph.capture({
    action: "observation",
    label: "Qdrant payload filtering is pre-search",
    summary:
      "Qdrant applies payload (metadata) filters before HNSW traversal, " +
      "giving exact filter results without post-search recall loss. " +
      "Pinecone and Weaviate apply filters post-search by default.",
  })) as any;
  console.log("  Recorded 3 observations");

  // --- Build claims with evidence (Epistemic layer) ---
  // argue() creates a Claim node and links Evidence nodes to it.
  // Claim summary is derived from props.content; evidence from props.description.
  const argQdrant = (await graph.argue({
    claim: {
      label: "Qdrant has the best metadata filtering for RAG",
      props: {
        content:
          "Pre-search filtering preserves recall while enforcing " +
          "exact metadata constraints — critical for multi-tenant RAG.",
      },
    },
    evidence: [
      {
        label: "Qdrant pre-search filtering benchmark",
        props: {
          description:
            "ANN-benchmarks show Qdrant maintains 95%+ recall with " +
            "payload filters vs 80-85% for post-filter approaches.",
        },
      },
    ],
  })) as any;
  const claimQdrantUid: string = argQdrant.claim_uid;

  const argWeaviate = (await graph.argue({
    claim: {
      label: "Weaviate's hybrid search reduces retrieval pipeline complexity",
      props: {
        content:
          "Built-in BM25 + vector fusion means one fewer service to " +
          "deploy and maintain compared to Pinecone + Elasticsearch.",
      },
    },
    evidence: [
      {
        label: "Weaviate hybrid search documentation",
        props: {
          description:
            "Single API call combines keyword and vector results with " +
            "configurable alpha weighting.",
        },
      },
    ],
  })) as any;
  const claimWeaviateUid: string = argWeaviate.claim_uid;
  console.log("  Built 2 claims with evidence");

  // --- Record open questions (Epistemic layer) ---
  const qLatency = (await graph.inquire({
    action: "open_question",
    label: "How does Qdrant's p99 latency compare under concurrent load?",
    summary:
      "Benchmarks are single-client. Need multi-client latency data " +
      "to confirm Qdrant can handle 100+ concurrent RAG queries.",
    props: { status: "open" },
  })) as any;

  const qCost = (await graph.inquire({
    action: "open_question",
    label: "What is the total cost of self-hosting Qdrant vs Pinecone serverless?",
    summary:
      "Qdrant Cloud pricing is competitive, but self-hosted on k8s " +
      "requires ops effort. Need a 12-month TCO comparison.",
    props: { status: "open" },
  })) as any;

  const qMigration = (await graph.inquire({
    action: "open_question",
    label: "How easy is it to migrate from Pinecone to Qdrant?",
    summary:
      "If we start with Pinecone for speed, can we migrate later " +
      "without re-indexing all vectors?",
    props: { status: "open" },
  })) as any;
  console.log("  Recorded 3 open questions");

  // --- Journal summary (Memory layer) ---
  // Captures the researcher's unstructured thoughts about the session.
  await graph.journal("Session 1 wrap-up", {}, {
    summary:
      "Initial research complete. Qdrant leads on filtering, Weaviate " +
      "on hybrid search simplicity, Pinecone on zero-ops. Three open " +
      "questions remain around latency, TCO, and migration feasibility. " +
      "Next session should resolve these before making a recommendation.",
    session_uid: session1Uid,
  });
  console.log("  Wrote journal entry");

  // Close session
  await graph.session({ action: "close", session_uid: session1Uid });
  console.log("  Closed session 1\n");

  // Collect UIDs from Session 1 for later use in distill
  const session1Uids = [
    goalUid,
    srcPinecone.uid, srcWeaviate.uid, srcQdrant.uid,
    obsPineconeCost.uid, obsWeaviateHybrid.uid, obsQdrantFiltering.uid,
    claimQdrantUid, claimWeaviateUid,
    qLatency.uid, qCost.uid, qMigration.uid,
  ];

  // ================================================================
  // SESSION 2: Resume & Decide
  // ================================================================
  console.log("=".repeat(60));
  console.log("SESSION 2: Resume & Decide");
  console.log("=".repeat(60));

  const s2 = (await graph.session({
    action: "open",
    label: "Vector DB evaluation — decision",
  })) as any;
  const session2Uid: string = s2.uid;
  console.log(`  Opened session: ${session2Uid}\n`);

  // --- RESUME CONTEXT BLOCK ---
  // This is the "money shot": retrieving prior context proves the agent
  // did not start from zero.
  console.log("  --- Resuming with prior context ---");

  // Retrieve active goals
  const goalsResp = (await graph.retrieve({ action: "active_goals" })) as any;
  const goals: any[] = Array.isArray(goalsResp) ? goalsResp : goalsResp.nodes ?? [];
  const activeGoal = goals.find((g: any) => g.uid === goalUid) ?? goals[0];
  if (activeGoal) {
    console.log(`  Goal: ${activeGoal.label}`);
  }

  // Retrieve open questions
  const questionsResp = (await graph.retrieve({ action: "open_questions" })) as any;
  const questions: any[] = Array.isArray(questionsResp) ? questionsResp : questionsResp.nodes ?? [];
  console.log(`  Open questions (${questions.length}):`);
  for (const q of questions) {
    console.log(`    - ${q.label}`);
  }

  // Search for prior findings about vector databases
  const searchResults = await graph.search("Qdrant filtering Pinecone");
  console.log(`  Prior findings (${searchResults.length} matches):`);
  for (const r of searchResults.slice(0, 5)) {
    console.log(`    - ${nodeLabel(r)}`);
  }

  console.log("  --- End resume context ---\n");

  // --- Address each open question with new observations ---
  // Retrieved questions drive what we research next.
  const session2Uids: string[] = [];

  // Question 1: Qdrant p99 latency under concurrent load
  const obsLatency = (await graph.capture({
    action: "observation",
    label: "Qdrant p99 latency is 12ms at 100 concurrent clients",
    summary:
      "Load testing with 100 concurrent clients on a 3-node Qdrant " +
      "cluster (1M vectors, 768 dims) shows p99 of 12ms. Pinecone " +
      "serverless shows p99 of 18ms under the same workload. " +
      `Addresses question: '${qLatency.label}'`,
  })) as any;
  session2Uids.push(obsLatency.uid);
  console.log(`  Answered: ${qLatency.label}`);

  // Question 2: TCO comparison
  const obsTco = (await graph.capture({
    action: "observation",
    label: "Qdrant Cloud TCO is 40% lower than Pinecone at scale",
    summary:
      "12-month TCO for 5M vectors, 2M queries/month: Pinecone " +
      "serverless ~$3,360/yr, Qdrant Cloud ~$2,016/yr (3-node managed). " +
      "Self-hosted Qdrant on k8s ~$1,440/yr but adds ~8 hrs/month ops. " +
      `Addresses question: '${qCost.label}'`,
  })) as any;
  session2Uids.push(obsTco.uid);
  console.log(`  Answered: ${qCost.label}`);

  // Question 3: Migration feasibility — partially answered
  const obsMigration = (await graph.capture({
    action: "observation",
    label: "Pinecone-to-Qdrant migration requires re-indexing",
    summary:
      "Pinecone does not support bulk vector export. Migration " +
      "requires re-embedding from source documents. Estimated effort: " +
      "2-3 days for 5M vectors. Not a dealbreaker but worth noting. " +
      `Partially addresses: '${qMigration.label}'`,
  })) as any;
  session2Uids.push(obsMigration.uid);
  console.log(`  Partially answered: ${qMigration.label}\n`);

  // --- Open a decision (Intent layer) ---
  // The decision summary references the retrieved goal.
  const decision = (await graph.deliberate({
    action: "open_decision",
    label: "Choose vector database for RAG assistant",
    summary:
      `Decision needed to fulfill goal: '${activeGoal.label}'. ` +
      "Three candidates evaluated across cost, latency, filtering, " +
      "hybrid search, and ops overhead.",
  })) as any;
  const decisionUid: string = decision.uid;
  session2Uids.push(decisionUid);

  // --- Add options referencing prior claims ---
  const optQdrant = (await graph.deliberate({
    action: "add_option",
    decision_uid: decisionUid,
    label: "Qdrant Cloud",
    summary:
      "Best-in-class filtering (pre-search), lowest TCO at scale, " +
      "strong latency. Requires learning Qdrant's query DSL. " +
      `Supported by: '${claimQdrantUid}' (filtering claim).`,
  })) as any;

  const optWeaviate = (await graph.deliberate({
    action: "add_option",
    decision_uid: decisionUid,
    label: "Weaviate Cloud",
    summary:
      "Native hybrid search simplifies architecture. Mid-range cost. " +
      `Supported by: '${claimWeaviateUid}' (hybrid search claim). ` +
      "Weaker metadata filtering than Qdrant.",
  })) as any;

  const optPinecone = (await graph.deliberate({
    action: "add_option",
    decision_uid: decisionUid,
    label: "Pinecone Serverless",
    summary:
      "Zero-ops, fastest time to production. Highest cost at scale, " +
      "post-search filtering reduces recall. No bulk export for migration.",
  })) as any;
  console.log("  Opened decision with 3 options");

  // --- Resolve the decision ---
  // Chosen option justified by evidence gathered across both sessions.
  await graph.deliberate({
    action: "resolve",
    decision_uid: decisionUid,
    chosen_option_uid: optQdrant.uid,
    summary:
      "Choosing Qdrant Cloud. Pre-search filtering maintains 95%+ " +
      "recall (critical for multi-tenant RAG). 40% lower TCO than " +
      "Pinecone at projected scale. p99 latency of 12ms beats Pinecone's " +
      "18ms. Tradeoff: Weaviate's hybrid search is convenient, but we " +
      "can implement BM25 + vector fusion at the application layer. " +
      "Caveat: migration from any future provider will require re-indexing.",
  });
  session2Uids.push(optQdrant.uid, optWeaviate.uid, optPinecone.uid);
  console.log("  Resolved decision: Qdrant Cloud\n");

  // --- Distill final summary (Memory layer) ---
  // summarizes_uids spans both sessions, summary synthesizes everything.
  const allUids = [...session1Uids, ...session2Uids];
  const distillResult = (await graph.distill({
    label: "Vector DB Evaluation — Final Recommendation",
    summary:
      "Recommendation: Qdrant Cloud for the RAG assistant.\n\n" +
      "Key findings:\n" +
      "- Qdrant's pre-search payload filtering maintains 95%+ recall with " +
      "exact metadata constraints, critical for multi-tenant isolation.\n" +
      "- 12-month TCO at projected scale (5M vectors, 2M queries/mo): " +
      "Qdrant Cloud ~$2,016/yr vs Pinecone ~$3,360/yr (40% savings).\n" +
      "- p99 latency under 100 concurrent clients: Qdrant 12ms vs " +
      "Pinecone 18ms.\n\n" +
      "Resolved open questions:\n" +
      "- Latency under load: confirmed competitive (12ms p99).\n" +
      "- TCO: Qdrant Cloud is 40% cheaper; self-hosted saves more but " +
      "adds ops burden.\n\n" +
      "Remaining caveat:\n" +
      "- Migration requires re-embedding from source docs (~2-3 days for 5M " +
      "vectors). Pinecone does not support bulk export. This is acceptable " +
      "risk given the cost and performance advantages.\n\n" +
      "Tradeoff accepted: Weaviate's built-in hybrid search is convenient " +
      "but can be replicated at the application layer. Qdrant's filtering " +
      "advantage is harder to work around.",
    summarizes_uids: allUids,
  })) as any;
  session2Uids.push(distillResult.uid);
  console.log(`  Distilled final summary: ${distillResult.uid}`);

  // Close session
  await graph.session({ action: "close", session_uid: session2Uid });
  console.log("  Closed session 2\n");

  // ================================================================
  // FINAL OUTPUT
  // ================================================================
  console.log("=".repeat(60));
  console.log("RECOMMENDATION");
  console.log("=".repeat(60));
  console.log();
  console.log("  Chosen: Qdrant Cloud");
  console.log();
  console.log("  Evidence (from Session 1):");
  console.log("    - Pre-search filtering preserves 95%+ recall");
  console.log("    - Hybrid search is nice-to-have but reproducible at app layer");
  console.log();
  console.log("  Questions resolved (in Session 2):");
  console.log("    - Latency under load: 12ms p99 at 100 concurrent clients");
  console.log("    - TCO: 40% cheaper than Pinecone at projected scale");
  console.log();
  console.log("  Remaining caveat:");
  console.log("    - Migration requires re-embedding (~2-3 days for 5M vectors)");
  console.log();
  console.log("  The agent resumed Session 2 with full context from Session 1.");
  console.log("  No research was repeated. Open questions drove targeted follow-up.");
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
