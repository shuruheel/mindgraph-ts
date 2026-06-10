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

/**
 * One retrieval leg's contribution to a fused hybrid result — the
 * "why retrieved" detail. The fused score reconstructs exactly as
 * `Σ 1/(60 + rank)` over a result's legs.
 */
export interface LegContribution {
  /** Which leg surfaced the result: `"fts"` (keyword/BM25) or `"vec"` (vector). */
  leg: string;
  /** 1-based within-leg rank the fusion used. */
  rank: number;
  /**
   * The leg's raw score (BM25 relevance for `fts`, cosine similarity for
   * `vec`). Not comparable across legs — RRF fuses by rank, not score.
   */
  score: number;
}

/** A suspected duplicate pair awaiting human review (pending PossibleDuplicate edge). */
export interface MergeCandidate {
  edge_uid: string;
  node_a_uid: string;
  node_a_label: string;
  node_a_summary: string;
  node_b_uid: string;
  node_b_label: string;
  node_b_summary: string;
  node_type: string;
  /** Similarity score that triggered the candidate (e.g. cosine), if known. */
  similarity: number | null;
  /** How the candidate was found: "exact" | "fuzzy" | "semantic" | "llm". */
  method: string | null;
}

/** A `/retrieve` hybrid result: the full node plus the fused RRF score. */
export interface HybridSearchResult {
  node: GraphNode;
  score: number;
  /** Per-leg contributions; present only when the request set `explain: true`. */
  legs?: LegContribution[];
}

export interface SearchChunk {
  chunk_uid: string;
  content: string;
  document_uid: string | null;
  document_title: string | null;
  chunk_index: number | null;
}

export interface EnrichedSearchResponse {
  results: SearchResult[];
  edges: GraphEdge[];
  chunks: SearchChunk[];
}

export interface PathStep {
  uid: string;
  label: string;
  node_type: string;
  edge_type: string | null;
  depth: number;
  parent_uid: string | null;
}

// ---- Reality layer prop types ----

export interface PersonProps {
  canonical_name: string;
  description?: string;
  birth_date?: string;
  death_date?: string;
  nationality?: string;
  occupation?: string;
  identifiers?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

export interface OrganizationProps {
  canonical_name: string;
  description?: string;
  org_type: string;
  founded_date?: string;
  dissolved_date?: string;
  headquarters?: string;
  sector?: string;
  identifiers?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

export interface NationProps {
  canonical_name: string;
  description?: string;
  iso_code?: string;
  capital?: string;
  government_type?: string;
  region?: string;
  identifiers?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

export interface EventProps {
  canonical_name: string;
  description?: string;
  event_type: string;
  event_date?: string;
  end_date?: string;
  location?: string;
  identifiers?: Record<string, string>;
  attributes?: Record<string, unknown>;
}

export interface PlaceProps {
  canonical_name: string;
  description?: string;
  place_type: string;
  coordinates?: { lat: number; lon: number };
  parent_location?: string;
  identifiers?: Record<string, string>;
  attributes?: Record<string, unknown>;
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
  /**
   * Retrieval action. Note: `"semantic"` requires a configured embedding
   * provider on the server; for semantic search use `retrieveContext()` instead.
   */
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
  /**
   * Hybrid action only: attach per-leg contributions (`legs`) to each
   * result — the "why retrieved" detail. Requires server ≥ 1.2.0; older
   * servers ignore the field.
   */
  explain?: boolean;
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
  /** Semantic content type: "article" (default), "meeting_notes", "journal". Drives default extraction layers. */
  content_type?: string;
  source_uri?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  layers?: string[];
  agent_id?: string;
  /** Paper metadata */
  authors?: string[];
  abstract_text?: string;
  doi?: string;
  publication_date?: string;
  journal?: string;
  keywords?: string[];
  citation_count?: number;
  arxiv_id?: string;
  language?: string;
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
  /** Max graph nodes to return (default 10). */
  node_limit?: number;
  /** Max wiki articles to return (default 3). Set to 0 to skip. */
  article_limit?: number;
  /** Max raw chunks to return (default 0). Set > 0 to include source text. */
  chunk_limit?: number;
  node_types?: string[];
  layer?: string;
  include_graph?: boolean;
  min_similarity?: number;
}

export interface ArticleResult {
  uid: string;
  label: string;
  content: string;
  article_type: string;
  covers_uid: string | null;
  questions: string[] | null;
  score: number;
}

export interface ListArticlesResponse {
  articles: GraphNode[];
  total: number;
  has_more: boolean;
}

export interface RetrieveContextResponse {
  articles?: ArticleResult[];
  chunks?: {
    chunk_uid: string;
    content: string;
    score: number;
    document_uid: string | null;
    document_title: string | null;
    chunk_index: number | null;
  }[];
  graph: {
    nodes: (Record<string, unknown> & {
      source_documents?: { uid: string; title: string }[];
    })[];
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

// ---- Synthesis (Projects) ----

export interface SignalsQuery {
  /**
   * Comma-separated subset of signal names to compute, e.g.
   * `"documents,entity_bridges,claim_hubs"`. If omitted, all signals run.
   */
  signals?: string;
  /**
   * Comma-separated node types used as filters for `entity_bridges` and
   * `claim_hubs`. Defaults to the server's built-in target set
   * (Person, Organization, Nation, Event, Place, Theory, Hypothesis,
   * Pattern, Mechanism, Model, Analogy).
   */
  target_types?: string;
}

export interface DocumentRef {
  uid: string;
  label: string;
}

export interface EntityBridge {
  uid: string;
  label: string;
  node_type: string;
  doc_count: number;
}

export interface ClaimHub {
  target_uid: string;
  target_label: string;
  target_type: string;
  claim_count: number;
}

export interface RankedClaimHub {
  target_uid: string;
  target_label: string;
  target_type: string;
  claim_count: number;
  distinct_doc_count: number;
  project_doc_count: number;
  dialectical_count: number;
  score: number;
  breadth_score: number;
  tension_score: number;
  density_score: number;
}

export interface ClusterClaimSample {
  uid: string;
  label: string;
  source_doc_label: string;
}

export interface EpistemicCounts {
  evidence: number;
  arguments: number;
  warrants: number;
  theories_hypotheses: number;
  contradicts_edges: number;
}

export interface ClusteredClaimHub {
  cluster_id: number;
  size: number;
  distinct_doc_count: number;
  project_doc_count: number;
  cohesion_score: number;
  epistemic_density: number;
  score: number;
  breadth_score: number;
  size_score: number;
  dominant_entity_uid: string | null;
  dominant_entity_label: string | null;
  dominant_entity_type: string | null;
  sample_claims: ClusterClaimSample[];
  epistemic_counts: EpistemicCounts;
}

export interface TheorySupportGap {
  uid: string;
  label: string;
  node_type: string;
  support_count: number;
}

export interface ConceptCluster {
  uid: string;
  label: string;
  doc_count: number;
}

export interface AnalogyCandidate {
  uid: string;
  label: string;
  summary: string;
}

export interface DialecticalPair {
  edge_type: string;
  from_uid: string;
  from_label: string;
  to_uid: string;
  to_label: string;
}

export interface SignalsResponse {
  project_uid: string;
  documents: DocumentRef[];
  entity_bridges: EntityBridge[];
  claim_hubs: ClaimHub[];
  ranked_claim_hubs: RankedClaimHub[];
  clustered_claim_hubs: ClusteredClaimHub[];
  theory_support_gaps: TheorySupportGap[];
  concept_clusters: ConceptCluster[];
  analogy_candidates: AnalogyCandidate[];
  dialectical_pairs: DialecticalPair[];
}

export interface SynthesisJobResponse {
  job_id: string;
}

// ---- Config ----

export interface MindGraphConfig {
  baseUrl: string;
  apiKey?: string;
  jwt?: string;
  orgId?: string;
  /** Max retries for 503 (server warming up) responses. Default: 3. Set to 0 to disable. */
  maxRetries?: number;
  /** Initial backoff in ms before first retry. Doubles each attempt. Default: 1000. */
  retryBackoffMs?: number;
}

// ============================================================================
// Operational Ontology Layer (Layer 7)
// ============================================================================

/** Field schema entry inside `OntologyObjectType.fields_json`. */
export interface FieldDefinition {
  name: string;
  /** One of: string|number|integer|boolean|date|datetime|enum|reference|array|object|json */
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: string[];
  reference_object_type?: string;
  array_item_type?: string;
  extraction_hint?: string;
}

export interface OntologySchema {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  status: "draft" | "active" | "deprecated" | "archived";
  version: number;
  propose_status?: "pending" | "running" | "ready" | "failed" | null;
  propose_job_id?: string | null;
  propose_error?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  activated_at?: string | null;
  archived_at?: string | null;
}

export interface OntologyObjectType {
  id: string;
  schema_id: string;
  org_id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  fields_json: FieldDefinition[];
  required_fields: string[];
  identity_fields: string[];
  aliases: string[];
  examples_json: Record<string, unknown>[];
  extraction_hints?: string | null;
  default_confidence: number;
  review_policy: "always" | "low_confidence" | "never";
  status: "active" | "deprecated" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OntologyRelationType {
  id: string;
  schema_id: string;
  org_id: string;
  name: string;
  display_name?: string | null;
  description?: string | null;
  source_type: string;
  target_type: string;
  cardinality?: "one_to_one" | "one_to_many" | "many_to_many" | null;
  symmetric: boolean;
  transitive: boolean;
  inverse_relation_type?: string | null;
  fields_json: FieldDefinition[];
  extraction_hints?: string | null;
  review_policy: "always" | "low_confidence" | "never";
  status: "active" | "deprecated" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OntologySchemaDetail extends OntologySchema {
  object_types: OntologyObjectType[];
  relation_types: OntologyRelationType[];
}

export interface CreateOntologySchemaRequest {
  name: string;
  description?: string;
}

export interface UpdateOntologySchemaRequest {
  name?: string;
  description?: string;
}

export interface OntologyObjectTypeInput {
  name: string;
  display_name?: string;
  description?: string;
  fields?: FieldDefinition[];
  required_fields?: string[];
  identity_fields?: string[];
  aliases?: string[];
  examples?: Record<string, unknown>[];
  extraction_hints?: string;
  default_confidence?: number;
  review_policy?: "always" | "low_confidence" | "never";
}

export interface OntologyRelationTypeInput {
  name: string;
  display_name?: string;
  description?: string;
  source_type: string;
  target_type: string;
  cardinality?: "one_to_one" | "one_to_many" | "many_to_many";
  symmetric?: boolean;
  transitive?: boolean;
  inverse_relation_type?: string;
  fields?: FieldDefinition[];
  extraction_hints?: string;
  review_policy?: "always" | "low_confidence" | "never";
}

/** Status: pending | approved | approval_required | rejected | applied | apply_failed. */
export interface OntologyProposal {
  id: string;
  org_id: string;
  schema_id: string;
  proposal_type: string;
  proposed_by_agent_id?: string | null;
  source_uids: string[];
  source_scope_ids: string[];
  changes_json: {
    adds: Array<Record<string, unknown>>;
    updates: Array<Record<string, unknown>>;
    removes: Array<Record<string, unknown>>;
  };
  rationale?: string | null;
  confidence?: number | null;
  risk_level?: string | null;
  review_status: string;
  approval_uid?: string | null;
  proposed_node_uid?: string | null;
  applied_job_id?: string | null;
  applied_error?: string | null;
  apply_attempt_count: number;
  edited_by?: string | null;
  edited_at?: string | null;
  original_snapshot?: Record<string, unknown> | null;
  requires_manual_resolution: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface ProposalEdits {
  canonical_name?: string;
  fields?: Record<string, unknown>;
  aliases?: string[];
}

export interface ProposeOntologySchemaRequest {
  description?: string;
  template_hint?:
    | "client_services"
    | "healthcare"
    | "supply_chain"
    | "research_intel"
    | "custom";
  source_uids?: string[];
  source_documents?: Array<{ content: string; title?: string }>;
  target_use_case?: string;
  example_objects?: string[];
  example_queries?: string[];
  desired_workflows?: string[];
  parent_schema_id?: string;
}

export interface OntologyQueryRequest {
  query: string;
  schema_id: string;
  object_types?: string[];
  include_cognitive_context?: boolean;
  include_sources?: boolean;
  depth?: number;
  limit?: number;
}

export interface OntologyQueryResponse {
  objects: GraphNode[];
  relations: GraphEdge[];
  cognitive_context: Record<string, GraphNode[]>;
  external_refs: unknown[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  provenance: Array<{ node_uid: string; source_uid: string; text_span: string }>;
  confidence: { overall: number };
  truncated?: Record<string, boolean>;
}

export interface LinkDomainObjectsRequest {
  from_uid: string;
  to_uid: string;
  relation_type: string;
  fields?: Record<string, unknown>;
  confidence?: number;
  agent_id?: string;
}

export interface ExtractOntologyRequest {
  ontology_schema_id: string;
  source_uids: string[];
  mode?: "propose_only" | "respect_policies" | "force_auto_apply";
}

export type DomainObject = GraphNode;
export type DomainRelation = GraphEdge;
