import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {checkRoutes,makeWorkLaunch} from "./router.mjs";
const routes=JSON.parse(readFileSync(new URL("./routes-v1.json",import.meta.url),"utf8"));
const sample=(journeyId)=>({journeyId,particular:"I want to prepare one useful project step with clear permissions."});
test("source manifest covers eight journeys and 30+ distinct owner resources",()=>{
 assert.equal(checkRoutes(routes),routes);
 assert.equal(routes.journeys.length,8);assert.ok(routes.capabilities.length>=30);
 assert.ok(routes.capabilities.some(x=>x.id==="jarvis"));
 assert.ok(routes.capabilities.some(x=>x.id==="planz"));
 assert.ok(routes.capabilities.some(x=>x.id==="banana"));
 assert.ok(routes.capabilities.some(x=>x.id==="graft"));
 assert.ok(routes.capabilities.some(x=>x.id==="toaster"));
});
test("every goal produces a complete locally proposed one-step work pack",()=>{
 for(const journey of routes.journeys){
  const p=makeWorkLaunch(sample(journey.id),routes);
  assert.equal(p.packet.journeyId,journey.id);
  assert.ok(p.owners.length>=3);
  assert.ok(p.first.length>12);
  assert.match(p.markdown,/nothing sent, deployed, scheduled, or executed/);
  assert.match(p.markdown,/Human or source-owner gate/);
  assert.equal(p.packet.executable,false);
  assert.equal(p.packet.contactAuthorized,false);
  assert.equal(p.packet.fieldConfirmed,false);
  assert.ok(!p.markdown.includes("undefined"));
 }
});
test("the work card uses the Porch next-move engine and respects finite attention",()=>{
 const info=sample("website");
 const short=makeWorkLaunch({...info,attention:"glance"},routes);
 const normal=makeWorkLaunch({...info,attention:"few"},routes);
 assert.match(short.first,/No action or contact is required now/);
 assert.match(normal.first,/verify DNS target/);
 assert.equal(short.packet.attention,"glance");
});
test("source-owned readiness is always visible, including drafts and release",()=>{
 const media=makeWorkLaunch(sample("media"),routes);
 assert.ok(media.owners.some(x=>x.state==="RELEASED_SOFTWARE"));
 assert.ok(media.owners.some(x=>x.state==="DRAFT_REVIEW"));
 assert.match(media.markdown,/Published unsigned Windows alpha/);
 assert.match(media.markdown,/not a shipped public tool/);
});
test("invalid authority, hostile URLs, and missing source owners fail closed",()=>{
 const hostile=structuredClone(routes);
 hostile.capabilities[1].openUrl="javascript:alert(1)";
 assert.throws(()=>checkRoutes(hostile),/invalid boundary or link/);
 const bad=structuredClone(routes);bad.journeys[0].capabilities.push("imaginary-provider");
 assert.throws(()=>checkRoutes(bad),/missing or invalid/);
 const counterfeit=structuredClone(routes);counterfeit.capabilities[0].state="PARTNER_VERIFIED";
 assert.throws(()=>checkRoutes(counterfeit),/invalid boundary or link/);
});
test("source text is never sent or granted authority, and private details are rejected",()=>{
 assert.throws(()=>makeWorkLaunch({...sample("application"),particular:"Please send this to someone@example.com immediately."},routes),/Remove email/);
 assert.throws(()=>makeWorkLaunch({...sample("application"),particular:"password: unsafe secret here"},routes),/Remove email/);
 assert.throws(()=>makeWorkLaunch(sample("not-a-journey"),routes),/available job/);
 assert.throws(()=>makeWorkLaunch({...sample("application"),particular:"hi"},routes),/8–420/);
 const x=makeWorkLaunch(sample("application"),routes);
 assert.ok(x.packet.capabilityRefs.every(y=>/^https:\/\//.test(y.sourceUrl)));
 assert.deepEqual(x.packet.capabilityRefs.map(y=>y.id),routes.journeys[0].capabilities);
});
