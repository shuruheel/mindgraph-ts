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

  // ---- Edge CRUD ----

  async addLink(body: {
    from_uid: string;
    to_uid: string;
    edge_type: string;
    agent_id?: string;
  }): Promise<unknown> {
    return this.post("/link", body);
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

  async getJob(id: string): Promise<Job> {
    return this.get(`/jobs/${id}`);
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
