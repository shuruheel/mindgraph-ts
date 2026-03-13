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

export interface CaptureRequest {
  action: "source" | "snippet" | "observation";
  label: string;
  summary?: string;
  source_uid?: string;
  confidence?: number;
  salience?: number;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface EntityRequest {
  action: "create" | "alias" | "resolve" | "fuzzy_resolve" | "merge" | "relate";
  label?: string;
  text?: string;
  canonical_uid?: string;
  alias_score?: number;
  keep_uid?: string;
  merge_uid?: string;
  limit?: number;
  source_uid?: string;
  target_uid?: string;
  edge_type?: string;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface ArgumentRequest {
  claim: { label: string; confidence?: number; props?: Record<string, unknown> };
  evidence?: { label: string; props?: Record<string, unknown> }[];
  warrant?: { label: string; props?: Record<string, unknown> };
  argument?: { label: string; props?: Record<string, unknown> };
  refutes_uid?: string;
  extends_uid?: string;
  supersedes_uid?: string;
  contradicts_uid?: string;
  source_uids?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface InquiryRequest {
  action: "hypothesis" | "theory" | "paradigm" | "anomaly" | "assumption" | "question" | "open_question";
  label: string;
  summary?: string;
  anomalous_to_uid?: string;
  assumes_uid?: string[];
  tests_uid?: string;
  addresses_uid?: string;
  supersedes_uid?: string;
  produces_uid?: string;
  confidence?: number;
  salience?: number;
  related_uids?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface StructureRequest {
  action: "concept" | "pattern" | "mechanism" | "model" | "model_evaluation" | "analogy" | "inference_chain" | "reasoning_strategy" | "sensitivity_analysis" | "theorem" | "equation" | "method" | "experiment";
  label: string;
  summary?: string;
  analogous_to_uid?: string;
  transfers_to_uid?: string[];
  evaluates_uid?: string;
  outperforms_uid?: string;
  chain_steps?: string[];
  derived_from_uid?: string[];
  proven_by_uid?: string;
  method_uid?: string;
  describes_uid?: string;
  part_of_uid?: string;
  supersedes_uid?: string;
  produces_uid?: string;
  related_uids?: string[];
  confidence?: number;
  salience?: number;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface CommitmentRequest {
  action: "goal" | "project" | "milestone";
  label: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  parent_uid?: string;
  motivated_by_uid?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface DeliberationRequest {
  action: "open_decision" | "add_option" | "add_constraint" | "resolve" | "get_open";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  decision_uid?: string;
  chosen_option_uid?: string;
  blocks_uid?: string;
  informs_uid?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface ProcedureRequest {
  action: "create_flow" | "add_step" | "add_affordance" | "add_control";
  label: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  flow_uid?: string;
  previous_step_uid?: string;
  uses_affordance_uids?: string[];
  goal_uid?: string;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface RiskRequest {
  action: "assess" | "get_assessments";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  assessed_uid?: string;
  filter_uid?: string;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface SessionRequest {
  action: "open" | "trace" | "close" | "journal";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  session_uid?: string;
  relevant_node_uids?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface DistillRequest {
  label: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  summarizes_uids?: string[];
  session_uid?: string;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface MemoryConfigRequest {
  action: "set_preference" | "get_preferences" | "set_policy" | "get_policies";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface PlanRequest {
  action: "create_task" | "create_plan" | "add_step" | "update_status" | "get_plan";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  goal_uid?: string;
  task_uid?: string;
  plan_uid?: string;
  depends_on_uids?: string[];
  target_uid?: string;
  status?: string;
  related_uids?: string[];
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface GovernanceRequest {
  action: "create_policy" | "set_budget" | "request_approval" | "resolve_approval" | "get_pending";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  governed_uid?: string;
  approval_uid?: string;
  approved?: boolean;
  requires_plan_uid?: string;
  props?: Record<string, unknown>;
  agent_id?: string;
}

export interface ExecutionRequest {
  action: "start" | "complete" | "fail" | "register_agent" | "get_executions";
  label?: string;
  summary?: string;
  confidence?: number;
  salience?: number;
  plan_uid?: string;
  executor_uid?: string;
  execution_uid?: string;
  produces_node_uid?: string;
  filter_plan_uid?: string;
  related_uids?: string[];
  props?: Record<string, unknown>;
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

// ---- Ingestion types ----

export interface IngestChunkRequest {
  content: string;
  chunk_type?: string;
  document_uid?: string;
  chunk_index?: number;
  label?: string;
  layers?: string[];
  agent_id?: string;
}

export interface IngestChunkResponse {
  chunk_uid: string;
  nodes_created: number;
  nodes_deduplicated: number;
  edges_created: number;
  extracted_node_uids: string[];
  errors: string[];
}

export interface IngestDocumentRequest {
  content: string;
  title?: string;
  document_type?: string;
  source_uri?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  layers?: string[];
  agent_id?: string;
}

export interface IngestDocumentResponse {
  job_id: string;
  document_uid: string;
}

export interface IngestSessionRequest {
  content: string;
  title?: string;
  session_uid?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  layers?: string[];
  agent_id?: string;
}

export interface RetrieveContextRequest {
  query: string;
  k?: number;
  depth?: number;
  node_types?: string[];
  layer?: string;
  include_chunks?: boolean;
  include_graph?: boolean;
  min_similarity?: number;
}

export interface RetrieveContextResponse {
  chunks: {
    chunk_uid: string;
    content: string;
    score: number;
    document_uid: string | null;
    chunk_index: number | null;
  }[];
  graph: {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
  };
}

export interface Job {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  progress: {
    total_chunks: number;
    processed_chunks: number;
    nodes_created: number;
    edges_created: number;
  };
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: number;
  queue_position?: number;
}

export interface ClearResponse {
  cleared: boolean;
  nodes_removed: number;
  edges_removed: number;
  versions_removed: number;
  aliases_removed: number;
  embeddings_removed: number;
}

export interface BatchRequest {
  nodes?: {
    label: string;
    node_type?: string;
    props?: Record<string, unknown>;
  }[];
  edges?: {
    from_uid: string;
    to_uid: string;
    edge_type: string;
  }[];
  agent_id?: string;
}

export interface DecayRequest {
  half_life_secs: number;
  min_salience?: number;
  min_age_secs?: number;
}

export interface PurgeRequest {
  before?: number;
}

// ---- Config ----

export interface MindGraphConfig {
  baseUrl: string;
  apiKey?: string;
  jwt?: string;
}
