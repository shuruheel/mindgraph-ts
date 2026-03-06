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
  action: "create_source" | "create_snippet" | "create_observation";
  label: string;
  content?: string;
  uri?: string;
  source_uid?: string;
  entity_type?: string;
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
  evidence: { label: string; description: string }[];
  warrant?: { label: string; principle: string };
  agent_id?: string;
}

export interface InquiryRequest {
  action: string;
  label: string;
  content?: string;
  description?: string;
  statement?: string;
  question?: string;
  confidence?: number;
  agent_id?: string;
  [key: string]: unknown;
}

export interface StructureRequest {
  action: string;
  label: string;
  content?: string;
  definition?: string;
  description?: string;
  agent_id?: string;
  [key: string]: unknown;
}

export interface CommitmentRequest {
  action: "create_goal" | "create_project" | "create_milestone";
  label: string;
  description?: string;
  motivated_by_uid?: string[];
  parent_uid?: string;
  agent_id?: string;
}

export interface DeliberationRequest {
  action: "open" | "add_option" | "add_constraint" | "resolve" | "get_open";
  label?: string;
  description?: string;
  decision_uid?: string;
  chosen_option_uid?: string;
  agent_id?: string;
  [key: string]: unknown;
}

export interface ProcedureRequest {
  action: "create_flow" | "add_step" | "create_affordance" | "create_control";
  label: string;
  description?: string;
  flow_uid?: string;
  previous_step_uid?: string;
  agent_id?: string;
  [key: string]: unknown;
}

export interface RiskRequest {
  action: "assess" | "get_assessments";
  label?: string;
  description?: string;
  target_uid?: string;
  filter_uid?: string;
  agent_id?: string;
}

export interface SessionRequest {
  action: "open" | "trace" | "close";
  focus?: string;
  session_uid?: string;
  content?: string;
  agent_id?: string;
}

export interface DistillRequest {
  content: string;
  label?: string;
  summary?: string;
  source_uids: string[];
  session_uid?: string;
  agent_id?: string;
}

export interface MemoryConfigRequest {
  action: "set_preference" | "get_preferences" | "set_policy" | "get_policies";
  key?: string;
  value?: string;
  preference_type?: string;
  policy_type?: string;
  target_node_type?: string;
  condition?: string;
  policy_action?: string;
  agent_id?: string;
}

export interface PlanRequest {
  action: "create_task" | "create_plan" | "add_step" | "update_status";
  label?: string;
  description?: string;
  task_uid?: string;
  plan_uid?: string;
  target_uid?: string;
  status?: string;
  agent_id?: string;
}

export interface GovernanceRequest {
  action: string;
  label?: string;
  description?: string;
  agent_id?: string;
  [key: string]: unknown;
}

export interface ExecutionRequest {
  action: "register_agent" | "start" | "complete" | "fail";
  label?: string;
  description?: string;
  plan_step_uid?: string;
  execution_uid?: string;
  result_summary?: string;
  error?: string;
  agent_id?: string;
}

export interface RetrieveRequest {
  action: "text" | "semantic" | "hybrid" | "active_goals" | "open_questions" | "weak_claims" | "pending_approvals" | "unresolved_contradictions" | "layer" | "recent";
  query?: string;
  k?: number;
  threshold?: number;
  layer?: string;
  node_types?: string[];
  limit?: number;
  offset?: number;
}

export interface TraverseRequest {
  action: "chain" | "neighborhood" | "path" | "subgraph";
  uid?: string;
  from_uid?: string;
  to_uid?: string;
  max_depth?: number;
  direction?: "outgoing" | "incoming" | "both";
  edge_types?: string[];
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
