import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MindGraph } from "./client.js";
import type { MemoryContextOptions, MemoryListOptions, MemoryProfileOptions, MemoryRememberOptions } from "./memory.js";
const fixtures = JSON.parse(readFileSync(new URL("../fixtures/memory-v1.json", import.meta.url), "utf8")) as { cases: { name: string; operation: string; request: Record<string, any>; status: number; response: any }[] };
afterEach(() => vi.unstubAllGlobals());
describe("shared server wire fixtures", () => {
  for (const fixture of fixtures.cases) it(fixture.name, async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture.response), { status: fixture.status, headers: {"content-type":"application/json","x-mindgraph-contract":"memory.v1"} }));
    vi.stubGlobal("fetch", fetch);
    const client = new MindGraph({baseUrl:"http://memory.test",maxRetries:0});
    const {scope, ...options} = fixture.request;
    const memory = client.memory(scope);
    let result: Promise<unknown>;
    switch (fixture.operation) {
      case "remember": { const {text,...rest}=options; result=memory.remember(text,rest as MemoryRememberOptions); break; }
      case "context": result=memory.context(options as MemoryContextOptions); break;
      case "profile": result=memory.profile(options as MemoryProfileOptions); break;
      case "list": result=memory.list(options as MemoryListOptions); break;
      case "forget": {const {custom_id,...rest}=options;result=memory.forget({custom_id},rest);break;}
      default: throw new Error("unrecognized fixture operation");
    }
    if(fixture.status<300) expect(await result).toEqual(fixture.response);
    else await expect(result).rejects.toMatchObject({status:fixture.status,code:fixture.response.code});
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(`http://memory.test/memory/v1/${fixture.operation}`);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(fixture.request);
  });
});
