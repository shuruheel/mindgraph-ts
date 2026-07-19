import type {
  MindGraphConfig,
  GraphNode,
  GraphEdge,
  SearchResult,
  HybridSearchResult,
  MergeCandidate,
  StaleDerivation,
  EnrichedSearchResponse,
  PathStep,
  CaptureRequest,
  EntityRequest,
  ArgumentRequest,
  InquiryRequest,
  StructureRequest,
  CommitmentRequest,
  DeliberationRequest,
  ProcedureRequest,
  RiskRequest,
  SessionRequest,
  DistillRequest,
  MemoryConfigRequest,
  PlanRequest,
  GovernanceRequest,
  ExecutionRequest,
  RetrieveRequest,
  TraverseRequest,
  EvolveRequest,
  IngestChunkRequest,
  IngestChunkResponse,
  IngestDocumentRequest,
  IngestDocumentResponse,
  IngestSessionRequest,
  RetrieveContextRequest,
  RetrieveContextResponse,
  Job,
  ClearResponse,
  BatchRequest,
  DecayRequest,
  PurgeRequest,
  ListArticlesResponse,
  SignalsQuery,
  SignalsResponse,
  SynthesisJobResponse,
  // Ontology layer
  OntologySchema,
  OntologySchemaDetail,
  OntologyObjectType,
  OntologyObjectTypeInput,
  OntologyRelationType,
  OntologyRelationTypeInput,
  CreateOntologySchemaRequest,
  UpdateOntologySchemaRequest,
  ProposeOntologySchemaRequest,
  OntologyProposal,
  OntologyDuplicateAudit,
  ProposalEdits,
  OntologyQueryRequest,
  OntologyQueryResponse,
  OntologyToolDescriptor,
  LinkDomainObjectsRequest,
  CreateDomainObjectRequest,
  ExtractOntologyRequest,
  DomainObject,
} from "./types.js";

export class MindGraphError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "MindGraphError";
  }
}

export class MindGraph {
  private baseUrl: string;
  private headers: Record<string, string>;
  private maxRetries: number;
  private retryBackoffMs: number;

  constructor(config: MindGraphConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (config.apiKey) {
      this.headers["Authorization"] = `Bearer ${config.apiKey}`;
    } else if (config.jwt) {
      this.headers["Authorization"] = `Bearer ${config.jwt}`;
    }
    if (config.orgId) {
      this.headers["X-MindGraph-Org"] = config.orgId;
    }
    this.maxRetries = config.maxRetries ?? 3;
    this.retryBackoffMs = config.retryBackoffMs ?? 1000;
  }

  // ---- HTTP helpers ----

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let lastError: MindGraphError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        const err = new MindGraphError(
          `${method} ${path} failed: ${res.status}`,
          res.status,
          parsed,
        );
        // Retry on 503 (server warming up) with exponential backoff
        if (res.status === 503 && attempt < this.maxRetries) {
          lastError = err;
          const delay = this.retryBackoffMs * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
      const text = await res.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    }
    throw lastError!;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // ---- Health ----

  async health(): Promise<{ status: string }> {
    return this.get("/health");
  }

  async stats(): Promise<Record<string, unknown>> {
    return this.get("/stats");
  }

  /**
   * Schema fill-rate report (measure-first tiering): per live node type,
   * the exact live count and sampled per-field fill rates; near-empty
   * fields flagged below 5%. `sample` caps per-type sampling (default
   * 1000); `layer` restricts (e.g. "epistemic").
   */
  async schemaFillStats(params?: {
    sample?: number;
    layer?: string;
  }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.sample !== undefined) q.set("sample", String(params.sample));
    if (params?.layer) q.set("layer", params.layer);
    const qs = q.toString();
    return this.get(`/stats/schema-fill${qs ? `?${qs}` : ""}`);
  }

  // ---- Reality Layer ----

  async capture(req: CaptureRequest): Promise<unknown> {
    return this.post("/reality/capture", req);
  }

  async entity(req: EntityRequest): Promise<unknown> {
    return this.post("/reality/entity", req);
  }

  /** Convenience: create or find an entity by label. */
  async findOrCreateEntity(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.post("/reality/entity", {
      action: "create",
      label,
      props: { entity_type: "other", ...props },
      agent_id: agentId,
    });
  }

  /** Convenience: create or find a Person entity by label. */
  async findOrCreatePerson(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "person", ...props }, agentId);
  }

  /** Convenience: create or find an Organization entity by label. */
  async findOrCreateOrganization(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "organization", ...props }, agentId);
  }

  /** Convenience: create or find a Nation entity by label. */
  async findOrCreateNation(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "nation", ...props }, agentId);
  }

  /** Convenience: create or find an Event entity by label. */
  async findOrCreateEvent(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "event", ...props }, agentId);
  }

  /** Convenience: create or find a Place entity by label. */
  async findOrCreatePlace(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "place", ...props }, agentId);
  }

  /** Convenience: create or find a Concept entity by label. */
  async findOrCreateConcept(
    label: string,
    props?: Record<string, unknown>,
    agentId?: string,
  ): Promise<GraphNode & { created: boolean }> {
    return this.findOrCreateEntity(label, { entity_type: "concept", ...props }, agentId);
  }

  /**
   * Resolve text to an existing entity via alias matching.
   * Returns `{ uid: string | null }`.
   */
  async resolveEntity(
    text: string,
    agentId?: string,
  ): Promise<{ uid: string | null }> {
    return this.post("/reality/entity", {
      action: "resolve",
      text,
      agent_id: agentId,
    });
  }

  /**
   * Fuzzy-match text against existing entities.
   * Returns `{ matches: [{ uid, label, score }] }`.
   */
  async fuzzyResolveEntity(
    text: string,
    limit = 5,
    agentId?: string,
  ): Promise<{ matches: { uid: string; label: string; score: number }[] }> {
    return this.post("/reality/entity", {
      action: "fuzzy_resolve",
      text,
      limit,
      agent_id: agentId,
    });
  }

  // ---- Epistemic Layer ----

  async argue(req: ArgumentRequest): Promise<unknown> {
    return this.post("/epistemic/argument", req);
  }

  async inquire(req: InquiryRequest): Promise<unknown> {
    return this.post("/epistemic/inquiry", req);
  }

  async structure(req: StructureRequest): Promise<unknown> {
    return this.post("/epistemic/structure", req);
  }

  /**
   * Convenience: create a Claim node via the argument endpoint.
   * Returns the full argument response including `claim_uid`.
   */
  async addClaim(
    label: string,
    content: string,
    confidence?: number,
    agentId?: string,
  ): Promise<unknown> {
    return this.post("/epistemic/argument", {
      claim: {
        label,
        confidence,
        props: { content },
      },
      agent_id: agentId,
    });
  }

  /**
   * Convenience: create an Evidence node attached to a claim via the argument endpoint.
   * If `claimLabel` and `claimConfidence` are provided, also creates the claim.
   */
  async addEvidence(
    label: string,
    description: string,
    agentId?: string,
  ): Promise<unknown> {
    return this.post("/epistemic/argument", {
      claim: { label: `Claim for: ${label}` },
      evidence: [{ label, props: { description } }],
      agent_id: agentId,
    });
  }

  /** Convenience: create an Observation node via the reality capture endpoint. */
  async addObservation(
    label: string,
    description: string,
    agentId?: string,
  ): Promise<unknown> {
    return this.post("/reality/capture", {
      action: "observation",
      label,
      summary: description,
      agent_id: agentId,
    });
  }

  // ---- Intent Layer ----

  async commit(req: CommitmentRequest): Promise<unknown> {
    return this.post("/intent/commitment", req);
  }

  async deliberate(req: DeliberationRequest): Promise<unknown> {
    return this.post("/intent/deliberation", req);
  }

  /** Open a new decision for deliberation. Returns the Decision node. */
  async openDecision(
    label: string,
    opts?: { summary?: string; props?: Record<string, unknown>; agent_id?: string },
  ): Promise<unknown> {
    return this.post("/intent/deliberation", {
      action: "open_decision",
      label,
      ...opts,
    });
  }

  /** Add an option to an open decision. Returns the Option node. */
  async addOption(
    decisionUid: string,
    label: string,
    opts?: { summary?: string; props?: Record<string, unknown>; agent_id?: string },
  ): Promise<unknown> {
    return this.post("/intent/deliberation", {
      action: "add_option",
      decision_uid: decisionUid,
      label,
      ...opts,
    });
  }

  /**
   * Resolve a decision by choosing an option.
   * `chosenOptionUid` must be the uid of an option added via `addOption()`.
   */
  async resolveDecision(
    decisionUid: string,
    chosenOptionUid: string,
    opts?: {
      summary?: string;
      props?: Record<string, unknown>;
      informs_uid?: string[];
      as_of_date?: string;
      session_id?: string;
      retrieval_trace_id?: string;
      agent_id?: string;
    },
  ): Promise<unknown> {
    return this.post("/intent/deliberation", {
      action: "resolve",
      decision_uid: decisionUid,
      chosen_option_uid: chosenOptionUid,
      ...opts,
    });
  }

  // ---- Action Layer ----

  async procedure(req: ProcedureRequest): Promise<unknown> {
    return this.post("/action/procedure", req);
  }

  async risk(req: RiskRequest): Promise<unknown> {
    return this.post("/action/risk", req);
  }

  // ---- Memory Layer ----

  async session(req: SessionRequest): Promise<unknown> {
    return this.post("/memory/session", req);
  }

  async journal(
    label: string,
    props: Record<string, unknown>,
    options?: {
      summary?: string;
      session_uid?: string;
      relevant_node_uids?: string[];
      confidence?: number;
      salience?: number;
      agent_id?: string;
    }
  ): Promise<unknown> {
    return this.post("/memory/session", {
      action: "journal" as const,
      label,
      props,
      ...options,
    });
  }

  async distill(req: DistillRequest): Promise<unknown> {
    return this.post("/memory/distill", req);
  }

  async memoryConfig(req: MemoryConfigRequest): Promise<unknown> {
    return this.post("/memory/config", req);
  }

  // ---- Agent Layer ----

  async plan(req: PlanRequest): Promise<unknown> {
    return this.post("/agent/plan", req);
  }

  async governance(req: GovernanceRequest): Promise<unknown> {
    return this.post("/agent/governance", req);
  }

  async execution(req: ExecutionRequest): Promise<unknown> {
    return this.post("/agent/execution", req);
  }

  // ---- Cross-cutting ----

  /** Returns an array of results. Shape varies by action. */
  async retrieve(req: RetrieveRequest): Promise<unknown[]> {
    return this.post("/retrieve", req);
  }

  async traverse(req: TraverseRequest): Promise<unknown> {
    return this.post("/traverse", req);
  }

  async evolve(req: EvolveRequest): Promise<unknown> {
    return this.post("/evolve", req);
  }

  // ---- Node CRUD ----

  async getNode(uid: string): Promise<GraphNode> {
    return this.get(`/node/${uid}`);
  }

  /**
   * Create a node via the low-level CRUD endpoint.
   *
   * The server requires `props._type` to determine the node variant.
   * If `node_type` is provided and `_type` is not already in `props`,
   * it is injected automatically.
   */
  async addNode(body: {
    label: string;
    node_type?: string;
    props?: Record<string, unknown>;
    agent_id?: string;
  }): Promise<GraphNode> {
    const props: Record<string, unknown> = { ...body.props };
    if (body.node_type && !("_type" in props)) {
      props._type = body.node_type;
    }
    return this.post("/node", { ...body, props });
  }

  async updateNode(
    uid: string,
    body: {
      label?: string;
      summary?: string;
      confidence?: number;
      salience?: number;
      agent_id?: string;
    },
  ): Promise<GraphNode> {
    return this.patch(`/node/${uid}`, body);
  }

  async deleteNode(uid: string): Promise<void> {
    await this.del(`/node/${uid}`);
  }

  async batchDeleteNodes(params: {
    uids?: string[];
    agentId?: string;
    filter?: {
      nodeType?: string;
      nodeTypes?: string[];
      layer?: string;
      labelContains?: string;
      propEquals?: [string, string];
    };
    reason?: string;
    by?: string;
    hardPurge?: boolean;
  }): Promise<{
    nodes_tombstoned: number;
    edges_tombstoned: number;
    nodes_purged: number;
    edges_purged: number;
  }> {
    const body: Record<string, unknown> = {};
    if (params.uids) body.uids = params.uids;
    if (params.agentId) body.agent_id = params.agentId;
    if (params.filter) {
      body.filter = {
        node_type: params.filter.nodeType,
        node_types: params.filter.nodeTypes,
        layer: params.filter.layer,
        label_contains: params.filter.labelContains,
        prop_equals: params.filter.propEquals,
      };
    }
    if (params.reason) body.reason = params.reason;
    if (params.by) body.by = params.by;
    if (params.hardPurge) body.hard_purge = params.hardPurge;
    return this.post("/nodes/delete", body);
  }

  async getNodeHistory(uid: string): Promise<unknown[]> {
    return this.get(`/node/${uid}/history`);
  }

  async getNodeAtVersion(uid: string, version: number): Promise<GraphNode> {
    return this.get(`/node/${uid}/history/${version}`);
  }

  // ---- Edge CRUD ----

  async addLink(body: {
    from_uid: string;
    to_uid: string;
    edge_type: string;
    agent_id?: string;
  }): Promise<unknown> {
    return this.post("/link", body);
  }

  /**
   * Create an edge via the low-level CRUD endpoint.
   *
   * The server requires `props._type` to determine the edge variant.
   * If `edge_type` is provided and `_type` is not already in `props`,
   * it is injected automatically.
   */
  async addEdge(body: {
    from_uid: string;
    to_uid: string;
    edge_type: string;
    weight?: number;
    props?: Record<string, unknown>;
    agent_id?: string;
  }): Promise<unknown> {
    const props: Record<string, unknown> = { ...body.props };
    if (body.edge_type && !("_type" in props)) {
      props._type = body.edge_type;
    }
    return this.post("/edge", { ...body, props });
  }

  async updateEdge(uid: string, body: {
    weight?: number;
    props?: Record<string, unknown>;
    agent_id?: string;
  }): Promise<unknown> {
    return this.patch(`/edge/${uid}`, body);
  }

  async deleteEdge(uid: string): Promise<void> {
    await this.del(`/edge/${uid}`);
  }

  async getEdgeHistory(uid: string): Promise<unknown[]> {
    return this.get(`/edge/${uid}/history`);
  }

  /**
   * List edges filtered by source and/or target node.
   * At least one of `from_uid` or `to_uid` is **required** —
   * the server returns 400 if neither is provided.
   */
  async getEdges(params: {
    from_uid?: string;
    to_uid?: string;
  }): Promise<GraphEdge[]> {
    if (!params.from_uid && !params.to_uid) {
      throw new Error("at least one of from_uid or to_uid is required");
    }
    const qs = new URLSearchParams();
    if (params.from_uid) qs.set("from_uid", params.from_uid);
    if (params.to_uid) qs.set("to_uid", params.to_uid);
    return this.get(`/edges?${qs}`);
  }

  async getEdgeBetween(params: {
    from_uid: string;
    to_uid: string;
    edge_type?: string;
  }): Promise<GraphEdge[]> {
    const qs = new URLSearchParams();
    qs.set("from_uid", params.from_uid);
    qs.set("to_uid", params.to_uid);
    if (params.edge_type) qs.set("edge_type", params.edge_type);
    return this.get(`/edge/between?${qs}`);
  }

  // ---- Search ----

  async search(query: string, opts?: {
    project_uid?: string;
    node_type?: string;
    layer?: string;
    limit?: number;
    min_score?: number;
    include_edges?: boolean;
    include_chunks?: boolean;
  }): Promise<SearchResult[] | EnrichedSearchResponse> {
    return this.post("/search", { query, ...opts });
  }

  /**
   * Hybrid BM25 + vector search with reciprocal rank fusion. Pass
   * `explain: true` to get per-leg contributions (`legs`) on each result —
   * the "why retrieved" detail (server ≥ 1.2.0; older servers ignore it).
   */
  async hybridSearch(query: string, opts?: {
    project_uid?: string;
    k?: number;
    node_types?: string[];
    layer?: string;
    explain?: boolean;
  }): Promise<HybridSearchResult[]> {
    return this.post("/retrieve", {
      action: "hybrid",
      query,
      ...opts,
    });
  }

  // ---- Nodes listing ----

  async getNodes(params?: {
    node_type?: string;
    layer?: string;
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.node_type) qs.set("node_type", params.node_type);
    if (params?.layer) qs.set("layer", params.layer);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    return this.get(`/nodes?${qs}`);
  }

  async getAgentNodes(agentId: string): Promise<GraphNode[]> {
    return this.get(`/agent/${agentId}/nodes`);
  }

  // ---- Batch ----

  async batch(req: BatchRequest): Promise<unknown> {
    return this.post("/batch", req);
  }

  /** Fetch multiple nodes by UID in a single request. */
  async getNodesBatch(uids: string[]): Promise<GraphNode[]> {
    return this.post("/nodes/batch", { uids }) as Promise<GraphNode[]>;
  }

  /** Fetch all edges between a set of node UIDs. */
  async getEdgesBatch(uids: string[]): Promise<GraphEdge[]> {
    return this.post("/edges/batch", { uids }) as Promise<GraphEdge[]>;
  }

  // ---- Embeddings ----

  async configureEmbeddings(body: {
    model: string;
    dimensions: number;
    distance_metric?: string;
  }): Promise<unknown> {
    return this.post("/embeddings/configure", body);
  }

  async embeddingSearch(body: {
    vector: number[];
    k?: number;
    node_types?: string[];
    threshold?: number;
  }): Promise<unknown> {
    return this.post("/embeddings/search", body);
  }

  async embeddingSearchText(body: {
    text: string;
    k?: number;
    node_types?: string[];
    threshold?: number;
  }): Promise<unknown> {
    return this.post("/embeddings/search-text", body);
  }

  async getEmbedding(uid: string): Promise<unknown> {
    return this.get(`/node/${uid}/embedding`);
  }

  async setEmbedding(uid: string, vector: number[]): Promise<void> {
    await this.request("PUT", `/node/${uid}/embedding`, { vector });
  }

  async deleteEmbedding(uid: string): Promise<void> {
    await this.del(`/node/${uid}/embedding`);
  }

  // ---- Entity resolution ----

  async mergeEntities(body: {
    keep_uid: string;
    merge_uid: string;
    agent_id?: string;
  }): Promise<unknown> {
    return this.post("/entities/merge", body);
  }

  async addAlias(body: {
    text: string;
    canonical_uid: string;
    score?: number;
  }): Promise<unknown> {
    return this.post("/alias", body);
  }

  async getAliases(uid: string): Promise<unknown> {
    return this.get(`/aliases/${uid}`);
  }

  async resolveAlias(text: string): Promise<unknown> {
    return this.get(`/resolve?text=${encodeURIComponent(text)}`);
  }

  // ---- Export / Import ----

  async exportGraph(): Promise<unknown> {
    return this.get("/export");
  }

  /**
   * Export one document's extraction provenance as JSON-LD: PROV-O
   * entities/agents, CiTO relations between extracted claims, and the
   * citation anchors as W3C Web Annotations (TextQuoteSelector +
   * TextPositionSelector; positions are chunk-relative UTF-8 byte offsets,
   * flagged via `mg:offsetUnit`).
   */
  async exportProvenance(documentUid: string): Promise<unknown> {
    return this.get(
      `/export/prov?document_uid=${encodeURIComponent(documentUid)}`,
    );
  }

  async importGraph(data: unknown): Promise<unknown> {
    return this.post("/import", data);
  }

  // ---- Lifecycle ----

  async decay(req: DecayRequest): Promise<unknown> {
    return this.post("/decay", req);
  }

  async purge(req?: PurgeRequest): Promise<unknown> {
    return this.post("/purge", req ?? {});
  }

  // ---- Traversal shortcuts ----

  async reasoningChain(uid: string, maxDepth = 5): Promise<PathStep[]> {
    const r = await this.post("/traverse", {
      action: "chain",
      start_uid: uid,
      max_depth: maxDepth,
    });
    return (r as any)?.steps ?? r;
  }

  async neighborhood(uid: string, maxDepth = 1): Promise<PathStep[]> {
    const r = await this.post("/traverse", {
      action: "neighborhood",
      start_uid: uid,
      max_depth: maxDepth,
    });
    return (r as any)?.steps ?? r;
  }

  async subgraph(uid: string, opts?: {
    max_depth?: number;
    direction?: "outgoing" | "incoming" | "both";
    edge_types?: string[];
    weight_threshold?: number;
  }): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    return this.post("/subgraph", { start_uids: [uid], ...opts });
  }

  // ---- Lifecycle shortcuts ----

  async tombstone(uid: string, reason?: string, agentId?: string): Promise<unknown> {
    return this.post("/evolve", {
      action: "tombstone",
      uid,
      reason,
      agent_id: agentId,
    });
  }

  async restore(uid: string, agentId?: string): Promise<unknown> {
    return this.post("/evolve", {
      action: "restore",
      uid,
      agent_id: agentId,
    });
  }

  // ---- Epistemic queries ----

  async getGoals(): Promise<GraphNode[]> {
    return this.get("/goals");
  }

  async getOpenDecisions(): Promise<GraphNode[]> {
    return this.get("/decisions");
  }

  async getOpenQuestions(): Promise<GraphNode[]> {
    return this.get("/questions");
  }

  async getWeakClaims(): Promise<GraphNode[]> {
    return this.get("/claims/weak");
  }

  async getContradictions(): Promise<unknown[]> {
    return this.get("/contradictions");
  }

  /**
   * Pending merge candidates: suspected duplicate pairs recorded by the dedup
   * pipeline's ambiguous zone as PossibleDuplicate edges, awaiting a human
   * merge/dismiss decision (server >= 1.3).
   */
  async getMergeCandidates(): Promise<MergeCandidate[]> {
    return this.post("/retrieve", { action: "merge_candidates" });
  }

  /** Load-bearing conclusions awaiting repair after a premise changed. */
  async getStaleDerivations(limit = 50, offset = 0): Promise<StaleDerivation[]> {
    return this.post("/retrieve", { action: "stale_derivations", limit, offset });
  }

  async getPendingApprovals(): Promise<GraphNode[]> {
    return this.get("/approvals/pending");
  }

  // ---- Ingestion & Retrieval ----

  async ingestChunk(req: IngestChunkRequest): Promise<IngestChunkResponse> {
    return this.post("/ingest/chunk", req);
  }

  async ingestDocument(req: IngestDocumentRequest): Promise<IngestDocumentResponse> {
    return this.post("/ingest/document", req);
  }

  async ingestSession(req: IngestSessionRequest): Promise<IngestDocumentResponse> {
    return this.post("/ingest/session", req);
  }

  async retrieveContext(req: RetrieveContextRequest): Promise<RetrieveContextResponse> {
    return this.post("/retrieve/context", req);
  }

  /** Backfill node_source provenance for existing graphs. */
  async backfillNodeSources(): Promise<{ documents_processed: number; node_source_pairs_added: number }> {
    return this.post("/backfill/node-sources", {});
  }

  /** Backfill citation anchors (source_chunks spans) for existing graphs. Returns a background job id. */
  async backfillAnchors(): Promise<{ job_id: string }> {
    return this.post("/backfill/anchors", {});
  }

  async listJobs(): Promise<Job[]> {
    return this.get("/jobs");
  }

  async getJob(id: string): Promise<Job> {
    return this.get(`/jobs/${id}`);
  }

  async cancelJob(id: string): Promise<unknown> {
    return this.post(`/jobs/${id}/cancel`, {});
  }

  /** Resume ingestion of a document that has failed chunks. */
  async resumeDocument(
    docUid: string,
    opts?: { layers?: string[]; agent_id?: string },
  ): Promise<{ job_id: string; document_uid: string; chunks_to_resume: number }> {
    return this.post(`/ingest/resume/${docUid}`, opts ?? {});
  }

  /** Delete a document and all its chunks and extracted nodes. */
  async deleteDocument(uid: string): Promise<unknown> {
    return this.del(`/ingest/document/${uid}`);
  }

  async cleanupOrphans(): Promise<unknown> {
    return this.post("/ingest/cleanup", {});
  }

  async embedAll(): Promise<unknown> {
    return this.post("/ingest/embed-all", {});
  }

  async clearGraph(): Promise<ClearResponse> {
    return this.post("/clear", {});
  }

  // ── Wiki ──────────────────────────────────────────────────────────────

  /** List wiki articles with optional filters. */
  async listArticles(params?: {
    article_type?: string;
    covers_node_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListArticlesResponse> {
    const q = new URLSearchParams();
    if (params?.article_type) q.set("article_type", params.article_type);
    if (params?.covers_node_type) q.set("covers_node_type", params.covers_node_type);
    if (params?.search) q.set("search", params.search);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    return this.get(`/wiki/articles?${q}`);
  }

  /** Get a single wiki article by UID. */
  async getArticle(uid: string): Promise<GraphNode> {
    return this.get(`/wiki/article/${uid}`);
  }

  /** Find the article that covers or summarizes a given entity/document UID. */
  async getArticleBySubject(subjectUid: string): Promise<GraphNode | null> {
    try {
      return await this.get(`/wiki/article/by-subject/${subjectUid}`);
    } catch {
      return null;
    }
  }

  /** Update an article's markdown content (user editing). */
  async updateArticle(uid: string, content: string): Promise<GraphNode> {
    return this.patch(`/wiki/article/${uid}`, { content });
  }

  /** Trigger wiki compilation for a specific document. */
  async compileDocument(docUid: string): Promise<{ job_id?: string; status: string }> {
    return this.post(`/wiki/compile/${docUid}`, {});
  }

  /** Trigger wiki compilation for a specific entity. */
  async compileEntity(entityUid: string): Promise<{ job_id: string }> {
    return this.post(`/wiki/compile/entity/${entityUid}`, {});
  }

  /** Backfill: compile articles for all documents and eligible entities. */
  async compileAll(): Promise<{ job_id: string }> {
    return this.post("/wiki/compile/all", {});
  }

  // ── Synthesis (Projects) ──────────────────────────────────────────────

  /**
   * Mine structural synthesis signals for a project's document corpus.
   *
   * Returns candidate surface for downstream synthesis — entity bridges
   * across documents, claim hubs, clustered claim hubs, theory support
   * gaps, concept clusters, analogy candidates, and dialectical pairs.
   *
   * Blocking operation. No LLM calls; Datalog + embedding clustering only.
   */
  async signals(
    projectUid: string,
    opts?: SignalsQuery,
  ): Promise<SignalsResponse> {
    const q = new URLSearchParams();
    if (opts?.signals) q.set("signals", opts.signals);
    if (opts?.target_types) q.set("target_types", opts.target_types);
    const qs = q.toString();
    return this.get(`/synthesis/signals/${projectUid}${qs ? `?${qs}` : ""}`);
  }

  /**
   * Spawn a background synthesis job for a project: mines signals,
   * selects top idea clusters, runs LLM synthesis, and persists
   * candidate Article nodes linked via `Covers` edges.
   *
   * Returns a `job_id` immediately; poll `getJob(id)` for progress.
   */
  async runSynthesis(projectUid: string): Promise<SynthesisJobResponse> {
    return this.post(`/synthesis/run/${projectUid}`, {});
  }

  // ============================================================================
  // Operational Ontology Layer (Layer 7)
  // ============================================================================

  // ---- Schema management (cloud Postgres) ----

  async listOntologySchemas(): Promise<{ items: OntologySchema[] }> {
    return this.get("/v1/ontology/schemas");
  }

  async getOntologySchema(id: string): Promise<OntologySchemaDetail> {
    return this.get(`/v1/ontology/schemas/${id}`);
  }

  async createOntologySchema(
    req: CreateOntologySchemaRequest,
  ): Promise<OntologySchema> {
    return this.post("/v1/ontology/schemas", req);
  }

  async updateOntologySchema(
    id: string,
    req: UpdateOntologySchemaRequest,
  ): Promise<OntologySchema> {
    return this.patch(`/v1/ontology/schemas/${id}`, req);
  }

  async activateOntologySchema(id: string): Promise<OntologySchema> {
    return this.post(`/v1/ontology/schemas/${id}/activate`, {});
  }

  async deprecateOntologySchema(id: string): Promise<OntologySchema> {
    return this.post(`/v1/ontology/schemas/${id}/deprecate`, {});
  }

  async archiveOntologySchema(id: string): Promise<OntologySchema> {
    return this.del(`/v1/ontology/schemas/${id}`);
  }

  /**
   * Kick off an LLM-driven schema proposal job.
   * Returns immediately with `{ schema_id, job_id }`; poll
   * `getOntologySchema(schema_id)` for streaming progress.
   */
  async proposeOntologySchema(
    req: ProposeOntologySchemaRequest,
  ): Promise<{ schema_id: string; job_id: string }> {
    return this.post("/v1/ontology/propose-schema", req);
  }

  async testOntologySchema(
    id: string,
    opts?: { example_queries?: string[] },
  ): Promise<{ job_id: string }> {
    return this.post(`/v1/ontology/schemas/${id}/test`, opts ?? {});
  }

  // ---- Schema sub-resources ----

  async addOntologyObjectType(
    schemaId: string,
    req: OntologyObjectTypeInput,
  ): Promise<OntologyObjectType> {
    return this.post(`/v1/ontology/schemas/${schemaId}/object-types`, req);
  }

  async updateOntologyObjectType(
    schemaId: string,
    typeId: string,
    req: Partial<OntologyObjectTypeInput>,
  ): Promise<OntologyObjectType> {
    return this.patch(
      `/v1/ontology/schemas/${schemaId}/object-types/${typeId}`,
      req,
    );
  }

  async deleteOntologyObjectType(
    schemaId: string,
    typeId: string,
  ): Promise<OntologyObjectType> {
    return this.del(
      `/v1/ontology/schemas/${schemaId}/object-types/${typeId}`,
    );
  }

  async addOntologyRelationType(
    schemaId: string,
    req: OntologyRelationTypeInput,
  ): Promise<OntologyRelationType> {
    return this.post(`/v1/ontology/schemas/${schemaId}/relation-types`, req);
  }

  async updateOntologyRelationType(
    schemaId: string,
    typeId: string,
    req: Partial<OntologyRelationTypeInput>,
  ): Promise<OntologyRelationType> {
    return this.patch(
      `/v1/ontology/schemas/${schemaId}/relation-types/${typeId}`,
      req,
    );
  }

  async deleteOntologyRelationType(
    schemaId: string,
    typeId: string,
  ): Promise<OntologyRelationType> {
    return this.del(
      `/v1/ontology/schemas/${schemaId}/relation-types/${typeId}`,
    );
  }

  /** Generate inert semantic classifications for individual human review. */
  async analyzeOntologySemanticGuidance(
    schemaId: string,
  ): Promise<{ created: number }> {
    return this.post(
      `/v1/ontology/schemas/${schemaId}/semantic-guidance/analyze`,
      {},
    );
  }

  /** Read-only exact-identity collision audit; never merges graph data. */
  async auditOntologyDuplicates(
    schemaId: string,
  ): Promise<OntologyDuplicateAudit> {
    return this.post(`/v1/ontology/schemas/${schemaId}/duplicates/audit`, {});
  }

  // ---- Proposals ----

  async listOntologyProposals(opts?: {
    status?: string;
    schema_id?: string;
    object_type?: string;
    proposal_type?: string;
    extract_job_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: OntologyProposal[]; limit: number; offset: number }> {
    const q = new URLSearchParams();
    if (opts?.status) q.set("status", opts.status);
    if (opts?.schema_id) q.set("schema_id", opts.schema_id);
    if (opts?.object_type) q.set("object_type", opts.object_type);
    if (opts?.proposal_type) q.set("proposal_type", opts.proposal_type);
    if (opts?.extract_job_id) q.set("extract_job_id", opts.extract_job_id);
    if (opts?.limit != null) q.set("limit", String(opts.limit));
    if (opts?.offset != null) q.set("offset", String(opts.offset));
    const qs = q.toString();
    return this.get(`/v1/ontology/proposals${qs ? `?${qs}` : ""}`);
  }

  async getOntologyProposal(id: string): Promise<OntologyProposal> {
    return this.get(`/v1/ontology/proposals/${id}`);
  }

  async patchOntologyProposal(
    id: string,
    req: { edits: ProposalEdits },
  ): Promise<OntologyProposal> {
    return this.patch(`/v1/ontology/proposals/${id}`, req);
  }

  async approveOntologyProposal(
    id: string,
    opts?: { feedback?: string; edits?: ProposalEdits },
  ): Promise<OntologyProposal> {
    return this.post(`/v1/ontology/proposals/${id}/approve`, opts ?? {});
  }

  async rejectOntologyProposal(
    id: string,
    reason?: string,
  ): Promise<OntologyProposal> {
    return this.post(`/v1/ontology/proposals/${id}/reject`, { reason });
  }

  async applyOntologyProposal(
    id: string,
  ): Promise<{ id: string; queued: boolean }> {
    return this.post(`/v1/ontology/proposals/${id}/apply`, {});
  }

  async batchApproveOntologyProposals(
    ids: string[],
    feedback?: string,
  ): Promise<{ processed: string[]; skipped: { id: string; reason: string }[] }> {
    return this.post("/v1/ontology/proposals/batch-approve", { ids, feedback });
  }

  async batchRejectOntologyProposals(
    ids: string[],
    reason?: string,
  ): Promise<{ processed: string[]; skipped: { id: string; reason: string }[] }> {
    return this.post("/v1/ontology/proposals/batch-reject", { ids, reason });
  }

  // ---- Retrieval (graph server) ----

  async queryOntology(req: OntologyQueryRequest): Promise<OntologyQueryResponse> {
    return this.post("/ontology/query", req);
  }

  /**
   * Read-only agent tool descriptors generated from the active ontology
   * schema(s). Each maps to a generic `/ontology` read endpoint with
   * `object_type` bound. Used by the MCP server to expose typed per-object
   * tools (`search_customers`, `summarize_customer`, …).
   */
  async listOntologyTools(): Promise<{ tools: OntologyToolDescriptor[] }> {
    return this.get("/v1/ontology/tools");
  }

  async getDomainObject(uid: string): Promise<DomainObject> {
    return this.get(`/ontology/object/${uid}`);
  }

  async getDomainObjectContext(
    uid: string,
    depth?: number,
  ): Promise<OntologyQueryResponse> {
    const qs = depth != null ? `?depth=${depth}` : "";
    return this.get(`/ontology/object/${uid}/context${qs}`);
  }

  async getDomainObjectHistory(
    uid: string,
  ): Promise<{
    versions: Array<{
      version: number;
      changed_at: string;
      changed_by: string;
      change_reason?: string;
      snapshot: unknown;
    }>;
  }> {
    return this.get(`/ontology/object/${uid}/history`);
  }

  async listDomainObjects(opts: {
    schema_id: string;
    object_type?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{
    items: DomainObject[];
    limit: number;
    offset: number;
    has_more: boolean;
  }> {
    const q = new URLSearchParams();
    q.set("schema_id", opts.schema_id);
    if (opts.object_type) q.set("object_type", opts.object_type);
    if (opts.limit != null) q.set("limit", String(opts.limit));
    if (opts.offset != null) q.set("offset", String(opts.offset));
    if (opts.sort) q.set("sort", opts.sort);
    return this.get(`/ontology/objects?${q.toString()}`);
  }

  async searchDomainObjects(
    query: string,
    opts?: { schema_id?: string; object_types?: string[]; limit?: number },
  ): Promise<{ items: Array<{ object: DomainObject; score: number }> }> {
    return this.post("/ontology/objects/search", { query, ...(opts ?? {}) });
  }

  /**
   * Per-object-type coverage stats for a schema (C2f): field fill rates
   * (with a `near_empty` flag < 5%) and identity collisions, over a bounded
   * per-type sample (default 500, max 2000).
   */
  async ontologyStats(
    schemaId: string,
    sample?: number,
  ): Promise<{
    schema_id: string;
    object_types: Array<{
      object_type: string;
      count: number;
      sampled: boolean;
      fields: Array<{ name: string; fill_rate: number; near_empty: boolean }>;
      collisions: Array<{ identity: string; uids: string[] }>;
    }>;
  }> {
    const q = new URLSearchParams({ schema_id: schemaId });
    if (sample != null) q.set("sample", String(sample));
    return this.get(`/ontology/stats?${q.toString()}`);
  }

  /**
   * Create a domain object by hand (auto-approved). Returns the created node
   * uid + the audit proposal id. Throws 409 if an object of the same type +
   * canonical_name already exists, unless `allow_duplicate` is set.
   */
  async createDomainObject(
    req: CreateDomainObjectRequest,
  ): Promise<{ uid: string; proposal_id: string }> {
    return this.post("/v1/ontology/objects", req);
  }

  async linkDomainObjects(
    req: LinkDomainObjectsRequest,
  ): Promise<{ edge_uid: string }> {
    return this.post("/ontology/relation", { action: "create", ...req });
  }

  // ---- Extraction ----

  async extractOntology(
    req: ExtractOntologyRequest,
  ): Promise<{ job_id: string }> {
    return this.post("/ontology/extract", req);
  }

}
