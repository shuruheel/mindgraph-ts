import type { MemoryForgetResponse } from "./memory.js";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { MindGraph, MindGraphError } from "./client.js";
const scope = { space_uid: "space:project:alpha" };
const client = () => new MindGraph({ baseUrl: "http://memory.test", maxRetries: 0 });
const reply = (body: object, status = 200, contract = "memory.v1") => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-mindgraph-contract": contract } });
afterEach(() => vi.unstubAllGlobals());
describe("memory.v1", () => {
  it("binds an immutable selector without I/O and sends caller keys unchanged", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({ contract: "memory.v1", scope, uid: "m1" }, 201));
    vi.stubGlobal("fetch", fetch);
    const input = { ...scope };
    const memory = client().memory(input);
    input.space_uid = "space:other";
    expect(fetch).not.toHaveBeenCalled();
    await memory.remember("deploy to staging", { custom_id: "deploy-target" });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ scope, text: "deploy to staging", custom_id: "deploy-target" });
    expect(fetch.mock.calls[0][0]).toBe("http://memory.test/memory/v1/remember");
  });
  it("preserves marked domain 404 without discovery", async () => {
    const fetch = vi.fn().mockResolvedValue(reply({ error: "missing", code: "scope_not_found" }, 404));
    vi.stubGlobal("fetch", fetch);
    await expect(client().memory(scope).list()).rejects.toMatchObject({ status: 404, code: "scope_not_found" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("uses only valid discovery to establish unsupported and never replays mutations", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(reply({ contracts: [] }));
    vi.stubGlobal("fetch", fetch);
    await expect(client().memory(scope).remember("text")).rejects.toMatchObject({ code: "unsupported_capability" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe("http://memory.test/memory/v1");
  });
  it("a JSON discovery error does not prove unsupported", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("missing", { status: 404 }))
      .mockResolvedValueOnce(reply({ error: "missing" }, 404, ""));
    vi.stubGlobal("fetch", fetch);
    await expect(client().memory(scope).list()).rejects.toMatchObject({ code: "endpoint_unavailable" });
  });
  it.each([
    { contract: "memory.v0", scope },
    { contract: "memory.v1", scope: { space_uid: "space:other" } },
    { contract: "memory.v1", scope, project_uid: "unexpected" },
  ])("rejects incompatible successful data", async body => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(body)));
    await expect(client().memory(scope).list()).rejects.toMatchObject({ code: "incompatible_response" });
  });
  it("refuses per-call scope overrides", () => {
    expect(() => client().memory(scope).list({ scope: {space_uid:"elsewhere"} } as never)).toThrow(TypeError);
  });
  it("preserves authorization errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply({ error: "forbidden" }, 403, "")));
    await expect(client().memory(scope).list()).rejects.toBeInstanceOf(MindGraphError);
  });
});
it("freezes a facade read body across retry while caller objects change", async()=>{
  vi.useFakeTimers();
  try {
    const fetch=vi.fn().mockResolvedValueOnce(reply({code:"query_admission_busy",retriable:true},503))
      .mockResolvedValueOnce(reply({contract:"memory.v1",scope,items:[],next_cursor:null}));
    vi.stubGlobal("fetch",fetch);
    const node_filter={field:"salience" as const,op:"gt" as const,value:0.5};
    const pending=new MindGraph({baseUrl:"http://memory.test",maxRetries:1,retryBackoffMs:1}).memory(scope).list({node_filter});
    node_filter.value=0.9;
    await vi.runAllTimersAsync(); await pending;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].body).toBe(fetch.mock.calls[0][1].body);
    expect(JSON.parse(fetch.mock.calls[1][1].body).node_filter.value).toBe(0.5);
  } finally {vi.useRealTimers();}
});
it("never retries facade mutations solely on a server hint",async()=>{
  const fetch=vi.fn().mockImplementation(async()=>reply({code:"query_admission_busy",retriable:true},503));
  vi.stubGlobal("fetch",fetch);
  const memory=new MindGraph({baseUrl:"http://memory.test",maxRetries:3}).memory(scope);
  await expect(memory.remember("safe",{custom_id:"key"})).rejects.toMatchObject({status:503});
  await expect(memory.forget({custom_id:"key"})).rejects.toMatchObject({status:503});
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("models facade preview and node-only restore independently of legacy forget",()=>{
  expectTypeOf<MemoryForgetResponse["action"]>().toEqualTypeOf<"preview" | "forgotten">();
  expectTypeOf<MemoryForgetResponse["undo"]>().toEqualTypeOf<{node:string}>();
  expectTypeOf<MemoryForgetResponse["edges_tombstoned"]>().toEqualTypeOf<number>();
  expectTypeOf<MemoryForgetResponse["would_tombstone_edges"]>().toEqualTypeOf<number>();
});
