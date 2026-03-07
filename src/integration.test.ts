/**
 * Comprehensive integration tests for the MindGraph TypeScript SDK.
 * Tests every public method against the live Cloud API.
 *
 * Run: API_KEY=mg_live_... bun test src/integration.test.ts
 */
import { describe, test, expect, beforeAll } from "vitest";
import { MindGraph } from "./client.js";

const API_KEY = process.env.API_KEY ?? process.env.MINDGRAPH_API_KEY ?? "";
const BASE_URL = process.env.BASE_URL ?? "https://api.mindgraph.cloud";

describe.skipIf(!API_KEY)("MindGraph SDK Integration Tests", () => {
  let mg: MindGraph;

  // UIDs collected during the test run
  const uids: Record<string, string> = {};

  beforeAll(() => {
    mg = new MindGraph({ baseUrl: BASE_URL, apiKey: API_KEY });
  });

  // ============================================================
  // 1. Health & Stats
  // ============================================================
  describe("Health & Stats", () => {
    test("health", async () => {
      const r = await mg.health();
      expect(r.status).toBe("ok");
    });

    test("stats", async () => {
      const r = await mg.stats();
      expect(r).toHaveProperty("live_nodes");
    });
  });

  // ============================================================
  // 2. Management
  // ============================================================
  describe("Management", () => {
    test("listApiKeys", async () => {
      const r = await mg.listApiKeys();
      expect(r).toHaveProperty("api_keys");
    });

    test("getUsage", async () => {
      const r = await mg.getUsage();
      expect(r).toHaveProperty("org_id");
    });
  });

  // ============================================================
  // 3. Reality Layer
  // ============================================================
  describe("Reality: Ingest", () => {
    test("source", async () => {
      const r = await mg.ingest({
        action: "source",
        label: "TS SDK Test Source",
        summary: "Integration test source",
        props: { uri: "https://example.com", title: "Example" },
      });
      expect(r).toHaveProperty("uid");
      uids.source = (r as any).uid;
    });

    test("snippet", async () => {
      const r = await mg.ingest({
        action: "snippet",
        label: "TS SDK Test Snippet",
        summary: "A snippet from the source",
        source_uid: uids.source,
      });
      expect(r).toHaveProperty("uid");
    });

    test("observation", async () => {
      const r = await mg.ingest({
        action: "observation",
        label: "TS SDK Test Observation",
        summary: "Something observed during testing",
        props: { content: "The SDK is working well" },
      });
      expect(r).toHaveProperty("uid");
      uids.observation = (r as any).uid;
    });
  });

  describe("Reality: Entity", () => {
    test("create", async () => {
      const r = await mg.entity({
        action: "create",
        label: "TS SDK Test Entity",
        summary: "A test entity",
        props: { canonical_name: "ts-test-entity", entity_type: "concept" },
      });
      expect(r).toHaveProperty("uid");
      uids.entity = (r as any).uid;
    });

    test("alias", async () => {
      const r = await mg.entity({
        action: "alias",
        text: "ts-sdk-entity-alias",
        canonical_uid: uids.entity,
      } as any);
      expect(r).toBeDefined();
    });

    test("resolve", async () => {
      const r = await mg.entity({
        action: "resolve",
        text: "ts-sdk-entity-alias",
      } as any);
      expect(r).toBeDefined();
    });

    test("relate", async () => {
      const r = await mg.entity({
        action: "relate",
        source_uid: uids.entity,
        target_uid: uids.observation,
        edge_type: "Related",
      } as any);
      expect(r).toBeDefined();
    });

    test("findOrCreateEntity", async () => {
      const r = await mg.findOrCreateEntity("TS SDK Find-or-Create", {
        canonical_name: "ts-foc",
      });
      expect(r).toHaveProperty("uid");
      uids.focEntity = r.uid;
    });
  });

  // ============================================================
  // 4. Epistemic Layer
  // ============================================================
  describe("Epistemic: Inquiry", () => {
    test("hypothesis", async () => {
      const r = await mg.inquire({
        action: "hypothesis",
        label: "TS Hypothesis",
        summary: "If we test, then quality improves",
        props: { statement: "Testing leads to quality" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("theory", async () => {
      const r = await mg.inquire({
        action: "theory",
        label: "TS Theory",
        summary: "Theory of software reliability",
      });
      expect(r).toHaveProperty("uid");
    });

    test("question", async () => {
      const r = await mg.inquire({
        action: "question",
        label: "TS Question",
        summary: "How to improve coverage?",
        props: { question: "How to improve test coverage?" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("open_question", async () => {
      const r = await mg.inquire({
        action: "open_question",
        label: "TS Open Question",
        summary: "What makes software good?",
        props: { question: "What makes software good?" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("assumption", async () => {
      const r = await mg.inquire({
        action: "assumption",
        label: "TS Assumption",
        summary: "Tests are deterministic",
      });
      expect(r).toHaveProperty("uid");
    });

    test("anomaly", async () => {
      const r = await mg.inquire({
        action: "anomaly",
        label: "TS Anomaly",
        summary: "Test passed when it should have failed",
      });
      expect(r).toHaveProperty("uid");
    });

    test("paradigm", async () => {
      const r = await mg.inquire({
        action: "paradigm",
        label: "TS Paradigm",
        summary: "Test-driven development paradigm",
      });
      expect(r).toHaveProperty("uid");
    });
  });

  describe("Epistemic: Argument", () => {
    test("argue", async () => {
      const r = await mg.argue({
        claim: { label: "TS Claim", statement: "SDKs should be tested" },
        evidence: [
          { label: "TS Evidence", statement: "Untested SDKs have more bugs" },
        ],
      });
      expect(r).toHaveProperty("claim_uid");
      uids.claim = (r as any).claim_uid;
    });
  });

  describe("Epistemic: Structure", () => {
    const structureActions = [
      "concept",
      "pattern",
      "mechanism",
      "model",
      "model_evaluation",
      "analogy",
      "inference_chain",
      "reasoning_strategy",
      "sensitivity_analysis",
      "theorem",
      "equation",
      "method",
      "experiment",
    ] as const;

    for (const action of structureActions) {
      test(action, async () => {
        const r = await mg.structure({
          action,
          label: `TS ${action}`,
          summary: `Test ${action} node`,
        });
        expect(r).toHaveProperty("uid");
      });
    }
  });

  // ============================================================
  // 5. Intent Layer
  // ============================================================
  describe("Intent: Commitment", () => {
    test("goal", async () => {
      const r = await mg.commit({
        action: "goal",
        label: "TS Goal",
        summary: "Complete SDK integration tests",
      });
      expect(r).toHaveProperty("uid");
      uids.goal = (r as any).uid;
    });

    test("project", async () => {
      const r = await mg.commit({
        action: "project",
        label: "TS Project",
        summary: "SDK test project",
        parent_uid: uids.goal,
      });
      expect(r).toHaveProperty("uid");
      uids.project = (r as any).uid;
    });

    test("milestone", async () => {
      const r = await mg.commit({
        action: "milestone",
        label: "TS Milestone",
        summary: "All tests passing",
        parent_uid: uids.project,
      });
      expect(r).toHaveProperty("uid");
    });
  });

  describe("Intent: Deliberation", () => {
    test("open_decision", async () => {
      const r = await mg.deliberate({
        action: "open_decision",
        label: "TS Decision",
        summary: "Which testing framework?",
      });
      expect(r).toHaveProperty("uid");
      uids.decision = (r as any).uid;
    });

    test("add_option", async () => {
      const r = await mg.deliberate({
        action: "add_option",
        label: "Option: Vitest",
        summary: "Use vitest for testing",
        decision_uid: uids.decision,
      });
      expect(r).toHaveProperty("uid");
    });

    test("add_constraint", async () => {
      const r = await mg.deliberate({
        action: "add_constraint",
        label: "Must be fast",
        summary: "Tests must run in under 60s",
        decision_uid: uids.decision,
      });
      expect(r).toHaveProperty("uid");
    });

    test("resolve", async () => {
      // Create an option to choose
      const opt = await mg.deliberate({
        action: "add_option",
        label: "Option: Bun Test",
        summary: "Use bun test",
        decision_uid: uids.decision,
      });
      const r = await mg.deliberate({
        action: "resolve",
        label: "Chose Bun Test",
        summary: "Bun test selected for speed",
        decision_uid: uids.decision,
        chosen_option_uid: (opt as any).uid,
        props: { decision_rationale: "Bun is fastest" },
      });
      expect(r).toBeDefined();
    });

    test("get_open", async () => {
      const r = await mg.deliberate({ action: "get_open" });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 6. Action Layer
  // ============================================================
  describe("Action: Procedure", () => {
    test("create_flow", async () => {
      const r = await mg.procedure({
        action: "create_flow",
        label: "TS Test Flow",
        summary: "SDK test workflow",
      });
      expect(r).toHaveProperty("uid");
      uids.flow = (r as any).uid;
    });

    test("add_step", async () => {
      const r = await mg.procedure({
        action: "add_step",
        label: "Step 1: Setup",
        summary: "Initialize test environment",
        flow_uid: uids.flow,
      });
      expect(r).toHaveProperty("uid");
    });

    test("add_affordance", async () => {
      const r = await mg.procedure({
        action: "add_affordance",
        label: "TS Affordance",
        summary: "Can run tests",
        props: { action_name: "run_tests" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("add_control", async () => {
      const r = await mg.procedure({
        action: "add_control",
        label: "TS Control",
        summary: "Must pass linting first",
        props: { condition: "lint passes", action: "allow test run" },
      });
      expect(r).toHaveProperty("uid");
    });
  });

  describe("Action: Risk", () => {
    test("assess", async () => {
      const r = await mg.risk({
        action: "assess",
        label: "TS Risk",
        summary: "SDK may have undiscovered bugs",
        props: { vulnerability: "untested paths", mitigation: "add more tests" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("get_assessments", async () => {
      const r = await mg.risk({ action: "get_assessments" });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 7. Memory Layer
  // ============================================================
  describe("Memory: Session", () => {
    test("open", async () => {
      const r = await mg.session({
        action: "open",
        label: "TS Test Session",
        summary: "SDK integration test session",
      });
      expect(r).toHaveProperty("uid");
      uids.session = (r as any).uid;
    });

    test("journal", async () => {
      const r = await mg.journal("TS Journal Entry", {
        content: "Testing the journal convenience method",
      }, { session_uid: uids.session });
      expect(r).toHaveProperty("uid");
    });

    test("trace", async () => {
      const r = await mg.session({
        action: "trace",
        label: "TS Trace",
        summary: "Debug info logged",
        session_uid: uids.session,
      });
      expect(r).toHaveProperty("uid");
    });

    test("close", async () => {
      const r = await mg.session({
        action: "close",
        session_uid: uids.session,
      });
      expect(r).toBeDefined();
    });
  });

  describe("Memory: Distill", () => {
    test("distill", async () => {
      const r = await mg.distill({
        label: "TS Lesson Learned",
        summary: "Integration tests catch real bugs",
        source_uids: [uids.observation],
      });
      expect(r).toHaveProperty("uid");
    });
  });

  describe("Memory: Config", () => {
    test("set_preference", async () => {
      const r = await mg.memoryConfig({
        action: "set_preference",
        label: "TS Preference",
        summary: "Prefer verbose output",
        props: { key: "output_verbosity", value: "verbose" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("set_policy", async () => {
      const r = await mg.memoryConfig({
        action: "set_policy",
        label: "TS Policy",
        summary: "Always run tests before commit",
        props: { principle: "test first" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("get_preferences", async () => {
      const r = await mg.memoryConfig({ action: "get_preferences" });
      expect(r).toBeDefined();
    });

    test("get_policies", async () => {
      const r = await mg.memoryConfig({ action: "get_policies" });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 8. Agent Layer
  // ============================================================
  describe("Agent: Plan", () => {
    test("create_task", async () => {
      const r = await mg.plan({
        action: "create_task",
        label: "TS Task",
        summary: "Write integration tests",
      });
      expect(r).toHaveProperty("uid");
    });

    test("create_plan", async () => {
      const r = await mg.plan({
        action: "create_plan",
        label: "TS Plan",
        summary: "Master test plan",
      });
      expect(r).toHaveProperty("uid");
      uids.plan = (r as any).uid;
    });

    test("add_step", async () => {
      const r = await mg.plan({
        action: "add_step",
        label: "Plan Step 1",
        summary: "Setup fixtures",
        plan_uid: uids.plan,
      });
      expect(r).toHaveProperty("uid");
    });

    test("get_plan", async () => {
      const r = await mg.plan({
        action: "get_plan",
        plan_uid: uids.plan,
      });
      expect(r).toBeDefined();
    });
  });

  describe("Agent: Governance", () => {
    test("set_budget", async () => {
      const r = await mg.governance({
        action: "set_budget",
        label: "TS Budget",
        summary: "Test resource budget",
        props: { description: "Budget for testing" },
      });
      expect(r).toHaveProperty("uid");
    });

    test("create_policy", async () => {
      const r = await mg.governance({
        action: "create_policy",
        label: "TS Gov Policy",
        summary: "Safety first",
      });
      expect(r).toHaveProperty("uid");
    });

    test("request_approval", async () => {
      const r = await mg.governance({
        action: "request_approval",
        label: "TS Approval",
        summary: "Need approval for deployment",
      });
      expect(r).toHaveProperty("uid");
      uids.approval = (r as any).uid;
    });

    test("resolve_approval", async () => {
      const r = await mg.governance({
        action: "resolve_approval",
        approval_uid: uids.approval,
        approved: true,
      });
      expect(r).toBeDefined();
    });

    test("get_pending", async () => {
      const r = await mg.governance({ action: "get_pending" });
      expect(r).toBeDefined();
    });
  });

  describe("Agent: Execution", () => {
    test("start", async () => {
      const r = await mg.execution({
        action: "start",
        label: "TS Execution",
        summary: "Running tests",
      });
      expect(r).toHaveProperty("uid");
      uids.execution = (r as any).uid;
    });

    test("complete", async () => {
      const r = await mg.execution({
        action: "complete",
        label: "Done",
        summary: "Tests passed",
        execution_uid: uids.execution,
      });
      expect(r).toBeDefined();
    });

    test("fail", async () => {
      const start = await mg.execution({
        action: "start",
        label: "TS Fail Exec",
        summary: "Will fail",
      });
      const r = await mg.execution({
        action: "fail",
        label: "Failed",
        summary: "Something went wrong",
        execution_uid: (start as any).uid,
      });
      expect(r).toBeDefined();
    });

    test("register_agent", async () => {
      const r = await mg.execution({
        action: "register_agent",
        label: "TS Test Agent",
        summary: "An integration test agent",
      });
      expect(r).toHaveProperty("uid");
    });

    test("get_executions", async () => {
      const r = await mg.execution({ action: "get_executions" });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 9. Retrieve & Traverse
  // ============================================================
  describe("Retrieve", () => {
    test("text", async () => {
      const r = await mg.retrieve({ action: "text", query: "test", limit: 3 });
      expect(r).toBeDefined();
    });

    test("active_goals", async () => {
      const r = await mg.retrieve({ action: "active_goals" });
      expect(r).toBeDefined();
    });

    test("open_questions", async () => {
      const r = await mg.retrieve({ action: "open_questions" });
      expect(r).toBeDefined();
    });

    test("weak_claims", async () => {
      const r = await mg.retrieve({ action: "weak_claims" });
      expect(r).toBeDefined();
    });

    test("pending_approvals", async () => {
      const r = await mg.retrieve({ action: "pending_approvals" });
      expect(r).toBeDefined();
    });

    test("unresolved_contradictions", async () => {
      const r = await mg.retrieve({ action: "unresolved_contradictions" });
      expect(r).toBeDefined();
    });

    test("layer", async () => {
      const r = await mg.retrieve({
        action: "layer",
        layer: "reality",
        limit: 3,
      });
      expect(r).toBeDefined();
    });

    test("recent", async () => {
      const r = await mg.retrieve({ action: "recent", limit: 3 });
      expect(r).toBeDefined();
    });
  });

  describe("Traverse", () => {
    test("chain", async () => {
      const r = await mg.traverse({
        action: "chain",
        start_uid: uids.entity,
        max_depth: 2,
      });
      expect(r).toBeDefined();
    });

    test("neighborhood", async () => {
      const r = await mg.traverse({
        action: "neighborhood",
        start_uid: uids.entity,
        max_depth: 1,
      });
      expect(r).toBeDefined();
    });

    test("path", async () => {
      const r = await mg.traverse({
        action: "path",
        start_uid: uids.entity,
        end_uid: uids.observation,
      });
      expect(r).toBeDefined();
    });

    test("subgraph", async () => {
      const r = await mg.traverse({
        action: "subgraph",
        start_uid: uids.entity,
        max_depth: 1,
      });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 10. Evolve
  // ============================================================
  describe("Evolve", () => {
    test("update", async () => {
      const r = await mg.evolve({
        action: "update",
        uid: uids.entity,
        summary: "Updated via evolve",
      });
      expect(r).toBeDefined();
    });

    test("history", async () => {
      const r = await mg.evolve({
        action: "history",
        uid: uids.entity,
      });
      expect(r).toBeDefined();
    });

    test("snapshot", async () => {
      const r = await mg.evolve({
        action: "snapshot",
        uid: uids.entity,
        version: 1,
      });
      expect(r).toBeDefined();
    });

    test("tombstone and restore", async () => {
      // Create a temp node, tombstone it, then restore
      const node = await mg.ingest({
        action: "observation",
        label: "TS Evolve Temp",
        summary: "Will be tombstoned",
      });
      const uid = (node as any).uid;

      const t = await mg.evolve({
        action: "tombstone",
        uid,
        reason: "testing tombstone",
      });
      expect(t).toBeDefined();

      const r = await mg.evolve({ action: "restore", uid });
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 11. Node CRUD
  // ============================================================
  describe("Node CRUD", () => {
    test("addNode + getNode + updateNode + deleteNode", async () => {
      // Create
      const node = await mg.addNode({
        label: "TS CRUD Node",
        props: {
          _type: "Entity",
          canonical_name: "ts-crud",
          description: "CRUD test",
        },
      });
      expect(node).toHaveProperty("uid");
      expect(node.label).toBe("TS CRUD Node");

      // Read
      const fetched = await mg.getNode(node.uid);
      expect(fetched.uid).toBe(node.uid);

      // Update
      const updated = await mg.updateNode(node.uid, {
        summary: "Updated via CRUD",
      });
      expect(updated.summary).toBe("Updated via CRUD");

      // Delete
      await mg.deleteNode(node.uid);
    });
  });

  // ============================================================
  // 12. Edge CRUD
  // ============================================================
  describe("Edge CRUD", () => {
    test("addLink + getEdges", async () => {
      const link = await mg.addLink({
        from_uid: uids.entity,
        to_uid: uids.goal,
        edge_type: "Supports",
      });
      expect(link).toHaveProperty("uid");

      const edges = await mg.getEdges({ from_uid: uids.entity });
      expect(Array.isArray(edges)).toBe(true);
      expect(edges.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // 13. Search
  // ============================================================
  describe("Search", () => {
    test("full-text search", async () => {
      const results = await mg.search("test");
      expect(Array.isArray(results)).toBe(true);
    });

    test("hybridSearch", async () => {
      const results = await mg.hybridSearch("SDK integration test");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  // ============================================================
  // 14. Traversal Shortcuts
  // ============================================================
  describe("Traversal Shortcuts", () => {
    test("reasoningChain", async () => {
      const r = await mg.reasoningChain(uids.entity);
      expect(r).toBeDefined();
    });

    test("neighborhood", async () => {
      const r = await mg.neighborhood(uids.entity);
      expect(r).toBeDefined();
    });
  });

  // ============================================================
  // 15. Lifecycle Shortcuts
  // ============================================================
  describe("Lifecycle Shortcuts", () => {
    test("tombstone + restore", async () => {
      const node = await mg.ingest({
        action: "observation",
        label: "TS Lifecycle Temp",
        summary: "For tombstone/restore shortcut test",
      });
      const uid = (node as any).uid;

      await mg.tombstone(uid, "testing shortcuts");
      await mg.restore(uid);
    });
  });
});
