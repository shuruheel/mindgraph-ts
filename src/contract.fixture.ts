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
  "preferences",
  "layer",
  "recent",
] as const;

/** Valid actions per action-dispatch endpoint (CLAUDE.md table, exhaustive). */
export const ENDPOINT_ACTIONS: Record<string, readonly string[]> = {
  "/reality/capture": ["source", "snippet", "observation"],
  "/reality/entity": ["create", "alias", "resolve", "fuzzy_resolve", "merge", "relate"],
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
  "/agent/plan": ["create_task", "create_plan", "add_step", "update_status", "get_plan"],
  "/agent/governance": [
    "create_policy",
    "set_budget",
    "request_approval",
    "resolve_approval",
    "get_pending",
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
    requiredFields: ["action", "decision_uid", "chosen_option_uid"],
    args: ["dec-uid", "opt-uid"],
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
    requiredFields: ["label"],
    forbiddenFields: ["action"],
    args: [{ label: "Lesson", summary: "S", summarizes_uids: ["a"] }],
  },
  {
    method: "memoryConfig",
    endpoint: "/memory/config",
    httpMethod: "POST",
    action: "set_preference",
    requiredFields: ["action"],
    args: [{ action: "set_preference", label: "P", summary: "S" }],
  },

  // ---- Agent ----
  {
    method: "plan",
    endpoint: "/agent/plan",
    httpMethod: "POST",
    action: "create_plan",
    requiredFields: ["action"],
    args: [{ action: "create_plan", label: "P", summary: "S" }],
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
    method: "execution",
    endpoint: "/agent/execution",
    httpMethod: "POST",
    action: "start",
    requiredFields: ["action"],
    args: [{ action: "start", label: "E", summary: "S" }],
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
