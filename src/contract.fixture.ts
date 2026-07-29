/**
 * Canonical wire-contract fixture for the MindGraph cognitive API.
 *
 * Authoritative source: CLAUDE.md "Cognitive Endpoint Actions (exhaustive)"
 * table + "SDK-Server Field Name Conventions". R6 verified that the table
 * matches the server. This fixture is the single, hand-maintained restatement
 * the TS SDK's offline conformance test (src/offline.test.ts) diffs the SDK's
 * actual request building against, so drift becomes visible in CI.
 *
 * NOTE: this is a TEST FIXTURE, not SDK source. It does not change any SDK
 * behavior; it only encodes what the SDK *should* be sending. It lives under
 * src/ (not test/) only because tsconfig's rootDir is "src"; it is never
 * bundled into the published package (tsup bundles only the src/index.ts entry
 * graph, which does not import this file).
 */

/** The full, exact set of valid `/retrieve` actions per CLAUDE.md. */
export const RETRIEVE_ACTIONS = [
  "text",
  "semantic",
  "hybrid",
  "active_goals",
  "open_questions",
  "weak_claims",
  "pending_approvals",
  "unresolved_contradictions",
  "merge_candidates",
  "curation_counts",
  "stale_derivations",
  "preferences",
  "layer",
  "recent",
] as const;

/** Valid actions per action-dispatch endpoint (CLAUDE.md table, exhaustive). */
export const ENDPOINT_ACTIONS: Record<string, readonly string[]> = {
  "/reality/capture": ["source", "snippet", "observation"],
  "/reality/entity": [
    "create",
    "resolve_identity",
    "alias",
    "resolve",
    "fuzzy_resolve",
    "merge",
    "relate",
  ],
  "/epistemic/inquiry": [
    "hypothesis",
    "theory",
    "paradigm",
    "anomaly",
    "assumption",
    "question",
    "open_question",
  ],
  "/epistemic/structure": [
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
  ],
  "/intent/commitment": ["goal", "project", "milestone"],
  "/intent/deliberation": ["open_decision", "add_option", "add_constraint", "resolve", "get_open"],
  "/action/procedure": ["create_flow", "add_step", "add_affordance", "add_control"],
  "/action/risk": ["assess", "get_assessments"],
  "/memory/session": ["open", "trace", "close", "journal"],
  "/memory/config": ["set_preference", "get_preferences", "set_policy", "get_policies"],
  "/memory/sync": ["scan", "begin", "record", "finalize", "status", "abandon"],
  "/agent/plan": [
    "create_task", "create_plan", "add_step", "update_status", "get_plan",
    "resume_work", "claim_task", "heartbeat", "start_iteration",
    "checkpoint_iteration", "block_task", "complete_task", "abandon_iteration",
  ],
  "/agent/governance": [
    "create_policy",
    "set_budget",
    "request_approval",
    "resolve_approval",
    "get_pending",
    "check",
  ],
  "/agent/execution": ["start", "complete", "fail", "register_agent", "get_executions"],
  "/retrieve": RETRIEVE_ACTIONS,
  "/traverse": ["chain", "neighborhood", "path", "subgraph"],
  "/evolve": [
    "update",
    "tombstone",
    "restore",
    "decay",
    "history",
    "snapshot",
    "tombstone_edge",
    "restore_edge",
    "tombstone_cascade",
  ],
};

/** Endpoints that are MONOLITHIC — they take NO `action` field. */
export const ACTIONLESS_ENDPOINTS = ["/epistemic/argument", "/memory/distill"] as const;

/**
 * Per-method expected wire contract. Each entry says: when you call this SDK
 * method with the sample args, the request that hits the transport MUST match
 * `{ endpoint, httpMethod, action, requiredFields }`.
 *
 * - `action: null` => endpoint is monolithic; the body MUST NOT contain `action`.
 * - `requiredFields` => keys that MUST be present (top-level) in the JSON body.
 * - `arrayFields` => keys whose value MUST be a JSON array.
 * - `forbiddenFields` => keys that MUST NOT appear in the body.
 */
export interface ContractEntry {
  /** SDK method name on MindGraph. */
  method: string;
  endpoint: string;
  httpMethod: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  /** Expected `action` in the body, or null for monolithic endpoints. */
  action: string | null;
  requiredFields?: string[];
  arrayFields?: string[];
  forbiddenFields?: string[];
  /** Sample args passed to the SDK method to drive the call. */
  args: unknown[];
}

/**
 * The cognitive-method contract table. Covers the action-dispatch + monolithic
 * cognitive endpoints and the field-name conventions
 * (start_uid / end_uid; argument is action-less with an evidence ARRAY).
 */
export const CONTRACT: ContractEntry[] = [
  // ---- Reality ----
  {
    method: "capture",
    endpoint: "/reality/capture",
    httpMethod: "POST",
    action: "source",
    requiredFields: ["action", "label"],
    args: [{ action: "source", label: "L", summary: "S" }],
  },
  {
    method: "entity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "create",
    requiredFields: ["action"],
    args: [{ action: "create", label: "L", props: { entity_type: "concept" } }],
  },
  {
    method: "entity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "create",
    requiredFields: ["action", "label", "identity", "identity_space_uid"],
    args: [
      {
        action: "create",
        label: "Repository",
        identity: {
          namespace: "external.code",
          key_version: 1,
          key: { v: 1, kind: "repository", repo_id: "fixture" },
        },
        identity_space_uid: "space:project:fixture",
      },
    ],
  },
  {
    method: "entity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "resolve_identity",
    requiredFields: ["action", "identity"],
    args: [
      {
        action: "resolve_identity",
        identity: {
          namespace: "external.code",
          key_version: 1,
          key: { v: 1, kind: "repository", repo_id: "fixture" },
        },
      },
    ],
  },
  {
    method: "addObservation",
    endpoint: "/reality/capture",
    httpMethod: "POST",
    action: "observation",
    requiredFields: ["action", "label", "summary"],
    args: ["Obs", "desc"],
  },
  {
    method: "resolveEntity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "resolve",
    requiredFields: ["action", "text"],
    args: ["some text"],
  },
  {
    method: "fuzzyResolveEntity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "fuzzy_resolve",
    requiredFields: ["action", "text", "limit"],
    args: ["some text"],
  },
  {
    method: "findOrCreateEntity",
    endpoint: "/reality/entity",
    httpMethod: "POST",
    action: "create",
    requiredFields: ["action", "label", "props"],
    args: ["Acme"],
  },

  // ---- Epistemic ----
  {
    // MONOLITHIC: no action field; evidence MUST be an array.
    method: "argue",
    endpoint: "/epistemic/argument",
    httpMethod: "POST",
    action: null,
    requiredFields: ["claim"],
    arrayFields: ["evidence"],
    forbiddenFields: ["action"],
    args: [
      {
        claim: { label: "C", props: { statement: "x" } },
        evidence: [{ label: "E", props: { statement: "y" } }],
      },
    ],
  },
  {
    method: "inquire",
    endpoint: "/epistemic/inquiry",
    httpMethod: "POST",
    action: "hypothesis",
    requiredFields: ["action", "label"],
    args: [{ action: "hypothesis", label: "H", summary: "S" }],
  },
  {
    method: "structure",
    endpoint: "/epistemic/structure",
    httpMethod: "POST",
    action: "concept",
    requiredFields: ["action", "label"],
    args: [{ action: "concept", label: "C", summary: "S" }],
  },

  // ---- Intent ----
  {
    method: "commit",
    endpoint: "/intent/commitment",
    httpMethod: "POST",
    action: "goal",
    requiredFields: ["action", "label"],
    args: [{ action: "goal", label: "G", summary: "S" }],
  },
  {
    method: "deliberate",
    endpoint: "/intent/deliberation",
    httpMethod: "POST",
    action: "open_decision",
    requiredFields: ["action"],
    args: [{ action: "open_decision", label: "D", summary: "S" }],
  },
  {
    method: "openDecision",
    endpoint: "/intent/deliberation",
    httpMethod: "POST",
    action: "open_decision",
    requiredFields: ["action", "label"],
    args: ["Decision"],
  },
  {
    method: "addOption",
    endpoint: "/intent/deliberation",
    httpMethod: "POST",
    action: "add_option",
    requiredFields: ["action", "decision_uid", "label"],
    args: ["dec-uid", "Option"],
  },
  {
    method: "resolveDecision",
    endpoint: "/intent/deliberation",
    httpMethod: "POST",
    action: "resolve",
    // The optional resolve fields are asserted as required HERE (the fixture
    // supplies them) so a wire-name typo in any of them goes red offline —
    // serde on the server silently drops unknown keys.
    requiredFields: [
      "action",
      "decision_uid",
      "chosen_option_uid",
      "informs_uid",
      "as_of_date",
      "session_id",
      "retrieval_trace_id",
    ],
    arrayFields: ["informs_uid"],
    args: [
      "dec-uid",
      "opt-uid",
      {
        informs_uid: ["ctx-uid"],
        as_of_date: "2026-07-17",
        session_id: "session-7",
        retrieval_trace_id: "trace-7",
      },
    ],
  },

  // ---- Action ----
  {
    method: "procedure",
    endpoint: "/action/procedure",
    httpMethod: "POST",
    action: "create_flow",
    requiredFields: ["action", "label"],
    args: [{ action: "create_flow", label: "F", summary: "S" }],
  },
  {
    method: "risk",
    endpoint: "/action/risk",
    httpMethod: "POST",
    action: "assess",
    requiredFields: ["action"],
    args: [{ action: "assess", label: "R", summary: "S" }],
  },

  // ---- Memory ----
  {
    method: "session",
    endpoint: "/memory/session",
    httpMethod: "POST",
    action: "open",
    requiredFields: ["action"],
    args: [{ action: "open", label: "Sess", summary: "S" }],
  },
  {
    method: "journal",
    endpoint: "/memory/session",
    httpMethod: "POST",
    action: "journal",
    requiredFields: ["action", "label", "props"],
    args: ["Entry", { content: "c" }],
  },
  {
    // MONOLITHIC: no action field.
    method: "distill",
    endpoint: "/memory/distill",
    httpMethod: "POST",
    action: null,
    requiredFields: ["label", "output_type"],
    forbiddenFields: ["action"],
    arrayFields: ["summarizes_uids"],
    args: [{ label: "Lesson", output_type: "lesson", summary: "S", summarizes_uids: ["a"] }],
  },
  {
    method: "memoryConfig",
    endpoint: "/memory/config",
    httpMethod: "POST",
    action: "set_preference",
    requiredFields: ["action"],
    args: [{ action: "set_preference", label: "P", summary: "S" }],
  },
  ...[
    {
      action: "scan",
      logical_path: "memory/a.md",
      content_hash: "hash-a",
    },
    {
      action: "begin",
      logical_path: "memory/a.md",
      content_hash: "hash-a",
      content: "# A",
      planned_fingerprints: ["fp-a"],
      repo_space_uid: "space:repo",
    },
    {
      action: "record",
      execution_uid: "execution-a",
      assertion_fingerprint: "fp-a",
      capture_type: "lesson",
      label: "A",
      expected_execution_version: 1,
      repo_space_uid: "space:repo",
    },
    {
      action: "finalize",
      execution_uid: "execution-a",
      expected_execution_version: 2,
    },
    { action: "status", source_uid: "source-a" },
    {
      action: "abandon",
      execution_uid: "execution-a",
      expected_execution_version: 2,
    },
  ].map((request) => ({
    method: "memorySync",
    endpoint: "/memory/sync",
    httpMethod: "POST" as const,
    action: request.action,
    requiredFields: ["action"],
    args: [
      {
        provider: "claude_project",
        repo_id: "repo:a",
        ...request,
      },
    ],
  })),

  // ---- Agent ----
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "create_task",
    requiredFields: ["action", "goal_uid", "related_uids"],
    arrayFields: ["related_uids"],
    args: [{
      action: "create_task",
      label: "T",
      goal_uid: "goal-1",
      related_uids: ["code-1"],
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "create_plan",
    requiredFields: ["action", "goal_uid", "task_uid", "related_uids"],
    arrayFields: ["related_uids"],
    args: [{
      action: "create_plan",
      label: "P",
      goal_uid: "goal-1",
      task_uid: "task-1",
      related_uids: ["code-1"],
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "add_step",
    requiredFields: ["action", "plan_uid", "depends_on_uids"],
    arrayFields: ["depends_on_uids"],
    args: [{
      action: "add_step",
      label: "S",
      plan_uid: "plan-1",
      depends_on_uids: ["step-0"],
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "update_status",
    requiredFields: ["action", "target_uid", "status"],
    args: [{
      action: "update_status",
      target_uid: "task-1",
      status: "in_progress",
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "get_plan",
    requiredFields: ["action", "plan_uid"],
    args: [{ action: "get_plan", plan_uid: "plan-1" }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "resume_work",
    requiredFields: ["action", "scope_uids", "session_uid"],
    arrayFields: ["scope_uids"],
    args: [{
      action: "resume_work",
      scope_uids: ["repo-1"],
      session_uid: "session-1",
      limit: 1,
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "claim_task",
    requiredFields: [
      "action", "task_uid", "session_uid", "expected_version", "idempotency_key",
    ],
    args: [{
      action: "claim_task",
      task_uid: "task-1",
      session_uid: "session-1",
      expected_version: 1,
      idempotency_key: "claim-1",
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "heartbeat",
    requiredFields: [
      "action", "task_uid", "session_uid", "expected_version", "lease_epoch",
      "idempotency_key",
    ],
    args: [{
      action: "heartbeat",
      task_uid: "task-1",
      session_uid: "session-1",
      expected_version: 2,
      lease_epoch: 1,
      idempotency_key: "heartbeat-1",
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "start_iteration",
    requiredFields: [
      "action", "task_uid", "step_uid", "session_uid", "expected_version",
      "lease_epoch", "idempotency_key", "input_snapshot",
    ],
    args: [{
      action: "start_iteration",
      task_uid: "task-1",
      step_uid: "step-1",
      session_uid: "session-1",
      expected_version: 2,
      lease_epoch: 1,
      idempotency_key: "start-1",
      input_snapshot: { base_commit: "abc" },
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "checkpoint_iteration",
    requiredFields: [
      "action", "task_uid", "execution_uid", "session_uid", "expected_version",
      "lease_epoch", "idempotency_key", "output_snapshot", "produces_node_uids",
    ],
    arrayFields: ["produces_node_uids"],
    args: [{
      action: "checkpoint_iteration",
      task_uid: "task-1",
      execution_uid: "execution-1",
      session_uid: "session-1",
      expected_version: 3,
      lease_epoch: 1,
      idempotency_key: "checkpoint-1",
      output_snapshot: { head_commit: "def" },
      produces_node_uids: ["lesson-1"],
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "block_task",
    requiredFields: [
      "action", "task_uid", "session_uid", "expected_version", "lease_epoch",
      "idempotency_key", "release_lease",
    ],
    args: [{
      action: "block_task",
      task_uid: "task-1",
      session_uid: "session-1",
      expected_version: 4,
      lease_epoch: 1,
      idempotency_key: "block-1",
      release_lease: true,
      summary: "Waiting on dependency",
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "complete_task",
    requiredFields: [
      "action", "task_uid", "execution_uid", "session_uid", "expected_version",
      "lease_epoch", "idempotency_key",
    ],
    args: [{
      action: "complete_task",
      task_uid: "task-1",
      execution_uid: "execution-1",
      session_uid: "session-1",
      expected_version: 4,
      lease_epoch: 1,
      idempotency_key: "complete-1",
    }],
  },
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "abandon_iteration",
    requiredFields: [
      "action", "task_uid", "execution_uid", "session_uid", "expected_version",
      "lease_epoch", "idempotency_key", "release_lease",
    ],
    args: [{
      action: "abandon_iteration",
      task_uid: "task-1",
      execution_uid: "execution-1",
      session_uid: "session-1",
      expected_version: 4,
      lease_epoch: 1,
      idempotency_key: "abandon-1",
      release_lease: true,
    }],
  },
  {
    method: "governance",
    endpoint: "/agent/governance",
    httpMethod: "POST",
    action: "request_approval",
    requiredFields: ["action"],
    args: [{ action: "request_approval", label: "A", summary: "S" }],
  },
  {
    method: "governance",
    endpoint: "/agent/governance",
    httpMethod: "POST",
    action: "check",
    requiredFields: ["action", "act", "target"],
    args: [{
      action: "check",
      act: "tool_invoke",
      target: {
        tool_name: "mindgraph_plan",
        action: "complete_execution",
        mutability: "write",
        target_uids: ["execution-1"],
      },
    }],
  },
  {
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "start",
    requiredFields: [
      "action",
      "plan_uid",
      "executor_uid",
      "affordance_uid",
      "related_uids",
      "input_snapshot",
    ],
    arrayFields: ["related_uids"],
    args: [{
      action: "start",
      label: "E",
      plan_uid: "plan-1",
      executor_uid: "agent-1",
      affordance_uid: "affordance-1",
      related_uids: ["task-1"],
      input_snapshot: { command: "test" },
    }],
  },
  {
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "complete",
    requiredFields: [
      "action",
      "execution_uid",
      "produces_node_uid",
      "output_snapshot",
      "side_effects",
      "outcome",
    ],
    arrayFields: ["side_effects"],
    args: [{
      action: "complete",
      execution_uid: "execution-1",
      produces_node_uid: "lesson-1",
      output_snapshot: { exit_code: 0 },
      side_effects: ["wrote file"],
      outcome: "passed",
    }],
  },
  {
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "fail",
    requiredFields: [
      "action",
      "execution_uid",
      "output_snapshot",
      "side_effects",
      "outcome",
      "error",
    ],
    arrayFields: ["side_effects"],
    args: [{
      action: "fail",
      execution_uid: "execution-1",
      output_snapshot: { exit_code: 1 },
      side_effects: [],
      outcome: "failed",
      error: "assertion mismatch",
    }],
  },
  {
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "register_agent",
    requiredFields: ["action", "label"],
    args: [{ action: "register_agent", label: "Coding agent" }],
  },
  {
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "get_executions",
    requiredFields: ["action", "filter_plan_uid"],
    args: [{ action: "get_executions", filter_plan_uid: "plan-1" }],
  },

  // ---- Cross-cutting: retrieve / traverse / evolve ----
  {
    method: "retrieve",
    endpoint: "/retrieve",
    httpMethod: "POST",
    action: "text",
    requiredFields: ["action"],
    args: [{ action: "text", query: "q", limit: 3 }],
  },
  {
    method: "hybridSearch",
    endpoint: "/retrieve",
    httpMethod: "POST",
    action: "hybrid",
    requiredFields: ["action", "query"],
    args: ["q"],
  },
  {
    method: "getMergeCandidates",
    endpoint: "/retrieve",
    httpMethod: "POST",
    action: "merge_candidates",
    requiredFields: ["action"],
    args: [],
  },
  {
    method: "getStaleDerivations",
    endpoint: "/retrieve",
    httpMethod: "POST",
    action: "stale_derivations",
    requiredFields: ["action"],
    args: [],
  },
  {
    method: "traverse",
    endpoint: "/traverse",
    httpMethod: "POST",
    action: "chain",
    // Field-name convention: traverse uses start_uid (NOT uid/from_uid).
    requiredFields: ["action", "start_uid"],
    forbiddenFields: ["uid", "from_uid"],
    args: [{ action: "chain", start_uid: "n1", max_depth: 2 }],
  },
  {
    method: "reasoningChain",
    endpoint: "/traverse",
    httpMethod: "POST",
    action: "chain",
    requiredFields: ["action", "start_uid", "max_depth"],
    forbiddenFields: ["uid", "from_uid"],
    args: ["n1"],
  },
  {
    method: "neighborhood",
    endpoint: "/traverse",
    httpMethod: "POST",
    action: "neighborhood",
    requiredFields: ["action", "start_uid", "max_depth"],
    forbiddenFields: ["uid", "from_uid"],
    args: ["n1"],
  },
  {
    method: "evolve",
    endpoint: "/evolve",
    httpMethod: "POST",
    action: "tombstone",
    requiredFields: ["action", "uid"],
    args: [{ action: "tombstone", uid: "n1", reason: "r" }],
  },
  {
    method: "tombstone",
    endpoint: "/evolve",
    httpMethod: "POST",
    action: "tombstone",
    requiredFields: ["action", "uid"],
    args: ["n1", "reason"],
  },
  {
    method: "restore",
    endpoint: "/evolve",
    httpMethod: "POST",
    action: "restore",
    requiredFields: ["action", "uid"],
    args: ["n1"],
  },
];

/**
 * Methods whose SDK behavior is a KNOWN, DOCUMENTED R4 divergence from a
 * cleanly-canonical contract. These are pending an owner/product decision
 * (breaking change). The offline test asserts each method's CURRENT behavior
 * so it (a) passes today and (b) traps any silent change away from documented
 * behavior. See docs/plans/collaborator-readiness-refactors.md §R4.
 */
export const KNOWN_DIVERGENCES = [
  {
    id: "R4-1-addClaim",
    method: "addClaim",
    note: "TS addClaim -> POST /epistemic/argument (Claim node). Py add_claim -> POST /epistemic/inquiry action=hypothesis (Hypothesis node). Different endpoint AND node type.",
  },
  {
    id: "R4-2-addEvidence",
    method: "addEvidence",
    note: "TS addEvidence sends an ARRAY of evidence + props. Py sends a single OBJECT + summary.",
  },
  {
    id: "R4-3-retrieve-action-enum",
    method: "RetrieveRequest.action",
    note: "TS RetrieveRequest.action type omits merge_candidates and curation_counts, both valid server-side.",
  },
  {
    id: "R4-4-getArticleBySubject",
    method: "getArticleBySubject",
    note: "TS getArticleBySubject swallows ALL errors as not-found (returns null). Py is 404-only.",
  },
  {
    id: "R4-5-request-timeout",
    method: "request",
    note: "TS request() has no timeout. Py has a 30s timeout.",
  },
] as const;
