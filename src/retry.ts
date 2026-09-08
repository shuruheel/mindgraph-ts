// Keep the Python SDK's policy in sync. A correlation ID is not an
// idempotency key. New routes/actions require a semantics review.
const READ_POSTS = new Set([
  "/search", "/retrieve/context", "/nodes/batch", "/edges/batch", "/subgraph",
  "/embeddings/search", "/embeddings/search-text", "/ontology/query",
  "/ontology/query/structured", "/ontology/objects/search",
]);
const READ_ACTIONS: Record<string, readonly string[]> = {
  "/retrieve": ["text", "semantic", "hybrid", "active_goals", "open_questions",
    "preferences", "weak_claims", "pending_approvals", "unresolved_contradictions",
    "merge_candidates", "stale_derivations", "curation_counts", "layer", "recent"],
  "/traverse": ["chain", "top_k_paths", "neighborhood", "path", "subgraph"],
  "/reality/series": ["window", "aggregate", "latest", "list_for_entity", "batch_latest", "batch_aggregate"],
  "/intent/deliberation": ["get_open"],
  "/action/risk": ["get_assessments"],
  "/action/skill": ["get", "list"],
  "/memory/config": ["get_preferences", "get_policies"],
  "/memory/sync": ["status"],
  "/agent/plan": ["get_plan", "resume_work"],
  "/agent/governance": ["get_pending", "check"],
  "/agent/execution": ["get_executions"],
  "/evolve": ["history", "snapshot"],
};
// These work operations commit their receipt and mutation in one transaction.
// Other writes (including arbitrary POSTs carrying a key) are not opted in.
const IDEMPOTENT_WORK = new Set([
  "claim_task", "heartbeat", "start_iteration", "checkpoint_iteration",
  "block_task", "complete_task", "abandon_iteration",
]);

export function errorFields(body: unknown): { code?: string; retriable?: boolean } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const fields = body as Record<string, unknown>;
  return {
    ...(typeof fields.code === "string" ? { code: fields.code } : {}),
    ...(typeof fields.retriable === "boolean" ? { retriable: fields.retriable } : {}),
  };
}

export function canRetryRequest(method: string, path: string, body: unknown): boolean {
  if (method === "GET" || method === "HEAD") return true;
  if (method !== "POST") return false;
  if (READ_POSTS.has(path)) return true;
  const fields = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : {};
  if (typeof fields.action !== "string") return false;
  if (Object.prototype.hasOwnProperty.call(READ_ACTIONS, path) && READ_ACTIONS[path].includes(fields.action)) return true;
  return path === "/agent/plan" && IDEMPOTENT_WORK.has(fields.action)
    && typeof fields.idempotency_key === "string" && fields.idempotency_key.trim().length > 0;
}

export function permitsRetry(fields: { code?: string; retriable?: boolean }): boolean {
  return fields.retriable !== false && ![
    "query_memory_budget_exceeded", "query_timeout", "query_cancelled", "vector_index_rebuilding",
  ].includes(fields.code ?? "");
}

export function retryDelayMs(header: string | null, backoff: number, attempt: number): number {
  const hint = Number(header);
  return Number.isFinite(hint) && hint > 0
    ? Math.min(hint * 1000, 10_000)
    : Math.min(backoff * 2 ** Math.min(attempt, 32), 10_000);
}
