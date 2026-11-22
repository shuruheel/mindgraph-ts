/**
 * T-RL15: Offline unit + mock-HTTP conformance tests for Document Readiness
 * Lifecycle (`document-status.v1`) in the TypeScript SDK.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MindGraph,
  MindGraphError,
  DOCUMENT_STATUS_CONTRACT,
  ValidationError,
  ReadinessUnknownError,
  DocumentSupersededError,
  ReadinessNotRequestedError,
  DocumentIncompleteError,
  DocumentWaitTimeoutError,
  DocumentWaitCancelledError,
  type DocumentStatus,
  type IngestDocumentResponse,
  type ResumeDocumentResponse,
} from "./index.js";
import { parseRetryAfterMs, runWaitForDocumentLoop, validateWaitForDocumentOptions } from "./document-lifecycle.js";

const BASE = "https://offline.invalid";

function makeStatus(overrides: Partial<DocumentStatus> = {}): DocumentStatus {
  return {
    contract: DOCUMENT_STATUS_CONTRACT,
    document_uid: "doc-1",
    document_version: 2,
    generation_id: "gen_01",
    attempt_id: "att_01",
    job_id: "job_01",
    job_available: true,
    processing_status: "processing",
    attempt_state: "running",
    content_revision: "sha256:abc",
    pipeline_digest: "sha256:def",
    readiness: {
      lexical: "ready",
      vector: "not_ready",
      extraction: "not_ready",
    },
    observed_at: "2026-11-22T04:00:00Z",
    error: null,
    ...overrides,
  };
}

interface RecordedCall {
  url: string;
  method: string;
  body?: unknown;
}

function stubFetchSequence(
  responses: Array<
    | { status?: number; body?: unknown; headers?: Record<string, string> }
    | ((url: string, init?: RequestInit) => Promise<Response> | Response)
  >,
): { calls: RecordedCall[]; stub: ReturnType<typeof vi.fn> } {
  const calls: RecordedCall[] = [];
  let idx = 0;
  const stub = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    const method = init?.method ?? "GET";
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    calls.push({ url, method, body });
    const entry = responses[Math.min(idx++, responses.length - 1)];
    if (typeof entry === "function") {
      return entry(url, init);
    }
    const status = entry.status ?? 200;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(entry.headers ?? {}),
    };
    const payload =
      entry.body === undefined
        ? ""
        : typeof entry.body === "string"
          ? entry.body
          : JSON.stringify(entry.body);
    return new Response(payload, { status, headers });
  });
  vi.stubGlobal("fetch", stub);
  return { calls, stub };
}

function assertStrictlyReadOnly(calls: RecordedCall[], expectedDocUid = "doc-1"): void {
  const expectedPath = `${BASE}/ingest/document/${encodeURIComponent(expectedDocUid)}/status`;
  for (const call of calls) {
    expect(call.method).toBe("GET");
    expect(call.url).toBe(expectedPath);
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("T-RL15: Document readiness lifecycle (TS SDK)", () => {
  test("additive receipt typings on ingestDocument, ingestSession, and resumeDocument (with reprocess)", async () => {
    const ingestReceipt: IngestDocumentResponse = {
      job_id: "job-1",
      document_uid: "doc-1",
      deduplicated: false,
      processing_status: "processing",
      generation_id: "gen_01",
      attempt_id: "att_01",
    };
    const resumeReceipt: ResumeDocumentResponse = {
      job_id: "job-2",
      document_uid: "doc-1",
      chunks_to_resume: 3,
      total_chunks: 10,
      generation_id: "gen_02",
      attempt_id: "att_02",
    };
    const { calls } = stubFetchSequence([
      { status: 202, body: ingestReceipt },
      { status: 202, body: resumeReceipt },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    const r1 = await client.ingestDocument({ content: "hello" });
    expect(r1.generation_id).toBe("gen_01");
    expect(r1.attempt_id).toBe("att_01");

    const r2 = await client.resumeDocument("doc-1", {
      layers: ["reality"],
      reprocess: true,
    });
    expect(r2.generation_id).toBe("gen_02");
    expect(r2.attempt_id).toBe("att_02");
    expect(r2.total_chunks).toBe(10);
    expect(calls[1].body).toEqual({ layers: ["reality"], reprocess: true });
  });

  test("getDocumentStatus URL-encodes uid, validates contract, and rejects incompatible payload", async () => {
    const status = makeStatus({ document_uid: "doc/with?chars#1" });
    const { calls } = stubFetchSequence([
      { status: 200, body: status },
      { status: 200, body: { contract: "wrong", document_uid: "doc-1" } },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    const res = await client.getDocumentStatus("doc/with?chars#1");
    expect(res).toEqual(status);
    expect(calls[0].url).toBe(`${BASE}/ingest/document/doc%2Fwith%3Fchars%231/status`);

    await expect(client.getDocumentStatus("doc-1")).rejects.toMatchObject({
      code: "incompatible_response",
      status: 200,
    });
  });

  test("timeoutMs bounds (0, -1, 300_001, NaN, Infinity, non-integer) throw ValidationError synchronously with 0 HTTP calls", () => {
    const { calls } = stubFetchSequence([{ status: 200, body: makeStatus() }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    for (const badTimeout of [0, -1, 300_001, Number.NaN, Number.POSITIVE_INFINITY, 100.5]) {
      expect(() => client.waitForDocument("doc-1", { timeoutMs: badTimeout })).toThrow(ValidationError);
    }
    expect(() =>
      client.waitForDocument("doc-1", { until: "invalid" as unknown as "extraction" }),
    ).toThrow(ValidationError);
    expect(() => client.waitForDocument("doc-1", { attemptId: "" })).toThrow(ValidationError);
    expect(calls).toHaveLength(0);
  });

  test("explicit pinned attemptId resolves on target dimension ready and rejects supersession", async () => {
    const { calls } = stubFetchSequence([
      {
        status: 200,
        body: makeStatus({
          attempt_id: "att_01",
          attempt_state: "running",
          readiness: { lexical: "ready", vector: "not_ready", extraction: "not_ready" },
        }),
      },
      {
        status: 200,
        body: makeStatus({
          attempt_id: "att_01",
          attempt_state: "completed",
          processing_status: "completed",
          readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
        }),
      },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    const done = await client.waitForDocument("doc-1", {
      attemptId: "att_01",
      until: "extraction",
      intervalMs: 100,
      timeoutMs: 5_000,
    });
    expect(done.readiness.extraction).toBe("ready");
    expect(calls).toHaveLength(2);
    assertStrictlyReadOnly(calls);
  });

  test("auto-pins first observed non-null attempt_id and raises DocumentSupersededError on attempt switch", async () => {
    const first = makeStatus({ attempt_id: "att_01", attempt_state: "running" });
    const second = makeStatus({
      attempt_id: "att_02",
      attempt_state: "completed",
      readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
    });
    const { calls } = stubFetchSequence([
      { status: 200, body: first },
      { status: 200, body: second },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    let caught: unknown;
    try {
      await client.waitForDocument("doc-1", { intervalMs: 100, timeoutMs: 5_000 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DocumentSupersededError);
    const err = caught as DocumentSupersededError;
    expect(err.code).toBe("document_superseded");
    expect(err.documentUid).toBe("doc-1");
    expect(err.expectedAttemptId).toBe("att_01");
    expect(err.observedAttemptId).toBe("att_02");
    expect(err.lastStatus).toEqual(second);
    assertStrictlyReadOnly(calls);
  });

  test("explicit attemptId detects supersession immediately on first poll", async () => {
    const observed = makeStatus({ attempt_id: "att_02" });
    stubFetchSequence([{ status: 200, body: observed }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    await expect(
      client.waitForDocument("doc-1", { attemptId: "att_01", timeoutMs: 5_000 }),
    ).rejects.toMatchObject({
      code: "document_superseded",
      documentUid: "doc-1",
      expectedAttemptId: "att_01",
      observedAttemptId: "att_02",
      lastStatus: observed,
    });
  });

  test("legacy document (attempt_id: null) raises ReadinessUnknownError", async () => {
    const legacy = makeStatus({
      generation_id: null,
      attempt_id: null,
      job_id: null,
      job_available: false,
      attempt_state: null,
      processing_status: "completed",
      readiness: { lexical: "unknown", vector: "unknown", extraction: "unknown" },
    });
    stubFetchSequence([{ status: 200, body: legacy }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    let caught: unknown;
    try {
      await client.waitForDocument("doc-1", { timeoutMs: 5_000 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ReadinessUnknownError);
    expect((caught as ReadinessUnknownError).code).toBe("readiness_unknown");
    expect((caught as ReadinessUnknownError).documentUid).toBe("doc-1");
    expect((caught as ReadinessUnknownError).lastStatus).toEqual(legacy);
  });

  test("target dimension not_requested raises ReadinessNotRequestedError", async () => {
    const noVec = makeStatus({
      readiness: { lexical: "ready", vector: "not_requested", extraction: "not_ready" },
    });
    stubFetchSequence([{ status: 200, body: noVec }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    let caught: unknown;
    try {
      await client.waitForDocument("doc-1", { until: "vector", timeoutMs: 5_000 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ReadinessNotRequestedError);
    const err = caught as ReadinessNotRequestedError;
    expect(err.code).toBe("readiness_not_requested");
    expect(err.documentUid).toBe("doc-1");
    expect(err.dimension).toBe("vector");
    expect(err.lastStatus).toEqual(noVec);
  });

  test("attempt_state='running' keeps polling regardless of stale processing_status, and terminal states raise DocumentIncompleteError or ReadinessUnknownError", async () => {
    // Active even when processing_status claims "failed" or "completed"
    const { calls } = stubFetchSequence([
      {
        status: 200,
        body: makeStatus({
          processing_status: "failed",
          attempt_state: "running",
          readiness: { lexical: "ready", vector: "ready", extraction: "not_ready" },
        }),
      },
      {
        status: 200,
        body: makeStatus({
          processing_status: "completed",
          attempt_state: "completed",
          readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
        }),
      },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    const res = await client.waitForDocument("doc-1", { intervalMs: 100, timeoutMs: 5_000 });
    expect(res.readiness.extraction).toBe("ready");
    expect(calls).toHaveLength(2);

    // Terminal not_ready -> DocumentIncompleteError
    const partial = makeStatus({
      processing_status: "processing", // stale!
      attempt_state: "interrupted",
      readiness: { lexical: "ready", vector: "not_ready", extraction: "not_ready" },
    });
    stubFetchSequence([{ status: 200, body: partial }]);
    let incompleteErr: unknown;
    try {
      await client.waitForDocument("doc-1", { until: "vector", timeoutMs: 5_000 });
    } catch (e) {
      incompleteErr = e;
    }
    expect(incompleteErr).toBeInstanceOf(DocumentIncompleteError);
    expect((incompleteErr as DocumentIncompleteError).code).toBe("document_incomplete");
    expect((incompleteErr as DocumentIncompleteError).dimension).toBe("vector");
    expect((incompleteErr as DocumentIncompleteError).lastStatus).toEqual(partial);

    // Terminal unknown (e.g., invalidated_out_of_band) -> ReadinessUnknownError
    const invalidated = makeStatus({
      attempt_state: "completed",
      readiness: { lexical: "unknown", vector: "unknown", extraction: "unknown" },
    });
    stubFetchSequence([{ status: 200, body: invalidated }]);
    await expect(
      client.waitForDocument("doc-1", { until: "extraction", timeoutMs: 5_000 }),
    ).rejects.toBeInstanceOf(ReadinessUnknownError);
  });

  test("409 status_changed retries transparently without supersession or error; other 409 propagates", async () => {
    const { calls } = stubFetchSequence([
      {
        status: 409,
        body: {
          error: "Document ingestion attempt changed while reading status; retry the status read",
          code: "status_changed",
          retriable: true,
        },
      },
      {
        status: 200,
        body: makeStatus({
          attempt_state: "completed",
          readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
        }),
      },
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    const res = await client.waitForDocument("doc-1", {
      attemptId: "att_01",
      intervalMs: 100,
      timeoutMs: 5_000,
    });
    expect(res.readiness.extraction).toBe("ready");
    expect(calls).toHaveLength(2);
    assertStrictlyReadOnly(calls);

    // Non-status_changed 409 throws MindGraphError immediately
    stubFetchSequence([{ status: 409, body: { code: "other_conflict", retriable: false } }]);
    await expect(
      client.waitForDocument("doc-1", { timeoutMs: 5_000 }),
    ).rejects.toMatchObject({ status: 409, code: "other_conflict" });
  });

  test("Retry-After parsing (integer seconds + HTTP-date) and clamping to deadline on 429/503/200", async () => {
    const baseNow = Date.UTC(2026, 10, 22, 4, 0, 0);
    expect(parseRetryAfterMs("3", baseNow)).toBe(3_000);
    expect(parseRetryAfterMs("0", baseNow)).toBe(0);
    expect(parseRetryAfterMs("Sun, 22 Nov 2026 04:00:05 GMT", baseNow)).toBe(5_000);
    expect(parseRetryAfterMs("Sun, 22 Nov 2026 03:59:55 GMT", baseNow)).toBe(0);
    expect(parseRetryAfterMs("not-a-date", baseNow)).toBeNull();

    // Fake-clock test: 429 with Retry-After: 2 sleeps 2000ms (max(100, 2000)), then 200 with HTTP-date Retry-After: +1s sleeps 1000ms, then ready
    let now = baseNow;
    const sleeps: number[] = [];
    const clock = {
      now: () => now,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        now += ms;
      },
    };
    const replies = [
      { status: 429, body: { code: "rate_limited" }, retryAfter: "2" },
      {
        status: 200,
        body: makeStatus({ attempt_state: "running" }),
        retryAfter: new Date(baseNow + 3_000).toUTCString(), // +1s from now (baseNow+2000)
      },
      {
        status: 200,
        body: makeStatus({
          attempt_state: "completed",
          readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
        }),
        retryAfter: null,
      },
    ];
    let i = 0;
    const okStatus = await runWaitForDocumentLoop(
      "doc-1",
      validateWaitForDocumentOptions({ intervalMs: 100, timeoutMs: 10_000 }),
      async () => replies[i++],
      undefined,
      clock,
    );
    expect(okStatus.readiness.extraction).toBe("ready");
    expect(sleeps).toEqual([2_000, 1_000]);

    // Retry-After >= remainingMs raises DocumentWaitTimeoutError immediately without exceeding deadline
    now = baseNow;
    const clampedSleeps: number[] = [];
    const runningStatus = makeStatus({ attempt_state: "running" });
    let caught: unknown;
    try {
      let j = 0;
      const seq = [
        { status: 200, body: runningStatus, retryAfter: null },
        { status: 503, body: { code: "overloaded" }, retryAfter: "60" },
      ];
      await runWaitForDocumentLoop(
        "doc-1",
        validateWaitForDocumentOptions({ intervalMs: 100, timeoutMs: 500 }),
        async () => seq[j++],
        undefined,
        {
          now: () => now,
          sleep: async (ms: number) => {
            clampedSleeps.push(ms);
            now += ms;
          },
        },
      );
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DocumentWaitTimeoutError);
    const timeoutErr = caught as DocumentWaitTimeoutError;
    expect(timeoutErr.code).toBe("document_wait_timeout");
    expect(timeoutErr.documentUid).toBe("doc-1");
    expect(timeoutErr.attemptId).toBe("att_01");
    expect(timeoutErr.lastStatus).toEqual(runningStatus);
    expect(clampedSleeps).toEqual([100]); // never slept 60_000ms
    expect(now - baseNow).toBeLessThanOrEqual(500);
  });

  test("timeout returns documentUid, attemptId, and lastStatus with 0 write/cancel/resubmit requests", async () => {
    const running = makeStatus({ attempt_state: "running" });
    const { calls } = stubFetchSequence([{ status: 200, body: running }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    let caught: unknown;
    try {
      await client.waitForDocument("doc-1", { intervalMs: 100, timeoutMs: 150 });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DocumentWaitTimeoutError);
    const err = caught as DocumentWaitTimeoutError;
    expect(err.code).toBe("document_wait_timeout");
    expect(err.documentUid).toBe("doc-1");
    expect(err.attemptId).toBe("att_01");
    expect(err.lastStatus).toEqual(running);
    expect(calls.length).toBeGreaterThanOrEqual(1);
    assertStrictlyReadOnly(calls);
  });

  test("AbortSignal cancels polling immediately (before request or during sleep) with 0 write/cancel/resubmit requests", async () => {
    // 1. Pre-aborted signal -> 0 HTTP requests at all
    const preAbort = new AbortController();
    preAbort.abort();
    const { calls: preCalls } = stubFetchSequence([{ status: 200, body: makeStatus() }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    let caughtPre: unknown;
    try {
      await client.waitForDocument("doc-1", {
        attemptId: "att_01",
        signal: preAbort.signal,
        timeoutMs: 5_000,
      });
    } catch (e) {
      caughtPre = e;
    }
    expect(caughtPre).toBeInstanceOf(DocumentWaitCancelledError);
    expect((caughtPre as DocumentWaitCancelledError).code).toBe("document_wait_cancelled");
    expect((caughtPre as DocumentWaitCancelledError).documentUid).toBe("doc-1");
    expect((caughtPre as DocumentWaitCancelledError).attemptId).toBe("att_01");
    expect((caughtPre as DocumentWaitCancelledError).lastStatus).toBeNull();
    expect(preCalls).toHaveLength(0);

    // 2. Abort after first running poll -> preserves lastStatus and sends 0 write/cancel requests
    const controller = new AbortController();
    const running = makeStatus({ attempt_state: "running" });
    const { calls } = stubFetchSequence([
      () => {
        setTimeout(() => controller.abort(), 20);
        return new Response(JSON.stringify(running), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    ]);
    let caughtMid: unknown;
    try {
      await client.waitForDocument("doc-1", {
        intervalMs: 1_000,
        timeoutMs: 10_000,
        signal: controller.signal,
      });
    } catch (e) {
      caughtMid = e;
    }
    expect(caughtMid).toBeInstanceOf(DocumentWaitCancelledError);
    const midErr = caughtMid as DocumentWaitCancelledError;
    expect(midErr.code).toBe("document_wait_cancelled");
    expect(midErr.documentUid).toBe("doc-1");
    expect(midErr.attemptId).toBe("att_01");
    expect(midErr.lastStatus).toEqual(running);
    expect(calls).toHaveLength(1);
    assertStrictlyReadOnly(calls);
  });

  test("MindGraphError propagates on 404 (disabled flag or tombstoned/unauthorized doc)", async () => {
    stubFetchSequence([{ status: 404, body: { error: "Not found", code: "not_found" } }]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    await expect(
      client.waitForDocument("doc-1", { timeoutMs: 5_000 }),
    ).rejects.toSatisfy((e: unknown) => e instanceof MindGraphError && e.status === 404);
  });

  test("intervalMs clamping (< 100 -> 100), invalid intervalMs rejection, missing attempt_id rejection, and non-retriable 503 propagation", async () => {
    expect(validateWaitForDocumentOptions({ intervalMs: 10 }).intervalMs).toBe(100);
    expect(validateWaitForDocumentOptions({ intervalMs: -50 }).intervalMs).toBe(100);
    expect(() => validateWaitForDocumentOptions({ intervalMs: Number.NaN })).toThrow(
      ValidationError,
    );
    expect(() =>
      validateWaitForDocumentOptions({ intervalMs: Number.POSITIVE_INFINITY }),
    ).toThrow(ValidationError);

    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });

    // Missing attempt_id (undefined) must fail closed with incompatible_response
    const brokenPayload = {
      contract: DOCUMENT_STATUS_CONTRACT,
      document_uid: "doc-1",
      attempt_state: "completed",
      readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
    };
    stubFetchSequence([{ status: 200, body: brokenPayload }]);
    await expect(client.waitForDocument("doc-1", { timeoutMs: 5_000 })).rejects.toMatchObject({
      code: "incompatible_response",
      status: 200,
    });

    // Non-retriable 503 (retriable: false or terminal code) propagates immediately without retry
    const { calls: c1 } = stubFetchSequence([
      { status: 503, body: { code: "overloaded", retriable: false } },
    ]);
    await expect(client.waitForDocument("doc-1", { timeoutMs: 5_000 })).rejects.toMatchObject({
      status: 503,
      code: "overloaded",
    });
    expect(c1).toHaveLength(1);

    const { calls: c2 } = stubFetchSequence([
      { status: 503, body: { code: "vector_index_rebuilding" } },
    ]);
    await expect(client.waitForDocument("doc-1", { timeoutMs: 5_000 })).rejects.toMatchObject({
      status: 503,
      code: "vector_index_rebuilding",
    });
    expect(c2).toHaveLength(1);
  });

  test("in-flight fetch abort via AbortSignal and remainingMs deadline abort (ignoring shorter client timeoutMs)", async () => {
    // 1. AbortSignal aborts an in-flight fetch immediately
    const controller = new AbortController();
    const { calls: abortCalls } = stubFetchSequence([
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
          setTimeout(() => controller.abort(), 20);
        }),
    ]);
    const client = new MindGraph({ baseUrl: BASE, apiKey: "mg_test" });
    let caughtAbort: unknown;
    try {
      await client.waitForDocument("doc-1", {
        attemptId: "att_01",
        timeoutMs: 5_000,
        signal: controller.signal,
      });
    } catch (e) {
      caughtAbort = e;
    }
    expect(caughtAbort).toBeInstanceOf(DocumentWaitCancelledError);
    expect((caughtAbort as DocumentWaitCancelledError).attemptId).toBe("att_01");
    expect((caughtAbort as DocumentWaitCancelledError).lastStatus).toBeNull();
    expect(abortCalls).toHaveLength(1);

    // 2. Stalled in-flight fetch is aborted at remainingMs and surfaces DocumentWaitTimeoutError
    stubFetchSequence([
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    ]);
    await expect(
      client.waitForDocument("doc-1", { attemptId: "att_01", timeoutMs: 120 }),
    ).rejects.toMatchObject({
      code: "document_wait_timeout",
      documentUid: "doc-1",
      attemptId: "att_01",
      lastStatus: null,
    });

    // 3. Client timeoutMs (50ms) does NOT truncate waitForDocument's longer timeoutMs (5_000ms)
    const shortClient = new MindGraph({ baseUrl: BASE, apiKey: "mg_test", timeoutMs: 50 });
    stubFetchSequence([
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify(
                    makeStatus({
                      attempt_state: "completed",
                      readiness: { lexical: "ready", vector: "ready", extraction: "ready" },
                    }),
                  ),
                  { status: 200, headers: { "Content-Type": "application/json" } },
                ),
              ),
            90,
          );
        }),
    ]);
    const done = await shortClient.waitForDocument("doc-1", { timeoutMs: 5_000 });
    expect(done.readiness.extraction).toBe("ready");
  });
});
