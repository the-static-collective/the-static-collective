import test from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {makePublicOnlyCrossing,TOPICS,CAPACITIES} from "./crossing-bridge.mjs";
// An actual external owner checkout is mandatory in the dedicated CI step.
test("native pinned webZ CROSSINGS-032 reads every emitted packet without adaptation",async t=>{
 const originalRoot=process.env.WEBZ_NATIVE_ROOT;
 if(!originalRoot){t.skip("Run with WEBZ_NATIVE_ROOT=native-webz after exact-commit source checkout.");return;}
 const mod=await import(pathToFileURL(resolve(originalRoot,"ask-jarvis/public/crossings/model.mjs")).href);
 const when=new Date("2026-10-30T19:00:00.000Z");
 assert.deepEqual(TOPICS,mod.TOPICS);
 assert.deepEqual(CAPACITIES,mod.CAPACITIES);
 for(const topic of TOPICS)for(const capacity of CAPACITIES){
  const ticket=makePublicOnlyCrossing({topic,capacity},when);
  assert.deepEqual(mod.readCrossing(ticket),ticket);
  const original=mod.makeCrossing({schema:"abundent/public-first-yes/v0",standing:"PUBLIC_DRAFT_PREPARED_UNSENT",topic,capacity,publicSource:{status:"EDITORIAL_ONLY"}},when);
  assert.deepEqual(ticket,original);
  const unverifiedReturn=mod.makeReturn(ticket,"DECLINED",when);
  assert.equal(unverifiedReturn.standing,"UNVERIFIED_SELF_REPORT");
  assert.equal(unverifiedReturn.automaticPublication,false);
  assert.equal(unverifiedReturn.proof,"NONE");
 }
 const invalid=makePublicOnlyCrossing({topic:"grocery",capacity:"Listen"},when);
 assert.throws(()=>mod.readCrossing({...invalid,question:"private details"}),/UNRECOGNIZED_OR_UNSAFE_CROSSING/);
 assert.throws(()=>mod.readCrossing({...invalid,authority:{...invalid.authority,consentReceived:true}}),/UNRECOGNIZED_OR_UNSAFE_CROSSING/);
});
