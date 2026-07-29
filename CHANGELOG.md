# Changelog

## Unreleased

## 0.14.0 (2026-07-29)

The coding-agent work substrate. **Compatibility**: the new work composites and
identity actions require a server with the coding-agent work surface (newer
than mindgraph 1.10.0 — at publish time available in a local build of
`mindgraph-server` from main; MindGraph Cloud gains it with the next server
deploy). Everything else works against server >= 1.10.0. Publish this package
before `mindgraph-mcp` 0.14.0 (it calls `memorySync`).

### Added

- **Durable-work composites** on `plan()`: `resume_work` (deterministic bounded
  work brief), `claim_task` / `heartbeat` (fenced leases), `start_iteration` /
  `checkpoint_iteration` / `block_task` / `complete_task` / `abandon_iteration`
  (idempotent material attempts), with the fencing fields `expected_version`,
  `lease_epoch`, `idempotency_key`, and `execution_uid` forwarded on every
  composite.
- **External identity** on `entity()`: `identity: {namespace, key_version, key}`
  + `identity_space_uid` for atomic find-or-create by canonical key, and the
  `resolve_identity` action.
- **`memorySync(req)`** — the memory-file sync surface (scan/begin/record/
  finalize bookkeeping used by `mindgraph-mcp`'s `mindgraph_sync`).

## 0.13.0 (2026-07-23)

Requires server >= 1.10.0 for everything below. This release is the compatibility
gate for `mindgraph-mcp` 0.13.0, which dispatches the generated ontology tools
through these methods — publish this package first.

### Added

- **Structured ontology queries.** `queryDomainStructured(req)` →
  `POST /ontology/query/structured` asks a validated, typed question of a Layer 7
  schema — predicate filters, one- and two-leg traversal, and bounded exact counts
  and aggregates — instead of ranking text. The response carries explicit coverage
  metadata, so a partial answer reports itself as partial rather than reading as
  complete. New types: `StructuredOntologyQueryRequest`,
  `StructuredOntologyQueryResponse`, `OntologyQueryPredicate`, and
  `OntologyPredicateOperator` (`eq`/`neq`/`in`/`contains`, validated against the
  field's declared type).
- `queryRelatedDomainObjects(req)` (`RelatedDomainObjectsRequest`) — typed
  neighbours of a domain object along a named relation, scoped to the caller's
  grants.
- `getDomainObject(...)` — fetch a single domain object by identity.
- `OntologyToolDescriptor` — the descriptor shape MCP clients read to generate
  schema-qualified tools. Tool names always carry stable schema and relation
  identity, so names cannot collide across schemas that reuse vocabulary.
- **Project scope on corpus calls.** `search`, `hybridSearch`, `ingestDocument`,
  and `retrieveContext` accept `project_uid`, confining the call to one project's
  admitted sources.

### Changed

- Ontology query wire types were corrected against the server contract: field
  types and nullability now match what `/ontology/query/structured` actually
  returns, and the offline contract suite asserts the wire names so a rename goes
  red in CI rather than surfacing as a runtime `undefined`.

## 0.12.0 (2026-07-18)

### Added

- `RetrieveContextRequest.graph_expansion_limit` / `graph_max_depth`, plus
  retrieval-path metadata on graph-expanded response nodes.
- `TraverseRequest.exclude_edge_types`, `include_provenance`, and `max_nodes`.
- `MergeCandidate.node_a_truth_status` / `node_b_truth_status` (server >= 1.9):
  per-side Claim truth status so curation UIs can flag a refuted side before a
  merge.

### Changed

- `resolveDecision` against server >= 1.9 is replace-semantics: re-resolving
  tombstones the prior `DecidedOn` edge (exactly one live canonical edge) and
  the response reports `replaced_decided_on`; invalid decision/option/context
  UIDs are rejected up front. The offline contract suite now asserts the
  resolve/distill wire names (`informs_uid`, `as_of_date`, `session_id`,
  `retrieval_trace_id`, `output_type`), so a rename goes red in CI.

- `PathStep.depth`, `parent_uid`, `path_cost`, and `path_confidence` now describe
  the selected min-cost witness path (server >= 1.9.0), not first-discovery BFS.
- Sparse graph expansion backfills unused slots from the unchanged direct
  ranking; node filters are applied before traversal admission.

## 0.11.0 (2026-07-07)

### Added

- Ingest requests carry conversation + ontology metadata: `ontology_schema_id`
  on document/session/chunk, and `participants` (new `Participant` type),
  `occurred_at`, `context` on document/session.
- `createDomainObject(req)` → `POST /v1/ontology/objects` (auto-approved manual
  object create; 409 on duplicate unless `allow_duplicate`).
- `ontologyStats(schemaId, sample?)` → `GET /ontology/stats` (per-type field
  fill rates + `near_empty` flags + identity collisions).
- `RetrieveRequest.include_sources`: annotate each result's `node` with
  `source_documents` (`uid`, `title`, `ingested_by_name?`, `occurred_at?`).

### Changed

- **BREAKING (type-only): `SearchResult` corrected to `{ node, score, legs? }`.**
  The previous flat `{ uid, label, summary, node_type, score }` never matched
  the `/retrieve` wire shape. Read fields off `.node` (e.g. `.node.uid`); with
  `include_sources`, `.node.source_documents` carries provenance. No runtime
  change — only the compile-time shape.
- `linkDomainObjects` now resolves (`POST /ontology/relation` is registered
  server-side; it previously 404'd).

## 0.10.0 (2026-07-04)

### Added

- `ClaimProps` interface: the valid-time window (`valid_from`/`valid_until`),
  the contradiction operands (`polarity`/`modality`/`quantification`,
  `subject`/`predicate`/`object`), and the server-computed `canonical_key`
  (server >= mindgraph 1.7.0).
- Retrieve-context graph nodes typed with `superseded`/`superseded_by`,
  `currently_valid`, and the as-of variant `valid_at_time`;
  `RetrieveContextRequest.valid_at` (ISO date) selects the as-of reference.
- `exportProvenance(documentUid)` - document-scoped PROV-O / CiTO /
  W3C Web Annotation JSON-LD (`GET /export/prov`).
- `schemaFillStats({sample?, layer?})` - per-type live counts + sampled
  per-field fill rates (`GET /stats/schema-fill`).
- `traverse` action `"top_k_paths"` with `k`/`max_hops`/`max_cost` request
  fields and the `ScoredPath` result type - the true k-cheapest min-plus
  paths (engine `min_cost_k`), unlike `PathStep`'s first-discovery scores.


## 0.9.0 (2026-07-03)

### Added

- `PathStep.path_cost` / `PathStep.path_confidence` (optional; server ≥ mindgraph
  1.6.0): min-plus cost (Σ −ln(edge weight)) and product of edge confidences of
  the returned BFS traversal path — a ranking signal for traverse results; they
  score the path returned, not the best possible path.

### Fixed

- `PathStep.uid` → `node_uid`. The server has always serialized `node_uid`; the
  declared type was wrong, so reads of `.uid` returned `undefined` at runtime.
  Type-level breaking, runtime-aligned.

## 0.8.0 (2026-06-29)

### Added

- **Citation provenance on retrieval.** `RetrieveContextResponse` graph nodes now
  carry `source_chunks` (`SourceChunk[]`): per source chunk, `char_start`/`char_end`
  (UTF-8 byte offsets), `page_start`/`page_end`, the matched `quote`, and a structured
  `anchor` (`TextSelector`). New exported types `SourceChunk` and `TextSelector`.
- **Belief stance.** Claim nodes may carry `believed_by` (`BelievedBy[]`): the
  per-agent assertion stance (`agent_uid`, `agent_label`, `confidence`). New exported
  type `BelievedBy`.
- **Document ingestion** gains optional `page_offsets` (`PageOffset[]`), `page_count`,
  `mime_type`, and `force_reingest`; `IngestDocumentResponse` gains `deduplicated`
  (identical content reuses the existing Document). New exported type `PageOffset`
  (`char_start` is a UTF-8 **byte** offset).
- `backfillAnchors()` — kick off the `/backfill/anchors` job (populate
  `ExtractedFrom.location` selectors for pre-existing edges). Server ≥ 1.5.0.

## 0.7.0 (2026-06-14)

### Added

- `RetrieveRequest.action` gains `"preferences"`: returns the user's
  stated/learned preferences (server ≥ 1.4.0). With a `query`, topic-relevant
  preferences via the semantic leg; without one, all preferences by salience.
  Either way the result is a `SearchResult[]`. Use it for advice/recommendation
  requests so answers reflect what the user likes.
- `RetrieveRequest.created_after` / `created_before` (unix seconds) for the
  `"recent"` action — an ingestion-time window.

(Changelog note: 0.5.0–0.6.1 were published without changelog entries; this
file resumes at 0.7.0.)

## 0.4.1 (2026-04-16)

### Docs

- README: correct `addClaim` / `addEvidence` / `addObservation` signatures and `findOrCreateEntity` parameter name to match `src/client.ts`.
- README: remove Management (Cloud only) section — those methods were never part of the SDK. Account sign-up, login, and API key management live in the [MindGraph dashboard](https://mindgraph.cloud/dashboard).

No code changes in this release.

## 0.4.0 (2026-04-16)

### Synthesis (Projects)

Scoped-corpus synthesis: mine cross-document signals for a `Project` and turn top idea clusters into Article nodes via a background job.

- `signals(projectUid, opts?)` — `GET /synthesis/signals/{project_uid}`. Returns entity bridges, claim hubs, ranked/clustered claim hubs, theory support gaps, concept clusters, analogy candidates, and dialectical pairs. Filterable by signal subset and target node types.
- `runSynthesis(projectUid)` — `POST /synthesis/run/{project_uid}`. Spawns a background synthesis job and returns `{ job_id }`; poll with `getJob()`.

### New Types

`SignalsQuery`, `SignalsResponse`, `SynthesisJobResponse`, `DocumentRef`, `EntityBridge`, `ClaimHub`, `RankedClaimHub`, `ClusteredClaimHub`, `ClusterClaimSample`, `EpistemicCounts`, `TheorySupportGap`, `ConceptCluster`, `AnalogyCandidate`, `DialecticalPair`.

## 0.2.0 (2026-03-30)

### New Entity Types

The Reality layer now has first-class node types instead of a single generic `Entity`:

- **Person** — Named individuals (`findOrCreatePerson`)
- **Organization** — Companies, nonprofits, government bodies (`findOrCreateOrganization`)
- **Nation** — Countries and sovereign states (`findOrCreateNation`)
- **Event** — Named occurrences (`findOrCreateEvent`)
- **Place** — Geographic locations (`findOrCreatePlace`)
- **Concept** — Topics, subjects, defined terms (`findOrCreateConcept`)
- **Entity** — Retained as fallback for technology, product, and other types

### New Convenience Methods

- `findOrCreatePerson(label, props?, agentId?)`
- `findOrCreateOrganization(label, props?, agentId?)`
- `findOrCreateNation(label, props?, agentId?)`
- `findOrCreateEvent(label, props?, agentId?)`
- `findOrCreatePlace(label, props?, agentId?)`
- `findOrCreateConcept(label, props?, agentId?)`
- `addClaim(label, content, confidence?, agentId?)`
- `addEvidence(label, description, agentId?)`
- `addObservation(label, description, agentId?)`

### New Edge Types (18)

**Structural:** MEMBER_OF, LEADER_OF, FOUNDED_BY, BASED_IN, CITIZEN_OF, LOCATED_IN, OCCURRED_AT, PARTICIPATED_IN

**Stance:** ALLIED_WITH, RIVAL_OF, REPORTS_TO, ENDORSES, CRITICIZES

**Concept/Influence:** RELATED_TO, EXPERT_IN, OPERATES_IN, STRENGTHENS, CHALLENGES

### New Type Exports

`PersonProps`, `OrganizationProps`, `NationProps`, `EventProps`, `PlaceProps`

### Breaking Changes

- `findOrCreateEntity` with `entity_type: "person"` now returns `node_type: "Person"` instead of `"Entity"`. Code that filters on `node_type === "Entity"` for people/organizations should update to use `node_type === "Person"` etc.
- `findOrCreateEntity` still works and is backward-compatible — it routes to the correct type internally.

## 0.1.9 and earlier

Initial release with core CRUD, cognitive endpoints, entity resolution, decision management, and journal support.
