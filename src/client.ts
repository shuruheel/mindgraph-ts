import type {
  MindGraphConfig,
  GraphNode,
  GraphEdge,
  SearchResult,
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
  SignupRequest,
  LoginRequest,
  CreateOrgRequest,
  CreateApiKeyRequest,
  ApiKeyResponse,
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

  constructor(config: MindGraphConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (config.apiKey) {
      this.headers["Authorization"] = `Bearer ${config.apiKey}`;
    } else if (config.jwt) {
      this.headers["Authorization"] = `Bearer ${config.jwt}`;
    }
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
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      throw new MindGraphError(
        `${method} ${path} failed: ${res.status}`,
        res.status,
        parsed,
      );
    }
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
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

  // ---- Intent Layer ----

  async commit(req: CommitmentRequest): Promise<unknown> {
    return this.post("/intent/commitment", req);
  }

  async deliberate(req: DeliberationRequest): Promise<unknown> {
    return this.post("/intent/deliberation", req);
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

  async retrieve(req: RetrieveRequest): Promise<unknown> {
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

  async addNode(body: {
    label: string;
    node_type?: string;
    props?: Record<string, unknown>;
    agent_id?: string;
  }): Promise<GraphNode> {
    return this.post("/node", body);
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

  async addEdge(body: {
    from_uid: string;
    to_uid: string;
    edge_type: string;
    weight?: number;
    props?: Record<string, unknown>;
    agent_id?: string;
  }): Promise<unknown> {
    return this.post("/edge", body);
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

  async getEdges(params: {
    from_uid?: string;
    to_uid?: string;
  }): Promise<GraphEdge[]> {
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
    node_type?: string;
    layer?: string;
    limit?: number;
  }): Promise<SearchResult[]> {
    return this.post("/search", { query, ...opts });
  }

  /** Hybrid BM25 + vector search with reciprocal rank fusion. */
  async hybridSearch(query: string, opts?: {
    k?: number;
    node_types?: string[];
    layer?: string;
  }): Promise<SearchResult[]> {
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
    return this.get(`/embeddings/${uid}`);
  }

  async setEmbedding(uid: string, vector: number[]): Promise<void> {
    await this.request("PUT", `/embeddings/${uid}`, { vector });
  }

  async deleteEmbedding(uid: string): Promise<void> {
    await this.del(`/embeddings/${uid}`);
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
    return this.post("/subgraph", { uid, ...opts });
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

  async listJobs(): Promise<Job[]> {
    return this.get("/jobs");
  }

  async getJob(id: string): Promise<Job> {
    return this.get(`/jobs/${id}`);
  }

  async cancelJob(id: string): Promise<unknown> {
    return this.post(`/jobs/${id}/cancel`, {});
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

  // ---- Management (Cloud only) ----

  async signup(email: string, password: string): Promise<unknown> {
    return this.post("/v1/auth/signup", { email, password });
  }

  async login(email: string, password: string): Promise<unknown> {
    return this.post("/v1/auth/login", { email, password });
  }

  async createApiKey(name = "default"): Promise<ApiKeyResponse> {
    return this.post("/v1/api-keys", { name });
  }

  async listApiKeys(): Promise<{ api_keys: unknown[] }> {
    return this.get("/v1/api-keys");
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.del(`/v1/api-keys/${id}`);
  }

  async getUsage(): Promise<unknown> {
    return this.get("/v1/usage");
  }
}
