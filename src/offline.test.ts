/**
 * Offline wire-contract conformance tests for the MindGraph TS SDK.
 *
 * These run with NO network: the global `fetch` is stubbed to capture the
 * request the SDK builds, then the captured request is diffed against the
 * canonical contract fixture (test/contract.fixture.ts), which is derived from
 * CLAUDE.md's "Cognitive Endpoint Actions" table + field-name conventions.
 *
 * Purpose: make SDK<->server contract drift (R4-class) visible in CI without
 * hitting prod. Pure test code — does NOT change any SDK behavior.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { MindGraph } from "./client.js";
import {
  CONTRACT,
  RETRIEVE_ACTIONS,
  ENDPOINT_ACTIONS,
  ACTIONLESS_ENDPOINTS,
  KNOWN_DIVERGENCES,
  type ContractEntry,
} from "./contract.fixture.js";

const BASE = "https://offline.invalid"; // never resolved — fetch is stubbed.

/** A single captured outbound request. */
interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

let captured: CapturedRequest[] = [];

/**
 * Install a fetch stub that records every request and returns a benign empty
 * JSON object (200). The SDK methods we test only build & send a request; the
 * response shape is irrelevant to a wire-contract assertion.
 */
function installFetchStub(responseBody: unknown = {}): void {
  const stub = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    let body: unknown;
    if (init?.body != null) {
      try {
        body = JSON.parse(init.body as string);
      } catch {
        body = init.body;
      }
    }
    captured.push({
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body,
    });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", stub);
}

function newClient(): MindGraph {
  return new MindGraph({ baseUrl: BASE, apiKey: "mg_test_offline" });
}

beforeEach(() => {
  captured = [];
});

describe("corpus project wire contract", () => {
  test("carries project_uid through ingestion, search, and context retrieval", async () => {
    installFetchStub([]);
    const mg = newClient();

    await mg.ingestDocument({ content: "source", project_uid: "project-1" });
    await mg.search("query", { project_uid: "project-1" });
    await mg.retrieveContext({ query: "query", project_uid: "project-1" });

    expect(captured.map((request) => request.body)).toEqual([
      { content: "source", project_uid: "project-1" },
      { query: "query", project_uid: "project-1" },
      { query: "query", project_uid: "project-1" },
    ]);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ontology review and audit routes", () => {
  test("supports run-scoped semantic proposal filtering", async () => {
    installFetchStub({ items: [], limit: 50, offset: 0 });
    const mg = newClient();
    await mg.listOntologyProposals({
      schema_id: "schema-1",
      proposal_type: "semantic_match_candidate",
      extract_job_id: "job-1",
    });
    const url = new URL(captured[0].url);
    expect(url.pathname).toBe("/v1/ontology/proposals");
    expect(url.searchParams.get("schema_id")).toBe("schema-1");
    expect(url.searchParams.get("proposal_type")).toBe("semantic_match_candidate");
    expect(url.searchParams.get("extract_job_id")).toBe("job-1");
  });

  test("exposes explicit semantic analysis and read-only duplicate audit", async () => {
    installFetchStub({ created: 0 });
    const mg = newClient();
    await mg.analyzeOntologySemanticGuidance("schema-1");
    await mg.auditOntologyDuplicates("schema-1");
    expect(captured.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
      ["POST", "/v1/ontology/schemas/schema-1/semantic-guidance/analyze"],
      ["POST", "/v1/ontology/schemas/schema-1/duplicates/audit"],
    ]);
  });
});

describe("graph-aware ontology retrieval wire contract", () => {
  test("carries project scope through the legacy ontology query", async () => {
    installFetchStub({
      objects: [],
      relations: [],
      cognitive_context: {},
      external_refs: [],
      graph: { nodes: [], edges: [] },
      provenance: [],
      confidence: { overall: 0 },
      returned_count: 0,
      has_more: false,
      seed_cap_hit: false,
    });
    const mg = newClient();
    await mg.queryOntology({
      query: "requirements",
      schema_id: "schema-a",
      project_uid: "project-a",
    });
    expect(captured[0].body).toMatchObject({ project_uid: "project-a" });
  });

  test("sends the closed structured query representation unchanged", async () => {
    installFetchStub({ rows: [], total_count: 0, total_count_exact: true });
    const mg = newClient();
    const request = {
      schema_id: "schema-a",
      select: "Requirement",
      anchor: { type: "Customer", uid: "customer-1" },
      path: [{ relation: "REQUESTED_BY", entry_role: "target" as const }],
      where: [{ field: "status", op: "eq" as const, value: "open" }],
      page: { limit: 100, offset: 0 },
    };
    await mg.queryDomainStructured(request);
    expect(captured[0].method).toBe("POST");
    expect(new URL(captured[0].url).pathname).toBe("/ontology/query/structured");
    expect(captured[0].body).toEqual(request);
  });

  test("compiles related reads to a typed UID anchor and relation leg", async () => {
    installFetchStub({ rows: [], total_count: 0, total_count_exact: true });
    const mg = newClient();
    await mg.queryRelatedDomainObjects({
      schema_id: "schema-a",
      entry_type: "Customer",
      uid: "customer-1",
      relation: "REQUESTED_BY",
      entry_role: "target",
      far_type: "Requirement",
      where: [{ field: "status", op: "eq", value: "open" }],
      include_provenance: true,
      limit: 50,
      offset: 5,
    });
    expect(captured[0].body).toEqual({
      schema_id: "schema-a",
      select: "Requirement",
      anchor: { type: "Customer", uid: "customer-1" },
      path: [{ relation: "REQUESTED_BY", entry_role: "target" }],
      where: [{ field: "status", op: "eq", value: "open" }],
      include: { provenance: true },
      page: { limit: 50, offset: 5 },
    });
  });

  test("binds discovery and point reads to schema and object type", async () => {
    installFetchStub({
      items: [],
      returned_count: 0,
      has_more: false,
      seed_cap_hit: false,
      truncation_reasons: [],
      total_count: null,
      total_count_exact: false,
    });
    const mg = newClient();
    await mg.searchDomainObjects("dispatch", {
      schema_id: "schema-a",
      object_types: ["Requirement"],
      filters: [{ field: "status", op: "eq", value: "open" }],
      limit: 10,
    });
    await mg.getDomainObject("requirement-1", {
      schema_id: "schema-a",
      object_type: "Requirement",
    });
    await mg.getDomainObjectContext("requirement-1", 2, {
      schema_id: "schema-a",
      object_type: "Requirement",
    });

    expect(captured[0].body).toEqual({
      query: "dispatch",
      schema_id: "schema-a",
      object_types: ["Requirement"],
      filters: [{ field: "status", op: "eq", value: "open" }],
      limit: 10,
    });
    const point = new URL(captured[1].url);
    expect(point.pathname).toBe("/ontology/object/requirement-1");
    expect(point.searchParams.get("schema_id")).toBe("schema-a");
    expect(point.searchParams.get("object_type")).toBe("Requirement");
    const context = new URL(captured[2].url);
    expect(context.pathname).toBe("/ontology/object/requirement-1/context");
    expect(context.searchParams.get("depth")).toBe("2");
    expect(context.searchParams.get("schema_id")).toBe("schema-a");
    expect(context.searchParams.get("object_type")).toBe("Requirement");
  });
});

// ---------------------------------------------------------------------------
// Sanity: the stub really intercepts and no real network is hit.
// ---------------------------------------------------------------------------
describe("offline transport stub", () => {
  test("captures requests instead of hitting the network", async () => {
    installFetchStub({ status: "ok" });
    const mg = newClient();
    await mg.health();
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe(`${BASE}/health`);
    expect(captured[0].method).toBe("GET");
  });

  test("sends the Authorization bearer header", async () => {
    installFetchStub();
    const mg = newClient();
    await mg.capture({ action: "source", label: "x" });
    expect(captured[0].headers["Authorization"]).toBe("Bearer mg_test_offline");
    expect(captured[0].headers["Content-Type"]).toBe("application/json");
    expect(captured[0].headers["X-MindGraph-Request-ID"]).toMatch(/^[A-Za-z0-9._:-]+$/);
  });

  test("adds the normalized MCP hint without changing request bodies", async () => {
    installFetchStub();
    const mg = new MindGraph({
      baseUrl: BASE,
      apiKey: "mg_test_offline",
      telemetrySurface: "mcp",
    });
    await mg.retrieveContext({ query: "customer requirements" });
    expect(captured[0].headers["X-MindGraph-Surface"]).toBe("mcp");
    expect(captured[0].body).toEqual({ query: "customer requirements" });
  });
});

// ---------------------------------------------------------------------------
// Contract-driven conformance: each cognitive method must build the request
// that the canonical contract says it should.
// ---------------------------------------------------------------------------
describe("cognitive method wire-contract conformance", () => {
  for (const entry of CONTRACT) {
    test(`${entry.method} -> ${entry.httpMethod} ${entry.endpoint}${
      entry.action ? ` (action=${entry.action})` : " (action-less)"
    }`, async () => {
      installFetchStub();
      const mg = newClient();
      const fn = (mg as unknown as Record<string, unknown>)[entry.method];
      expect(typeof fn, `SDK is missing method ${entry.method}`).toBe("function");

      await (fn as (...a: unknown[]) => Promise<unknown>).apply(mg, entry.args);

      expect(captured.length, `${entry.method} sent no request`).toBeGreaterThan(0);
      const req = captured[captured.length - 1];

      // endpoint + http method
      expect(req.url).toBe(`${BASE}${entry.endpoint}`);
      expect(req.method).toBe(entry.httpMethod);

      const body = (req.body ?? {}) as Record<string, unknown>;

      // action (or action-less)
      if (entry.action === null) {
        expect(
          "action" in body,
          `${entry.method} hits monolithic ${entry.endpoint} which takes NO action field`,
        ).toBe(false);
      } else {
        expect(body.action, `${entry.method} action mismatch`).toBe(entry.action);
        // the action must be a valid value for this endpoint
        const valid = ENDPOINT_ACTIONS[entry.endpoint];
        expect(
          valid?.includes(entry.action),
          `action "${entry.action}" not valid for ${entry.endpoint}`,
        ).toBe(true);
      }

      // required fields present
      for (const f of entry.requiredFields ?? []) {
        expect(f in body, `${entry.method} missing required field "${f}"`).toBe(true);
      }

      // array-typed fields really are arrays
      for (const f of entry.arrayFields ?? []) {
        expect(Array.isArray(body[f]), `${entry.method} field "${f}" must be an array`).toBe(true);
      }

      // forbidden fields absent (field-name conventions, e.g. start_uid not uid)
      for (const f of entry.forbiddenFields ?? []) {
        expect(f in body, `${entry.method} must NOT send field "${f}"`).toBe(false);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Field-name convention spot-checks (CLAUDE.md "SDK-Server Field Name
// Conventions"): traverse path uses start_uid + end_uid (NOT from_uid/to_uid).
// ---------------------------------------------------------------------------
describe("field-name conventions", () => {
  test("traverse path uses start_uid + end_uid (not from_uid/to_uid)", async () => {
    installFetchStub();
    const mg = newClient();
    await mg.traverse({ action: "path", start_uid: "a", end_uid: "b" });
    const body = captured[0].body as Record<string, unknown>;
    expect(body.start_uid).toBe("a");
    expect(body.end_uid).toBe("b");
    expect("from_uid" in body).toBe(false);
    expect("to_uid" in body).toBe(false);
  });

  test("argument endpoint is monolithic with an evidence ARRAY", async () => {
    installFetchStub();
    const mg = newClient();
    await mg.argue({
      claim: { label: "C" },
      evidence: [{ label: "E1" }, { label: "E2" }],
    });
    const req = captured[0];
    expect(req.url).toBe(`${BASE}/epistemic/argument`);
    const body = req.body as Record<string, unknown>;
    expect("action" in body).toBe(false);
    expect(Array.isArray(body.evidence)).toBe(true);
    expect((body.evidence as unknown[]).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// /retrieve action-set parity: the SDK must be able to send EVERY canonical
// retrieve action through the generic retrieve() method (runtime wire check;
// independent of the TS type enum, which has a known R4 gap).
// ---------------------------------------------------------------------------
describe("/retrieve action set", () => {
  for (const action of RETRIEVE_ACTIONS) {
    test(`retrieve() forwards action=${action} verbatim`, async () => {
      installFetchStub([]);
      const mg = newClient();
      // Cast through unknown: at runtime retrieve() forwards the body as-is;
      // a couple actions are missing from the static type (documented R4 gap).
      await mg.retrieve({ action } as unknown as Parameters<MindGraph["retrieve"]>[0]);
      const req = captured[0];
      expect(req.url).toBe(`${BASE}/retrieve`);
      const body = req.body as Record<string, unknown>;
      expect(body.action).toBe(action);
    });
  }

  test("ENDPOINT_ACTIONS['/retrieve'] equals the canonical RETRIEVE_ACTIONS set", () => {
    expect([...ENDPOINT_ACTIONS["/retrieve"]].sort()).toEqual([...RETRIEVE_ACTIONS].sort());
  });
});

// ---------------------------------------------------------------------------
// Monolithic endpoints registry sanity.
// ---------------------------------------------------------------------------
describe("monolithic endpoints", () => {
  test("argument + distill are registered as action-less", () => {
    expect([...ACTIONLESS_ENDPOINTS].sort()).toEqual(["/epistemic/argument", "/memory/distill"]);
  });
});

// ---------------------------------------------------------------------------
// KNOWN R4 DIVERGENCES (allowlist).
//
// These assert the SDK's CURRENT, documented-divergent behavior. They pass
// today (so they don't break CI) AND fail if anyone silently changes the
// behavior away from what R4 documented — at which point the change must be a
// deliberate owner decision that updates this allowlist.
// ---------------------------------------------------------------------------
describe("known R4 divergences (documented, allowlisted)", () => {
  test("allowlist is complete (5 documented R4 divergences)", () => {
    expect(KNOWN_DIVERGENCES.map((d) => d.id).sort()).toEqual([
      "R4-1-addClaim",
      "R4-2-addEvidence",
      "R4-3-retrieve-action-enum",
      "R4-4-getArticleBySubject",
      "R4-5-request-timeout",
    ]);
  });

  test("[R4-1] addClaim hits /epistemic/argument as a Claim (NOT inquiry/hypothesis)", async () => {
    installFetchStub();
    const mg = newClient();
    await mg.addClaim("Label", "content", 0.8);
    const req = captured[0];
    // CURRENT TS behavior: argument endpoint, action-less, structured claim obj.
    expect(req.url).toBe(`${BASE}/epistemic/argument`);
    const body = req.body as Record<string, unknown>;
    expect("action" in body).toBe(false);
    expect(body).toHaveProperty("claim");
    const claim = body.claim as Record<string, unknown>;
    expect(claim.label).toBe("Label");
    // Divergence marker: it does NOT route to /epistemic/inquiry like Py.
    expect(req.url).not.toBe(`${BASE}/epistemic/inquiry`);
  });

  test("[R4-2] addEvidence sends evidence as an ARRAY + props (NOT a single object)", async () => {
    installFetchStub();
    const mg = newClient();
    await mg.addEvidence("Ev label", "Ev description");
    const req = captured[0];
    expect(req.url).toBe(`${BASE}/epistemic/argument`);
    const body = req.body as Record<string, unknown>;
    expect(Array.isArray(body.evidence)).toBe(true);
    const ev0 = (body.evidence as Record<string, unknown>[])[0];
    expect(ev0.label).toBe("Ev label");
    expect((ev0.props as Record<string, unknown>).description).toBe("Ev description");
    // Divergence marker: TS does NOT send a `summary` (Py's object form does).
    expect("summary" in ev0).toBe(false);
  });

  test("[R4-3] RetrieveRequest.action type omits merge_candidates & curation_counts (still sent at runtime)", async () => {
    installFetchStub([]);
    const mg = newClient();
    // getMergeCandidates IS the only typed escape hatch for merge_candidates.
    await mg.getMergeCandidates();
    expect((captured[0].body as Record<string, unknown>).action).toBe("merge_candidates");
    // curation_counts has NO dedicated SDK method and is absent from the type
    // enum; it can still be forced through the generic retrieve() at runtime.
    captured = [];
    await mg.retrieve({ action: "curation_counts" } as unknown as Parameters<
      MindGraph["retrieve"]
    >[0]);
    expect((captured[0].body as Record<string, unknown>).action).toBe("curation_counts");
  });

  test("[R4-4] getArticleBySubject swallows ALL errors as null (not 404-only)", async () => {
    // Make fetch return a 500 — TS must STILL resolve to null (the divergence).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("boom", { status: 500 })),
    );
    const mg = newClient();
    const r = await mg.getArticleBySubject("subj-uid");
    expect(r).toBeNull();
  });

  test("[R4-5] request() has no timeout (no AbortSignal attached to fetch init)", async () => {
    let sawSignal = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: unknown, init?: RequestInit) => {
        if (init && "signal" in init && init.signal != null) sawSignal = true;
        return new Response("{}", { status: 200 });
      }),
    );
    const mg = newClient();
    await mg.capture({ action: "source", label: "x" });
    // CURRENT TS behavior: no timeout => no AbortSignal on the request.
    expect(sawSignal).toBe(false);
  });
});

describe("[C43] path-segment encoding", () => {
  // Every uid/id below is caller-supplied, and in agent deployments the caller
  // is frequently a model. Each test asserts the *escaped* URL exactly, so it
  // fails if `seg()` is dropped from that call site — a `toContain` check on
  // the encoded form would also pass on a raw path that merely happened to
  // include the substring.
  beforeEach(() => installFetchStub());

  test("a traversal payload cannot climb out of its route", async () => {
    await newClient().getNode("../../v1/orgs");
    expect(captured[0].url).toBe(`${BASE}/node/..%2F..%2Fv1%2Forgs`);
    // The decisive property: no additional real path separator reached the URL.
    expect(new URL(captured[0].url).pathname).toBe("/node/..%2F..%2Fv1%2Forgs");
  });

  test("a uid cannot forge a query string", async () => {
    await newClient().getJob("job-1?admin=true");
    expect(captured[0].url).toBe(`${BASE}/jobs/job-1%3Fadmin%3Dtrue`);
    expect(new URL(captured[0].url).search).toBe("");
  });

  test("a uid cannot truncate the path with a fragment", async () => {
    await newClient().getAliases("uid-1#");
    expect(captured[0].url).toBe(`${BASE}/aliases/uid-1%23`);
    expect(new URL(captured[0].url).hash).toBe("");
  });

  test("every segment of a multi-segment path is encoded, not just the first", async () => {
    await newClient().deleteOntologyObjectType("schema/../x", "type/../y");
    expect(captured[0].url).toBe(
      `${BASE}/v1/ontology/schemas/schema%2F..%2Fx/object-types/type%2F..%2Fy`,
    );
  });

  test("legitimate query strings are still sent as query strings", async () => {
    // The guard against over-applying `seg()`: encoding a whole assembled path
    // would escape the `?` and turn the query into part of the last segment.
    await newClient().listArticles({ search: "a b", article_type: "entity" });
    const url = new URL(captured[0].url);
    expect(url.pathname).toBe("/wiki/articles");
    expect(url.searchParams.get("search")).toBe("a b");
    expect(url.searchParams.get("article_type")).toBe("entity");
  });
});
