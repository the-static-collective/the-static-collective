import test from "node:test";
import assert from "node:assert/strict";
import {makePublicOnlyCrossing,TOPICS,CAPACITIES} from "./crossing-bridge.mjs";
const when=new Date("2026-10-30T19:00:00.000Z");
test("the public-only crossing can never include original note/identity and grants no authority",()=>{
 for(const topic of TOPICS){
  const p=makePublicOnlyCrossing({topic,capacity:"Listen"},when);
  assert.equal(p.schema,"abundent/public-crossing/v0");
  assert.equal(p.scope,"PUBLIC_COMMUNITY_ONLY");
  assert.equal(p.standing,"PROPOSED_UNSENT");
  assert.equal(p.sourceStatus,"EDITORIAL_ONLY");
  assert.equal(p.reviewedEntryId,null);
  assert.ok(Object.values(p.authority).every(v=>v===false));
  assert.deepEqual(Object.keys(p).sort(),["authority","capacity","createdAt","reviewedEntryId","schema","scope","sourceStatus","standing","topic"].sort());
  assert.doesNotMatch(JSON.stringify(p),/question|particular|name|email|address|phone|receipt|secret|password/i);
 }
});
test("original topic/capacity allowlist, date and unavailable choices fail closed",()=>{
 assert.equal(CAPACITIES.length,6);
 assert.throws(()=>makePublicOnlyCrossing({topic:"forged-case",capacity:"Listen"},when),/public topic/);
 assert.throws(()=>makePublicOnlyCrossing({topic:"care",capacity:"Send email"},when),/public topic/);
 assert.throws(()=>makePublicOnlyCrossing({topic:"care",capacity:"Research"},new Date(NaN)),/valid date/);
});
