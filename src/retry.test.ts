import { afterEach, describe, expect, test, vi } from "vitest";
import { MindGraph, MindGraphError } from "./client.js";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function client() { return new MindGraph({ baseUrl: "https://offline.invalid", retryBackoffMs: 1 }); }
function fail(body: unknown, status = 503, hint = "86400") {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status, headers: { "Retry-After": hint },
  });
}
function transport(body: unknown, status = 503, hint = "86400") {
  const fetcher = vi.fn().mockResolvedValueOnce(fail(body, status, hint))
    .mockImplementation(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("engine failure retry contract", () => {
  test.each([
    [503, "vector_index_rebuilding"], [503, "query_admission_busy"],
    [422, "query_memory_budget_exceeded"], [504, "query_timeout"], [409, "query_cancelled"],
  ])("preserves %s/%s and never retries explicit false", async (status, code) => {
    const body = { error: "Operation failed", code, retriable: false };
    const fetcher = transport(body, status);
    await expect(client().hybridSearch("test")).rejects.toMatchObject({
      status, code, retriable: false, body,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("terminal maintenance code also stops retries from older producers", async () => {
    const fetcher = transport({ code: "vector_index_rebuilding" });
    await expect(client().getNode("node")).rejects.toBeInstanceOf(MindGraphError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test.each(["busy", {}, { retriable: true }, [], null])("retries legacy or allowed read response %j", async (body) => {
    vi.useFakeTimers();
    const fetcher = transport(body);
    const result = client().hybridSearch("test");
    await vi.advanceTimersByTimeAsync(9999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test.each([
    (mg: MindGraph) => mg.capture({ action: "source", label: "source" }),
    (mg: MindGraph) => mg.plan({ action: "create_task", idempotency_key: "ignored", label: "task" }),
    (mg: MindGraph) => mg.plan({ action: "heartbeat", idempotency_key: " " }),
    (mg: MindGraph) => mg.series({ action: "append", series_uid: "s", points: [] }),
    (mg: MindGraph) => mg.updateNode("n", { label: "updated" }),
    (mg: MindGraph) => mg.deleteNode("n"),
  ])("does not retry unprotected write %# even when the server says true", async (invoke) => {
    const fetcher = transport({ retriable: true });
    await expect(invoke(client())).rejects.toBeInstanceOf(MindGraphError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("keyed work retry retains exact payload and telemetry correlation", async () => {
    vi.useFakeTimers();
    const fetcher = transport({ code: "query_admission_busy", retriable: true }, 503, "0.001");
    const body = { action: "heartbeat" as const, idempotency_key: "key-1", task_uid: "t" };
    const result = client().plan(body);
    body.idempotency_key = "changed";
    await vi.runAllTimersAsync();
    await result;
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toEqual(fetcher.mock.calls[1][1]);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).idempotency_key).toBe("key-1");
  });

  test("explicit false also stops keyed work", async () => {
    const fetcher = transport({ code: "query_admission_busy", retriable: false });
    await expect(client().plan({ action: "heartbeat", idempotency_key: "key" })).rejects.toBeInstanceOf(MindGraphError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test("classifies the serialized action rather than an input object's read label", async () => {
    const fetcher = transport({ retriable: true });
    const request = { action: "get_plan" as const, toJSON: () => ({ action: "create_task", label: "task" }) };
    await expect(client().plan(request)).rejects.toBeInstanceOf(MindGraphError);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).action).toBe("create_task");
  });

  test.each(["NaN", "Infinity", "-1", "invalid", ""]) ("bounds fallback delay for %s", async (header) => {
    vi.useFakeTimers();
    const fetcher = transport("busy", 503, header);
    const result = new MindGraph({ baseUrl: "https://offline.invalid", retryBackoffMs: 60_000 }).health();
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  test("exhausts the configured retry count and returns the last typed error", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async () => fail({ code: "query_admission_busy", retriable: true }, 503, "0.001"));
    vi.stubGlobal("fetch", fetcher);
    const result = expect(client().health()).rejects.toMatchObject({ code: "query_admission_busy", retriable: true });
    await vi.runAllTimersAsync();
    await result;
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  test("does not turn malformed field types into typed guidance", () => {
    expect(new MindGraphError("failure", 503, { code: 3, retriable: "false" }))
      .toMatchObject({ code: undefined, retriable: undefined });
  });
});
