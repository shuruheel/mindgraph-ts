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

/**
 * A `/retrieve` (text/semantic/hybrid) result. BREAKING (D3): the wire shape is
 * `{node, score, legs?}` — the previous flat `{uid, label, summary, node_type,
 * score}` never matched the server. Read fields off `.node` (e.g. `.node.uid`).
 * With `include_sources: true`, `.node.source_documents` carries provenance.
 */
export interface SearchResult {
  node: GraphNode & {
    source_documents?: Array<{
      uid: string;
      title: string;
      ingested_by_name?: string;
      occurred_at?: string;
    }>;
  };
  score: number;
  /** Present only when the hybrid search ran with `explain: true`. */
  legs?: LegContribution[];
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
  node_uid: string;
  label: string;
  node_type: string;
  edge_type: string | null;
  depth: number;
  parent_uid: string | null;
  /** Min-plus cost of the returned BFS path from the start node
   * (sum of -ln(weight), weights clamped to (1e-9, 1]); cost of the path
   * the traversal returned, not the cheapest path. 0 at the start node. */
  path_cost?: number;
  /** Product of edge confidences along the returned BFS path (clamped to
   * (1e-9, 1]); a ranking signal, not a calibrated probability. 1 at the
   * start node. */
  path_confidence?: number;
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

// ---- Epistemic layer prop types ----

export interface ClaimProps {
  content: string;
  claim_type?: string;
  certainty_degree?: number;
  truth_status?: string;
  scope?: string;
  quantitative_value?: number;
  unit?: string;
  uncertainty_range?: string;
  /** When the claimed event occurred (ISO 8601, may be imprecise, e.g. "2026-03"). */
  event_date?: string;
  /** Start of the interval over which the claim holds true in the world (ISO 8601). Absent = unbounded/unknown. */
  valid_from?: string;
  /** End of the interval over which the claim holds true (ISO 8601). Absent = unbounded/unknown (still valid). */
  valid_until?: string;
  /** "affirmative" | "negative" — whether the claim affirms or denies its predicate. */
  polarity?: string;
  /** Assertoric strength: "actual" | "necessary" | "likely" | "possible" | "hypothetical" | "counterfactual" | "other". */
  modality?: string;
  /** Quantifier over the subject: "universal" | "most" | "some" | "none" | "singular" | "numeric" | "other". */
  quantification?: string;
  /** Structured complement to `content`; present only for claims with one clear subject–predicate shape. */
  subject?: string;
  predicate?: string;
  object?: string;
  /** Content-addressed proposition identity (server-computed; never set by clients). */
  canonical_key?: string;
  source?: string;
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
  action: "text" | "semantic" | "hybrid" | "active_goals" | "open_questions" | "weak_claims" | "pending_approvals" | "unresolved_contradictions" | "preferences" | "layer" | "recent";
  /**
   * Required for `"text"`, `"semantic"`, `"hybrid"`. Optional for
   * `"preferences"`: with a `query` you get topic-relevant preferences (the
   * semantic leg bridges low lexical overlap — e.g. "suggest a hotel"
   * surfaces a stored "loved the rooftop pool"); without one you get all
   * preferences, most salient first. Either way the result is a
   * `SearchResult[]` (score = relevance with a query, salience without).
   * Use `"preferences"` for advice/recommendation requests so answers
   * reflect what the user likes.
   */
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
  /**
   * `recent` action only: restrict to nodes created at/after this unix
   * timestamp (seconds). Filters by INGESTION time, not event time.
   */
  created_after?: number;
  /**
   * `recent` action only: restrict to nodes created at/before this unix
   * timestamp (seconds). Filters by INGESTION time, not event time.
   */
  created_before?: number;
  /**
   * When true (`text`/`semantic`/`hybrid`), annotate each result's `node` with
   * `source_documents` (`[{uid, title, ingested_by_name?, occurred_at?}]`) —
   * provenance for citing "which teammate's notes" (D3). Requires server ≥ 1.8.0.
   */
  include_sources?: boolean;
}

export interface TraverseRequest {
  action: "chain" | "neighborhood" | "path" | "subgraph" | "top_k_paths";
  start_uid: string;
  end_uid?: string;
  max_depth?: number;
  direction?: "outgoing" | "incoming" | "both";
  edge_types?: string[];
  weight_threshold?: number;
  /** `top_k_paths` only: number of cheapest paths to return (default 3, cap 25). */
  k?: number;
  /** `top_k_paths` only: max edges per path (default 8, cap 16). */
  max_hops?: number;
  /** `top_k_paths` only: prune paths whose min-plus cost exceeds this. */
  max_cost?: number;
}

/** One result of the `top_k_paths` traverse action: the true k-cheapest
 * min-plus paths (engine `min_cost_k` semiring aggregation in recursion —
 * the optimum, unlike PathStep's first-discovery BFS scores). */
export interface ScoredPath {
  node_uids: string[];
  labels: string[];
  /** Σ −ln(weight) along the path; lower = stronger evidence chain. */
  cost: number;
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

/**
 * Maps a 1-based page number to the **UTF-8 byte offset** where that page begins
 * in `content`. `char_start` is a byte offset, NOT a codepoint count — count
 * UTF-8 bytes (`new TextEncoder().encode(s).length`), not `s.length`, or pages
 * will be wrong for any non-ASCII document.
 */
export interface PageOffset {
  page: number;
  char_start: number;
}

/**
 * A named participant in a conversation/transcript. Supplied at ingest so
 * extraction can map generic speaker labels ("Interviewer:") to real people
 * and attribute claims/preferences/demands to the named person.
 */
export interface Participant {
  name: string;
  organization?: string;
  role?: string;
}

export interface IngestChunkRequest {
  content: string;
  chunk_type?: string;
  document_uid?: string;
  chunk_index?: number;
  label?: string;
  layers?: string[];
  agent_id?: string;
  /**
   * Optional ontology schema id. When set, the per-chunk ontology extraction
   * pass runs inline after cognitive extraction and submits proposed domain
   * objects/relations. Presence alone triggers it.
   */
  ontology_schema_id?: string;
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
  /** Per-page character offsets into `content`, used to map extractions back to source pages. */
  page_offsets?: PageOffset[];
  /** Total number of pages in the source document. */
  page_count?: number;
  /** MIME type of the original source (e.g. "application/pdf"). */
  mime_type?: string;
  /** Re-ingest even if a document with the same content was already ingested. */
  force_reingest?: boolean;
  /**
   * Optional ontology schema id. When set, the ontology extraction pass runs
   * after cognitive passes. Presence alone triggers it (no `"ontology"` layer
   * required), so auto-classified documents still get typed extraction.
   */
  ontology_schema_id?: string;
  /** Named conversation participants — maps speaker labels to real people. */
  participants?: Participant[];
  /** When the document/conversation occurred (ISO-8601, imprecision ok). */
  occurred_at?: string;
  /** Free-text context grounding attribution during extraction. */
  context?: string;
}

export interface IngestDocumentResponse {
  job_id: string;
  document_uid: string;
  /** True when the document was recognized as a duplicate and ingestion was skipped. */
  deduplicated?: boolean;
}

export interface IngestSessionRequest {
  content: string;
  title?: string;
  session_uid?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  layers?: string[];
  agent_id?: string;
  /** Optional ontology schema id — triggers the ontology post-pass over the transcript's chunks. */
  ontology_schema_id?: string;
  /** Named conversation participants — maps speaker labels to real people. */
  participants?: Participant[];
  /** When the conversation occurred (ISO-8601, imprecision ok). */
  occurred_at?: string;
  /** Free-text context grounding attribution during extraction. */
  context?: string;
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
  /**
   * M3 as-of (valid time): ISO-8601 date to judge validity windows against.
   * Windowed nodes then carry `valid_at_time` instead of `currently_valid`.
   */
  valid_at?: string;
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

/**
 * Citation provenance for a graph node: the source chunk span(s) the node was
 * extracted from. Annotated onto retrieve-context graph nodes via `source_chunks`.
 */
export interface SourceChunk {
  chunk_uid: string;
  /** UTF-8 byte offset into the chunk where the source span starts. */
  char_start: number | null;
  /** UTF-8 byte offset into the chunk where the source span ends. */
  char_end: number | null;
  /** 1-based page number where the span starts (null if no page map). */
  page_start: number | null;
  /** 1-based page number where the span ends (null if no page map). */
  page_end: number | null;
  /** The verbatim source span (when matched), else null. */
  quote: string | null;
  /**
   * Web-Annotation-style selector object pinning the node to its source span,
   * or null when no confident match. `start`/`end` are chunk-relative UTF-8 byte
   * offsets; `exact` is the durable quote; `prefix`/`suffix` give re-anchoring context.
   */
  anchor: TextSelector | null;
}

/** A Web-Annotation quote+position selector (see `SourceChunk.anchor`). */
export interface TextSelector {
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
  end: number;
}

/**
 * Per-agent stance on a Claim: which agent asserts it and with what certainty.
 * Annotated onto retrieve-context graph nodes (Claim nodes) via `believed_by`.
 */
export interface BelievedBy {
  agent_uid: string;
  agent_label: string;
  /** The asserting agent's certainty in the claim, or null if unspecified. */
  confidence: number | null;
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
      source_documents?: {
        uid: string;
        title: string;
        /** User id of the teammate who ingested the source document (A4). */
        ingested_by?: string;
        /** Display name (else email) of the ingesting teammate. */
        ingested_by_name?: string;
      }[];
      source_chunks?: SourceChunk[];
      believed_by?: BelievedBy[];
      /** This node has been replaced by a newer value (Supersedes edge). */
      superseded?: boolean;
      /** UID of the node that superseded this one. */
      superseded_by?: string;
      /**
       * Whether the node's valid-time window (`props.valid_from`/`valid_until`)
       * contains today. Absent when the node carries no window — unknown is
       * not false.
       */
      currently_valid?: boolean;
      /** As-of variant of `currently_valid` when the request set `valid_at`. */
      valid_at_time?: boolean;
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

/**
 * Datasource binding for an object type — the "semantic contract" mapping it to
 * an external system (SQL today). Null/absent = extracted or authored.
 * See docs/plans/layer7-semantic-contract.md §2.
 */
export interface ObjectBacking {
  kind: "sql";
  /** MDO-ready list; exactly one source is supported today. */
  sources: SqlBackingSource[];
  /** Identity key, resolved via an indexed source_pk at sync time. */
  primary_key: string;
  title_field?: string;
  sync?: BackingSync;
}

export interface SqlBackingSource {
  /** FK into external_connections — credentials live in secrets, never here. */
  connection_ref: string;
  table: string;
  /** Join/identity key within this source. */
  key: string;
  filter?: BackingFilter;
  /** object field name -> binding. Each field is owned by exactly one source. */
  field_map: Record<string, FieldBinding>;
}

export interface FieldBinding {
  column: string;
  /** indexed = projected/embedded/searchable; live = fetched on demand, never stored. */
  mode?: "indexed" | "live";
}

/** Structured predicate (column op value) — never raw SQL. */
export interface BackingFilter {
  column: string;
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "like" | "is_null" | "not_null";
  value?: unknown;
}

export interface BackingSync {
  mode?: "incremental" | "full";
  cursor_column?: string;
  deleted_at_column?: string;
  /** null = manual "Sync now"; cron later. */
  schedule?: string | null;
}

/** Datasource binding for a relation type (FK column or M:M join table). */
export type RelationBacking =
  | {
      kind: "sql_fk";
      connection_ref: string;
      fk_table: string;
      fk_column: string;
      /** `table.column` the FK references (the other side's PK). */
      references: string;
    }
  | {
      kind: "sql_join_table";
      connection_ref: string;
      table: string;
      from_column: string;
      to_column: string;
    };

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
  /** Datasource binding (null = extracted/authored). */
  backing?: ObjectBacking | null;
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
  /** Datasource binding (null = extracted/authored). */
  backing?: RelationBacking | null;
  status: "active" | "deprecated" | "archived";
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OntologySchemaDetail extends OntologySchema {
  object_types: OntologyObjectType[];
  relation_types: OntologyRelationType[];
}

/** A generated read-only tool descriptor (from `listOntologyTools`). */
export interface OntologyToolDescriptor {
  name: string;
  description: string;
  schema_id: string;
  object_type: string;
  /** "search" | "object" | "object_context" */
  maps_to: string;
  input_schema: Record<string, unknown>;
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
  /** Bind this object type to an external source (SQL). Omit for extracted/authored. */
  backing?: ObjectBacking | null;
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
  /** Bind this relation to an FK column or M:M join table. Both endpoints must be sql-mapped. */
  backing?: RelationBacking | null;
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

export interface CreateDomainObjectRequest {
  schema_id: string;
  object_type: string;
  canonical_name: string;
  fields?: Record<string, unknown>;
  aliases?: string[];
  identity?: Record<string, unknown>;
  confidence?: number;
  /** Skip the same-type + same-name duplicate guard (default false). */
  allow_duplicate?: boolean;
}

export interface ExtractOntologyRequest {
  ontology_schema_id: string;
  source_uids: string[];
  mode?: "propose_only" | "respect_policies" | "force_auto_apply";
}

export type DomainObject = GraphNode;
export type DomainRelation = GraphEdge;
