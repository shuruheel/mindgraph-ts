import { describe, expect, it } from "vitest";
import { MindGraph } from "./client.js";
const baseUrl=process.env.MEMORY_CONFORMANCE_URL;
describe.skipIf(!baseUrl)("local memory.v1 server conformance",()=>{
  it("runs the public SDK workflow without external providers",async()=>{
    const client=new MindGraph({baseUrl:baseUrl!,maxRetries:0});
    expect((await client.contracts()).contracts).toContain("memory.v1");
    const memory=client.memory({space_uid:"space:ts-conformance"});
    const saved=await memory.remember("Use the staging cluster",{custom_id:"deploy-target"});
    const context=await memory.context({query:"staging",article_limit:0,chunk_limit:0,ontology:{mode:"off"},format:"text",max_tokens:1000});
    expect(context.budget?.used).toBeLessThanOrEqual(1000);
    expect((await memory.list()).items.map(n=>n.uid)).toContain(saved.uid);
    expect((await memory.profile()).profile.memories.map(n=>n.uid)).toContain(saved.uid);
    await memory.forget({custom_id:"deploy-target"});
    expect((await memory.profile()).profile.memories).toEqual([]);
  });
});
