/** Explicitly selected memory.v1 API. Construction never performs I/O. */
import type { RememberOptions, RememberResponse, ForgetTarget, RetrieveContextRequest, RetrieveContextResponse } from "./types.js";
export interface MemoryScope { space_uid: string }
export type MemoryNodeFilter =
  | { field: "node_type" | "layer"; op: "eq"; value: string }
  | { field: "node_type" | "layer"; op: "in"; value: string[] }
  | { field: "confidence" | "salience" | "created_at" | "updated_at"; op: "eq" | "gt" | "gte" | "lt" | "lte"; value: number }
  | { op: "and" | "or"; operands: MemoryNodeFilter[] };
export interface MemoryEnvelope { contract: "memory.v1"; scope: MemoryScope; project_uid?: string; include_org_space?: boolean }
export interface MemoryBudget { method: "mindgraph_estimate_v1"; limit: number; used: number; truncated: boolean }
export interface MemoryItem {
  uid: string; node_type: string; layer: string; label: string; summary: string | null;
  text: string; version: number; created_at: number; updated_at: number;
  confidence: number; salience: number; space_uid: string; source_uids: string[];
  currently_valid?: boolean; valid_at_time?: boolean; valid_from?: string; valid_until?: string;
  superseded?: { by: string[]; heads?: string[]; head_uid?: string };
  conflicts?: { uid: string; counterpart_uid: string; resolution_status: string }[];
  omitted_reason?: "unsafe_summary";
  unresolved_evidence?: boolean;
}
export type MemoryRememberOptions = Omit<RememberOptions, "space_uid" | "agent_id">;
export type MemoryRememberResponse = RememberResponse & MemoryEnvelope & { remember_instructions_error?: { code: string | null; retriable: boolean | null } | null };
export interface MemoryForgetResponse extends MemoryEnvelope {
  uid: string; label: string; action: "preview" | "forgotten";
  dry_run: boolean; cascade: boolean; edge_uids: string[];
  edges_tombstoned: number; would_tombstone_edges: number;
  undo: { node: string };
}
export interface MemoryReadOptions { project_uid?: string; node_filter?: MemoryNodeFilter }
export interface MemoryListOptions extends MemoryReadOptions { limit?: number; cursor?: string }
export interface MemoryListResponse extends MemoryEnvelope { items: MemoryItem[]; next_cursor: string | null }
export type MemorySection = "memories" | "preferences" | "lessons" | "goals" | "decisions";
export interface MemoryProfileOptions extends MemoryReadOptions {
  include_org_space?: boolean; sections?: MemorySection[]; max_items?: number;
  format?: "json" | "text"; max_tokens?: number;
}
export interface MemoryProfileResponse extends MemoryEnvelope {
  profile: Record<MemorySection, MemoryItem[]>; computed_at: string; complete: boolean;
  omitted: { item_limit: number; text_budget: number; unsafe_summary: number };
  unavailable: { section: MemorySection; reason: "too_large" }[];
  context_text?: string; budget?: MemoryBudget;
}
export type MemoryContextOptions = Pick<RetrieveContextRequest,
  "query" | "project_uid" | "node_limit" | "article_limit" | "chunk_limit" | "node_types" | "layer" |
  "graph_expansion_limit" | "graph_max_depth" | "valid_at" | "as_of" | "occurred_from" | "occurred_to" |
  "sort" | "ontology" | "format" | "max_tokens"> & { include_org_space?: boolean; node_filter?: MemoryNodeFilter };
export type MemoryContextResponse = RetrieveContextResponse & MemoryEnvelope & { budget?: MemoryBudget; legs_disabled?: string[] };
export type MemoryOperation = "remember" | "forget" | "context" | "profile" | "list";
type Send = <T>(operation: MemoryOperation, body: object) => Promise<T>;

export class MemoryClient {
  readonly scope: Readonly<MemoryScope>;
  constructor(scope: MemoryScope, private readonly send: Send) {
    if (Object.keys(scope).some(k => k !== "space_uid") || !scope.space_uid?.trim() || scope.space_uid !== scope.space_uid.trim()) throw new TypeError("A single nonempty space_uid is required");
    this.scope = Object.freeze({ space_uid: scope.space_uid });
    Object.freeze(this);
  }
  private call<T>(operation: MemoryOperation, options: object): Promise<T> {
    if ("scope" in options || "space_uid" in options) throw new TypeError("Per-call Space overrides are not supported");
    return this.send<T>(operation, { ...options, scope: this.scope });
  }
  remember(text: string, options: MemoryRememberOptions = {}): Promise<MemoryRememberResponse> { return this.call("remember", { ...options, text }); }
  forget(target: ForgetTarget, options: { dry_run?: boolean; cascade?: false; reason?: string } = {}): Promise<MemoryForgetResponse> { return this.call("forget", { ...target, ...options }); }
  context(options: MemoryContextOptions): Promise<MemoryContextResponse> { return this.call("context", options); }
  profile(options: MemoryProfileOptions = {}): Promise<MemoryProfileResponse> { return this.call("profile", options); }
  list(options: MemoryListOptions = {}): Promise<MemoryListResponse> { return this.call("list", options); }
}
