// ---- Core types ----

export interface GraphNode {
  uid: string;
  label: string;
  summary: string;
  node_type: string;
  layer: string;
  confidence: number;
  salience: number;
  props: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  tombstone_at: number | null;
}

export interface GraphEdge {
  uid: string;
  from_uid: string;
  to_uid: string;
  edge_type: string;
  layer: string;
  weight: number;
  props: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  tombstone_at: number | null;
}

export interface SearchResult {
  uid: string;
  label: string;
  summary: string;
  node_type: string;
  score: number;
}

export interface PathStep {
  uid: string;
  label: string;
  node_type: string;
  edge_type: string | null;
  depth: number;
  parent_uid: string | null;
}

// ---- Request types ----

export interface IngestRequest {
  action: "source" | "snippet" | "observation";
  label: string;
  content: string;
  source_uid?: string;
  medium?: string;
  url?: string;
  timestamp?: number;
  confidence?: number;
  salience?: number;
  agent_id?: string;
}

export interface EntityRequest {
  action: "create" | "alias" | "resolve" | "fuzzy_resolve" | "merge" | "relate";
  label?: string;
  entity_type?: string;
  text?: string;
  canonical_uid?: string;
  alias_score?: number;
  keep_uid?: string;
  merge_uid?: string;
  limit?: number;
  source_uid?: string;
  target_uid?: string;
  edge_type?: string;
  agent_id?: string;
}

export interface ArgumentRequest {
  claim: { label: string; content: string; confidence?: number };
  evidence?: { label: string; description: string; evidence_type?: string }[];
  warrant?: { label: string; principle: string };
  argument?: { label: string; summary: string };
  refutes_uid?: string;
  extends_uid?: string;
  source_uids?: string[];
  agent_id?: string;
}

export interface InquiryRequest {
  action: "hypothesis" | "theory" | "paradigm" | "anomaly" | "assumption" | "question" | "open_question";
  label: string;
  content: string;
  status?: string;
  anomalous_to_uid?: string;
  assumes_uid?: string[];
  tests_uid?: string;
  addresses_uid?: string;
  confidence?: number;
  salience?: number;
  related_uids?: string[];
  agent_id?: string;
}

export interface StructureRequest {
  action: "concept" | "pattern" | "mechanism" | "model" | "model_evaluation" | "analogy" | "inference_chain" | "reasoning_strategy" | "sensitivity_analysis" | "theorem" | "equation";
  label: string;
  content: string;
  summary?: string;
  analogous_to_uid?: string;
  transfers_to_uid?: string[];
  evaluates_uid?: string;
  outperforms_uid?: string;
  chain_steps?: string[];
  derived_from_uid?: string[];
  proven_by_uid?: string;
  related_uids?: string[];
  confidence?: number;
  agent_id?: string;
}

export interface CommitmentRequest {
  action: "goal" | "project" | "milestone";
  label: string;
  description: string;
  priority?: string;
  status?: string;
  parent_uid?: string;
  due_date?: number;
  motivated_by_uid?: string[];
  agent_id?: string;
}

export interface DeliberationRequest {
  action: "open_decision" | "add_option" | "add_constraint" | "resolve" | "get_open";
  label?: string;
  description?: string;
  decision_uid?: string;
  chosen_option_uid?: string;
  resolution_rationale?: string;
  constraint_type?: string;
  blocks_uid?: string;
  informs_uid?: string[];
  agent_id?: string;
}

export interface ProcedureRequest {
  action: "create_flow" | "add_step" | "add_affordance" | "add_control";
  label: string;
  description?: string;
  flow_uid?: string;
  step_order?: number;
  previous_step_uid?: string;
  affordance_type?: string;
  control_type?: string;
  uses_affordance_uids?: string[];
  goal_uid?: string;
  agent_id?: string;
}

export interface RiskRequest {
  action: "assess" | "get_assessments";
  label?: string;
  description?: string;
  assessed_uid?: string;
  severity?: string;
  likelihood?: number;
  mitigations?: string[];
  residual_risk?: number;
  filter_uid?: string;
  agent_id?: string;
}

export interface SessionRequest {
  action: "open" | "trace" | "close" | "journal";
  label?: string;
  focus?: string;
  session_uid?: string;
  trace_content?: string;
  trace_type?: string;
  relevant_node_uids?: string[];
  content?: string;
  journal_type?: string;
  tags?: string[];
  agent_id?: string;
}

export interface DistillRequest {
  label: string;
  content: string;
  summarizes_uids?: string[];
  session_uid?: string;
  importance?: number;
  agent_id?: string;
}

export interface MemoryConfigRequest {
  action: "set_preference" | "get_preferences" | "set_policy" | "get_policies";
  label?: string;
  key?: string;
  value?: string;
  policy_content?: string;
  agent_id?: string;
}

export interface PlanRequest {
  action: "create_task" | "create_plan" | "add_step" | "update_status" | "get_plan";
  label?: string;
  description?: string;
  goal_uid?: string;
  task_uid?: string;
  plan_uid?: string;
  step_order?: number;
  depends_on_uids?: string[];
  target_uid?: string;
  status?: string;
  related_uids?: string[];
  agent_id?: string;
}

export interface GovernanceRequest {
  action: "create_policy" | "set_budget" | "request_approval" | "resolve_approval" | "get_pending";
  label?: string;
  policy_content?: string;
  budget_type?: string;
  budget_limit?: number;
  governed_uid?: string;
  approval_uid?: string;
  approved?: boolean;
  resolution_note?: string;
  requires_plan_uid?: string;
  approval_request?: string;
  agent_id?: string;
}

export interface ExecutionRequest {
  action: "start" | "complete" | "fail" | "register_agent" | "get_executions";
  label?: string;
  plan_uid?: string;
  executor_uid?: string;
  execution_uid?: string;
  outcome?: string;
  produces_node_uid?: string;
  error_description?: string;
  agent_name?: string;
  agent_role?: string;
  filter_plan_uid?: string;
  related_uids?: string[];
  agent_id?: string;
}

export interface RetrieveRequest {
  action: "text" | "semantic" | "hybrid" | "active_goals" | "open_questions" | "weak_claims" | "pending_approvals" | "unresolved_contradictions" | "layer" | "recent";
  query?: string;
  k?: number;
  threshold?: number;
  layer?: string;
  node_types?: string[];
  confidence_min?: number;
  salience_min?: number;
  limit?: number;
  offset?: number;
}

export interface TraverseRequest {
  action: "chain" | "neighborhood" | "path" | "subgraph";
  start_uid: string;
  end_uid?: string;
  max_depth?: number;
  direction?: "outgoing" | "incoming" | "both";
  edge_types?: string[];
  weight_threshold?: number;
}

export interface EvolveRequest {
  action: "update" | "tombstone" | "restore" | "decay" | "history" | "snapshot" | "tombstone_edge" | "restore_edge" | "tombstone_cascade";
  uid: string;
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  props_patch?: Record<string, unknown>;
  reason?: string;
  cascade?: boolean;
  half_life_secs?: number;
  min_salience?: number;
  min_age_secs?: number;
  version?: number;
  agent_id?: string;
}

// ---- Auth types ----

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateOrgRequest {
  name: string;
  slug?: string;
}

export interface CreateApiKeyRequest {
  name?: string;
}

export interface ApiKeyResponse {
  id: string;
  key: string;
  name: string;
  prefix: string;
}

// ---- Config ----

export interface MindGraphConfig {
  baseUrl: string;
  apiKey?: string;
  jwt?: string;
}
