# Changelog

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
